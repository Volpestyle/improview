package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// CognitoConfig controls how the Cognito authenticator validates tokens.
type CognitoConfig struct {
	UserPoolID   string
	Region       string
	AppClientIDs []string
	JWKSURL      string
	TokenUse     string
	CacheTTL     time.Duration
	HTTPClient   *http.Client
}

// Validate ensures the configuration contains the required fields.
func (c *CognitoConfig) Validate() error {
	c.UserPoolID = strings.TrimSpace(c.UserPoolID)
	if c.UserPoolID == "" {
		return errors.New("cognito auth: user pool id is required")
	}

	c.Region = strings.TrimSpace(c.Region)
	if c.Region == "" {
		parts := strings.SplitN(c.UserPoolID, "_", 2)
		if len(parts) == 0 || strings.TrimSpace(parts[0]) == "" {
			return errors.New("cognito auth: region is required")
		}
		c.Region = parts[0]
	}

	clientIDs := make([]string, 0, len(c.AppClientIDs))
	for _, id := range c.AppClientIDs {
		if trimmed := strings.TrimSpace(id); trimmed != "" {
			clientIDs = append(clientIDs, trimmed)
		}
	}
	if len(clientIDs) == 0 {
		return errors.New("cognito auth: at least one app client id is required")
	}
	c.AppClientIDs = clientIDs

	if c.TokenUse == "" {
		c.TokenUse = "access"
	}
	if c.CacheTTL <= 0 {
		c.CacheTTL = 12 * time.Hour
	}
	if c.HTTPClient == nil {
		c.HTTPClient = http.DefaultClient
	}
	if c.JWKSURL == "" {
		c.JWKSURL = fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s/.well-known/jwks.json", c.Region, c.UserPoolID)
	}

	return nil
}

// CognitoAuthenticator validates Cognito JWTs using the JWKS endpoint.
type CognitoAuthenticator struct {
	issuer    string
	jwksURL   string
	clientIDs map[string]struct{}
	tokenUse  string

	httpClient *http.Client
	cacheTTL   time.Duration

	mu        sync.RWMutex
	keys      map[string]*rsa.PublicKey
	expiresAt time.Time
}

// NewCognitoAuthenticator constructs a Cognito-backed authenticator.
func NewCognitoAuthenticator(cfg CognitoConfig) (*CognitoAuthenticator, error) {
	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	clientIDs := make(map[string]struct{}, len(cfg.AppClientIDs))
	for _, id := range cfg.AppClientIDs {
		clientIDs[id] = struct{}{}
	}

	return &CognitoAuthenticator{
		issuer:     fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s", cfg.Region, cfg.UserPoolID),
		jwksURL:    cfg.JWKSURL,
		clientIDs:  clientIDs,
		tokenUse:   cfg.TokenUse,
		httpClient: cfg.HTTPClient,
		cacheTTL:   cfg.CacheTTL,
		keys:       make(map[string]*rsa.PublicKey),
	}, nil
}

// Authenticate validates the provided bearer token and returns its identity.
func (a *CognitoAuthenticator) Authenticate(ctx context.Context, token string) (Identity, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return Identity{}, ErrUnauthenticated
	}

	claims := &cognitoClaims{}
	parser := jwt.NewParser(
		jwt.WithIssuer(a.issuer),
		jwt.WithValidMethods([]string{jwt.SigningMethodRS256.Alg()}),
	)

	parsed, err := parser.ParseWithClaims(token, claims, func(t *jwt.Token) (any, error) {
		kid, _ := t.Header["kid"].(string)
		if kid == "" {
			return nil, fmt.Errorf("cognito auth: token missing kid header")
		}
		return a.getKey(ctx, kid)
	})
	if err != nil || !parsed.Valid {
		return Identity{}, ErrUnauthenticated
	}

	if claims.TokenUse != "" && !strings.EqualFold(claims.TokenUse, a.tokenUse) {
		return Identity{}, ErrForbidden
	}

	if _, ok := a.clientIDs[claims.ClientID]; !ok {
		return Identity{}, ErrForbidden
	}

	expiration, err := claims.GetExpirationTime()
	if err != nil || expiration == nil {
		return Identity{}, ErrUnauthenticated
	}

	id := Identity{
		Subject:   claims.Subject,
		Username:  claims.Username,
		Email:     claims.Email,
		ClientID:  claims.ClientID,
		TokenUse:  claims.TokenUse,
		Groups:    append([]string(nil), claims.Groups...),
		Scopes:    splitScope(claims.Scope),
		Issuer:    claims.Issuer,
		ExpiresAt: expiration.Time,
	}
	return id, nil
}

