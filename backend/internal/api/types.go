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

// UpdateUserProfileRequest contains optional profile fields to update.
type UpdateUserProfileRequest struct {
	Handle      *string           `json:"handle,omitempty"`
	DisplayName *string           `json:"display_name,omitempty"`
	Bio         *string           `json:"bio,omitempty"`
	AvatarURL   *string           `json:"avatar_url,omitempty"`
	Timezone    *string           `json:"timezone,omitempty"`
	Preferences map[string]string `json:"preferences,omitempty"`
}

// UserProfileResponse wraps the persisted profile payload.
type UserProfileResponse struct {
	Profile domain.UserProfile `json:"profile"`
}

// CreateSavedProblemRequest defines the payload to persist a saved problem.
type CreateSavedProblemRequest struct {
	ProblemID    string   `json:"problem_id"`
	Title        string   `json:"title,omitempty"`
	Language     string   `json:"language"`
	Status       string   `json:"status,omitempty"`
	Tags         []string `json:"tags,omitempty"`
	Notes        string   `json:"notes,omitempty"`
	HintUnlocked *bool    `json:"hint_unlocked,omitempty"`
}

// UpdateSavedProblemRequest permits partial updates to saved problem metadata.
type UpdateSavedProblemRequest struct {
	Status       *string  `json:"status,omitempty"`
	Tags         []string `json:"tags,omitempty"`
	Notes        *string  `json:"notes,omitempty"`
	HintUnlocked *bool    `json:"hint_unlocked,omitempty"`
}

// SavedProblemResponse wraps a saved problem summary.
type SavedProblemResponse struct {
	SavedProblem domain.SavedProblemSummary `json:"saved_problem"`
}

// SavedProblemDetailResponse wraps a full saved problem representation.
type SavedProblemDetailResponse struct {
	SavedProblem domain.SavedProblemDetail `json:"saved_problem"`
}

// SavedProblemListResponse returns paginated saved problem summaries.
type SavedProblemListResponse struct {
	SavedProblems []domain.SavedProblemSummary `json:"saved_problems"`
	NextToken     *string                      `json:"next_token,omitempty"`
}

// CreateSavedProblemAttemptRequest appends a new attempt snapshot.
type CreateSavedProblemAttemptRequest struct {
	AttemptID   string `json:"attempt_id"`
	Code        string `json:"code"`
	Status      string `json:"status"`
	PassCount   int    `json:"pass_count,omitempty"`
	FailCount   int    `json:"fail_count,omitempty"`
	RuntimeMS   int64  `json:"runtime_ms,omitempty"`
	SubmittedAt *int64 `json:"submitted_at,omitempty"`
	CodeS3Key   string `json:"code_s3_key,omitempty"`
}

// SavedProblemAttemptResponse wraps a single attempt snapshot.
type SavedProblemAttemptResponse struct {
	Attempt domain.SavedAttemptSnapshot `json:"attempt"`
}

// SavedProblemAttemptsResponse lists all attempt snapshots for a saved problem.
type SavedProblemAttemptsResponse struct {
	Attempts []domain.SavedAttemptSnapshot `json:"attempts"`
}

// ErrorResponse provides a consistent error envelope.
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}
