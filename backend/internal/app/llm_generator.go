package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"improview/backend/internal/api"
	"improview/backend/internal/domain"

	llmhub "github.com/Volpestyle/llmhub/packages/go"
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
			"required":             []string{"code"},
			"properties": map[string]any{
				"code":   map[string]any{"type": "string"},
				"hidden": map[string]any{"type": "boolean"},
			},
		},
	},
}

func newProblemPackResponseFormat() *llmhub.ResponseFormat {
	return &llmhub.ResponseFormat{
		Type: "json_schema",
		JsonSchema: &llmhub.JsonSchemaFormat{
			Name:   "problem_pack",
			Schema: problemPackJSONSchema,
			Strict: true,
		},
	}
}

type providerSettings struct {
	provider     llmhub.Provider
	label        string
	defaultModel string
}

type llmHubClient interface {
	Generate(ctx context.Context, in llmhub.GenerateInput) (llmhub.GenerateOutput, error)
}

type hubFactory func(cfg llmhub.Config) (llmHubClient, error)

const defaultAnthropicAPIVersion = "2023-06-01"

// LLMProblemGenerator talks to llmhub to create fresh problem packs.
type LLMProblemGenerator struct {
	hub         llmHubClient
	baseHub     *llmhub.Hub
	hubConfig   llmhub.Config
	hubFactory  hubFactory
	temperature float64
	defaultProv llmhub.Provider
	providers   map[llmhub.Provider]providerSettings
}

// NewLLMProblemGenerator constructs an LLM-backed problem generator instance.
func NewLLMProblemGenerator(opts LLMOptions) (*LLMProblemGenerator, error) {
	keys := normalizeAPIKeys(opts.APIKey, opts.APIKeys)
	if len(keys) == 0 {
		return nil, errors.New("llm generator: missing API key")
	}
	apiKey := keys[0]

	base := normalizeProviderBase(defaultString(opts.BaseURL, defaultLLMBaseURL), "/v1")
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

	hubCfg := llmhub.Config{
		HTTPClient: client,
		OpenAI: &llmhub.OpenAIConfig{
			APIKey:              apiKey,
			APIKeys:             keys,
			BaseURL:             base,
			DefaultUseResponses: true,
		},
	}

	providers := map[llmhub.Provider]providerSettings{
		llmhub.ProviderOpenAI: {
			provider:     llmhub.ProviderOpenAI,
			label:        defaultString(opts.Provider, "OpenAI"),
			defaultModel: model,
		},
	}

	for rawKey, cfg := range opts.AdditionalProviders {
		providerKey := canonicalProviderKey(rawKey)
		if providerKey == "" {
			continue
		}
		providerKeys := normalizeAPIKeys(cfg.APIKey, cfg.APIKeys)
		if len(providerKeys) == 0 {
			continue
		}
		providerAPIKey := providerKeys[0]
		baseURL := normalizeProviderBase(
			defaultString(cfg.BaseURL, defaultBaseURLForProvider(providerKey)),
			versionSuffixesForProvider(providerKey)...,
		)
		if baseURL == "" {
			continue
		}
		providerModel := strings.TrimSpace(cfg.Model)
		label := defaultString(cfg.Provider, defaultLabelForProvider(providerKey))

		switch providerKey {
		case llmhub.ProviderAnthropic:
			hubCfg.Anthropic = &llmhub.AnthropicConfig{
				APIKey:  providerAPIKey,
				APIKeys: providerKeys,
				BaseURL: baseURL,
				Version: defaultAnthropicAPIVersion,
			}
		case llmhub.ProviderXAI:
			hubCfg.XAI = &llmhub.XAIConfig{
				APIKey:  providerAPIKey,
				APIKeys: providerKeys,
				BaseURL: baseURL,
			}
		case llmhub.ProviderGoogle:
			hubCfg.Google = &llmhub.GoogleConfig{
				APIKey:  providerAPIKey,
				APIKeys: providerKeys,
				BaseURL: baseURL,
			}
		}

		providers[providerKey] = providerSettings{
			provider:     providerKey,
			label:        label,
			defaultModel: providerModel,
		}
	}

	hub, err := llmhub.New(hubCfg)
	if err != nil {
		return nil, fmt.Errorf("llm generator: configure hub: %w", err)
	}

	return &LLMProblemGenerator{
		hub:         hub,
		baseHub:     hub,
		hubConfig:   hubCfg,
		hubFactory:  defaultHubFactory,
		temperature: temperature,
		defaultProv: llmhub.ProviderOpenAI,
		providers:   providers,
	}, nil
}

