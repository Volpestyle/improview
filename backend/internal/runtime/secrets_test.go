package runtime

import "testing"

func TestParseProviderSecretExtractsKnownFields(t *testing.T) {
	payload := `{
			"openaiApiKey": "  key-123  ",
			"openaiBaseUrl": "https://api.sandbox/v1 ",
			"openaiModel": "gpt-sandbox",
			"openaiProvider": "sandbox",
			"grokApiKey": "grok-secret",
			"anthropicApiKey": "claude-secret",
			"googleApiKey": "gemini-secret"
		}`

	env, err := parseProviderSecret(payload)
	if err != nil {
		t.Fatalf("parse provider secret: %v", err)
	}

	assertEqual(t, env["OPENAI_API_KEY"], "key-123")
	assertEqual(t, env["OPENAI_BASE_URL"], "https://api.sandbox/v1")
	assertEqual(t, env["OPENAI_MODEL"], "gpt-sandbox")
	assertEqual(t, env["OPENAI_PROVIDER"], "sandbox")

	assertEqual(t, env["GROK_API_KEY"], "grok-secret")
	assertEqual(t, env["ANTHROPIC_API_KEY"], "claude-secret")
	assertEqual(t, env["GOOGLE_API_KEY"], "gemini-secret")
}

func TestParseProviderSecretIgnoresMissingFields(t *testing.T) {
	payload := `{"updatedAt":"2024-01-01T00:00:00Z"}`
	env, err := parseProviderSecret(payload)
	if err != nil {
		t.Fatalf("parse provider secret: %v", err)
	}
	if len(env) != 0 {
		t.Fatalf("expected no env values, got %v", env)
	}
}

func assertEqual(t *testing.T, got, want string) {
	t.Helper()
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}
