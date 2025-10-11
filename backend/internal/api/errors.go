package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
)

var (
	// ErrBadRequest indicates the client supplied invalid data.
	ErrBadRequest = errors.New("bad request")
	// ErrUnauthenticated indicates the user must authenticate before retrying.
	ErrUnauthenticated = errors.New("unauthenticated")
	// ErrForbidden indicates the caller lacks permissions.
	ErrForbidden = errors.New("forbidden")
	// ErrNotFound indicates the resource could not be located.
	ErrNotFound = errors.New("not found")
	// ErrNotImplemented is returned for handlers without a backend implementation yet.
	ErrNotImplemented = errors.New("not implemented")
)

// writeError serializes the provided error into a JSON envelope.
func writeError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	errorCode := "internal_error"
	switch {
	case errors.Is(err, ErrBadRequest):
		status = http.StatusBadRequest
		errorCode = "bad_request"
	case errors.Is(err, ErrUnauthenticated):
		status = http.StatusUnauthorized
		errorCode = "unauthenticated"
	case errors.Is(err, ErrForbidden):
		status = http.StatusForbidden
		errorCode = "forbidden"
	case errors.Is(err, ErrNotFound):
		status = http.StatusNotFound
		errorCode = "not_found"
	case errors.Is(err, ErrNotImplemented):
		status = http.StatusNotImplemented
		errorCode = "not_implemented"
	}

	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(ErrorResponse{Error: errorCode, Message: err.Error()}); err != nil {
		log.Printf("api: failed to write error response: %v", err)
	}
}
