package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"improview/backend/internal/domain"
)

type liveSuite struct {
	baseURL string
	client  *http.Client
}

func newLiveSuite(t *testing.T) *liveSuite {
	t.Helper()

	base := os.Getenv("IMPROVIEW_LIVE_BASE_URL")
	if base == "" {
		t.Skip("set IMPROVIEW_LIVE_BASE_URL to run live API integration tests")
	}

	base = strings.TrimRight(base, "/")

	return &liveSuite{
		baseURL: base,
		client:  &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *liveSuite) get(t *testing.T, path string, target any) *http.Response {
	t.Helper()

	req, err := http.NewRequest(http.MethodGet, s.baseURL+path, nil)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}

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

	resp, err := s.client.Do(req)
	if err != nil {
		t.Fatalf("perform POST %s: %v", path, err)
	}

	decodeBody(t, resp, target)
	return resp
}

func decodeBody(t *testing.T, resp *http.Response, target any) {
	t.Helper()

	defer resp.Body.Close()
	if target == nil {
		return
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
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
}

func TestLiveAttemptLifecycle(t *testing.T) {
	suite := newLiveSuite(t)

	problem := generateProblem(t, suite)

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
		"code":       "function solution(){ return 42; }",
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
		"code":       "function solution(){ return 42; }",
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

func generateProblem(t *testing.T, suite *liveSuite) *struct {
	ProblemID string             `json:"problem_id"`
	Pack      domain.ProblemPack `json:"pack"`
} {
	var payload struct {
		ProblemID string             `json:"problem_id"`
		Pack      domain.ProblemPack `json:"pack"`
	}

	resp := suite.post(t, "/api/generate", map[string]string{
		"category":   "arrays",
		"difficulty": "easy",
	}, &payload)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from generate, got %d", resp.StatusCode)
	}

	return &payload
}
