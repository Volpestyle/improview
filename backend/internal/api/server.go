package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"improview/backend/internal/auth"
	"improview/backend/internal/domain"
)

// Server exposes the HTTP API expected by the frontend and external clients.
type Server struct {
	services Services
	mux      *http.ServeMux
}

// NewServer wires all routes using the provided services.
func NewServer(services Services) *Server {
	if services.Clock == nil {
		services.Clock = RealClock{}
	}

	s := &Server{services: services, mux: http.NewServeMux()}
	// Core routes
	s.mux.Handle("/api/generate", s.guard(s.jsonHandler(http.MethodPost, s.handleGenerate)))
	s.mux.Handle("/api/attempt", s.guard(s.jsonHandler(http.MethodPost, s.handleCreateAttempt)))
	s.mux.Handle("/api/run-tests", s.guard(s.jsonHandler(http.MethodPost, s.handleRunTests)))
	s.mux.Handle("/api/submit", s.guard(s.jsonHandler(http.MethodPost, s.handleSubmit)))
	s.mux.Handle("/api/attempt/", s.guard(http.HandlerFunc(s.handleAttemptByID)))
	s.mux.Handle("/api/problem/", s.guard(http.HandlerFunc(s.handleProblemByID)))
	s.mux.Handle("/api/user/profile", s.guard(http.HandlerFunc(s.handleUserProfile)))
	s.mux.Handle("/api/user/saved-problems", s.guard(http.HandlerFunc(s.handleSavedProblemsCollection)))
	s.mux.Handle("/api/user/saved-problems/", s.guard(http.HandlerFunc(s.handleSavedProblemResource)))
	s.mux.Handle("/api/healthz", http.HandlerFunc(s.handleHealth))
	s.mux.Handle("/api/version", http.HandlerFunc(s.handleVersion))

	return s
}

// Handler returns the root http.Handler for the server.
func (s *Server) Handler() http.Handler { return s.mux }

func (s *Server) jsonHandler(method string, h func(http.ResponseWriter, *http.Request) error) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != method {
			w.Header().Set("Allow", method)
			writeError(w, ErrBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := h(w, r); err != nil {
			writeError(w, err)
		}
	})
}

func (s *Server) guard(next http.Handler) http.Handler {
	if s.services.Authenticator == nil {
		return next
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := bearerToken(r.Header.Get("Authorization"))
		if token == "" {
			writeError(w, ErrUnauthenticated)
			return
		}

		identity, err := s.services.Authenticator.Authenticate(r.Context(), token)
		if err != nil {
			switch {
			case errors.Is(err, auth.ErrForbidden):
				writeError(w, ErrForbidden)
			default:
				writeError(w, ErrUnauthenticated)
			}
			return
		}

		ctx := WithIdentity(r.Context(), identity)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func bearerToken(header string) string {
	if header == "" {
		return ""
	}
	parts := strings.Fields(header)
	if len(parts) != 2 {
		return ""
	}
	if !strings.EqualFold(parts[0], "bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}

func (s *Server) handleGenerate(w http.ResponseWriter, r *http.Request) error {
	if s.services.Generator == nil {
		return ErrNotImplemented
	}
	if s.services.Problems == nil {
		return ErrNotImplemented
	}

	var req GenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return ErrBadRequest
	}

	pack, err := s.services.Generator.Generate(r.Context(), req)
	if err != nil {
		return err
	}

	id, err := s.services.Problems.Save(r.Context(), pack)
	if err != nil {
		return err
	}

	return json.NewEncoder(w).Encode(GenerateResponse{ProblemID: id, Pack: pack})
}

func (s *Server) handleCreateAttempt(w http.ResponseWriter, r *http.Request) error {
	if s.services.Attempts == nil {
		return ErrNotImplemented
	}

	var req CreateAttemptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return ErrBadRequest
	}

	attempt, err := s.services.Attempts.Create(r.Context(), req)
	if err != nil {
		return err
	}

	return json.NewEncoder(w).Encode(CreateAttemptResponse{Attempt: attempt})
}

func (s *Server) handleRunTests(w http.ResponseWriter, r *http.Request) error {
	if s.services.Tests == nil {
		return ErrNotImplemented
	}

	var req RunTestsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return ErrBadRequest
	}

	summary, err := s.services.Tests.Run(r.Context(), req)
	if err != nil {
		return err
	}
	if s.services.Attempts != nil {
		if err := s.services.Attempts.RecordRun(r.Context(), req.AttemptID, summary); err != nil {
			return err
		}
	}

	return json.NewEncoder(w).Encode(RunTestsResponse{Summary: summary})
}

func (s *Server) handleSubmit(w http.ResponseWriter, r *http.Request) error {
	if s.services.Submission == nil {
		return ErrNotImplemented
	}

	var req SubmitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return ErrBadRequest
	}

	summary, err := s.services.Submission.Submit(r.Context(), req)
	if err != nil {
		return err
	}
	if s.services.Attempts != nil {
		if err := s.services.Attempts.Complete(r.Context(), req.AttemptID, summary); err != nil {
			return err
		}
	}

	return json.NewEncoder(w).Encode(SubmitResponse{Summary: summary})
}

