package runtime

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

var envKeys = []string{
	"OPENAI_API_KEY",
	"OPENAI_BASE_URL",
	"OPENAI_MODEL",
	"OPENAI_PROVIDER",
}

// LoadLLMEnvFromSecret pulls provider credentials from Secrets Manager when they are not
// already present in the process environment. Invoked once during Lambda cold start.
func LoadLLMEnvFromSecret(ctx context.Context) error {
	secretARN := strings.TrimSpace(os.Getenv("PROVIDER_SECRET_ARN"))
	if secretARN == "" {
		return nil
	}

	if envSatisfied() {
		return nil
	}

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return fmt.Errorf("load aws configuration: %w", err)
	}

	client := secretsmanager.NewFromConfig(cfg)
	output, err := client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
		SecretId: aws.String(secretARN),
	})
	if err != nil {
		return fmt.Errorf("fetch provider secret: %w", err)
	}

	var secretStr string
	if output.SecretString != nil {
		secretStr = *output.SecretString
	}
	if secretStr == "" {
		return errors.New("provider secret payload was empty")
	}

	values, err := parseProviderSecret(secretStr)
	if err != nil {
		return err
	}

	for key, value := range values {
		current := strings.TrimSpace(os.Getenv(key))
		trimmed := strings.TrimSpace(value)
		if current != "" || trimmed == "" {
			continue
		}
		if err := os.Setenv(key, trimmed); err != nil {
			return fmt.Errorf("set %s from provider secret: %w", key, err)
		}
	}

	if strings.TrimSpace(os.Getenv("OPENAI_API_KEY")) == "" {
		return errors.New("provider secret did not include openaiApiKey")
	}

	return nil
}

func envSatisfied() bool {
	for _, key := range envKeys {
		if strings.TrimSpace(os.Getenv(key)) == "" {
			return false
		}
	}
	return true
}

func parseProviderSecret(secret string) (map[string]string, error) {
	var payload map[string]any
	if err := json.Unmarshal([]byte(secret), &payload); err != nil {
		return nil, fmt.Errorf("parse provider secret JSON: %w", err)
	}

	results := make(map[string]string)
	if val, ok := stringValue(payload["openaiApiKey"]); ok {
		results["OPENAI_API_KEY"] = val
	}
	if val, ok := stringValue(payload["openaiBaseUrl"]); ok {
		results["OPENAI_BASE_URL"] = val
	}
	if val, ok := stringValue(payload["openaiModel"]); ok {
		results["OPENAI_MODEL"] = val
	}
	if val, ok := stringValue(payload["openaiProvider"]); ok {
		results["OPENAI_PROVIDER"] = val
	}

	return results, nil
}

func stringValue(v any) (string, bool) {
	switch value := v.(type) {
	case string:
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			return "", false
		}
		return trimmed, true
	}
	return "", false
}
