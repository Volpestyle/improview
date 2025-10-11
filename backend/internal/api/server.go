package api

import (
	"encoding/json"
	"net/http"
	"strings"

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
	s.mux.Handle("/api/generate", s.jsonHandler(http.MethodPost, s.handleGenerate))
	s.mux.Handle("/api/attempt", s.jsonHandler(http.MethodPost, s.handleCreateAttempt))
	s.mux.Handle("/api/run-tests", s.jsonHandler(http.MethodPost, s.handleRunTests))
	s.mux.Handle("/api/submit", s.jsonHandler(http.MethodPost, s.handleSubmit))
	s.mux.Handle("/api/attempt/", http.HandlerFunc(s.handleAttemptByID))
	s.mux.Handle("/api/problem/", http.HandlerFunc(s.handleProblemByID))
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
