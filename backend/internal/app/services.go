package app

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"improview/backend/internal/api"
)

// GeneratorMode selects which problem generator backend to use.
type GeneratorMode string

const (
	// GeneratorModeStatic uses the local StaticProblemGenerator.
	GeneratorModeStatic GeneratorMode = "static"
	// GeneratorModeLLM connects to a remote LLM-backed generator.
	GeneratorModeLLM GeneratorMode = "llm"
)

// ServicesOptions controls how backend services are wired together.
type ServicesOptions struct {
	GeneratorMode GeneratorMode
	LLM           LLMOptions
}

// LLMOptions holds configuration for the remote LLM generator.
type LLMOptions struct {
	APIKey      string
	BaseURL     string
	Model       string
	Provider    string
	Temperature float64
	Timeout     time.Duration
	HTTPClient  *http.Client
}

const (
	defaultLLMTimeout = 25 * time.Second
	defaultLLMBaseURL = "https://api.openai.com/v1"
	defaultLLMModel   = "gpt-4.1-mini"
)

// NewInMemoryServices wires together a fully in-memory implementation of the API services.
func NewInMemoryServices(clock api.Clock) api.Services {
	services, err := newServices(clock, ServicesOptions{GeneratorMode: GeneratorModeStatic})
	if err != nil {
		panic(fmt.Sprintf("app: static services configuration failed: %v", err))
	}
	return services
}

// NewServicesFromEnv constructs backend services based on environment variables.
//
// Recognised variables:
//   - IMPROVIEW_GENERATOR_MODE: "static" (default) or "llm"
//   - IMPROVIEW_OPENAI_API_KEY: required when mode=llm
//   - IMPROVIEW_OPENAI_MODEL: overrides the default OpenAI model
//   - IMPROVIEW_OPENAI_BASE_URL: overrides the OpenAI API base URL
//   - IMPROVIEW_OPENAI_PROVIDER: optional label recorded in prompts
//   - IMPROVIEW_OPENAI_TIMEOUT_SECONDS: request timeout when mode=llm
//   - IMPROVIEW_OPENAI_TEMPERATURE: float temperature override when mode=llm
func NewServicesFromEnv(clock api.Clock) (api.Services, error) {
	mode := GeneratorMode(strings.ToLower(strings.TrimSpace(os.Getenv("IMPROVIEW_GENERATOR_MODE"))))
	if mode == "" {
		mode = GeneratorModeStatic
	}

	options := ServicesOptions{
		GeneratorMode: mode,
		LLM:           parseLLMOptionsFromEnv(),
	}
	switch mode {
	case GeneratorModeStatic, GeneratorModeLLM:
		// handled later
	default:
		return api.Services{}, fmt.Errorf("unknown generator mode %q", mode)
	}

	return newServices(clock, options)
}

func parseLLMOptionsFromEnv() LLMOptions {
	timeout := defaultLLMTimeout
	if raw := strings.TrimSpace(os.Getenv("IMPROVIEW_OPENAI_TIMEOUT_SECONDS")); raw != "" {
		if seconds, err := strconv.Atoi(raw); err == nil && seconds > 0 {
			timeout = time.Duration(seconds) * time.Second
		}
	}

	temperature := 0.2
	if raw := strings.TrimSpace(os.Getenv("IMPROVIEW_OPENAI_TEMPERATURE")); raw != "" {
		if val, err := strconv.ParseFloat(raw, 64); err == nil {
			temperature = val
		}
	}

	return LLMOptions{
		APIKey:      strings.TrimSpace(os.Getenv("IMPROVIEW_OPENAI_API_KEY")),
		BaseURL:     defaultString(os.Getenv("IMPROVIEW_OPENAI_BASE_URL"), defaultLLMBaseURL),
		Model:       defaultString(os.Getenv("IMPROVIEW_OPENAI_MODEL"), defaultLLMModel),
		Provider:    strings.TrimSpace(os.Getenv("IMPROVIEW_OPENAI_PROVIDER")),
		Temperature: temperature,
		Timeout:     timeout,
	}
}

func defaultString(value, fallback string) string {
	if trimmed := strings.TrimSpace(value); trimmed != "" {
		return trimmed
	}
	return fallback
}

func newServices(clock api.Clock, options ServicesOptions) (api.Services, error) {
	if clock == nil {
		clock = api.RealClock{}
	}

	staticGenerator := NewStaticProblemGenerator()

	var llmGenerator api.ProblemGenerator
	if strings.TrimSpace(options.LLM.APIKey) != "" {
		var err error
		llmGenerator, err = NewLLMProblemGenerator(options.LLM)
		if err != nil {
			return api.Services{}, err
		}
	} else if options.GeneratorMode == GeneratorModeLLM {
		return api.Services{}, fmt.Errorf("llm generator: missing API key")
	}

	generator, err := NewDynamicProblemGenerator(options.GeneratorMode, staticGenerator, llmGenerator)
	if err != nil {
		return api.Services{}, err
	}

	problems := NewMemoryProblemRepository()
	attempts := NewMemoryAttemptStore(clock)
	runner := SimpleTestRunner{}
	submission := SubmissionService{Runner: runner, Attempts: attempts}

	return api.Services{
		Generator:  generator,
		Problems:   problems,
		Attempts:   attempts,
		Tests:      runner,
		Submission: submission,
		Health:     nil,
		Clock:      clock,
	}, nil
}
