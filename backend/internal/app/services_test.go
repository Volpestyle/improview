package app

import "testing"

func TestConfigureAuthenticatorFromEnvDisabledByDefault(t *testing.T) {
	t.Setenv("IMPROVIEW_AUTH_COGNITO_USER_POOL_ID", "")
	t.Setenv("USER_POOL_ID", "")
	t.Setenv("IMPROVIEW_AUTH_COGNITO_APP_CLIENT_IDS", "")
	t.Setenv("IMPROVIEW_AUTH_COGNITO_APP_CLIENT_ID", "")
	t.Setenv("USER_POOL_CLIENT_ID", "")

	authenticator, err := configureAuthenticatorFromEnv()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if authenticator != nil {
		t.Fatalf("expected authenticator to be nil when no user pool is configured")
	}
}

func TestConfigureAuthenticatorFromEnvUsesFallbackVars(t *testing.T) {
	t.Setenv("IMPROVIEW_AUTH_COGNITO_USER_POOL_ID", "")
	t.Setenv("USER_POOL_ID", "us-east-1_example")
	t.Setenv("IMPROVIEW_AUTH_COGNITO_APP_CLIENT_IDS", "")
	t.Setenv("IMPROVIEW_AUTH_COGNITO_APP_CLIENT_ID", "")
	t.Setenv("USER_POOL_CLIENT_ID", "client-123")
	t.Setenv("IMPROVIEW_AUTH_COGNITO_REGION", "")
	t.Setenv("AWS_REGION", "")
	t.Setenv("AWS_DEFAULT_REGION", "")

	authenticator, err := configureAuthenticatorFromEnv()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if authenticator == nil {
		t.Fatalf("expected authenticator when user pool and client id are provided")
	}
}

func TestConfigureAuthenticatorFromEnvRequiresClientID(t *testing.T) {
	t.Setenv("IMPROVIEW_AUTH_COGNITO_USER_POOL_ID", "us-east-1_example")
	t.Setenv("USER_POOL_ID", "")
	t.Setenv("IMPROVIEW_AUTH_COGNITO_APP_CLIENT_IDS", "")
	t.Setenv("IMPROVIEW_AUTH_COGNITO_APP_CLIENT_ID", "")
	t.Setenv("USER_POOL_CLIENT_ID", "")

	if _, err := configureAuthenticatorFromEnv(); err == nil {
		t.Fatalf("expected error when user pool is set without client ids")
	}
}
