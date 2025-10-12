# Backend Runtime Configuration

The Go API can run in two generator modes:

- `static` (default) — uses `StaticProblemGenerator` with canned problems. This mode is fee-free and safe for CI/CD smoke checks.
- `llm` — forwards `/api/generate` requests to an OpenAI-compatible endpoint for real-time problem generation.

## Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `IMPROVIEW_GENERATOR_MODE` | `static` (default) or `llm`. | No |
| `IMPROVIEW_OPENAI_API_KEY` | Bearer token for the OpenAI API when mode=`llm`. | Yes (llm) |
| `IMPROVIEW_OPENAI_MODEL` | Model name; defaults to `gpt-4.1-mini`. | No |
| `IMPROVIEW_OPENAI_BASE_URL` | Override base URL (defaults to `https://api.openai.com/v1`). | No |
| `IMPROVIEW_OPENAI_PROVIDER` | Optional label injected into prompts. | No |
| `IMPROVIEW_OPENAI_TIMEOUT_SECONDS` | Override request timeout (defaults to 25s). | No |
| `IMPROVIEW_OPENAI_TEMPERATURE` | Override temperature (defaults to `0.2`). | No |

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

Set `IMPROVIEW_GENERATOR_MODE=static` for automated smoke tests against deployed environments. This keeps coverage high without incurring LLM inference charges. When you want end-to-end verification of the LLM path, flip the variable to `llm` and provide the required credentials.
### Running Live Smoke Tests Locally

To exercise the deployed API and stream request/response payloads to the console.

The Go integration tests in `backend/internal/api` default to the static generator, but they will automatically honour `IMPROVIEW_GENERATOR_MODE=llm` when set. This lets you re-use the existing test suite to validate the real LLM path:

```bash
cd backend
export IMPROVIEW_GENERATOR_MODE=llm
export IMPROVIEW_OPENAI_API_KEY=...
# optional: point at a mock server
export IMPROVIEW_OPENAI_BASE_URL="http://127.0.0.1:8787"
CI_SMOKE_DEBUG=1 go test ./internal/api -run Generate -v
```

`CI_SMOKE_DEBUG=1` gates additional logging so routine runs stay quiet. Drop the prefix (or unset the variable) along with `IMPROVIEW_LIVE_BASE_URL` when you are done.

To exercise the deployed API gateway instead of the in-process server, set `IMPROVIEW_LIVE_BASE_URL` and run the `Live` suite:

```bash
cd backend
export IMPROVIEW_LIVE_BASE_URL="https://your-env.example.com"
CI_SMOKE_DEBUG=1 go test ./internal/api -run Live -v
```
