package domain

// UserProfile stores editable metadata for an authenticated user.
type UserProfile struct {
	UserID      string            `json:"user_id"`
	Handle      string            `json:"handle,omitempty"`
	DisplayName string            `json:"display_name,omitempty"`
	Bio         string            `json:"bio,omitempty"`
	AvatarURL   string            `json:"avatar_url,omitempty"`
	Timezone    string            `json:"timezone,omitempty"`
	Preferences map[string]string `json:"preferences,omitempty"`
	CreatedAt   int64             `json:"created_at"`
	UpdatedAt   int64             `json:"updated_at"`
}

// UserProfileUpdate captures partial profile updates.
type UserProfileUpdate struct {
	Handle      *string
	DisplayName *string
	Bio         *string
	AvatarURL   *string
	Timezone    *string
	Preferences map[string]string
}

// SavedProblemStatus enumerates lifecycle states for a saved problem.
type SavedProblemStatus string

const (
	// SavedProblemStatusInProgress indicates the user is actively working.
	SavedProblemStatusInProgress SavedProblemStatus = "in_progress"
	// SavedProblemStatusCompleted indicates work has been finished.
	SavedProblemStatusCompleted SavedProblemStatus = "completed"
	// SavedProblemStatusArchived indicates the problem is hidden from active lists.
	SavedProblemStatusArchived SavedProblemStatus = "archived"
)

// SavedProblemSummary is the lightweight payload returned during list operations.
type SavedProblemSummary struct {
	ID           string                `json:"id"`
	ProblemID    string                `json:"problem_id"`
	Title        string                `json:"title,omitempty"`
	Language     string                `json:"language"`
	Status       SavedProblemStatus    `json:"status"`
	Tags         []string              `json:"tags,omitempty"`
	Notes        string                `json:"notes,omitempty"`
	HintUnlocked bool                  `json:"hint_unlocked"`
	CreatedAt    int64                 `json:"created_at"`
	UpdatedAt    int64                 `json:"updated_at"`
	LastAttempt  *SavedAttemptSnapshot `json:"last_attempt,omitempty"`
}

// SavedAttemptSummary captures high-level attempt metadata.
type SavedAttemptSummary struct {
	AttemptID string             `json:"attempt_id"`
	Status    SavedAttemptStatus `json:"status"`
	UpdatedAt int64              `json:"updated_at"`
	PassCount int                `json:"pass_count"`
	FailCount int                `json:"fail_count"`
}

// SavedAttemptStatus defines lifecycle states for a saved attempt snapshot.
type SavedAttemptStatus string

const (
	// SavedAttemptStatusSubmitted indicates the attempt was persisted but final grading not evaluated.
	SavedAttemptStatusSubmitted SavedAttemptStatus = "submitted"
	// SavedAttemptStatusPassed indicates the attempt passed hidden tests.
	SavedAttemptStatusPassed SavedAttemptStatus = "passed"
	// SavedAttemptStatusFailed indicates the attempt failed evaluation.
	SavedAttemptStatusFailed SavedAttemptStatus = "failed"
)

// SavedAttemptSnapshot retains serialized code alongside summary fields.
type SavedAttemptSnapshot struct {
	SavedAttemptSummary
	SubmittedAt *int64 `json:"submitted_at,omitempty"`
	RuntimeMS   int64  `json:"runtime_ms"`
	Code        string `json:"code,omitempty"`
	CodeS3Key   string `json:"code_s3_key,omitempty"`
}

// SavedProblemDetail expands on the summary with full attempt history.
type SavedProblemDetail struct {
	SavedProblemSummary
	Attempts []SavedAttemptSnapshot `json:"attempts"`
}

// SavedProblemCreateInput describes the payload necessary to create a saved problem.
type SavedProblemCreateInput struct {
	ProblemID    string
	Title        string
	Language     string
	Status       SavedProblemStatus
	Tags         []string
	Notes        string
	HintUnlocked bool
}

// SavedProblemUpdateInput captures optional saved problem updates.
type SavedProblemUpdateInput struct {
	Status       *SavedProblemStatus
	Tags         []string
	Notes        *string
	HintUnlocked *bool
}

// SavedProblemAttemptInput represents a new attempt snapshot.
type SavedProblemAttemptInput struct {
	AttemptID   string
	Status      SavedAttemptStatus
	PassCount   int
	FailCount   int
	RuntimeMS   int64
	Code        string
	CodeS3Key   string
	SubmittedAt *int64
}

// SavedProblemListOptions configures pagination and filtering.
type SavedProblemListOptions struct {
	Status    SavedProblemStatus
	Limit     int32
	NextToken string
}

// SavedProblemListResult returns summaries along with pagination cursor.
type SavedProblemListResult struct {
	Items     []SavedProblemSummary
	NextToken string
}
