package api_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"improview/backend/internal/app"
	"improview/backend/internal/domain"
	"improview/backend/internal/jsonfmt"
	"improview/backend/internal/testenv"
)

type liveSuite struct {
	baseURL string
	client  *http.Client
	token   string
}

const smokeLogMaxBodyBytes = jsonfmt.DefaultLogLimit

func smokeDebugEnabled() bool {
	return strings.TrimSpace(os.Getenv("CI_SMOKE_DEBUG")) != ""
}

func logSmoke(t *testing.T, format string, args ...any) {
	if !smokeDebugEnabled() {
		return
	}
	t.Helper()
	t.Logf(format, args...)
}

func newLiveSuite(t *testing.T) *liveSuite {
	t.Helper()

	if err := testenv.LoadOnce(".env.local"); err != nil {
		t.Fatalf("load env file: %v", err)
	}

	base := os.Getenv("BASE_URL")
	if base == "" {
		t.Skip("set BASE_URL to run live API integration tests")
	}

	base = strings.TrimRight(base, "/")

	return &liveSuite{
		baseURL: base,
		client:  &http.Client{Timeout: 15 * time.Second},
		token:   strings.TrimSpace(os.Getenv("IMPROVIEW_LIVE_ACCESS_TOKEN")),
	}
}

func requireAuth(t *testing.T, suite *liveSuite) {
	if strings.TrimSpace(suite.token) == "" {
		t.Skip("set IMPROVIEW_LIVE_ACCESS_TOKEN to exercise authenticated endpoints")
	}
}

func (s *liveSuite) get(t *testing.T, path string, target any) *http.Response {
	t.Helper()

	req, err := http.NewRequest(http.MethodGet, s.baseURL+path, nil)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}

	if s.token != "" {
		req.Header.Set("Authorization", "Bearer "+s.token)
	}

	logSmoke(t, "[GET %s] sending request", path)

	resp, err := s.client.Do(req)
	if err != nil {
		t.Fatalf("perform GET %s: %v", path, err)
	}

	decodeBody(t, resp, target)
	return resp
}

func (s *liveSuite) post(t *testing.T, path string, payload any, target any) *http.Response {
	t.Helper()

	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	req, err := http.NewRequest(http.MethodPost, s.baseURL+path, bytes.NewReader(body))
	if err != nil {
		t.Fatalf("create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if s.token != "" {
		req.Header.Set("Authorization", "Bearer "+s.token)
	}

	logSmoke(t, "[POST %s] payload=%s", path, jsonfmt.FormatForLog(body, smokeLogMaxBodyBytes))

	resp, err := s.client.Do(req)
	if err != nil {
		t.Fatalf("perform POST %s: %v", path, err)
	}

	decodeBody(t, resp, target)
	return resp
}

func (s *liveSuite) put(t *testing.T, path string, payload any, target any) *http.Response {
	t.Helper()

	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	req, err := http.NewRequest(http.MethodPut, s.baseURL+path, bytes.NewReader(body))
	if err != nil {
		t.Fatalf("create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if s.token != "" {
		req.Header.Set("Authorization", "Bearer "+s.token)
	}

	logSmoke(t, "[PUT %s] payload=%s", path, jsonfmt.FormatForLog(body, smokeLogMaxBodyBytes))

	resp, err := s.client.Do(req)
	if err != nil {
		t.Fatalf("perform PUT %s: %v", path, err)
	}

	decodeBody(t, resp, target)
	return resp
}

func (s *liveSuite) delete(t *testing.T, path string) *http.Response {
	t.Helper()

	req, err := http.NewRequest(http.MethodDelete, s.baseURL+path, nil)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}
	if s.token != "" {
		req.Header.Set("Authorization", "Bearer "+s.token)
	}

	logSmoke(t, "[DELETE %s] sending request", path)
	resp, err := s.client.Do(req)
	if err != nil {
		t.Fatalf("perform DELETE %s: %v", path, err)
	}
	return resp
}

func decodeBody(t *testing.T, resp *http.Response, target any) {
	t.Helper()

	defer resp.Body.Close()
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}

	if smokeDebugEnabled() {
		method := "UNKNOWN"
		path := ""
		if resp.Request != nil {
			method = resp.Request.Method
			if resp.Request.URL != nil {
				path = resp.Request.URL.RequestURI()
			}
		}
		logSmoke(t, "[RESP %s %s] status=%d body=%s", method, path, resp.StatusCode, jsonfmt.FormatForLog(bodyBytes, smokeLogMaxBodyBytes))
	}

	if target == nil {
		return
	}

	if err := json.Unmarshal(bodyBytes, target); err != nil {
		t.Fatalf("decode response: %v (body: %s)", err, string(bodyBytes))
	}
}

