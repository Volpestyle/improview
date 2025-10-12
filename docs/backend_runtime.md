# Backend Runtime Configuration

The Go API can run in two generator modes:

- `static` (default) — uses `StaticProblemGenerator` with canned problems. This mode is fee-free and safe for CI/CD smoke checks.
- `llm` — forwards `/api/generate` requests to an OpenAI-compatible endpoint for real-time problem generation.

## Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `IMPROVIEW_OPENAI_API_KEY` | Bearer token for the OpenAI API when mode=`llm`. | Yes (llm) |
| `IMPROVIEW_OPENAI_MODEL` | Model name; defaults to `gpt-4.1-mini`. | No |
| `IMPROVIEW_OPENAI_BASE_URL` | Override base URL (defaults to `https://api.openai.com/v1`). | No |
| `IMPROVIEW_OPENAI_PROVIDER` | Optional label injected into prompts. | No |
| `IMPROVIEW_OPENAI_TIMEOUT_SECONDS` | Override request timeout (defaults to 25s). | No |
| `IMPROVIEW_OPENAI_TEMPERATURE` | Override temperature (defaults to `0.2`). | No |

### Authentication

| Variable | Description | Required |
| --- | --- | --- |
| `IMPROVIEW_AUTH_MODE` | Set to `cognito` to enforce JWT validation. | No |
| `IMPROVIEW_AUTH_COGNITO_USER_POOL_ID` | Cognito User Pool ID (e.g. `us-east-1_XXXX`). | Yes (`cognito`) |
| `IMPROVIEW_AUTH_COGNITO_APP_CLIENT_IDS` | Comma-separated list of allowed app client IDs. | Yes (`cognito`) |
| `IMPROVIEW_AUTH_COGNITO_REGION` | Overrides the AWS region derived from the pool ID. | No |
| `IMPROVIEW_AUTH_COGNITO_JWKS_URL` | Custom JWKS URL (defaults to Cognito well-known JWKS). | No |
| `IMPROVIEW_AUTH_JWKS_CACHE_TTL_SECONDS` | Cache duration for downloaded JWKS keys. | No |

### Per-request Overrides

- `/api/generate` now accepts an optional `mode` field (`static` or `llm`). When the field is empty or unsupported, the backend falls back to the configured default (`static`).
- LLM requests can also provide an `llm` object to override the provider, model, or base URL for a single call:

```json
{
  "category": "graphs",
  "difficulty": "medium",
  "mode": "llm",
  "llm": {
    "provider": "sandbox-openai",
    "model": "gpt-4.1-mini",
    "baseUrl": "http://127.0.0.1:8787"
  }
}
```

## Smoke Test Guidance

To exercise the deployed API and stream request/response payloads to the console, use the helper script or run the tests directly after exporting `IMPROVIEW_LIVE_BASE_URL` and a Cognito access token.

#### Authenticating Deployed Smoke Tests

When the backend runs with `IMPROVIEW_AUTH_MODE=cognito`, the live smoke tests need a valid bearer token. The fastest path is `./backend/scripts/run-smoke.sh`, which handles every step below automatically. For reference, the manual flow looks like this:

1. Ensure the Cognito app client allows the `USER_PASSWORD_AUTH` flow and create a non-production test user (for example `smoke-tester`).
2. Use the AWS CLI to exchange the username/password for an access token:

   ```bash
   export COGNITO_CLIENT_ID="<your-dev-app-client-id>"
   export SMOKE_USER="smoke-tester@example.com"
   export SMOKE_PASSWORD="replace-me"

   SMOKE_TOKEN=$(aws cognito-idp initiate-auth \
     --region us-east-1 \
     --client-id "$COGNITO_CLIENT_ID" \
     --auth-flow USER_PASSWORD_AUTH \
     --auth-parameters USERNAME=$SMOKE_USER,PASSWORD=$SMOKE_PASSWORD \
     --query 'AuthenticationResult.AccessToken' \
     --output text)

   export IMPROVIEW_LIVE_BASE_URL="https://bh853brv47.execute-api.us-east-1.amazonaws.com"
   export IMPROVIEW_LIVE_ACCESS_TOKEN="$SMOKE_TOKEN"
   ```

3. Run the suite. The tests automatically add the `Authorization: Bearer …` header when `IMPROVIEW_LIVE_ACCESS_TOKEN` is present:

   ```bash
   CI_SMOKE_DEBUG=1 go test ./internal/api -run Live -count=1
   ```

   The live suite calls `testenv.LoadOnce(".env.local")`, so you can instead place the Cognito token and base URL in a local env file and skip manual exporting.

Access tokens expire after roughly an hour; rerun the AWS CLI command whenever you see `401 Unauthorized` responses.

#### One-command runner

Use `backend/scripts/run-smoke.sh` to automate the entire flow (resolve stack outputs, fetch smoke credentials, mint an access token, and run the tests). Example:

```bash
./backend/scripts/run-smoke.sh --env dev --mode static
```

Prerequisites:

- AWS CLI configured with access to the target account/region.
- A smoke-test secret at `improview/<env>/smoke-credentials` containing `{"username": "...", "password": "..."}` (see [infra/cdk/README.md](../infra/cdk/README.md#manage-smoke-test-credentials)).
- Cognito app client ID exposed via `IMPROVIEW_COGNITO_CLIENT_ID` (or provided with `--client-id`).
- `python3` available for lightweight JSON parsing (no third-party packages required).
- The Cognito app client must allow the `USER_PASSWORD_AUTH` flow and the smoke-test user must have a permanent password. If Cognito returns `NEW_PASSWORD_REQUIRED`, run:

  ```bash
  aws cognito-idp admin-set-user-password \
    --region us-east-1 \
    --user-pool-id <your-user-pool-id> \
    --username <smoke-user-username> \
    --password '<strong-password>' \
    --permanent
  ```

Flags allow you to switch modes or override LLM settings without retyping credentials:

- `--mode llm --llm-api-key $OPENAI_API_KEY --llm-base-url http://127.0.0.1:8787`
- `--base-url https://custom.execute-api.us-east-1.amazonaws.com`
- `--run LiveGenerate` (passes through to `go test -run`)
- `--debug` to enable request/response logging
- `--client-secret <secret>` if your Cognito app client is configured with a secret (the script automatically computes the required `SECRET_HASH`).

`--mode llm` also tells the smoke tests to send `{"mode":"llm"}` with the `/api/generate` request so the deployed backend exercises the LLM generator (assuming it is configured with provider credentials). `--debug` runs the suite with `go test -v` and enables verbose request/response logging while still authenticating with Cognito.

The script defaults to the Cognito client ID from `IMPROVIEW_COGNITO_CLIENT_ID` (or `IMPROVIEW_AUTH_COGNITO_APP_CLIENT_ID`) and retrieves the smoke user secret at `improview/<env>/smoke-credentials`. Provide `--client-id` or `--secret-id` if you use different values.
