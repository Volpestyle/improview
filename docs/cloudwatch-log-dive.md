# AWS CloudWatch Log Dive Notes

## Context
- Target: `Improview-dev-Backend` Lambda invoked by API Gateway (`/api/generate` failures in smoke tests).
- Symptom: `TestLiveGenerate` and `TestLiveAttemptLifecycle` returning `500` during `pnpm backend:smoke:dev`.
- Goal: Trace backend failures by correlating smoke-test output with CloudWatch logs.

## Local Reproduction
- Command: `pnpm backend:smoke:dev`
- Result excerpt:
  ```
  [RESP POST /api/generate] status=500 body={
    "error": "internal_error",
    "message": "llm generator: upstream 401 invalid_request_error: Incorrect API key provided: replace-*********-key. You can find your API key at https://platform.openai.com/account/api-keys."
  }
  ```
- Interpretation: Lambda responded with an error propagated from the LLM generator (OpenAI 401).

## AWS CLI Session
All commands run from repository root with `aws-cli/2.4.7`.

1. **Verify identity**
   ```bash
   aws sts get-caller-identity
   ```
   Ensures AWS credentials are active before querying logs.

2. **Locate Lambda log group**
   ```bash
   aws logs describe-log-groups \
     --log-group-name-prefix '/aws/lambda/Improview-dev-Backend-ApiHandler'
   ```
   Returned two log groups for distinct deployments; chose the latest (`...-stfYHdBtiuYF`).

3. **List recent log streams**
   ```bash
   aws logs describe-log-streams \
     --log-group-name '/aws/lambda/Improview-dev-Backend-ApiHandler5E7490E8-stfYHdBtiuYF' \
     --order-by LastEventTime --descending --limit 5
   ```
   Identified stream `2025/10/13/[$LATEST]faa5f14497c94e6d946bbc924f454b26` with events at `2025-10-13T02:10:11Z` (matches CI failure timestamp).

4. **Fetch log events**
   ```bash
   aws logs get-log-events \
     --log-group-name '/aws/lambda/Improview-dev-Backend-ApiHandler5E7490E8-stfYHdBtiuYF' \
     --log-stream-name '2025/10/13/[$LATEST]faa5f14497c94e6d946bbc924f454b26' \
     --limit 200
   ```
   Output shows short Lambda durations (≈145 ms) with no stack trace, confirming the invocation completed gracefully while still returning a 500 to the caller.

## Evidence Correlation
- Smoke test failure timestamp: `2025-10-13T02:10:11Z` (from `go test` log).
- CloudWatch stream event timestamps align (converted via `python -c 'import datetime; print(datetime.datetime.utcfromtimestamp(1760321411206/1000))'`).
- Absence of Lambda errors plus 401 message points to upstream OpenAI authentication issue.

## Root Cause
- `PROVIDER_SECRET_ARN` secret contains placeholder OpenAI API key (`replace-…-key`).
- `backend/internal/runtime/secrets.go` loads that secret into `OPENAI_*` env vars.
- `backend/internal/app/services.go` defaults generator mode to `llm` when an API key is present, leading every `/api/generate` call to hit OpenAI with invalid credentials.

## Remediation Options
1. Update the provider secret (`improview/dev/providers`) with a valid OpenAI API key.
2. Temporarily force static generator:
   - Remove/blank the key in the secret, or
   - Export `IMPROVIEW_FORCE_GENERATE_MODE=static` in CI until credentials are fixed.

## Takeaways
- Always start with a local reproduction (`pnpm backend:smoke:dev`) to capture exact error payloads.
- Use `aws logs describe-log-groups` → `describe-log-streams` → `get-log-events` to narrow CloudWatch searches.
- Lack of Lambda stack traces can still indicate API-level failures; compare test output with CloudWatch timestamps to differentiate upstream issues from Lambda crashes.