func TestLiveHealthz(t *testing.T) {
	suite := newLiveSuite(t)

	var payload struct {
		Status string `json:"status"`
	}

	resp := suite.get(t, "/api/healthz", &payload)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from healthz, got %d", resp.StatusCode)
	}

	if payload.Status != "ok" {
		t.Fatalf("expected status ok, got %q", payload.Status)
	}
}

func TestLiveVersion(t *testing.T) {
	suite := newLiveSuite(t)

	var payload struct {
		Version string `json:"version"`
	}

	resp := suite.get(t, "/api/version", &payload)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from version, got %d", resp.StatusCode)
	}

	if strings.TrimSpace(payload.Version) == "" {
		t.Fatalf("expected non-empty version string")
	}
}

func TestLiveGenerate(t *testing.T) {
	suite := newLiveSuite(t)

	problem := generateProblem(t, suite)

	if strings.TrimSpace(problem.ProblemID) == "" {
		t.Fatalf("expected problem_id in response")
	}
	if strings.TrimSpace(problem.Pack.Problem.Title) == "" {
		t.Fatalf("expected problem title in pack")
	}
	if len(problem.Pack.Tests.Public) == 0 || len(problem.Pack.Tests.Hidden) == 0 {
		t.Fatalf("expected both public and hidden tests")
	}
	if len(problem.Pack.Solutions) == 0 {
		t.Fatalf("expected at least one solution outline")
	}
	if strings.TrimSpace(problem.Pack.Hint) == "" {
		t.Fatalf("expected hint in problem pack")
	}
	if strings.TrimSpace(problem.Pack.MacroCategory) == "" {
		t.Fatalf("expected macro category on problem pack")
	}
	if tmpl := problem.Pack.WorkspaceTemplate; tmpl != nil {
		if strings.TrimSpace(tmpl.Entry) == "" {
			t.Fatalf("workspace template entry must not be empty")
		}
		if tmpl.Files == nil || len(tmpl.Files) == 0 {
			t.Fatalf("workspace template files must be populated when template exists")
		}
	}
}

