# Improview Backend

Go application that powers the Improview API. This README covers local development, configuration, and the smoke-test workflow. For the HTTP contract, see `docs/backend_api_contract.md`.

## Prerequisites

- Go 1.22+ (toolchain `go1.24.5`).
- Node.js 18+ with pnpm 8 (commands below rely on monorepo scripts).
- `python3` (used by the smoke-test helper for lightweight JSON parsing).
- AWS CLI configured for the target account and region when running smoke tests.

## Local Development

1. Configure `backend/.env.local` with any required OpenAI-compatible credentials (API key, model overrides, etc.). The pnpm helpers load this file through `dotenvx`.
2. Start the API:
   ```bash
   pnpm backend:serve:local
   ```
   This runs `go run ./cmd/api` with the environment you defined.
3. Optional: run directly with Go if you have already exported the required env vars:
   ```bash
   cd backend
   go run ./cmd/api
   ```

## Scripts

- `pnpm backend:serve:local` — Run the API with `backend/.env.local`.
- `pnpm backend:smoke:local` — Execute smoke tests against `http://localhost:8080`.
- `pnpm backend:smoke:dev` — Resolve stack outputs, authenticate with Cognito, and hit the deployed dev API (ignores local `BASE_URL` unless you pass `--base-url`).

`backend/scripts/run-smoke.sh` powers the smoke commands and accepts extra flags. Example:

```bash
./backend/scripts/run-smoke.sh --env dev --mode llm --debug
```

Only `backend/.env.local` is required for local helpers; when you target a deployed stack the script fetches the base URL from CloudFormation automatically.

> Tip: pnpm forwards flags directly, so you can run `pnpm backend:smoke:local --mode llm` or `pnpm backend:smoke:dev --run LiveGenerate` without adding an extra `--`. The helper exports `BASE_URL` for downstream scripts.
> Output is color-coded when run in a TTY; set `NO_COLOR=1` if you prefer plain logs.

## Configuration

When `OPENAI_API_KEY` is present the live LLM generator becomes available. Static packs remain the default, and callers can pass `"mode": "llm"` or `"mode": "static"` per request (or via `run-smoke.sh --mode ...`) to override the behavior.

### Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `OPENAI_API_KEY` | API key that enables live LLM-backed generation. | Yes (llm) |
| `OPENAI_MODEL` | Model name (defaults to `gpt-4.1-mini`). | No |
| `OPENAI_BASE_URL` | Override base URL (`https://api.openai.com/v1` by default). | No |
| `OPENAI_PROVIDER` | Optional label recorded with requests. | No |
| `OPENAI_TIMEOUT_SECONDS` | Request timeout in seconds (defaults to `25`). | No |
| `OPENAI_TEMPERATURE` | Sampling temperature (defaults to `0.2`). | No |

#### Authentication

| Variable | Description | Required |
| --- | --- | --- |
| `USER_POOL_ID` | Cognito User Pool ID. Enabling this turns auth on. | Yes (secured) |
| `USER_POOL_CLIENT_ID` | Primary Cognito App Client ID allowed to call the API. | Yes (secured) |
| `USER_POOL_CLIENT_IDS` | Additional comma-separated client IDs (optional). | No |
| `COGNITO_REGION` | Override region parsed from the pool ID. | No |
| `COGNITO_JWKS_URL` | Custom JWKS URL (defaults to Cognito discovery). | No |
| `COGNITO_JWKS_CACHE_TTL_SECONDS` | Cache TTL for downloaded JWKS keys. | No |

> The CDK stack automatically injects `USER_POOL_ID`, `USER_POOL_CLIENT_ID`, and `PROVIDER_SECRET_ARN` into the Lambda runtime, so deployed stacks stay authenticated without extra configuration. Legacy variables prefixed with `COGNITO_` are still honoured for backward compatibility.

## Smoke Tests

### One-time Secret Seeding

Store the Cognito smoke-test credentials in AWS Secrets Manager so local runs and CI can fetch them. Replace `dev` with the desired environment name:

```bash
export SMOKE_USER="smoke-tester@example.com"
export SMOKE_PASSWORD="$(openssl rand -base64 24)"
export USER_POOL_ID="us-east-1_example" # replace with your Cognito user pool ID
export USER_POOL_CLIENT_ID="your-app-client-id"
```

Create (or recreate) the Cognito smoke user and set its password to permanent so the `USER_PASSWORD_AUTH` flow succeeds:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$SMOKE_USER" \
  --user-attributes Name=email,Value="$SMOKE_USER" Name=email_verified,Value=true \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --user-pool-id "$USER_POOL_ID" \
  --username "$SMOKE_USER" \
  --password "$SMOKE_PASSWORD" \
  --permanent
```

If the user already exists, skip straight to `admin-set-user-password`. Verify the account with `aws cognito-idp admin-get-user --user-pool-id "$USER_POOL_ID" --username "$SMOKE_USER"`.

Store the credentials in Secrets Manager so automation can mint tokens:

```bash
aws secretsmanager create-secret \
  --region us-east-1 \
  --name "improview/dev/smoke-credentials" \
  --description "Cognito smoke-test credentials" \
  --secret-string "{\"username\":\"${SMOKE_USER}\",\"password\":\"${SMOKE_PASSWORD}\"}"
```

For subsequent rotations, replace `create-secret` with `put-secret-value` and reuse the same `--secret-id`.

### Running the Suite

- Local API:
  ```bash
  pnpm backend:smoke:local
  ```
- Deployed dev stack:
  ```bash
  pnpm backend:smoke:dev
  ```

Both commands fetch smoke credentials, mint a Cognito access token (when auth is enabled), and execute the Go `Live` tests. Useful flags:

- `--mode llm` — forces `/api/generate` to exercise the live LLM generator.
- `--base-url <url>` — hit a custom API Gateway URL.
- `--run LiveGenerate` — forward a custom test selector to `go test -run`.
- `--client-secret <secret>` — supply the Cognito client secret if required.
- `--debug` — enable verbose Go test output and HTTP logging.

Under the hood `backend/scripts/run-smoke.sh` asks CloudFormation for the `ApiEndpoint` output, exports it as `BASE_URL`, and then runs `go test ./internal/api`. The tests (`backend/internal/api/live_api_test.go`) simply read `BASE_URL` from the environment, so the automatic export keeps local invocations and CI in sync; set `BASE_URL` yourself only when you want to override the resolved value.

If you ever need to run the flow manually, obtain a token with:

```bash
SMOKE_TOKEN=$(aws cognito-idp initiate-auth \
  --region us-east-1 \
  --client-id "${USER_POOL_CLIENT_ID:-$(echo "$USER_POOL_CLIENT_IDS" | tr ',' '\n' | head -n1 | xargs)}" \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=$SMOKE_USER,PASSWORD=$SMOKE_PASSWORD \
  --query 'AuthenticationResult.AccessToken' \
  --output text)

export BASE_URL="https://example.execute-api.us-east-1.amazonaws.com"
export IMPROVIEW_LIVE_ACCESS_TOKEN="$SMOKE_TOKEN"

CI_SMOKE_DEBUG=1 go test ./internal/api -run Live -count=1
```

Access tokens expire in roughly an hour; rerun the CLI command when you see `401 Unauthorized`. Ensure the Cognito app client allows the `USER_PASSWORD_AUTH` flow and that the smoke user has a permanent password (`aws cognito-idp admin-set-user-password --permanent ...`).

## Additional Resources

- API contract: `docs/backend_api_contract.md` (OpenAPI: `docs/backend_api_contract.yaml`).
- Infrastructure setup and smoke credential management: `infra/cdk/README.md`.
