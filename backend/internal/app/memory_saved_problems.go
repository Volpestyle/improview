package app

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"improview/backend/internal/api"
	"improview/backend/internal/domain"
)

// MemorySavedProblemStore provides an in-memory SavedProblemStore implementation for local development.
type MemorySavedProblemStore struct {
	mu       sync.RWMutex
	clock    api.Clock
	problems map[string]map[string]domain.SavedProblemDetail // userID -> savedProblemID -> detail
}

// NewMemorySavedProblemStore constructs the in-memory saved problem store.
func NewMemorySavedProblemStore(clock api.Clock) *MemorySavedProblemStore {
	if clock == nil {
		clock = api.RealClock{}
	}

	return &MemorySavedProblemStore{
		clock:    clock,
		problems: make(map[string]map[string]domain.SavedProblemDetail),
	}
}

func (s *MemorySavedProblemStore) ensureUser(userID string) {
	if _, ok := s.problems[userID]; !ok {
		s.problems[userID] = make(map[string]domain.SavedProblemDetail)
	}
}

// ListSavedProblems returns summaries for the given user with optional pagination and status filtering.
func (s *MemorySavedProblemStore) ListSavedProblems(ctx context.Context, userID string, opts domain.SavedProblemListOptions) (domain.SavedProblemListResult, error) {
	if s == nil {
		return domain.SavedProblemListResult{}, api.ErrNotImplemented
	}
	if strings.TrimSpace(userID) == "" {
		return domain.SavedProblemListResult{}, fmt.Errorf("%w: missing user id", api.ErrBadRequest)
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	userProblems := s.problems[userID]
	if len(userProblems) == 0 {
		return domain.SavedProblemListResult{Items: []domain.SavedProblemSummary{}}, nil
	}

	items := make([]domain.SavedProblemSummary, 0, len(userProblems))
	for _, detail := range userProblems {
		if opts.Status != "" && detail.Status != opts.Status {
			continue
		}
		items = append(items, detail.SavedProblemSummary)
	}

	if len(items) == 0 {
		return domain.SavedProblemListResult{Items: []domain.SavedProblemSummary{}}, nil
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].UpdatedAt > items[j].UpdatedAt
	})

	start := 0
	if trimmed := strings.TrimSpace(opts.NextToken); trimmed != "" {
		if offset, err := strconv.Atoi(trimmed); err == nil && offset >= 0 && offset < len(items) {
			start = offset
		}
	}

	if start >= len(items) {
		return domain.SavedProblemListResult{Items: []domain.SavedProblemSummary{}}, nil
	}

	end := start + int(opts.Limit)
	if opts.Limit <= 0 || end > len(items) {
		end = len(items)
	}

	paged := append([]domain.SavedProblemSummary(nil), items[start:end]...)
	var next string
	if end < len(items) {
		next = strconv.Itoa(end)
	}

	return domain.SavedProblemListResult{
		Items:     paged,
		NextToken: next,
	}, nil
}

