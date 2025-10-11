package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"improview/backend/internal/api"
	"improview/backend/internal/app"
)

func setupServer() *api.Server {
	services := app.NewInMemoryServices(api.RealClock{})
	return api.NewServer(services)
}

func TestGenerateReturnsProblemPack(t *testing.T) {
	server := setupServer()

	req := httptest.NewRequest(http.MethodPost, "/api/generate", strings.NewReader(`{"category":"bfs","difficulty":"easy"}`))
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
}

func TestAttemptLifecycle(t *testing.T) {
	server := setupServer()

	genReq := httptest.NewRequest(http.MethodPost, "/api/generate", strings.NewReader(`{"category":"bfs","difficulty":"easy"}`))
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
	attemptRec := httptest.NewRecorder()
	server.Handler().ServeHTTP(attemptRec, attemptReq)
	if attemptRec.Code != http.StatusOK {
		t.Fatalf("create attempt returned %d", attemptRec.Code)
	}

	runReqBody := `{"attempt_id":"` + getAttemptID(t, attemptRec.Body.Bytes()) + `","code":"function solution(){ return 42; }","which":"public"}`
	runReq := httptest.NewRequest(http.MethodPost, "/api/run-tests", strings.NewReader(runReqBody))
	runRec := httptest.NewRecorder()
	server.Handler().ServeHTTP(runRec, runReq)
	if runRec.Code != http.StatusOK {
		t.Fatalf("run-tests returned %d", runRec.Code)
	}

	submitReq := httptest.NewRequest(http.MethodPost, "/api/submit", strings.NewReader(`{"attempt_id":"`+getAttemptID(t, attemptRec.Body.Bytes())+`","code":"function solution(){ return 42; }"}`))
	submitRec := httptest.NewRecorder()
	server.Handler().ServeHTTP(submitRec, submitReq)
	if submitRec.Code != http.StatusOK {
		t.Fatalf("submit returned %d", submitRec.Code)
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
