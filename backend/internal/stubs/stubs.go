package stubs

import (
	"context"

	"improview/backend/internal/api"
	"improview/backend/internal/domain"
)

// ProblemGenerator is a placeholder implementation used during early scaffolding.
type ProblemGenerator struct{}

// Generate currently returns ErrNotImplemented.
func (ProblemGenerator) Generate(context.Context, api.GenerateRequest) (domain.ProblemPack, error) {
	return domain.ProblemPack{}, api.ErrNotImplemented
}

// ProblemRepository is a placeholder persistence layer.
type ProblemRepository struct{}

// Save currently returns ErrNotImplemented.
func (ProblemRepository) Save(context.Context, domain.ProblemPack) (string, error) {
	return "", api.ErrNotImplemented
}

// Get currently returns ErrNotImplemented.
func (ProblemRepository) Get(context.Context, string) (domain.ProblemPack, error) {
	return domain.ProblemPack{}, api.ErrNotImplemented
}

// AttemptStore is a placeholder store implementation.
type AttemptStore struct{}

// Create currently returns ErrNotImplemented.
func (AttemptStore) Create(context.Context, api.CreateAttemptRequest) (domain.Attempt, error) {
	return domain.Attempt{}, api.ErrNotImplemented
}

// RecordRun currently returns ErrNotImplemented.
func (AttemptStore) RecordRun(context.Context, string, domain.RunSummary) error {
	return api.ErrNotImplemented
}

// Get currently returns ErrNotImplemented.
func (AttemptStore) Get(context.Context, string) (domain.Attempt, []domain.RunResult, error) {
	return domain.Attempt{}, nil, api.ErrNotImplemented
}

// Complete currently returns ErrNotImplemented.
func (AttemptStore) Complete(context.Context, string, domain.SubmissionSummary) error {
	return api.ErrNotImplemented
}

// TestRunner is a placeholder runner implementation.
type TestRunner struct{}

// Run currently returns ErrNotImplemented.
func (TestRunner) Run(context.Context, api.RunTestsRequest) (domain.RunSummary, error) {
	return domain.RunSummary{}, api.ErrNotImplemented
}

// SubmissionEvaluator is a placeholder submission implementation.
type SubmissionEvaluator struct{}

// Submit currently returns ErrNotImplemented.
func (SubmissionEvaluator) Submit(context.Context, api.SubmitRequest) (domain.SubmissionSummary, error) {
	return domain.SubmissionSummary{}, api.ErrNotImplemented
}

// HealthReporter is a placeholder health checker.
type HealthReporter struct{}

// Check always returns nil to keep /api/healthz green during scaffolding.
func (HealthReporter) Check(context.Context) error { return nil }
