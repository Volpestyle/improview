# Improview Backend

Go application that powers the Improview API. This README covers local development, configuration, and the smoke-test workflow. For the HTTP contract, see `docs/backend_api_contract.md`.

## Prerequisites

- Go 1.22+ (toolchain `go1.24.5`).
- Node.js 18+ with pnpm 8 (commands below rely on monorepo scripts).
- `python3` (used by the smoke-test helper for lightweight JSON parsing).
- AWS CLI configured for the target account and region when running smoke tests.

## Local Development

1. Configure `backend/.env.local` with the generator mode (`IMPROVIEW_GENERATOR_MODE=static|llm`) and any OpenAI-compatible credentials. The pnpm helpers load this file through `dotenvx`.
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
- `pnpm backend:smoke:dev` — Resolve stack outputs, authenticate with Cognito, and hit the deployed dev API (ignores local `IMPROVIEW_LIVE_BASE_URL`/`BASE_URL` unless you pass `--base-url`).

`backend/scripts/run-smoke.sh` powers the smoke commands and accepts extra flags. Example:

```bash
./backend/scripts/run-smoke.sh --env dev --mode llm --debug
```

Only `backend/.env.local` is required for local helpers; when you target a deployed stack the script fetches the base URL from CloudFormation automatically.

> Tip: pnpm forwards flags directly, so you can run `pnpm backend:smoke:local --mode llm` or `pnpm backend:smoke:dev --run LiveGenerate` without adding an extra `--`. The helper exports both `IMPROVIEW_LIVE_BASE_URL` and `BASE_URL` for compatibility with CI scripts.
> Output is color-coded when run in a TTY; set `NO_COLOR=1` if you prefer plain logs.

## Configuration

### Generator Modes

- `static` (default) — Uses `StaticProblemGenerator` and canned problems; safe for CI and offline testing.
- `llm` — Sends `/api/generate` requests to an OpenAI-compatible provider for live generation.

Set the default with `IMPROVIEW_GENERATOR_MODE`. Per-request callers can override by passing `"mode": "llm"` or `"static"` in the JSON payload; unknown values fall back to the configured default.

### Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `IMPROVIEW_OPENAI_API_KEY` | API key when `IMPROVIEW_GENERATOR_MODE=llm`. | Yes (llm) |
| `IMPROVIEW_OPENAI_MODEL` | Model name (defaults to `gpt-4.1-mini`). | No |
| `IMPROVIEW_OPENAI_BASE_URL` | Override base URL (`https://api.openai.com/v1` by default). | No |
| `IMPROVIEW_OPENAI_PROVIDER` | Optional label recorded with requests. | No |
| `IMPROVIEW_OPENAI_TIMEOUT_SECONDS` | Request timeout in seconds (defaults to `25`). | No |
| `IMPROVIEW_OPENAI_TEMPERATURE` | Sampling temperature (defaults to `0.2`). | No |

#### Authentication

| Variable | Description | Required |
| --- | --- | --- |
| `IMPROVIEW_AUTH_COGNITO_USER_POOL_ID` | Cognito User Pool ID (or `USER_POOL_ID`). Enabling this turns auth on. | Yes (secured) |
| `IMPROVIEW_AUTH_COGNITO_APP_CLIENT_IDS` | Comma-separated list of allowed app client IDs. Falls back to `IMPROVIEW_AUTH_COGNITO_APP_CLIENT_ID` or `USER_POOL_CLIENT_ID`. | Yes (secured) |
| `IMPROVIEW_AUTH_COGNITO_REGION` | Override region parsed from the pool ID. | No |
| `IMPROVIEW_AUTH_COGNITO_JWKS_URL` | Custom JWKS URL (defaults to Cognito discovery). | No |
| `IMPROVIEW_AUTH_JWKS_CACHE_TTL_SECONDS` | Cache TTL for downloaded JWKS keys. | No |

> The CDK stack automatically injects `USER_POOL_ID` and `USER_POOL_CLIENT_ID` into the Lambda runtime, so deployed stacks stay authenticated without extra configuration.

## Smoke Tests

### One-time Secret Seeding

Store the Cognito smoke-test credentials in AWS Secrets Manager so local runs and CI can fetch them:

```bash
export IMPROVIEW_ENV=dev
export SMOKE_USER="smoke-tester@example.com"
export SMOKE_PASSWORD="$(openssl rand -base64 24)"

aws secretsmanager create-secret \
  --region us-east-1 \
  --name "improview/${IMPROVIEW_ENV}/smoke-credentials" \
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

If you ever need to run the flow manually, obtain a token with:

```bash
SMOKE_TOKEN=$(aws cognito-idp initiate-auth \
  --region us-east-1 \
  --client-id "$IMPROVIEW_COGNITO_CLIENT_ID" \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=$SMOKE_USER,PASSWORD=$SMOKE_PASSWORD \
  --query 'AuthenticationResult.AccessToken' \
  --output text)

export IMPROVIEW_LIVE_BASE_URL="https://example.execute-api.us-east-1.amazonaws.com"
export IMPROVIEW_LIVE_ACCESS_TOKEN="$SMOKE_TOKEN"

CI_SMOKE_DEBUG=1 go test ./internal/api -run Live -count=1
```

Access tokens expire in roughly an hour; rerun the CLI command when you see `401 Unauthorized`. Ensure the Cognito app client allows the `USER_PASSWORD_AUTH` flow and that the smoke user has a permanent password (`aws cognito-idp admin-set-user-password --permanent ...`).

## Additional Resources

- API contract: `docs/backend_api_contract.md` (OpenAPI: `docs/backend_api_contract.yaml`).
- Infrastructure setup and smoke credential management: `infra/cdk/README.md`.
