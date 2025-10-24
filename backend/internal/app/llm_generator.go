package app

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"improview/backend/internal/api"
	"improview/backend/internal/domain"
	"improview/backend/internal/jsonfmt"
)

var jsonValueSchema = map[string]any{
	"anyOf": []any{
		map[string]any{"type": "string"},
		map[string]any{"type": "number"},
		map[string]any{"type": "integer"},
		map[string]any{"type": "boolean"},
		map[string]any{"type": "null"},
		map[string]any{
			"type":  "array",
			"items": map[string]any{"$ref": "#/$defs/json_value"},
		},
		map[string]any{
			"type":                 "object",
			"additionalProperties": map[string]any{"$ref": "#/$defs/json_value"},
		},
	},
}

var exampleJSONSchema = map[string]any{
	"type":                 "object",
	"additionalProperties": false,
	"required":             []string{"input", "output", "explanation"},
	"properties": map[string]any{
		"input": map[string]any{
			"type":  "array",
			"items": map[string]any{"$ref": "#/$defs/json_value"},
		},
		"output": map[string]any{
			"$ref": "#/$defs/json_value",
		},
		"explanation": map[string]any{
			"type": "string",
		},
	},
}

var problemPackJSONSchema = map[string]any{
	"type":                 "object",
	"additionalProperties": false,
	"required": []string{
		"problem",
		"api",
		"time_estimate_minutes",
		"hint",
		"solutions",
		"tests",
		"macro_category",
	},
	"properties": map[string]any{
		"problem": map[string]any{
			"type":                 "object",
			"additionalProperties": false,
			"required": []string{
				"title",
				"statement",
				"constraints",
				"examples",
				"edge_cases",
			},
			"properties": map[string]any{
				"title": map[string]any{
					"type": "string",
				},
				"statement": map[string]any{
					"type": "string",
				},
				"constraints": map[string]any{
					"type":  "array",
					"items": map[string]any{"type": "string"},
				},
				"examples": map[string]any{
					"type":  "array",
					"items": exampleJSONSchema,
				},
				"edge_cases": map[string]any{
					"type":  "array",
					"items": map[string]any{"type": "string"},
				},
			},
		},
		"api": map[string]any{
			"type":                 "object",
			"additionalProperties": false,
			"required": []string{
				"function_name",
				"signature",
				"params",
				"returns",
			},
			"properties": map[string]any{
				"function_name": map[string]any{
					"type": "string",
				},
				"signature": map[string]any{
					"type": "string",
				},
				"params": map[string]any{
					"type": "array",
					"items": map[string]any{
						"type":                 "object",
						"additionalProperties": false,
						"required":             []string{"name", "type", "desc"},
						"properties": map[string]any{
							"name": map[string]any{"type": "string"},
							"type": map[string]any{"type": "string"},
							"desc": map[string]any{"type": "string"},
						},
					},
				},
				"returns": map[string]any{
					"type":                 "object",
					"additionalProperties": false,
					"required":             []string{"type", "desc"},
					"properties": map[string]any{
						"type": map[string]any{"type": "string"},
						"desc": map[string]any{"type": "string"},
					},
				},
			},
		},
		"time_estimate_minutes": map[string]any{
			"type":    "integer",
			"minimum": 1,
			"maximum": 120,
		},
		"hint": map[string]any{
			"type": "string",
		},
		"solutions": map[string]any{
			"type": "array",
			"items": map[string]any{
				"type":                 "object",
				"additionalProperties": false,
				"required": []string{
					"approach",
					"complexity",
					"code",
				},
				"properties": map[string]any{
					"approach": map[string]any{"type": "string"},
					"complexity": map[string]any{
						"type":                 "object",
						"additionalProperties": false,
						"required":             []string{"time", "space"},
						"properties": map[string]any{
							"time":  map[string]any{"type": "string"},
							"space": map[string]any{"type": "string"},
						},
					},
					"code": map[string]any{"type": "string"},
				},
			},
		},
		"tests": map[string]any{
			"type":                 "object",
			"additionalProperties": false,
			"required":             []string{"public", "hidden"},
			"properties": map[string]any{
				"public": map[string]any{
					"type":  "array",
					"items": exampleJSONSchema,
				},
				"hidden": map[string]any{
					"type":  "array",
					"items": exampleJSONSchema,
				},
			},
		},
		"macro_category": map[string]any{
			"type": "string",
			"enum": []string{"dsa", "frontend", "system-design"},
		},
		"workspace_template": map[string]any{
			"type":                 "object",
			"additionalProperties": false,
			"required": []string{
				"entry",
				"files",
			},
			"properties": map[string]any{
				"entry": map[string]any{
					"type": "string",
				},
				"files": map[string]any{
					"type": "object",
					"patternProperties": map[string]any{
						"^.+$": map[string]any{"$ref": "#/$defs/workspace_file"},
					},
					"minProperties": 1,
				},
				"dependencies": map[string]any{
					"type": "object",
					"patternProperties": map[string]any{
						"^.+$": map[string]any{"type": "string"},
					},
				},
				"dev_dependencies": map[string]any{
					"type": "object",
					"patternProperties": map[string]any{
						"^.+$": map[string]any{"type": "string"},
					},
				},
				"template": map[string]any{
					"type": "string",
				},
				"environment": map[string]any{
					"type": "string",
				},
			},
		},
	},
	"$defs": map[string]any{
		"json_value": jsonValueSchema,
		"workspace_file": map[string]any{
			"type":                 "object",
			"additionalProperties": false,
			"required": []string{"code"},
			"properties": map[string]any{
				"code": map[string]any{"type": "string"},
				"hidden": map[string]any{"type": "boolean"},
			},
		},
	},
}