func TestLiveAttemptLifecycle(t *testing.T) {
	suite := newLiveSuite(t)

	problem := generateProblem(t, suite)
	solutionCode, ok := smokeSolutionForPack(problem.Pack)
	if !ok {
		t.Fatalf("no deterministic smoke solution for problem %q; ensure IMPROVIEW_FORCE_GENERATE_MODE=static", problem.Pack.Problem.Title)
	}

	var attemptResp struct {
		Attempt domain.Attempt `json:"attempt"`
	}

	resp := suite.post(t, "/api/attempt", map[string]string{
		"problem_id": problem.ProblemID,
		"lang":       "javascript",
	}, &attemptResp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from attempt creation, got %d", resp.StatusCode)
	}

	attemptID := strings.TrimSpace(attemptResp.Attempt.ID)
	if attemptID == "" {
		t.Fatalf("expected attempt id in response")
	}

	var runSummary struct {
		Summary domain.RunSummary `json:"summary"`
	}
	runResp := suite.post(t, "/api/run-tests", map[string]string{
		"attempt_id": attemptID,
		"code":       solutionCode,
		"which":      "public",
	}, &runSummary)
	if runResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from run-tests, got %d", runResp.StatusCode)
	}
	if len(runSummary.Summary.Results) == 0 {
		t.Fatalf("expected run summary results")
	}

	var submitSummary struct {
		Summary domain.SubmissionSummary `json:"summary"`
	}
	submitResp := suite.post(t, "/api/submit", map[string]string{
		"attempt_id": attemptID,
		"code":       solutionCode,
	}, &submitSummary)
	if submitResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from submit, got %d", submitResp.StatusCode)
	}
	if !submitSummary.Summary.Passed {
		t.Fatalf("expected submission to pass")
	}

	var attemptDetail struct {
		Attempt domain.Attempt     `json:"attempt"`
		Runs    []domain.RunResult `json:"runs"`
	}
	getResp := suite.get(t, "/api/attempt/"+attemptID, &attemptDetail)
	if getResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from get attempt, got %d", getResp.StatusCode)
	}
	if len(attemptDetail.Runs) == 0 {
		t.Fatalf("expected recorded runs in attempt")
	}
	if attemptDetail.Attempt.ProblemID != problem.ProblemID {
		t.Fatalf("expected problem id %q, got %q", problem.ProblemID, attemptDetail.Attempt.ProblemID)
	}

	var pack domain.ProblemPack
	problemResp := suite.get(t, "/api/problem/"+problem.ProblemID, &pack)
	if problemResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from get problem, got %d", problemResp.StatusCode)
	}
	if strings.TrimSpace(pack.Problem.Title) == "" {
		t.Fatalf("expected stored problem title")
	}
	if len(pack.Tests.Public) == 0 || len(pack.Tests.Hidden) == 0 {
		t.Fatalf("expected stored problem tests")
	}

	var errEnvelope struct {
		Error   string `json:"error"`
		Message string `json:"message"`
	}
	errResp := suite.get(t, "/api/attempt/does-not-exist", &errEnvelope)
	if errResp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 for missing attempt, got %d", errResp.StatusCode)
	}
	if errEnvelope.Error != "not_found" {
		t.Fatalf("expected not_found error code, got %q", errEnvelope.Error)
	}
}

func TestLiveModelCatalog(t *testing.T) {
	suite := newLiveSuite(t)

	var payload []struct {
		ID        string `json:"id"`
		Provider  string `json:"provider"`
		ModelName string `json:"displayName"`
	}

	resp := suite.get(t, "/api/models", &payload)
	if resp.StatusCode == http.StatusNotImplemented {
		t.Skip("llmhub model registry not configured")
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from models endpoint, got %d", resp.StatusCode)
	}
	if len(payload) == 0 {
		t.Fatalf("expected at least one model entry")
	}
	for _, model := range payload {
		if strings.TrimSpace(model.ID) == "" {
			t.Fatalf("expected model id in payload: %+v", model)
		}
		if strings.TrimSpace(model.Provider) == "" {
			t.Fatalf("expected provider in payload: %+v", model)
		}
		if strings.TrimSpace(model.ModelName) == "" {
			t.Fatalf("expected display name in payload: %+v", model)
		}
	}
}

func TestLiveUserProfileLifecycle(t *testing.T) {
	suite := newLiveSuite(t)
	requireAuth(t, suite)

	uniqueHandle := fmt.Sprintf("smoke-%d", time.Now().UnixNano())
	updatePayload := map[string]any{
		"handle":       uniqueHandle,
		"display_name": "Smoke " + uniqueHandle,
		"bio":          "Updated via smoke test",
		"timezone":     "UTC",
		"preferences": map[string]string{
			"editor.theme": "dark",
		},
	}

	var updateResp struct {
		Profile domain.UserProfile `json:"profile"`
	}
	suite.put(t, "/api/user/profile", updatePayload, &updateResp)

	var getResp struct {
		Profile domain.UserProfile `json:"profile"`
	}
	suite.get(t, "/api/user/profile", &getResp)

	if getResp.Profile.Handle != uniqueHandle {
		t.Fatalf("expected handle %s, got %s", uniqueHandle, getResp.Profile.Handle)
	}
	if getResp.Profile.DisplayName == "" {
		t.Fatalf("expected display name to be set")
	}
	if getResp.Profile.Preferences["editor.theme"] != "dark" {
		t.Fatalf("expected preference to persist")
	}
}

