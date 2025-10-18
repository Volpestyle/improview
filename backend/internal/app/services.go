package app

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"improview/backend/internal/api"
	"improview/backend/internal/auth"
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
//   - OPENAI_API_KEY: required when using the LLM generator
//   - OPENAI_MODEL: overrides the default OpenAI model
//   - OPENAI_BASE_URL: overrides the OpenAI API base URL
//   - OPENAI_PROVIDER: optional label recorded in prompts
//   - OPENAI_TIMEOUT_SECONDS: request timeout when mode=llm
//   - OPENAI_TEMPERATURE: float temperature override when mode=llm
func NewServicesFromEnv(clock api.Clock) (api.Services, error) {
	options := ServicesOptions{
		GeneratorMode: "",
		LLM:           parseLLMOptionsFromEnv(),
	}

	services, err := newServices(clock, options)
	if err != nil {
		return api.Services{}, err
	}

	authenticator, err := configureAuthenticatorFromEnv()
	if err != nil {
		return api.Services{}, err
	}
	services.Authenticator = authenticator

	return services, nil
}

func configureAuthenticatorFromEnv() (auth.Authenticator, error) {
	userPoolID := strings.TrimSpace(os.Getenv("USER_POOL_ID"))
	if userPoolID == "" {
		return nil, nil
	}

	clientIDs := gatherUserPoolClientIDs()
	if len(clientIDs) == 0 {
		return nil, fmt.Errorf("cognito auth: at least one app client id is required (set USER_POOL_CLIENT_ID or USER_POOL_CLIENT_IDS)")
	}

	cfg := auth.CognitoConfig{
		UserPoolID:   userPoolID,
		Region:       resolveCognitoRegion(userPoolID),
		AppClientIDs: clientIDs,
		JWKSURL:      strings.TrimSpace(os.Getenv("COGNITO_JWKS_URL")),
	}

	if raw := strings.TrimSpace(os.Getenv("COGNITO_JWKS_CACHE_TTL_SECONDS")); raw != "" {
		if seconds, err := strconv.Atoi(raw); err == nil && seconds > 0 {
			cfg.CacheTTL = time.Duration(seconds) * time.Second
		}
	}

	return auth.NewCognitoAuthenticator(cfg)
}

func resolveCognitoRegion(userPoolID string) string {
	if region := strings.TrimSpace(os.Getenv("COGNITO_REGION")); region != "" {
		return region
	}
	if region := strings.TrimSpace(os.Getenv("AWS_REGION")); region != "" {
		return region
	}
	if region := strings.TrimSpace(os.Getenv("AWS_DEFAULT_REGION")); region != "" {
		return region
	}
	if parts := strings.SplitN(userPoolID, "_", 2); len(parts) == 2 {
		return strings.TrimSpace(parts[0])
	}
	return ""
}

func parseLLMOptionsFromEnv() LLMOptions {
	timeout := defaultLLMTimeout
	if raw := strings.TrimSpace(os.Getenv("OPENAI_TIMEOUT_SECONDS")); raw != "" {
		if seconds, err := strconv.Atoi(raw); err == nil && seconds > 0 {
			timeout = time.Duration(seconds) * time.Second
		}
	}

	temperature := 0.2
	if raw := strings.TrimSpace(os.Getenv("OPENAI_TEMPERATURE")); raw != "" {
		if val, err := strconv.ParseFloat(raw, 64); err == nil {
			temperature = val
		}
	}

	return LLMOptions{
		APIKey:      strings.TrimSpace(os.Getenv("OPENAI_API_KEY")),
		BaseURL:     defaultString(os.Getenv("OPENAI_BASE_URL"), defaultLLMBaseURL),
		Model:       defaultString(os.Getenv("OPENAI_MODEL"), defaultLLMModel),
		Provider:    strings.TrimSpace(os.Getenv("OPENAI_PROVIDER")),
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

func splitCSV(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	results := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			results = append(results, trimmed)
		}
	}
	return results
}

func uniqueStrings(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(values))
	results := make([]string, 0, len(values))
	for _, val := range values {
		if _, ok := seen[val]; ok {
			continue
		}
		seen[val] = struct{}{}
		results = append(results, val)
	}
	return results
}

func gatherUserPoolClientIDs() []string {
	var combined []string
	if id := firstNonEmpty(os.Getenv("USER_POOL_CLIENT_ID")); id != "" {
		combined = append(combined, id)
	}
	combined = append(combined, splitCSV(os.Getenv("USER_POOL_CLIENT_IDS"))...)
	return uniqueStrings(combined)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
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
	}

	defaultMode := options.GeneratorMode
	if defaultMode == "" {
		if llmGenerator != nil {
			defaultMode = GeneratorModeLLM
		} else {
			defaultMode = GeneratorModeStatic
		}
	}
	if defaultMode == GeneratorModeLLM && llmGenerator == nil {
		return api.Services{}, fmt.Errorf("llm generator: missing API key")
	}

	generator, err := NewDynamicProblemGenerator(defaultMode, staticGenerator, llmGenerator)
	if err != nil {
		return api.Services{}, err
	}

	problems := NewMemoryProblemRepository()
	attempts := NewMemoryAttemptStore(clock)
	runner := SimpleTestRunner{}
	submission := SubmissionService{Runner: runner, Attempts: attempts}

	var profiles api.UserProfileStore
	var savedProblems api.SavedProblemStore
	if tableName := strings.TrimSpace(os.Getenv("TABLE_NAME")); tableName != "" {
		store, err := NewDynamoUserDataStoreFromEnv(context.Background(), tableName, strings.TrimSpace(os.Getenv("TABLE_INDEX_ATTEMPT_LOOKUP")), strings.TrimSpace(os.Getenv("TABLE_INDEX_USER_ACTIVITY")))
		if err != nil {
			return api.Services{}, err
		}
		profiles = store
		savedProblems = store
	}

	return api.Services{
		Generator:     generator,
		Problems:      problems,
		Attempts:      attempts,
		Profiles:      profiles,
		SavedProblems: savedProblems,
		Tests:         runner,
		Submission:    submission,
		Health:        nil,
		Clock:         clock,
	}, nil
}
