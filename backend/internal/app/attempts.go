package app

import (
	"context"
	"fmt"
	"strings"
	"sync"

	"improview/backend/internal/api"
	"improview/backend/internal/domain"
)

// MemoryAttemptStore keeps attempts in memory for rapid iteration.
type MemoryAttemptStore struct {
	mu       sync.RWMutex
	clock    api.Clock
	attempts map[string]domain.Attempt
	runs     map[string][]domain.RunResult
}

// NewMemoryAttemptStore constructs a MemoryAttemptStore.
func NewMemoryAttemptStore(clock api.Clock) *MemoryAttemptStore {
	if clock == nil {
		clock = api.RealClock{}
	}
	return &MemoryAttemptStore{
		clock:    clock,
		attempts: make(map[string]domain.Attempt),
		runs:     make(map[string][]domain.RunResult),
	}
}

// Create records a new attempt when a user begins solving.
func (s *MemoryAttemptStore) Create(_ context.Context, req api.CreateAttemptRequest) (domain.Attempt, error) {
	if s == nil {
		return domain.Attempt{}, api.ErrNotImplemented
	}
	if strings.TrimSpace(req.ProblemID) == "" {
		return domain.Attempt{}, api.ErrBadRequest
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	id := randomID()
	now := s.clock.Now().UnixMilli()
	attempt := domain.Attempt{
		ID:        id,
		ProblemID: req.ProblemID,
		UserID:    req.UserID,
		Language:  req.Language,
		StartedAt: now,
	}

	s.attempts[id] = attempt
	s.runs[id] = nil
	return attempt, nil
}

// RecordRun stores per-test run results and tallies pass/fail counts.
func (s *MemoryAttemptStore) RecordRun(_ context.Context, attemptID string, summary domain.RunSummary) error {
	if s == nil {
		return api.ErrNotImplemented
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	attempt, ok := s.attempts[attemptID]
	if !ok {
		return api.ErrNotFound
	}

	passes := 0
	fails := 0
	for _, result := range summary.Results {
		if strings.EqualFold(result.Status, "pass") {
			passes++
		} else {
			fails++
		}
	}
	attempt.PassCount += passes
	attempt.FailCount += fails
	s.attempts[attemptID] = attempt
	prev := append([]domain.RunResult(nil), s.runs[attemptID]...)
	prev = append(prev, summary.Results...)
	s.runs[attemptID] = prev

	return nil
}

// Complete finalizes an attempt after submission.
func (s *MemoryAttemptStore) Complete(_ context.Context, attemptID string, summary domain.SubmissionSummary) error {
	if s == nil {
		return api.ErrNotImplemented
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	attempt, ok := s.attempts[attemptID]
	if !ok {
		return api.ErrNotFound
	}

	attempt.EndedAt = s.clock.Now().UnixMilli()
	if attempt.StartedAt > 0 {
		attempt.DurationMS = attempt.EndedAt - attempt.StartedAt
	}

	s.attempts[attemptID] = attempt
	return nil
}

// Get returns the attempt metadata and aggregated run results.
func (s *MemoryAttemptStore) Get(_ context.Context, attemptID string) (domain.Attempt, []domain.RunResult, error) {
	if s == nil {
		return domain.Attempt{}, nil, api.ErrNotImplemented
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	attempt, ok := s.attempts[attemptID]
	if !ok {
		return domain.Attempt{}, nil, api.ErrNotFound
	}

	runs := append([]domain.RunResult(nil), s.runs[attemptID]...)
	return attempt, runs, nil
}

// SimpleTestRunner performs lightweight evaluation suitable for local development.
type SimpleTestRunner struct{}

// Run simulates test execution and marks code containing the word "fail" as a failure.
func (SimpleTestRunner) Run(_ context.Context, req api.RunTestsRequest) (domain.RunSummary, error) {
	if strings.TrimSpace(req.Code) == "" {
		return domain.RunSummary{}, api.ErrBadRequest
	}

	status := "pass"
	if strings.Contains(strings.ToLower(req.Code), "fail") {
		status = "fail"
	}

	result := domain.RunResult{
		TestID: fmt.Sprintf("%s-0", req.Which),
		Status: status,
		TimeMS: 1,
		Stdout: "",
		Stderr: "",
	}

	return domain.RunSummary{AttemptID: req.AttemptID, Results: []domain.RunResult{result}}, nil
}

// SubmissionService coordinates hidden test execution and attempt finalization.
type SubmissionService struct {
	Runner   api.TestRunner
	Attempts *MemoryAttemptStore
}

// Submit runs hidden tests and emits a submission summary.
func (s SubmissionService) Submit(ctx context.Context, req api.SubmitRequest) (domain.SubmissionSummary, error) {
	if s.Runner == nil || s.Attempts == nil {
		return domain.SubmissionSummary{}, api.ErrNotImplemented
	}

	summary, err := s.Runner.Run(ctx, api.RunTestsRequest{AttemptID: req.AttemptID, Code: req.Code, Which: "hidden"})
	if err != nil {
		return domain.SubmissionSummary{}, err
	}

	passed := true
	for _, result := range summary.Results {
		if !strings.EqualFold(result.Status, "pass") {
			passed = false
			break
		}
	}

	submission := domain.SubmissionSummary{
		AttemptID:     req.AttemptID,
		Passed:        passed,
		RuntimeMS:     1,
		Operations:    0,
		HiddenResults: summary.Results,
	}

	if err := s.Attempts.RecordRun(ctx, req.AttemptID, summary); err != nil {
		return domain.SubmissionSummary{}, err
	}

	if err := s.Attempts.Complete(ctx, req.AttemptID, submission); err != nil {
		return domain.SubmissionSummary{}, err
	}

	return submission, nil
}