func (s *Server) handleAttemptByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	if s.services.Attempts == nil {
		writeError(w, ErrNotImplemented)
		return
	}

	attemptID := strings.TrimPrefix(r.URL.Path, "/api/attempt/")
	if attemptID == "" {
		writeError(w, ErrBadRequest)
		return
	}

	attempt, runs, err := s.services.Attempts.Get(r.Context(), attemptID)
	if err != nil {
		writeError(w, err)
		return
	}

	resp := struct {
		Attempt domain.Attempt     `json:"attempt"`
		Runs    []domain.RunResult `json:"runs"`
	}{Attempt: attempt, Runs: runs}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		writeError(w, err)
	}
}

func (s *Server) handleProblemByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	if s.services.Problems == nil {
		writeError(w, ErrNotImplemented)
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/problem/")
	if id == "" {
		writeError(w, ErrBadRequest)
		return
	}

	pack, err := s.services.Problems.Get(r.Context(), id)
	if err != nil {
		writeError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(pack); err != nil {
		writeError(w, err)
	}
}

func (s *Server) handleUserProfile(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		w.Header().Set("Content-Type", "application/json")
		if err := s.getUserProfile(w, r); err != nil {
			writeError(w, err)
		}
	case http.MethodPut:
		w.Header().Set("Content-Type", "application/json")
		if err := s.updateUserProfile(w, r); err != nil {
			writeError(w, err)
		}
	default:
		w.Header().Set("Allow", "GET, PUT")
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) getUserProfile(w http.ResponseWriter, r *http.Request) error {
	if s.services.Profiles == nil {
		return ErrNotImplemented
	}

	userID, err := s.requireUserID(r.Context())
	if err != nil {
		return err
	}

	profile, err := s.services.Profiles.GetProfile(r.Context(), userID)
	if err != nil {
		return err
	}

	return json.NewEncoder(w).Encode(UserProfileResponse{Profile: profile})
}

func (s *Server) updateUserProfile(w http.ResponseWriter, r *http.Request) error {
	if s.services.Profiles == nil {
		return ErrNotImplemented
	}

	userID, err := s.requireUserID(r.Context())
	if err != nil {
		return err
	}

	var req UpdateUserProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return ErrBadRequest
	}

	update := domain.UserProfileUpdate{
		Handle:      req.Handle,
		DisplayName: req.DisplayName,
		Bio:         req.Bio,
		AvatarURL:   req.AvatarURL,
		Timezone:    req.Timezone,
		Preferences: req.Preferences,
	}

	now := s.services.Clock.Now()
	profile, err := s.services.Profiles.UpsertProfile(r.Context(), userID, update, now)
	if err != nil {
		return err
	}

	return json.NewEncoder(w).Encode(UserProfileResponse{Profile: profile})
}

func (s *Server) handleSavedProblemsCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		w.Header().Set("Content-Type", "application/json")
		if err := s.listSavedProblems(w, r); err != nil {
			writeError(w, err)
		}
	case http.MethodPost:
		w.Header().Set("Content-Type", "application/json")
		if err := s.createSavedProblem(w, r); err != nil {
			writeError(w, err)
		}
	default:
		w.Header().Set("Allow", "GET, POST")
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) listSavedProblems(w http.ResponseWriter, r *http.Request) error {
	if s.services.SavedProblems == nil {
		return ErrNotImplemented
	}

	userID, err := s.requireUserID(r.Context())
	if err != nil {
		return err
	}

	query := r.URL.Query()
	statusRaw := strings.TrimSpace(query.Get("status"))
	var status domain.SavedProblemStatus
	if statusRaw != "" {
		parsed, parseErr := parseSavedProblemStatus(statusRaw)
		if parseErr != nil {
			return parseErr
		}
		status = parsed
	}

	limit := 50
	if raw := strings.TrimSpace(query.Get("limit")); raw != "" {
		value, convErr := strconv.Atoi(raw)
		if convErr != nil || value <= 0 {
			return fmt.Errorf("%w: invalid limit", ErrBadRequest)
		}
		if value > 200 {
			value = 200
		}
		limit = value
	}

	opts := domain.SavedProblemListOptions{
		Status:    status,
		Limit:     int32(limit),
		NextToken: strings.TrimSpace(query.Get("next_token")),
	}

	result, err := s.services.SavedProblems.ListSavedProblems(r.Context(), userID, opts)
	if err != nil {
		return err
	}

	var next *string
	if strings.TrimSpace(result.NextToken) != "" {
		next = &result.NextToken
	}

	resp := SavedProblemListResponse{SavedProblems: result.Items, NextToken: next}
	return json.NewEncoder(w).Encode(resp)
}

