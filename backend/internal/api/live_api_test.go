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

	var payload struct {
		ProblemID string `json:"problem_id"`
		Pack      struct {
			Problem struct {
				Title string `json:"title"`
			} `json:"problem"`
		} `json:"pack"`
	}

	resp := suite.post(t, "/api/generate", map[string]string{
		"category":   "arrays",
		"difficulty": "easy",
	}, &payload)

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from generate, got %d", resp.StatusCode)
	}

	if strings.TrimSpace(payload.ProblemID) == "" {
		t.Fatalf("expected problem_id in response")
	}

	if strings.TrimSpace(payload.Pack.Problem.Title) == "" {
		t.Fatalf("expected problem title in pack")
	}
}

func TestLiveCreateAttempt(t *testing.T) {
	suite := newLiveSuite(t)

	var payload struct {
		Attempt struct {
			ID string `json:"id"`
		} `json:"attempt"`
	}

	resp := suite.post(t, "/api/attempt", map[string]string{
		"problem_id": "prob-live-test",
		"lang":       "python",
	}, &payload)

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from attempt creation, got %d", resp.StatusCode)
	}

	if strings.TrimSpace(payload.Attempt.ID) == "" {
		t.Fatalf("expected attempt id in response")
	}
}
