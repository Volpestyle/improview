package api

import (
	"context"

	"improview/backend/internal/auth"
)

type identityKey struct{}

// WithIdentity attaches the caller identity to the request context.
func WithIdentity(ctx context.Context, identity auth.Identity) context.Context {
	return context.WithValue(ctx, identityKey{}, identity)
}

// IdentityFromContext extracts the caller identity if present.
func IdentityFromContext(ctx context.Context) (auth.Identity, bool) {
	val := ctx.Value(identityKey{})
	if val == nil {
		return auth.Identity{}, false
	}
	identity, ok := val.(auth.Identity)
	return identity, ok
}