func (a *CognitoAuthenticator) getKey(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	now := time.Now()

	a.mu.RLock()
	key := a.keys[kid]
	expiry := a.expiresAt
	a.mu.RUnlock()

	if key != nil && now.Before(expiry) {
		return key, nil
	}

	if err := a.refreshKeys(ctx); err != nil {
		if key != nil {
			return key, nil
		}
		return nil, err
	}

	a.mu.RLock()
	defer a.mu.RUnlock()
	key = a.keys[kid]
	if key == nil {
		return nil, fmt.Errorf("cognito auth: kid %q not found in jwks", kid)
	}
	return key, nil
}

func (a *CognitoAuthenticator) refreshKeys(ctx context.Context) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if len(a.keys) > 0 && time.Now().Before(a.expiresAt) {
		return nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, a.jwksURL, nil)
	if err != nil {
		return fmt.Errorf("cognito auth: create jwks request: %w", err)
	}

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("cognito auth: fetch jwks: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("cognito auth: jwks responded with %d", resp.StatusCode)
	}

	var payload jwksPayload
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return fmt.Errorf("cognito auth: decode jwks: %w", err)
	}

	keys := make(map[string]*rsa.PublicKey)
	for _, item := range payload.Keys {
		if item.Kty != "RSA" || item.Kid == "" {
			continue
		}
		pub, err := jwkToPublicKey(item.N, item.E)
		if err != nil {
			continue
		}
		keys[item.Kid] = pub
	}

	if len(keys) == 0 {
		return errors.New("cognito auth: no RSA keys found in jwks payload")
	}

	a.keys = keys
	a.expiresAt = time.Now().Add(a.cacheTTL)
	return nil
}

type jwksPayload struct {
	Keys []struct {
		Kty string `json:"kty"`
		E   string `json:"e"`
		N   string `json:"n"`
		Kid string `json:"kid"`
		Alg string `json:"alg"`
	} `json:"keys"`
}

func jwkToPublicKey(nStr, eStr string) (*rsa.PublicKey, error) {
	nb, err := base64.RawURLEncoding.DecodeString(nStr)
	if err != nil {
		return nil, fmt.Errorf("decode modulus: %w", err)
	}
	eb, err := base64.RawURLEncoding.DecodeString(eStr)
	if err != nil {
		return nil, fmt.Errorf("decode exponent: %w", err)
	}

	var exponent int
	for _, b := range eb {
		exponent = exponent<<8 + int(b)
	}
	if exponent == 0 {
		return nil, errors.New("invalid exponent")
	}

	return &rsa.PublicKey{
		N: new(big.Int).SetBytes(nb),
		E: exponent,
	}, nil
}

type cognitoClaims struct {
	Username string   `json:"username"`
	ClientID string   `json:"client_id"`
	TokenUse string   `json:"token_use"`
	Scope    string   `json:"scope"`
	Email    string   `json:"email"`
	Groups   []string `json:"cognito:groups"`
	jwt.RegisteredClaims
}

func splitScope(scope string) []string {
	if scope == "" {
		return nil
	}
	fields := strings.Fields(scope)
	return append([]string(nil), fields...)
}