func TestLiveSavedProblemsLifecycle(t *testing.T) {
	suite := newLiveSuite(t)
	requireAuth(t, suite)

	problem := generateProblem(t, suite)
	savedTitle := fmt.Sprintf("Smoke Saved %d", time.Now().UnixNano())

	createPayload := map[string]any{
		"problem_id":    problem.ProblemID,
		"title":         savedTitle,
		"language":      "typescript",
		"status":        "in_progress",
		"tags":          []string{"smoke"},
		"notes":         "initial note",
		"hint_unlocked": false,
	}

	var createResp struct {
		SavedProblem domain.SavedProblemSummary `json:"saved_problem"`
	}
	suite.post(t, "/api/user/saved-problems", createPayload, &createResp)

	savedID := strings.TrimSpace(createResp.SavedProblem.ID)
	if savedID == "" {
		t.Fatalf("expected saved problem id in response")
	}

	var listResp struct {
		SavedProblems []domain.SavedProblemSummary `json:"saved_problems"`
	}
	suite.get(t, "/api/user/saved-problems?limit=5", &listResp)
	if len(listResp.SavedProblems) == 0 {
		t.Fatalf("expected saved problems in list response")
	}

	var detailResp struct {
		SavedProblem domain.SavedProblemDetail `json:"saved_problem"`
	}
	suite.get(t, "/api/user/saved-problems/"+savedID, &detailResp)
	if detailResp.SavedProblem.Title != savedTitle {
		t.Fatalf("expected saved problem title %s, got %s", savedTitle, detailResp.SavedProblem.Title)
	}

	updatePayload := map[string]any{
		"status":        "completed",
		"notes":         "updated via smoke test",
		"tags":          []string{"smoke", "updated"},
		"hint_unlocked": true,
	}
	suite.put(t, "/api/user/saved-problems/"+savedID, updatePayload, &createResp)
	if createResp.SavedProblem.Status != domain.SavedProblemStatusCompleted {
		t.Fatalf("expected status completed, got %s", createResp.SavedProblem.Status)
	}

	attemptID := fmt.Sprintf("att_smoke_%d", time.Now().UnixNano())
	attemptPayload := map[string]any{
		"attempt_id": attemptID,
		"code":       "function solution() { return 42; }",
		"status":     "submitted",
		"pass_count": 1,
		"fail_count": 0,
		"runtime_ms": 12,
	}

	var attemptResp struct {
		Attempt domain.SavedAttemptSnapshot `json:"attempt"`
	}
	suite.post(t, "/api/user/saved-problems/"+savedID+"/attempts", attemptPayload, &attemptResp)
	if attemptResp.Attempt.AttemptID != attemptID {
		t.Fatalf("expected attempt id %s, got %s", attemptID, attemptResp.Attempt.AttemptID)
	}

	var attemptsResp struct {
		Attempts []domain.SavedAttemptSnapshot `json:"attempts"`
	}
	suite.get(t, "/api/user/saved-problems/"+savedID+"/attempts", &attemptsResp)
	if len(attemptsResp.Attempts) == 0 {
		t.Fatalf("expected attempt history")
	}

	deleteResp := suite.delete(t, "/api/user/saved-problems/"+savedID)
	if deleteResp.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204 from delete, got %d", deleteResp.StatusCode)
	}
}

func generateProblem(t *testing.T, suite *liveSuite) *struct {
	ProblemID string             `json:"problem_id"`
	Pack      domain.ProblemPack `json:"pack"`
} {
	var payload struct {
		ProblemID string             `json:"problem_id"`
		Pack      domain.ProblemPack `json:"pack"`
	}

	request := map[string]any{
		"category":   "arrays",
		"difficulty": "easy",
	}

	forceMode := strings.TrimSpace(os.Getenv("IMPROVIEW_FORCE_GENERATE_MODE"))
	switch {
	case strings.EqualFold(forceMode, string(app.GeneratorModeLLM)):
		request["mode"] = string(app.GeneratorModeLLM)
	case strings.EqualFold(forceMode, string(app.GeneratorModeStatic)):
		request["mode"] = string(app.GeneratorModeStatic)
	}

	resp := suite.post(t, "/api/generate", request, &payload)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from generate, got %d", resp.StatusCode)
	}

	return &payload
}