func newProblemPackResponseFormat() responseFormat {
	return responseFormat{
		Type: "json_schema",
		JSONSchema: &responseJSONSchema{
			Name:   "problem_pack",
			Strict: true,
			Schema: problemPackJSONSchema,
		},
	}
}

// LLMProblemGenerator talks to an LLM provider to create fresh problem packs.
type LLMProblemGenerator struct {
	client      *http.Client
	baseURL     string
	model       string
	apiKey      string
	temperature float64
	provider    string
}

// NewLLMProblemGenerator constructs an LLM-backed problem generator instance.
func NewLLMProblemGenerator(opts LLMOptions) (*LLMProblemGenerator, error) {
	apiKey := strings.TrimSpace(opts.APIKey)
	if apiKey == "" {
		return nil, errors.New("llm generator: missing API key")
	}

	base := strings.TrimRight(defaultString(opts.BaseURL, defaultLLMBaseURL), "/")
	if base == "" {
		return nil, errors.New("llm generator: missing base URL")
	}

	model := strings.TrimSpace(defaultString(opts.Model, defaultLLMModel))
	if model == "" {
		return nil, errors.New("llm generator: missing model")
	}

	timeout := opts.Timeout
	if timeout <= 0 {
		timeout = defaultLLMTimeout
	}

	temperature := opts.Temperature
	if temperature == 0 {
		temperature = 0.2
	}

	client := opts.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: timeout}
	} else if client.Timeout == 0 {
		client.Timeout = timeout
	}

	return &LLMProblemGenerator{
		client:      client,
		baseURL:     base,
		model:       model,
		apiKey:      apiKey,
		temperature: temperature,
		provider:    strings.TrimSpace(opts.Provider),
	}, nil
}

