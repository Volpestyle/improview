package runtime

import "testing"

func TestParseProviderSecretExtractsKnownFields(t *testing.T) {
	payload := `{
		"openaiApiKey": "  key-123  ",
		"openaiBaseUrl": "https://api.sandbox/v1 ",
		"openaiModel": "gpt-sandbox",
		"openaiProvider": "sandbox",
		"grokApiKey": "ignored"
	}`

	env, err := parseProviderSecret(payload)
	if err != nil {
		t.Fatalf("parse provider secret: %v", err)
	}

	assertEqual(t, env["IMPROVIEW_OPENAI_API_KEY"], "key-123")
	assertEqual(t, env["IMPROVIEW_OPENAI_BASE_URL"], "https://api.sandbox/v1")
	assertEqual(t, env["IMPROVIEW_OPENAI_MODEL"], "gpt-sandbox")
	assertEqual(t, env["IMPROVIEW_OPENAI_PROVIDER"], "sandbox")

	if _, ok := env["grokApiKey"]; ok {
		t.Fatalf("unexpected field grokApiKey propagated")
	}
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
