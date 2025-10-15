package api

import "improview/backend/internal/domain"

// GenerateRequest receives category/difficulty selection from the frontend.
type GenerateRequest struct {
	Category     string             `json:"category"`
	Difficulty   string             `json:"difficulty"`
	CustomPrompt string             `json:"customPrompt,omitempty"`
	Provider     string             `json:"provider,omitempty"`
	Mode         string             `json:"mode,omitempty"`
	LLM          *LLMRequestOptions `json:"llm,omitempty"`
}

// GenerateResponse mirrors the ProblemPack contract.
type GenerateResponse struct {
	ProblemID string             `json:"problem_id"`
	Pack      domain.ProblemPack `json:"pack"`
}

// LLMRequestOptions carries per-request overrides for the LLM generator.
type LLMRequestOptions struct {
	Provider string `json:"provider,omitempty"`
	Model    string `json:"model,omitempty"`
	BaseURL  string `json:"baseUrl,omitempty"`
}

// CreateAttemptRequest represents metadata when the user starts solving.
type CreateAttemptRequest struct {
	ProblemID string `json:"problem_id"`
	Language  string `json:"lang"`
}

// CreateAttemptResponse returns the newly created attempt identifier.
type CreateAttemptResponse struct {
	Attempt domain.Attempt `json:"attempt"`
}

// RunTestsRequest asks the runner to execute code against specific tests.
type RunTestsRequest struct {
	AttemptID string `json:"attempt_id"`
	Code      string `json:"code"`
	Which     string `json:"which"`
}

// RunTestsResponse surfaces the per-test results.
type RunTestsResponse struct {
	Summary domain.RunSummary `json:"summary"`
}

// SubmitRequest finalizes the problem attempt.
type SubmitRequest struct {
	AttemptID string `json:"attempt_id"`
	Code      string `json:"code"`
}

// SubmitResponse contains the aggregated submission summary.
type SubmitResponse struct {
	Summary domain.SubmissionSummary `json:"summary"`
}

// ErrorResponse provides a consistent error envelope.
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}