// Generate issues a request to the LLM and maps the JSON response into a ProblemPack.
func (g *LLMProblemGenerator) Generate(ctx context.Context, req api.GenerateRequest) (domain.ProblemPack, error) {
	if g == nil {
		return domain.ProblemPack{}, api.ErrNotImplemented
	}

	baseURL := g.baseURL
	model := g.model
	provider := g.provider
	if req.LLM != nil {
		if trimmed := strings.TrimSpace(req.LLM.BaseURL); trimmed != "" {
			baseURL = strings.TrimRight(trimmed, "/")
		}
		if trimmed := strings.TrimSpace(req.LLM.Model); trimmed != "" {
			model = trimmed
		}
		if trimmed := strings.TrimSpace(req.LLM.Provider); trimmed != "" {
			provider = trimmed
		}
	}

	category := strings.TrimSpace(req.Category)
	difficulty := strings.TrimSpace(req.Difficulty)
	if category == "" || difficulty == "" {
		return domain.ProblemPack{}, api.ErrBadRequest
	}

	payload := chatCompletionRequest{
		Model:          model,
		ResponseFormat: newProblemPackResponseFormat(),
		Temperature:    g.temperature,
		Messages: []chatMessage{
			{
				Role: "system",
				Content: g.systemPrompt(
					category,
					difficulty,
					req.FrontendFramework,
					req.Styling,
					provider,
				),
			},
			{
				Role: "user",
				Content: g.userPrompt(
					category,
					difficulty,
					req.CustomPrompt,
					req.Provider,
					provider,
					req.FrontendFramework,
					req.Styling,
				),
			},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return domain.ProblemPack{}, fmt.Errorf("llm generator: marshal request: %w", err)
	}

	if baseURL == "" {
		return domain.ProblemPack{}, errors.New("llm generator: missing base URL")
	}

	endpoint := baseURL + "/chat/completions"
	g.logf("POST %s payload=%s", endpoint, jsonfmt.FormatForLog(body, jsonfmt.DefaultLogLimit))
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return domain.ProblemPack{}, fmt.Errorf("llm generator: create request: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+g.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")

	resp, err := g.client.Do(httpReq)
	if err != nil {
		return domain.ProblemPack{}, fmt.Errorf("llm generator: do request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return domain.ProblemPack{}, fmt.Errorf("llm generator: read response: %w", err)
	}

	g.logf("response status=%d body=%s", resp.StatusCode, jsonfmt.FormatForLog(respBody, jsonfmt.DefaultLogLimit))

	if resp.StatusCode >= 400 {
		return domain.ProblemPack{}, g.wrapHTTPError(resp.StatusCode, respBody)
	}

	var completion chatCompletionResponse
	if err := json.Unmarshal(respBody, &completion); err != nil {
		return domain.ProblemPack{}, fmt.Errorf("llm generator: decode response: %w", err)
	}

	content := strings.TrimSpace(completion.Content())
	if content == "" {
		return domain.ProblemPack{}, errors.New("llm generator: empty completion content")
	}

	var pack domain.ProblemPack
	if err := json.Unmarshal([]byte(content), &pack); err != nil {
		return domain.ProblemPack{}, fmt.Errorf("llm generator: parse problem pack: %w", err)
	}

	return pack, nil
}

func (g *LLMProblemGenerator) systemPrompt(category, difficulty, framework, styling, provider string) string {
	var providerLine string
	if provider != "" {
		providerLine = fmt.Sprintf("Provider: %s\n", provider)
	}

	framework = strings.TrimSpace(framework)
	styling = strings.TrimSpace(styling)

	var workspaceGuidance strings.Builder
	workspaceGuidance.WriteString("- workspace_template: include an entry file path and a dictionary of starter files (each item specifying a code string).\n")
	if framework != "" {
		workspaceGuidance.WriteString(fmt.Sprintf("- Honor the requested frontend framework \"%s\" when preparing starter files.\n", framework))
	} else {
		workspaceGuidance.WriteString("- For non-frontend categories, provide a minimal starter implementation aligned with the function signature.\n")
	}
	if styling != "" {
		workspaceGuidance.WriteString(fmt.Sprintf("- Apply the styling preference \"%s\" where appropriate (e.g., Tailwind setup vs. vanilla CSS).\n", styling))
	}
	workspaceGuidance.WriteString("- Limit total starter files to 10 and ensure the entry file exists in the files map.\n")

	return fmt.Sprintf(`You are Improview’s problem generator. Return ONLY JSON matching the schema.
%sConstraints:
- Category: %s
- Difficulty: %s (easy|medium|hard)
- Language: JavaScript (ES2022) for reference solutions and tests.
Provide:
- problem: title, statement (markdown), constraints, examples (I/O), edge_cases
- api: function_name, signature, params (name,type,desc), returns(type,desc)
- time_estimate_minutes: integer in [10,120]
- hint: short, actionable
- tests: public[] and hidden[] with deterministic inputs and expected outputs
- solutions: 1-2 idiomatic approaches with Big-O
- macro_category: set to "dsa", "frontend", or "system-design" based on the category type
%sRules:
- Keep tests minimal but comprehensive; avoid randomness.
- No external libs; pure functions only.
- Ensure tests align with the signature exactly.
- Prefer BFS/DFS/Two-Pointers/etc as per category.
- For macro_category: use "dsa" for algorithms/data structures, "frontend" for UI/web development, "system-design" for architecture/scalability.
- Apply workspace_template so the sandbox reflects the requested framework and styling when the macro category is "frontend".`, providerLine, category, difficulty, workspaceGuidance.String())
}

func (g *LLMProblemGenerator) userPrompt(category, difficulty, customPrompt, providerOverride, defaultProvider, framework, styling string) string {
	lines := []string{
		fmt.Sprintf("Generate a fresh problem pack for category \"%s\" at \"%s\" difficulty.", category, difficulty),
	}

	provider := strings.TrimSpace(providerOverride)
	if provider == "" {
		provider = defaultProvider
	}
	if provider != "" {
		lines = append(lines, fmt.Sprintf("If you must reference a provider, assume %s.", provider))
	}

	if trimmed := strings.TrimSpace(framework); trimmed != "" {
		lines = append(lines, fmt.Sprintf("Frontend framework preference: %s.", trimmed))
	}

	if trimmed := strings.TrimSpace(styling); trimmed != "" {
		lines = append(lines, fmt.Sprintf("Styling preference: %s.", trimmed))
	}

	if extra := strings.TrimSpace(customPrompt); extra != "" {
		lines = append(lines, "Additional guidance: "+extra)
	}

	lines = append(lines, "Respond with JSON only — no explanations outside the JSON envelope.")
	return strings.Join(lines, "\n\n")
}

func (g *LLMProblemGenerator) wrapHTTPError(status int, body []byte) error {
	var apiErr openAIError
	if err := json.Unmarshal(body, &apiErr); err == nil && apiErr.Error.Message != "" {
		return fmt.Errorf("llm generator: upstream %d %s: %s", status, apiErr.Error.Type, apiErr.Error.Message)
	}
	snippet := string(body)
	if len(snippet) > 256 {
		snippet = snippet[:256]
	}
	return fmt.Errorf("llm generator: upstream returned %d: %s", status, snippet)
}

func (g *LLMProblemGenerator) logf(format string, args ...any) {
	if !llmDebugEnabled() {
		return
	}
	log.Printf("llm generator: "+format, args...)
}

func llmDebugEnabled() bool {
	return strings.TrimSpace(os.Getenv("CI_SMOKE_DEBUG")) != ""
}

type responseJSONSchema struct {
	Name   string         `json:"name"`
	Strict bool           `json:"strict"`
	Schema map[string]any `json:"schema"`
}

type responseFormat struct {
	Type       string              `json:"type"`
	JSONSchema *responseJSONSchema `json:"json_schema,omitempty"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatCompletionRequest struct {
	Model          string         `json:"model"`
	Messages       []chatMessage  `json:"messages"`
	ResponseFormat responseFormat `json:"response_format"`
	Temperature    float64        `json:"temperature,omitempty"`
}

type chatCompletionResponse struct {
	Choices []struct {
		Message openAIMessage `json:"message"`
	} `json:"choices"`
}

func (r chatCompletionResponse) Content() string {
	if len(r.Choices) == 0 {
		return ""
	}
	return r.Choices[0].Message.Content
}

type openAIMessage struct {
	Content string
}

type contentArrayElement struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

func (m *openAIMessage) UnmarshalJSON(data []byte) error {
	var envelope struct {
		Content json.RawMessage `json:"content"`
	}
	if err := json.Unmarshal(data, &envelope); err != nil {
		return err
	}
	if len(envelope.Content) == 0 {
		m.Content = ""
		return nil
	}
	if envelope.Content[0] == '"' {
		var text string
		if err := json.Unmarshal(envelope.Content, &text); err != nil {
			return err
		}
		m.Content = text
		return nil
	}
	var parts []contentArrayElement
	if err := json.Unmarshal(envelope.Content, &parts); err == nil {
		var builder strings.Builder
		for _, part := range parts {
			if strings.EqualFold(part.Type, "text") {
				builder.WriteString(part.Text)
			}
		}
		m.Content = builder.String()
		return nil
	}
	// Fallback: keep raw JSON to aid debugging
	m.Content = string(envelope.Content)
	return nil
}

type openAIError struct {
	Error struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error"`
}
