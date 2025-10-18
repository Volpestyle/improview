package api

import (
	"context"
	"time"

	"improview/backend/internal/auth"
	"improview/backend/internal/domain"
)

// ProblemGenerator creates problem packs based on the requested parameters.
type ProblemGenerator interface {
	Generate(ctx context.Context, req GenerateRequest) (domain.ProblemPack, error)
}

// ProblemRepository persists generated problem packs for reuse.
type ProblemRepository interface {
	Save(ctx context.Context, pack domain.ProblemPack) (string, error)
	Get(ctx context.Context, id string) (domain.ProblemPack, error)
}

// AttemptStore persists attempt metadata and run history.
type AttemptStore interface {
	Create(ctx context.Context, req CreateAttemptRequest) (domain.Attempt, error)
	RecordRun(ctx context.Context, attemptID string, run domain.RunSummary) error
	Get(ctx context.Context, attemptID string) (domain.Attempt, []domain.RunResult, error)
	Complete(ctx context.Context, attemptID string, summary domain.SubmissionSummary) error
}

// UserProfileStore manages user profile persistence.
type UserProfileStore interface {
	GetProfile(ctx context.Context, userID string) (domain.UserProfile, error)
	UpsertProfile(ctx context.Context, userID string, update domain.UserProfileUpdate, now time.Time) (domain.UserProfile, error)
}

// SavedProblemStore persists saved problem metadata and attempt snapshots.
type SavedProblemStore interface {
	ListSavedProblems(ctx context.Context, userID string, opts domain.SavedProblemListOptions) (domain.SavedProblemListResult, error)
	CreateSavedProblem(ctx context.Context, userID string, input domain.SavedProblemCreateInput, now time.Time) (domain.SavedProblemSummary, error)
	GetSavedProblem(ctx context.Context, userID, savedProblemID string) (domain.SavedProblemDetail, error)
	UpdateSavedProblem(ctx context.Context, userID, savedProblemID string, input domain.SavedProblemUpdateInput, now time.Time) (domain.SavedProblemSummary, error)
	DeleteSavedProblem(ctx context.Context, userID, savedProblemID string) error
	AppendAttempt(ctx context.Context, userID, savedProblemID string, input domain.SavedProblemAttemptInput, now time.Time) (domain.SavedAttemptSnapshot, error)
	ListAttempts(ctx context.Context, userID, savedProblemID string) ([]domain.SavedAttemptSnapshot, error)
}

// TestRunner executes user code against public or hidden tests.
type TestRunner interface {
	Run(ctx context.Context, req RunTestsRequest) (domain.RunSummary, error)
}

// SubmissionEvaluator finalizes submissions on hidden tests and aggregates results.
type SubmissionEvaluator interface {
	Submit(ctx context.Context, req SubmitRequest) (domain.SubmissionSummary, error)
}

// HealthReporter exposes readiness checks for monitoring endpoints.
type HealthReporter interface {
	Check(ctx context.Context) error
}

// Clock allows deterministic testing of time-dependent features.
type Clock interface {
	Now() time.Time
}

// Services aggregates all backend dependencies used by HTTP handlers.
type Services struct {
	Generator     ProblemGenerator
	Problems      ProblemRepository
	Attempts      AttemptStore
	Profiles      UserProfileStore
	SavedProblems SavedProblemStore
	Tests         TestRunner
	Submission    SubmissionEvaluator
	Health        HealthReporter
	Clock         Clock
	Authenticator auth.Authenticator
}

// RealClock provides the default wall-clock implementation.
type RealClock struct{}

// Now returns the current time.
func (RealClock) Now() time.Time { return time.Now() }
