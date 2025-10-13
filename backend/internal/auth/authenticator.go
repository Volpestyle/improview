package auth

import (
	"context"
	"errors"
	"time"
)

// ErrUnauthenticated indicates that the request is missing valid credentials.
var ErrUnauthenticated = errors.New("auth: unauthenticated")

// ErrForbidden indicates that the caller is authenticated but lacks permissions.
var ErrForbidden = errors.New("auth: forbidden")

// Identity captures the caller details extracted from a verified token.
type Identity struct {
	Subject   string
	Username  string
	Email     string
	ClientID  string
	TokenUse  string
	Groups    []string
	Scopes    []string
	Issuer    string
	ExpiresAt time.Time
}

// Authenticator validates bearer tokens and surfaces the associated identity.
type Authenticator interface {
	Authenticate(ctx context.Context, token string) (Identity, error)
}
