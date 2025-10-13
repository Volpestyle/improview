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
