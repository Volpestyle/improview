package app

import "testing"

func TestConfigureAuthenticatorFromEnvDisabledByDefault(t *testing.T) {
	t.Setenv("COGNITO_USER_POOL_ID", "")
	t.Setenv("COGNITO_APP_CLIENT_IDS", "")

	authenticator, err := configureAuthenticatorFromEnv()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if authenticator != nil {
		t.Fatalf("expected authenticator to be nil when no user pool is configured")
	}
}

func TestConfigureAuthenticatorFromEnvUsesCognitoVars(t *testing.T) {
	t.Setenv("COGNITO_USER_POOL_ID", "us-east-1_example")
	t.Setenv("COGNITO_APP_CLIENT_IDS", "client-123")
	t.Setenv("COGNITO_REGION", "")
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
	t.Setenv("COGNITO_USER_POOL_ID", "us-east-1_example")
	t.Setenv("COGNITO_APP_CLIENT_IDS", "")

	if _, err := configureAuthenticatorFromEnv(); err == nil {
		t.Fatalf("expected error when user pool is set without client ids")
	}
}