func defaultHubFactory(cfg llmhub.Config) (llmHubClient, error) {
	return llmhub.New(cfg)
}

// Hub exposes the underlying llmhub instance so other services can reuse it.
func (g *LLMProblemGenerator) Hub() *llmhub.Hub {
	return g.baseHub
}

// Generate issues a request to llmhub and maps the JSON response into a ProblemPack.
func (g *LLMProblemGenerator) Generate(ctx context.Context, req api.GenerateRequest) (domain.ProblemPack, error) {
	if g == nil {
		return domain.ProblemPack{}, api.ErrNotImplemented
	}

	category := strings.TrimSpace(req.Category)
	difficulty := strings.TrimSpace(req.Difficulty)
	if category == "" || difficulty == "" {
		return domain.ProblemPack{}, api.ErrBadRequest
	}

	providerKey, labelOverride := g.selectProvider(req)
	settings, err := g.providerSettings(providerKey)
	if err != nil {
		return domain.ProblemPack{}, err
	}

	label := settings.label
	if labelOverride != "" {
		label = labelOverride
	}

	model := settings.defaultModel
	if req.LLM != nil {
		if trimmed := strings.TrimSpace(req.LLM.Model); trimmed != "" {
			model = trimmed
		}
	}
	if model == "" {
		return domain.ProblemPack{}, errors.New("llm generator: missing model")
	}

	input := llmhub.GenerateInput{
		Provider: providerKey,
		Model:    model,
		Messages: []llmhub.Message{
			{
				Role:    "system",
				Content: []llmhub.ContentPart{{Type: "text", Text: g.systemPrompt(category, difficulty, req.FrontendFramework, req.Styling, label)}},
			},
			{
				Role:    "user",
				Content: []llmhub.ContentPart{{Type: "text", Text: g.userPrompt(category, difficulty, req.CustomPrompt, req.Provider, label, req.FrontendFramework, req.Styling)}},
			},
		},
		ResponseFormat: newProblemPackResponseFormat(),
	}
	temp := g.temperature
	input.Temperature = &temp

	hubClient := g.hub
	if req.LLM != nil {
		if override := strings.TrimSpace(req.LLM.BaseURL); override != "" {
			overrideHub, err := g.buildHubWithOverride(providerKey, override)
			if err != nil {
				return domain.ProblemPack{}, err
			}
			hubClient = overrideHub
		}
	}

	g.logf("provider=%s model=%s framework=%s", providerKey, model, req.FrontendFramework)
	output, err := hubClient.Generate(ctx, input)
	if err != nil {
		return domain.ProblemPack{}, err
	}

	content := strings.TrimSpace(output.Text)
	if content == "" {
		return domain.ProblemPack{}, errors.New("llm generator: empty response")
	}

	var pack domain.ProblemPack
	if err := json.Unmarshal([]byte(content), &pack); err != nil {
		return domain.ProblemPack{}, fmt.Errorf("llm generator: parse problem pack: %w", err)
	}

	return pack, nil
}

func (g *LLMProblemGenerator) selectProvider(req api.GenerateRequest) (llmhub.Provider, string) {
	if req.LLM == nil {
		return g.defaultProv, ""
	}
	override := strings.TrimSpace(req.LLM.Provider)
	if override == "" {
		return g.defaultProv, ""
	}
	if selected := canonicalProviderKey(override); selected != "" {
		return selected, override
	}
	return g.defaultProv, override
}

func (g *LLMProblemGenerator) providerSettings(provider llmhub.Provider) (providerSettings, error) {
	settings, ok := g.providers[provider]
	if !ok {
		return providerSettings{}, fmt.Errorf("llm generator: provider %s not configured", provider)
	}
	return settings, nil
}