func (s *Server) createSavedProblem(w http.ResponseWriter, r *http.Request) error {
	if s.services.SavedProblems == nil {
		return ErrNotImplemented
	}

	userID, err := s.requireUserID(r.Context())
	if err != nil {
		return err
	}

	var req CreateSavedProblemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return ErrBadRequest
	}

	status := domain.SavedProblemStatusInProgress
	if trimmed := strings.TrimSpace(req.Status); trimmed != "" {
		parsed, parseErr := parseSavedProblemStatus(trimmed)
		if parseErr != nil {
			return parseErr
		}
		status = parsed
	}

	hintUnlocked := false
	if req.HintUnlocked != nil {
		hintUnlocked = *req.HintUnlocked
	}

	input := domain.SavedProblemCreateInput{
		ProblemID:    strings.TrimSpace(req.ProblemID),
		Title:        strings.TrimSpace(req.Title),
		Language:     strings.TrimSpace(req.Language),
		Status:       status,
		Tags:         req.Tags,
		Notes:        strings.TrimSpace(req.Notes),
		HintUnlocked: hintUnlocked,
	}

	summary, err := s.services.SavedProblems.CreateSavedProblem(r.Context(), userID, input, s.services.Clock.Now())
	if err != nil {
		return err
	}

	return json.NewEncoder(w).Encode(SavedProblemResponse{SavedProblem: summary})
}

