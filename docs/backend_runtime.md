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

## Smoke Test Guidance

Set `IMPROVIEW_GENERATOR_MODE=static` for automated smoke tests against deployed environments. This keeps coverage high without incurring LLM inference charges. When you want end-to-end verification of the LLM path, flip the variable to `llm` and provide the required credentials.
### Running Live Smoke Tests Locally

To exercise the deployed API and stream request/response payloads to the console:

```bash
cd backend
export IMPROVIEW_LIVE_BASE_URL="https://bh853brv47.execute-api.us-east-1.amazonaws.com"
CI_SMOKE_DEBUG=1 go test ./internal/api -run Live -v
```

`CI_SMOKE_DEBUG` gates additional logging so routine runs stay quiet. Unset it and `IMPROVIEW_LIVE_BASE_URL` when you are done.
