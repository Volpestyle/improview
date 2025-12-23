package app

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"

	"improview/backend/internal/api"

	llmhub "github.com/Volpestyle/llmhub/packages/go"
)

const samplePackJSON = `{
	"problem": {
		"title": "Graph Traversal",
		"statement": "Traverse the graph.",
		"constraints": ["1 <= n <= 10"],
		"examples": [{"input": [[1]], "output": [1], "explanation": "single node"}],
		"edge_cases": ["single node"]
	},
	"api": {
		"function_name": "solve",
		"signature": "function solve(nodes)",
		"params": [{"name": "nodes", "type": "number[][]", "desc": "graph"}],
		"returns": {"type": "number[]", "desc": "order"}
	},
	"time_estimate_minutes": 30,
	"hint": "Use BFS.",
	"solutions": [{
		"approach": "BFS",
		"complexity": {"time": "O(n)", "space": "O(n)"},
		"code": "function solve(nodes) { return []; }"
	}],
	"reference_solutions": [{
		"kind": "baseline",
		"language": "javascript",
		"code": "function solve(nodes) { return []; }"
	}],
	"tests": {
		"public": [{"input": [[1,2]], "output": [1,2]}],
		"hidden": [{"input": [[2,3]], "output": [2,3]}]
	},
	"macro_category": "dsa"
}`

type fakeHub struct {
	output llmhub.GenerateOutput
	err    error
	inputs []llmhub.GenerateInput
}

func (f *fakeHub) Generate(_ context.Context, in llmhub.GenerateInput) (llmhub.GenerateOutput, error) {
	f.inputs = append(f.inputs, in)
	if f.err != nil {
		return llmhub.GenerateOutput{}, f.err
	}
	return f.output, nil
}

func TestLLMProblemGeneratorGenerate(t *testing.T) {
	generator, stub := newTestGenerator(t, nil)
	stub.output = llmhub.GenerateOutput{Text: samplePackJSON}

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
	if pack.Problem.Title != "Graph Traversal" {
		t.Fatalf("expected problem title, got %q", pack.Problem.Title)
	}
	if len(stub.inputs) != 1 {
		t.Fatalf("expected single llmhub invocation, got %d", len(stub.inputs))
	}

	input := stub.inputs[0]
	if input.Provider != llmhub.ProviderOpenAI {
		t.Fatalf("expected provider openai, got %s", input.Provider)
	}
	if input.Model != "gpt-test" {
		t.Fatalf("expected model gpt-test, got %s", input.Model)
	}
	system := input.Messages[0].Content[0].Text
	if !strings.Contains(system, "Category: graphs") {
		t.Fatalf("system prompt missing category: %s", system)
	}
	if !strings.Contains(system, "Provider: OpenAI Sandbox") {
		t.Fatalf("system prompt missing provider label: %s", system)
	}
	user := input.Messages[1].Content[0].Text
	if !strings.Contains(user, "Local Provider") {
		t.Fatalf("user prompt missing override provider: %s", user)
	}
	if !strings.Contains(user, "Additional guidance") {
		t.Fatalf("user prompt missing custom guidance: %s", user)
	}
}

func TestLLMProblemGeneratorSupportsAdditionalProviders(t *testing.T) {
	generator, stub := newTestGenerator(t, func(opts *LLMOptions) {
		opts.AdditionalProviders = map[string]LLMProviderOptions{
			"anthropic": {
				APIKey:   "anthropic-key",
				BaseURL:  "https://api.anthropic.com/v1",
				Model:    "claude-default",
				Provider: "Anthropic Claude",
			},
		}
	})
	stub.output = llmhub.GenerateOutput{Text: samplePackJSON}

	req := api.GenerateRequest{
		Category:   "dp",
		Difficulty: "hard",
		LLM: &api.LLMRequestOptions{
			Provider: "anthropic",
			Model:    "claude-3",
		},
	}
	if _, err := generator.Generate(context.Background(), req); err != nil {
		t.Fatalf("generate with anthropic: %v", err)
	}
	input := stub.inputs[0]
	if input.Provider != llmhub.ProviderAnthropic {
		t.Fatalf("expected anthropic provider, got %s", input.Provider)
	}
	if input.Model != "claude-3" {
		t.Fatalf("expected override model claude-3, got %s", input.Model)
	}
}

func TestLLMProblemGeneratorHonoursRequestOverrides(t *testing.T) {
	generator, stub := newTestGenerator(t, nil)
	stub.output = llmhub.GenerateOutput{Text: samplePackJSON}

	var captured llmhub.Config
	overrideHub := &fakeHub{output: llmhub.GenerateOutput{Text: samplePackJSON}}
	generator.hubFactory = func(cfg llmhub.Config) (llmHubClient, error) {
		captured = cfg
		return overrideHub, nil
	}

	req := api.GenerateRequest{
		Category:   "arrays",
		Difficulty: "easy",
		LLM: &api.LLMRequestOptions{
			BaseURL:  "http://override.local/v1/",
			Model:    "gpt-override",
			Provider: "Override Provider",
		},
	}
	if _, err := generator.Generate(context.Background(), req); err != nil {
		t.Fatalf("generate with overrides: %v", err)
	}
	if captured.OpenAI == nil || captured.OpenAI.BaseURL != "http://override.local" {
		t.Fatalf("expected override base url, got %#v", captured.OpenAI)
	}
	overrideInput := overrideHub.inputs[0]
	system := overrideInput.Messages[0].Content[0].Text
	if !strings.Contains(system, "Provider: Override Provider") {
		t.Fatalf("system prompt missing override label: %s", system)
	}
	if overrideInput.Model != "gpt-override" {
		t.Fatalf("expected override model, got %s", overrideInput.Model)
	}
}

func TestLLMProblemGeneratorValidatesInput(t *testing.T) {
	generator, _ := newTestGenerator(t, nil)
	_, err := generator.Generate(context.Background(), api.GenerateRequest{})
	if !errors.Is(err, api.ErrBadRequest) {
		t.Fatalf("expected ErrBadRequest, got %v", err)
	}
}

func TestLLMProblemGeneratorErrorsOnEmptyResponse(t *testing.T) {
	generator, stub := newTestGenerator(t, nil)
	stub.output = llmhub.GenerateOutput{Text: ""}

	req := api.GenerateRequest{Category: "graphs", Difficulty: "easy"}
	if _, err := generator.Generate(context.Background(), req); err == nil || !strings.Contains(err.Error(), "empty response") {
		t.Fatalf("expected empty response error, got %v", err)
	}
}

func newTestGenerator(t *testing.T, mutate func(*LLMOptions)) (*LLMProblemGenerator, *fakeHub) {
	t.Helper()
	opts := LLMOptions{
		APIKey:     "test-key",
		BaseURL:    "https://api.openai.com/v1",
		Model:      "gpt-test",
		Provider:   "OpenAI Sandbox",
		Timeout:    defaultLLMTimeout,
		HTTPClient: &http.Client{Timeout: defaultLLMTimeout},
	}
	if mutate != nil {
		mutate(&opts)
	}
	gen, err := NewLLMProblemGenerator(opts)
	if err != nil {
		t.Fatalf("create llm generator: %v", err)
	}
	stub := &fakeHub{}
	gen.hub = stub
	return gen, stub
}
