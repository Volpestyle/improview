package app

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"improview/backend/internal/api"
	"improview/backend/internal/domain"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestLLMProblemGeneratorGenerate(t *testing.T) {
	samplePack := domain.ProblemPack{
		Problem: domain.ProblemMetadata{
			Title:     "Graph Traversal",
			Statement: "Traverse the graph using BFS.",
			Constraints: []string{
				"1 <= n <= 100",
				"Edges are directed",
			},
			Examples: []domain.Example{
				{Input: []any{[][]int{{1, 2}, {3}}}, Output: []int{0, 1, 2}},
			},
			EdgeCases: []string{"Single node graph"},
		},
		API: domain.APISignature{
			FunctionName: "traverseGraph",
			Signature:    "function traverseGraph(adjList)",
			Params: []domain.APIParam{
				{Name: "adjList", Type: "number[][]", Desc: "Adjacency list"},
			},
			Returns: domain.APIParamReturn{Type: "number[]", Desc: "Traversal order"},
		},
		TimeEstimateMins: 30,
		Hint:             "Use a queue to explore neighbors layer by layer.",
		Solutions: []domain.SolutionOutline{
			{
				Approach:   "Breadth-first search",
				Complexity: domain.Complexity{Time: "O(n+m)", Space: "O(n)"},
				Code:       "function traverseGraph(adjList) { /* ... */ }",
			},
		},
		Tests: domain.TestSuite{
			Public: []domain.Example{{Input: []any{[][]int{{1}, {2}, {}}}, Output: []int{0, 1, 2}}},
			Hidden: []domain.Example{{Input: []any{[][]int{{1, 2}, {}, {}}}, Output: []int{0, 1, 2}}},
		},
	}

	sampleJSON, err := json.Marshal(samplePack)
	if err != nil {
		t.Fatalf("marshal sample pack: %v", err)
	}

	var capturedAuth string
	var capturedRequest chatCompletionRequest

	client := &http.Client{
		Timeout: 2 * time.Second,
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			capturedAuth = req.Header.Get("Authorization")

			body, readErr := io.ReadAll(req.Body)
			if readErr != nil {
				t.Fatalf("read request body: %v", readErr)
			}
			defer req.Body.Close()

			if err := json.Unmarshal(body, &capturedRequest); err != nil {
				t.Fatalf("decode request body: %v", err)
			}

			resp := chatCompletionResponse{
				Choices: []struct {
					Message openAIMessage `json:"message"`
				}{
					{Message: openAIMessage{Content: string(sampleJSON)}},
				},
			}

			respBytes, marshalErr := json.Marshal(resp)
			if marshalErr != nil {
				t.Fatalf("encode response: %v", marshalErr)
			}

			return &http.Response{
				StatusCode: http.StatusOK,
				Header:     http.Header{"Content-Type": []string{"application/json"}},
				Body:       io.NopCloser(bytes.NewReader(respBytes)),
			}, nil
		}),
	}

	generator, err := NewLLMProblemGenerator(LLMOptions{
		APIKey:      "test-key",
		BaseURL:     "http://llm.local",
		Model:       "gpt-test",
		Provider:    "OpenAI Sandbox",
		Temperature: 0.4,
		Timeout:     2 * time.Second,
		HTTPClient:  client,
	})
	if err != nil {
		t.Fatalf("create llm generator: %v", err)
	}

	req := api.GenerateRequest{
		Category:     "graphs",
		Difficulty:   "medium",
		CustomPrompt: "Focus on connected components.",
		Provider:     "Local Provider",
	}
	pack, err := generator.Generate(context.Background(), req)
	if err != nil {
		t.Fatalf("generate problem pack: %v", err)
	}

	if capturedAuth != "Bearer test-key" {
		t.Fatalf("expected bearer auth header, got %q", capturedAuth)
	}

	if capturedRequest.Model != "gpt-test" {
		t.Fatalf("expected model gpt-test, got %s", capturedRequest.Model)
	}
	if capturedRequest.ResponseFormat.Type != "json_object" {
		t.Fatalf("expected response_format json_object, got %s", capturedRequest.ResponseFormat.Type)
	}
	if len(capturedRequest.Messages) != 2 {
		t.Fatalf("expected two messages, got %d", len(capturedRequest.Messages))
	}

	systemMsg := capturedRequest.Messages[0]
	userMsg := capturedRequest.Messages[1]

	if systemMsg.Role != "system" {
		t.Fatalf("expected system role, got %s", systemMsg.Role)
	}
	if !strings.Contains(systemMsg.Content, "Category: graphs") {
		t.Fatalf("system prompt missing category: %s", systemMsg.Content)
	}
	if !strings.Contains(systemMsg.Content, "Provider: OpenAI Sandbox") {
		t.Fatalf("system prompt missing provider label: %s", systemMsg.Content)
	}

	if userMsg.Role != "user" {
		t.Fatalf("expected user role, got %s", userMsg.Role)
	}
	if !strings.Contains(userMsg.Content, "Local Provider") {
		t.Fatalf("user prompt missing provider override: %s", userMsg.Content)
	}
	if !strings.Contains(userMsg.Content, "Additional guidance") {
		t.Fatalf("user prompt missing custom guidance: %s", userMsg.Content)
	}

	if pack.Problem.Title != samplePack.Problem.Title {
		t.Fatalf("expected problem title %q, got %q", samplePack.Problem.Title, pack.Problem.Title)
	}
	if len(pack.Tests.Public) != len(samplePack.Tests.Public) {
		t.Fatalf("expected %d public tests, got %d", len(samplePack.Tests.Public), len(pack.Tests.Public))
	}
	if pack.Hint != samplePack.Hint {
		t.Fatalf("expected hint %q, got %q", samplePack.Hint, pack.Hint)
	}
}

