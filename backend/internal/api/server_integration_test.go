package api_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"improview/backend/internal/api"
	"improview/backend/internal/app"
	"improview/backend/internal/auth"
	"improview/backend/internal/domain"
	"improview/backend/internal/testenv"
)

func setupServer(t *testing.T) *api.Server {
	t.Helper()

	mode := strings.ToLower(strings.TrimSpace(os.Getenv("IMPROVIEW_GENERATOR_MODE")))
	if mode == string(app.GeneratorModeLLM) {
		if err := testenv.LoadOnce(".env.local"); err != nil {
			t.Fatalf("load env file: %v", err)
		}

		services, err := app.NewServicesFromEnv(api.RealClock{})
		if err != nil {
			t.Fatalf("failed to configure llm services: %v", err)
		}
		return api.NewServer(services)
	}

	services := app.NewInMemoryServices(api.RealClock{})
	return api.NewServer(services)
}

type staticAuthenticator struct {
	expectedToken string
	identity      auth.Identity
}

func (s staticAuthenticator) Authenticate(_ context.Context, token string) (auth.Identity, error) {
	if token != s.expectedToken {
		return auth.Identity{}, auth.ErrUnauthenticated
	}
	return s.identity, nil
}

func TestAuthGuardRequiresBearerToken(t *testing.T) {
	services := app.NewInMemoryServices(api.RealClock{})
	services.Authenticator = staticAuthenticator{
		expectedToken: "valid-token",
		identity:      auth.Identity{Subject: "user-123", Username: "user@example.com"},
	}
	server := api.NewServer(services)

	callGenerate := func(token string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, "/api/generate", strings.NewReader(`{"category":"bfs","difficulty":"easy"}`))
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		rec := httptest.NewRecorder()
		server.Handler().ServeHTTP(rec, req)
		return rec
	}

	if res := callGenerate(""); res.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without authorization header, got %d", res.Code)
	}

	if res := callGenerate("wrong-token"); res.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for wrong token, got %d", res.Code)
	}

	if res := callGenerate("valid-token"); res.Code != http.StatusOK {
		t.Fatalf("expected 200 for valid token, got %d", res.Code)
	}
}