func (s *Server) handleSavedProblemResource(w http.ResponseWriter, r *http.Request) {
	trimmed := strings.TrimPrefix(r.URL.Path, "/api/user/saved-problems/")
	trimmed = strings.TrimSuffix(trimmed, "/")
	if trimmed == "" {
		writeError(w, ErrBadRequest)
		return
	}

	if strings.Contains(trimmed, "/") {
		parts := strings.Split(trimmed, "/")
		if len(parts) == 2 && parts[1] == "attempts" {
			s.handleSavedProblemAttempts(w, r, parts[0])
			return
		}
		writeError(w, ErrBadRequest)
		return
	}

	savedProblemID := trimmed
	switch r.Method {
	case http.MethodGet:
		w.Header().Set("Content-Type", "application/json")
		if err := s.getSavedProblem(w, r, savedProblemID); err != nil {
			writeError(w, err)
		}
	case http.MethodPut:
		w.Header().Set("Content-Type", "application/json")
		if err := s.updateSavedProblem(w, r, savedProblemID); err != nil {
			writeError(w, err)
		}
	case http.MethodDelete:
		if err := s.deleteSavedProblem(w, r, savedProblemID); err != nil {
			writeError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		w.Header().Set("Allow", "GET, PUT, DELETE")
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) getSavedProblem(w http.ResponseWriter, r *http.Request, savedProblemID string) error {
	if s.services.SavedProblems == nil {
		return ErrNotImplemented
	}
	userID, err := s.requireUserID(r.Context())
	if err != nil {
		return err
	}

	detail, err := s.services.SavedProblems.GetSavedProblem(r.Context(), userID, savedProblemID)
	if err != nil {
		return err
	}

	return json.NewEncoder(w).Encode(SavedProblemDetailResponse{SavedProblem: detail})
}

func (s *Server) updateSavedProblem(w http.ResponseWriter, r *http.Request, savedProblemID string) error {
	if s.services.SavedProblems == nil {
		return ErrNotImplemented
	}
	userID, err := s.requireUserID(r.Context())
	if err != nil {
		return err
	}

	var req UpdateSavedProblemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return ErrBadRequest
	}

	var statusPtr *domain.SavedProblemStatus
	if req.Status != nil {
		parsed, parseErr := parseSavedProblemStatus(*req.Status)
		if parseErr != nil {
			return parseErr
		}
		statusPtr = &parsed
	}

	var notesPtr *string
	if req.Notes != nil {
		trimmed := strings.TrimSpace(*req.Notes)
		notesPtr = &trimmed
	}

	input := domain.SavedProblemUpdateInput{
		Status:       statusPtr,
		Tags:         req.Tags,
		Notes:        notesPtr,
		HintUnlocked: req.HintUnlocked,
	}

	summary, err := s.services.SavedProblems.UpdateSavedProblem(r.Context(), userID, savedProblemID, input, s.services.Clock.Now())
	if err != nil {
		return err
	}

	return json.NewEncoder(w).Encode(SavedProblemResponse{SavedProblem: summary})
}

func (s *Server) deleteSavedProblem(w http.ResponseWriter, r *http.Request, savedProblemID string) error {
	if s.services.SavedProblems == nil {
		return ErrNotImplemented
	}
	userID, err := s.requireUserID(r.Context())
	if err != nil {
		return err
	}

	return s.services.SavedProblems.DeleteSavedProblem(r.Context(), userID, savedProblemID)
}

func (s *Server) handleSavedProblemAttempts(w http.ResponseWriter, r *http.Request, savedProblemID string) {
	switch r.Method {
	case http.MethodGet:
		w.Header().Set("Content-Type", "application/json")
		if err := s.listSavedProblemAttempts(w, r, savedProblemID); err != nil {
			writeError(w, err)
		}
	case http.MethodPost:
		w.Header().Set("Content-Type", "application/json")
		if err := s.appendSavedProblemAttempt(w, r, savedProblemID); err != nil {
			writeError(w, err)
		}
	default:
		w.Header().Set("Allow", "GET, POST")
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) listSavedProblemAttempts(w http.ResponseWriter, r *http.Request, savedProblemID string) error {
	if s.services.SavedProblems == nil {
		return ErrNotImplemented
	}
	userID, err := s.requireUserID(r.Context())
	if err != nil {
		return err
	}

	attempts, err := s.services.SavedProblems.ListAttempts(r.Context(), userID, savedProblemID)
	if err != nil {
		return err
	}

	return json.NewEncoder(w).Encode(SavedProblemAttemptsResponse{Attempts: attempts})
}

func (s *Server) appendSavedProblemAttempt(w http.ResponseWriter, r *http.Request, savedProblemID string) error {
	if s.services.SavedProblems == nil {
		return ErrNotImplemented
	}
	userID, err := s.requireUserID(r.Context())
	if err != nil {
		return err
	}

	var req CreateSavedProblemAttemptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return ErrBadRequest
	}

	status := domain.SavedAttemptStatusSubmitted
	if trimmed := strings.TrimSpace(req.Status); trimmed != "" {
		parsed, parseErr := parseSavedAttemptStatus(trimmed)
		if parseErr != nil {
			return parseErr
		}
		status = parsed
	}

	input := domain.SavedProblemAttemptInput{
		AttemptID:   strings.TrimSpace(req.AttemptID),
		Status:      status,
		PassCount:   req.PassCount,
		FailCount:   req.FailCount,
		RuntimeMS:   req.RuntimeMS,
		Code:        req.Code,
		CodeS3Key:   strings.TrimSpace(req.CodeS3Key),
		SubmittedAt: req.SubmittedAt,
	}

	snapshot, err := s.services.SavedProblems.AppendAttempt(r.Context(), userID, savedProblemID, input, s.services.Clock.Now())
	if err != nil {
		return err
	}

	return json.NewEncoder(w).Encode(SavedProblemAttemptResponse{Attempt: snapshot})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if s.services.Health != nil {
		if err := s.services.Health.Check(r.Context()); err != nil {
			writeError(w, err)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(struct {
		Status string `json:"status"`
	}{Status: "ok"})
}

func (s *Server) handleVersion(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(struct {
		Version string `json:"version"`
	}{Version: "v0.1.0"})
}

func (s *Server) requireUserID(ctx context.Context) (string, error) {
	identity, ok := IdentityFromContext(ctx)
	if !ok {
		return "", ErrUnauthenticated
	}

	order := []string{identity.Subject, identity.Username, identity.Email}
	for _, candidate := range order {
		if trimmed := strings.TrimSpace(candidate); trimmed != "" {
			return trimmed, nil
		}
	}

	return "", ErrUnauthenticated
}

func parseSavedProblemStatus(raw string) (domain.SavedProblemStatus, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case string(domain.SavedProblemStatusInProgress):
		return domain.SavedProblemStatusInProgress, nil
	case string(domain.SavedProblemStatusCompleted):
		return domain.SavedProblemStatusCompleted, nil
	case string(domain.SavedProblemStatusArchived):
		return domain.SavedProblemStatusArchived, nil
	default:
		return "", fmt.Errorf("%w: invalid saved problem status %q", ErrBadRequest, raw)
	}
}

func parseSavedAttemptStatus(raw string) (domain.SavedAttemptStatus, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case string(domain.SavedAttemptStatusSubmitted):
		return domain.SavedAttemptStatusSubmitted, nil
	case string(domain.SavedAttemptStatusPassed):
		return domain.SavedAttemptStatusPassed, nil
	case string(domain.SavedAttemptStatusFailed):
		return domain.SavedAttemptStatusFailed, nil
	default:
		return "", fmt.Errorf("%w: invalid saved attempt status %q", ErrBadRequest, raw)
	}
}