func TestLLMProblemGeneratorHonoursRequestOverrides(t *testing.T) {
	type captured struct {
		url     string
		request chatCompletionRequest
	}

	var capture captured

	samplePack := domain.ProblemPack{
		Problem: domain.ProblemMetadata{Title: "Override Pack"},
	}
	sampleJSON, err := json.Marshal(samplePack)
	if err != nil {
		t.Fatalf("marshal sample pack: %v", err)
	}

	client := &http.Client{
		Timeout: 2 * time.Second,
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			capture.url = req.URL.String()

			body, readErr := io.ReadAll(req.Body)
			if readErr != nil {
				t.Fatalf("read request body: %v", readErr)
			}
			defer req.Body.Close()

			if err := json.Unmarshal(body, &capture.request); err != nil {
				t.Fatalf("decode request body: %v", err)
			}

			respBytes, marshalErr := json.Marshal(chatCompletionResponse{
				Choices: []struct {
					Message openAIMessage `json:"message"`
				}{
					{Message: openAIMessage{Content: string(sampleJSON)}},
				},
			})
			if marshalErr != nil {
				t.Fatalf("encode response: %v", marshalErr)
			}

			return &http.Response{
				StatusCode: http.StatusOK,
				Header:     http.Header{"Content-Type": []string{"application/json"}},
				Body:       io.NopCloser(bytes.NewReader(respBytes)),
			}, nil
		}),
	}

	generator, err := NewLLMProblemGenerator(LLMOptions{
		APIKey:     "test-key",
		BaseURL:    "http://llm.local",
		Model:      "gpt-test",
		Provider:   "Default Provider",
		HTTPClient: client,
	})
	if err != nil {
		t.Fatalf("create llm generator: %v", err)
	}

	req := api.GenerateRequest{
		Category:   "graphs",
		Difficulty: "medium",
		Mode:       "llm",
		LLM: &api.LLMRequestOptions{
			BaseURL:  "http://override.local/v1/",
			Model:    "gpt-override",
			Provider: "Override Provider",
		},
	}

	if _, err := generator.Generate(context.Background(), req); err != nil {
		t.Fatalf("generate with overrides: %v", err)
	}

	if capture.url != "http://override.local/v1/chat/completions" {
		t.Fatalf("expected override base URL, got %s", capture.url)
	}
	if capture.request.Model != "gpt-override" {
		t.Fatalf("expected override model, got %s", capture.request.Model)
	}
	if len(capture.request.Messages) == 0 || !strings.Contains(capture.request.Messages[0].Content, "Provider: Override Provider") {
		t.Fatalf("expected override provider in system prompt, got %#v", capture.request.Messages)
	}
}

func TestLLMProblemGeneratorHandlesUpstreamErrors(t *testing.T) {
	errorPayload := []byte(`{"error":{"type":"insufficient_quota","message":"You have used your credit allowance."}}`)

	client := &http.Client{
		Timeout: time.Second,
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusTooManyRequests,
				Header:     http.Header{"Content-Type": []string{"application/json"}},
				Body:       io.NopCloser(bytes.NewReader(errorPayload)),
			}, nil
		}),
	}

	generator, err := NewLLMProblemGenerator(LLMOptions{
		APIKey:     "test-key",
		BaseURL:    "http://llm.local",
		Model:      "gpt-test",
		HTTPClient: client,
	})
	if err != nil {
		t.Fatalf("create llm generator: %v", err)
	}

	_, err = generator.Generate(context.Background(), api.GenerateRequest{Category: "graphs", Difficulty: "medium"})
	if err == nil {
		t.Fatalf("expected error from upstream failure")
	}
	if !strings.Contains(err.Error(), "insufficient_quota") {
		t.Fatalf("expected quota message in error, got %v", err)
	}
}

func TestLLMProblemGeneratorValidatesRequest(t *testing.T) {
	client := &http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			t.Fatalf("unexpected HTTP call")
			return nil, nil
		}),
	}

	generator, err := NewLLMProblemGenerator(LLMOptions{
		APIKey:     "test-key",
		BaseURL:    "http://llm.local",
		Model:      "gpt-test",
		HTTPClient: client,
	})
	if err != nil {
		t.Fatalf("create llm generator: %v", err)
	}

	_, err = generator.Generate(context.Background(), api.GenerateRequest{Category: "", Difficulty: "medium"})
	if err == nil || !strings.Contains(err.Error(), api.ErrBadRequest.Error()) {
		t.Fatalf("expected bad request error for missing category, got %v", err)
	}
}