func (g *LLMProblemGenerator) buildHubWithOverride(provider llmhub.Provider, baseURL string) (llmHubClient, error) {
	if g.hubFactory == nil {
		return nil, errors.New("llm generator: hub factory unavailable")
	}
	cfg := cloneHubConfig(g.hubConfig)
	normalized := normalizeProviderBase(baseURL, versionSuffixesForProvider(provider)...)
	if normalized == "" {
		return nil, errors.New("llm generator: missing override base URL")
	}

	switch provider {
	case llmhub.ProviderOpenAI:
		if cfg.OpenAI == nil {
			return nil, errors.New("llm generator: openai not configured")
		}
		cfg.OpenAI.BaseURL = normalized
	case llmhub.ProviderAnthropic:
		if cfg.Anthropic == nil {
			return nil, errors.New("llm generator: anthropic not configured")
		}
		cfg.Anthropic.BaseURL = normalized
	case llmhub.ProviderXAI:
		if cfg.XAI == nil {
			return nil, errors.New("llm generator: grok not configured")
		}
		cfg.XAI.BaseURL = normalized
	case llmhub.ProviderGoogle:
		if cfg.Google == nil {
			return nil, errors.New("llm generator: google not configured")
		}
		cfg.Google.BaseURL = normalized
	default:
		return nil, fmt.Errorf("llm generator: provider %s does not support overrides", provider)
	}

	return g.hubFactory(cfg)
}

func canonicalProviderKey(value string) llmhub.Provider {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "openai":
		return llmhub.ProviderOpenAI
	case "anthropic", "claude", "claude-3", "claude-3.5":
		return llmhub.ProviderAnthropic
	case "grok", "xai":
		return llmhub.ProviderXAI
	case "google", "gemini":
		return llmhub.ProviderGoogle
	default:
		return ""
	}
}

func defaultBaseURLForProvider(provider llmhub.Provider) string {
	switch provider {
	case llmhub.ProviderAnthropic:
		return defaultAnthropicBaseURL
	case llmhub.ProviderXAI:
		return defaultGrokBaseURL
	case llmhub.ProviderGoogle:
		return defaultGoogleBaseURL
	default:
		return defaultLLMBaseURL
	}
}

func defaultLabelForProvider(provider llmhub.Provider) string {
	switch provider {
	case llmhub.ProviderAnthropic:
		return "Anthropic Claude"
	case llmhub.ProviderXAI:
		return "Grok"
	case llmhub.ProviderGoogle:
		return "Google Gemini"
	default:
		return "OpenAI"
	}
}

func versionSuffixesForProvider(provider llmhub.Provider) []string {
	switch provider {
	case llmhub.ProviderGoogle:
		return []string{"/v1beta", "/v1"}
	default:
		return []string{"/v1"}
	}
}

func normalizeProviderBase(base string, suffixes ...string) string {
	trimmed := strings.TrimSpace(base)
	if trimmed == "" {
		return ""
	}
	trimmed = strings.TrimRight(trimmed, "/")
	for _, suffix := range suffixes {
		trimmed = strings.TrimSuffix(trimmed, suffix)
	}
	return strings.TrimRight(trimmed, "/")
}

func normalizeAPIKeys(primary string, extras []string) []string {
	seen := make(map[string]struct{})
	var keys []string
	appendKey := func(raw string) {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			return
		}
		if _, ok := seen[trimmed]; ok {
			return
		}
		seen[trimmed] = struct{}{}
		keys = append(keys, trimmed)
	}
	appendKey(primary)
	for _, key := range extras {
		appendKey(key)
	}
	return keys
}

func cloneHubConfig(cfg llmhub.Config) llmhub.Config {
	clone := cfg
	if cfg.OpenAI != nil {
		c := *cfg.OpenAI
		clone.OpenAI = &c
	}
	if cfg.Anthropic != nil {
		c := *cfg.Anthropic
		clone.Anthropic = &c
	}
	if cfg.XAI != nil {
		c := *cfg.XAI
		clone.XAI = &c
	}
	if cfg.Google != nil {
		c := *cfg.Google
		clone.Google = &c
	}
	return clone
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

func (g *LLMProblemGenerator) logf(format string, args ...any) {
	if !llmDebugEnabled() {
		return
	}
	log.Printf("llm generator: "+format, args...)
}

func llmDebugEnabled() bool {
	return strings.TrimSpace(os.Getenv("CI_SMOKE_DEBUG")) != ""
}