// CreateSavedProblem stores a new saved problem summary for the user.
func (s *MemorySavedProblemStore) CreateSavedProblem(ctx context.Context, userID string, input domain.SavedProblemCreateInput, now time.Time) (domain.SavedProblemSummary, error) {
	if s == nil {
		return domain.SavedProblemSummary{}, api.ErrNotImplemented
	}
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(input.ProblemID) == "" || strings.TrimSpace(input.Language) == "" {
		return domain.SavedProblemSummary{}, api.ErrBadRequest
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.ensureUser(userID)

	savedProblemID := randomID()
	timestamp := now.Unix()
	summary := domain.SavedProblemSummary{
		ID:           savedProblemID,
		ProblemID:    strings.TrimSpace(input.ProblemID),
		Title:        strings.TrimSpace(input.Title),
		Language:     strings.TrimSpace(input.Language),
		Status:       input.Status,
		Tags:         append([]string(nil), input.Tags...),
		Notes:        strings.TrimSpace(input.Notes),
		HintUnlocked: input.HintUnlocked,
		CreatedAt:    timestamp,
		UpdatedAt:    timestamp,
	}

	s.problems[userID][savedProblemID] = domain.SavedProblemDetail{
		SavedProblemSummary: summary,
		Attempts:            []domain.SavedAttemptSnapshot{},
	}

	return summary, nil
}

// GetSavedProblem retrieves the saved problem detail for the user.
func (s *MemorySavedProblemStore) GetSavedProblem(ctx context.Context, userID, savedProblemID string) (domain.SavedProblemDetail, error) {
	if s == nil {
		return domain.SavedProblemDetail{}, api.ErrNotImplemented
	}
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(savedProblemID) == "" {
		return domain.SavedProblemDetail{}, api.ErrBadRequest
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	userProblems := s.problems[userID]
	if userProblems == nil {
		return domain.SavedProblemDetail{}, api.ErrNotFound
	}

	detail, ok := userProblems[savedProblemID]
	if !ok {
		return domain.SavedProblemDetail{}, api.ErrNotFound
	}

	copyDetail := detail
	copyDetail.Attempts = append([]domain.SavedAttemptSnapshot(nil), detail.Attempts...)
	return copyDetail, nil
}

// UpdateSavedProblem updates metadata fields on a saved problem summary.
func (s *MemorySavedProblemStore) UpdateSavedProblem(ctx context.Context, userID, savedProblemID string, input domain.SavedProblemUpdateInput, now time.Time) (domain.SavedProblemSummary, error) {
	if s == nil {
		return domain.SavedProblemSummary{}, api.ErrNotImplemented
	}
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(savedProblemID) == "" {
		return domain.SavedProblemSummary{}, api.ErrBadRequest
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	userProblems := s.problems[userID]
	if userProblems == nil {
		return domain.SavedProblemSummary{}, api.ErrNotFound
	}

	detail, ok := userProblems[savedProblemID]
	if !ok {
		return domain.SavedProblemSummary{}, api.ErrNotFound
	}

	if input.Status != nil {
		detail.Status = *input.Status
	}
	if input.Notes != nil {
		detail.Notes = strings.TrimSpace(*input.Notes)
	}
	if input.HintUnlocked != nil {
		detail.HintUnlocked = *input.HintUnlocked
	}
	if input.Tags != nil {
		detail.Tags = append([]string(nil), input.Tags...)
	}
	detail.UpdatedAt = now.Unix()

	// Preserve LastAttempt pointer reference
	if len(detail.Attempts) > 0 {
		latestIdx := 0
		for i := 1; i < len(detail.Attempts); i++ {
			if detail.Attempts[i].UpdatedAt > detail.Attempts[latestIdx].UpdatedAt {
				latestIdx = i
			}
		}
		detail.LastAttempt = &detail.Attempts[latestIdx]
	} else {
		detail.LastAttempt = nil
	}

	userProblems[savedProblemID] = detail
	return detail.SavedProblemSummary, nil
}

// DeleteSavedProblem removes the saved problem entry for the user.
func (s *MemorySavedProblemStore) DeleteSavedProblem(ctx context.Context, userID, savedProblemID string) error {
	if s == nil {
		return api.ErrNotImplemented
	}
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(savedProblemID) == "" {
		return api.ErrBadRequest
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	userProblems := s.problems[userID]
	if userProblems == nil {
		return api.ErrNotFound
	}

	if _, ok := userProblems[savedProblemID]; !ok {
		return api.ErrNotFound
	}

	delete(userProblems, savedProblemID)
	if len(userProblems) == 0 {
		delete(s.problems, userID)
	}
	return nil
}

// AppendAttempt registers a new attempt snapshot for the saved problem.
func (s *MemorySavedProblemStore) AppendAttempt(ctx context.Context, userID, savedProblemID string, input domain.SavedProblemAttemptInput, now time.Time) (domain.SavedAttemptSnapshot, error) {
	if s == nil {
		return domain.SavedAttemptSnapshot{}, api.ErrNotImplemented
	}
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(savedProblemID) == "" || strings.TrimSpace(input.AttemptID) == "" {
		return domain.SavedAttemptSnapshot{}, api.ErrBadRequest
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	userProblems := s.problems[userID]
	if userProblems == nil {
		return domain.SavedAttemptSnapshot{}, api.ErrNotFound
	}

	detail, ok := userProblems[savedProblemID]
	if !ok {
		return domain.SavedAttemptSnapshot{}, api.ErrNotFound
	}

	snapshot := domain.SavedAttemptSnapshot{
		SavedAttemptSummary: domain.SavedAttemptSummary{
			AttemptID: input.AttemptID,
			Status:    input.Status,
			UpdatedAt: now.Unix(),
			PassCount: input.PassCount,
			FailCount: input.FailCount,
		},
		SubmittedAt: input.SubmittedAt,
		RuntimeMS:   input.RuntimeMS,
		Code:        input.Code,
		CodeS3Key:   input.CodeS3Key,
	}

	detail.Attempts = append([]domain.SavedAttemptSnapshot{snapshot}, detail.Attempts...)
	detail.LastAttempt = &detail.Attempts[0]
	detail.UpdatedAt = snapshot.UpdatedAt
	userProblems[savedProblemID] = detail

	return snapshot, nil
}

// ListAttempts returns the attempt snapshots for the saved problem ordered by most recent.
func (s *MemorySavedProblemStore) ListAttempts(ctx context.Context, userID, savedProblemID string) ([]domain.SavedAttemptSnapshot, error) {
	if s == nil {
		return nil, api.ErrNotImplemented
	}
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(savedProblemID) == "" {
		return nil, api.ErrBadRequest
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	userProblems := s.problems[userID]
	if userProblems == nil {
		return nil, api.ErrNotFound
	}

	detail, ok := userProblems[savedProblemID]
	if !ok {
		return nil, api.ErrNotFound
	}

	attempts := append([]domain.SavedAttemptSnapshot(nil), detail.Attempts...)
	sort.Slice(attempts, func(i, j int) bool {
		return attempts[i].UpdatedAt > attempts[j].UpdatedAt
	})
	return attempts, nil
}