func TestGenerateReturnsProblemPack(t *testing.T) {
	server := setupServer(t)

	req := httptest.NewRequest(http.MethodPost, "/api/generate", strings.NewReader(`{"category":"bfs","difficulty":"easy"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var resp api.GenerateResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.ProblemID == "" {
		t.Fatalf("expected a problem_id in response")
	}

	if resp.Pack.Problem.Title == "" {
		t.Fatalf("expected problem title to be set")
	}
	if resp.Pack.API.FunctionName == "" || resp.Pack.API.Signature == "" {
		t.Fatalf("expected API metadata to be populated")
	}
	if len(resp.Pack.Tests.Public) == 0 || len(resp.Pack.Tests.Hidden) == 0 {
		t.Fatalf("expected both public and hidden tests")
	}
	if len(resp.Pack.Solutions) == 0 {
		t.Fatalf("expected at least one solution outline")
	}
	if strings.TrimSpace(resp.Pack.Hint) == "" {
		t.Fatalf("expected hint to be populated")
	}
}

func TestAttemptLifecycle(t *testing.T) {
	server := setupServer(t)

	genReq := httptest.NewRequest(http.MethodPost, "/api/generate", strings.NewReader(`{"category":"bfs","difficulty":"easy"}`))
	genReq.Header.Set("Content-Type", "application/json")
	genRec := httptest.NewRecorder()
	server.Handler().ServeHTTP(genRec, genReq)
	if genRec.Code != http.StatusOK {
		t.Fatalf("generate returned %d", genRec.Code)
	}

	var genResp api.GenerateResponse
	if err := json.Unmarshal(genRec.Body.Bytes(), &genResp); err != nil {
		t.Fatalf("decode generate response: %v", err)
	}

	attemptReq := httptest.NewRequest(http.MethodPost, "/api/attempt", strings.NewReader(`{"problem_id":"`+genResp.ProblemID+`","lang":"javascript"}`))
	attemptReq.Header.Set("Content-Type", "application/json")
	attemptRec := httptest.NewRecorder()
	server.Handler().ServeHTTP(attemptRec, attemptReq)
	if attemptRec.Code != http.StatusOK {
		t.Fatalf("create attempt returned %d", attemptRec.Code)
	}

	runReqBody := `{"attempt_id":"` + getAttemptID(t, attemptRec.Body.Bytes()) + `","code":"function solution(){ return 42; }","which":"public"}`
	runReq := httptest.NewRequest(http.MethodPost, "/api/run-tests", strings.NewReader(runReqBody))
	runReq.Header.Set("Content-Type", "application/json")
	runRec := httptest.NewRecorder()
	server.Handler().ServeHTTP(runRec, runReq)
	if runRec.Code != http.StatusOK {
		t.Fatalf("run-tests returned %d", runRec.Code)
	}

	attemptID := getAttemptID(t, attemptRec.Body.Bytes())
	submitReq := httptest.NewRequest(http.MethodPost, "/api/submit", strings.NewReader(`{"attempt_id":"`+attemptID+`","code":"function solution(){ return 42; }"}`))
	submitReq.Header.Set("Content-Type", "application/json")
	submitRec := httptest.NewRecorder()
	server.Handler().ServeHTTP(submitRec, submitReq)
	if submitRec.Code != http.StatusOK {
		t.Fatalf("submit returned %d", submitRec.Code)
	}

	// Verify problem retrieval matches generated pack
	problemRec := httptest.NewRecorder()
	server.Handler().ServeHTTP(problemRec, httptest.NewRequest(http.MethodGet, "/api/problem/"+genResp.ProblemID, nil))
	if problemRec.Code != http.StatusOK {
		t.Fatalf("get problem returned %d", problemRec.Code)
	}
	var storedPack domain.ProblemPack
	if err := json.Unmarshal(problemRec.Body.Bytes(), &storedPack); err != nil {
		t.Fatalf("decode problem pack: %v", err)
	}
	if storedPack.Problem.Title != genResp.Pack.Problem.Title {
		t.Fatalf("expected stored problem title %q, got %q", genResp.Pack.Problem.Title, storedPack.Problem.Title)
	}
	if len(storedPack.Tests.Public) == 0 || len(storedPack.Tests.Hidden) == 0 {
		t.Fatalf("expected stored tests to include both public and hidden")
	}
	if storedPack.API.FunctionName == "" {
		t.Fatalf("expected stored API function name")
	}

	// Verify attempt retrieval matches contract
	attemptRecGet := httptest.NewRecorder()
	server.Handler().ServeHTTP(attemptRecGet, httptest.NewRequest(http.MethodGet, "/api/attempt/"+attemptID, nil))
	if attemptRecGet.Code != http.StatusOK {
		t.Fatalf("get attempt returned %d", attemptRecGet.Code)
	}
	var attemptPayload struct {
		Attempt domain.Attempt     `json:"attempt"`
		Runs    []domain.RunResult `json:"runs"`
	}
	if err := json.Unmarshal(attemptRecGet.Body.Bytes(), &attemptPayload); err != nil {
		t.Fatalf("decode attempt payload: %v", err)
	}
	if attemptPayload.Attempt.ID != attemptID {
		t.Fatalf("expected attempt id %q, got %q", attemptID, attemptPayload.Attempt.ID)
	}
	if attemptPayload.Attempt.PassCount != 2 {
		t.Fatalf("expected pass count 2, got %d", attemptPayload.Attempt.PassCount)
	}
	if attemptPayload.Attempt.EndedAt < attemptPayload.Attempt.StartedAt {
		t.Fatalf("expected ended_at to be >= started_at")
	}
	if attemptPayload.Attempt.DurationMS < 0 {
		t.Fatalf("expected non-negative duration, got %d", attemptPayload.Attempt.DurationMS)
	}
	if len(attemptPayload.Runs) != 2 {
		t.Fatalf("expected two recorded runs, got %d", len(attemptPayload.Runs))
	}
	if attemptPayload.Runs[0].TestID == "" {
		t.Fatalf("expected run test ids to be populated")
	}
}

func getAttemptID(t *testing.T, body []byte) string {
	t.Helper()

	var resp api.CreateAttemptResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		t.Fatalf("decode attempt response: %v", err)
	}

	if resp.Attempt.ID == "" {
		t.Fatalf("attempt id should not be empty")
	}

	return resp.Attempt.ID
}

func TestErrorEnvelopeAndHealthEndpoints(t *testing.T) {
	server := setupServer(t)

	// Missing attempt should surface JSON error envelope
	missingAttempt := httptest.NewRecorder()
	server.Handler().ServeHTTP(missingAttempt, httptest.NewRequest(http.MethodGet, "/api/attempt/does-not-exist", nil))
	if missingAttempt.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", missingAttempt.Code)
	}
	var errResp api.ErrorResponse
	if err := json.Unmarshal(missingAttempt.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("decode error response: %v", err)
	}
	if errResp.Error != "not_found" {
		t.Fatalf("expected not_found error code, got %q", errResp.Error)
	}

	// Invalid run-tests payload should return bad_request envelope
	badRunReq := httptest.NewRequest(http.MethodPost, "/api/run-tests", strings.NewReader(`{"attempt_id":"att","code":"","which":"public"}`))
	badRunReq.Header.Set("Content-Type", "application/json")
	badRunRec := httptest.NewRecorder()
	server.Handler().ServeHTTP(badRunRec, badRunReq)
	if badRunRec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", badRunRec.Code)
	}
	if err := json.Unmarshal(badRunRec.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("decode bad_request envelope: %v", err)
	}
	if errResp.Error != "bad_request" {
		t.Fatalf("expected bad_request error code, got %q", errResp.Error)
	}

	// Health endpoint should be OK
	healthRec := httptest.NewRecorder()
	server.Handler().ServeHTTP(healthRec, httptest.NewRequest(http.MethodGet, "/api/healthz", nil))
	if healthRec.Code != http.StatusOK {
		t.Fatalf("expected 200 from healthz, got %d", healthRec.Code)
	}
	var healthPayload struct {
		Status string `json:"status"`
	}
	if err := json.Unmarshal(healthRec.Body.Bytes(), &healthPayload); err != nil {
		t.Fatalf("decode health response: %v", err)
	}
	if healthPayload.Status != "ok" {
		t.Fatalf("expected status ok, got %q", healthPayload.Status)
	}

	// Version endpoint should return semantic version string
	versionRec := httptest.NewRecorder()
	server.Handler().ServeHTTP(versionRec, httptest.NewRequest(http.MethodGet, "/api/version", nil))
	if versionRec.Code != http.StatusOK {
		t.Fatalf("expected 200 from version, got %d", versionRec.Code)
	}
	var versionPayload struct {
		Version string `json:"version"`
	}
	if err := json.Unmarshal(versionRec.Body.Bytes(), &versionPayload); err != nil {
		t.Fatalf("decode version response: %v", err)
	}
	if versionPayload.Version == "" {
		t.Fatalf("expected version to be set")
	}

	// Ensure time monotonicity for attempt completion in memory store
	attempt := app.NewMemoryAttemptStore(api.RealClock{})
	created, err := attempt.Create(nil, api.CreateAttemptRequest{ProblemID: "abc", Language: "js"})
	if err != nil {
		t.Fatalf("create attempt: %v", err)
	}
	time.Sleep(time.Millisecond)
	if err := attempt.Complete(nil, created.ID, domain.SubmissionSummary{AttemptID: created.ID}); err != nil {
		t.Fatalf("complete attempt: %v", err)
	}
	got, _, err := attempt.Get(nil, created.ID)
	if err != nil {
		t.Fatalf("get attempt: %v", err)
	}
	if got.DurationMS <= 0 {
		t.Fatalf("expected positive duration, got %d", got.DurationMS)
	}
}
