# Improview Backend HTTP API Contract

This document describes the HTTP interface exposed by `internal/api.Server`. All
responses are JSON encoded unless noted otherwise.

## Common Behavior

- Base path: `/api`
- Request/response bodies use UTF-8 JSON.
- All endpoints (except `/api/healthz` and `/api/version`) require an `Authorization: Bearer <access_token>` header issued by Cognito. Missing or invalid tokens return `401` (unauthenticated) or `403` (forbidden).
- Errors follow the envelope:
  ```json
  {
    "error": "bad_request",
    "message": "human readable detail"
  }
  ```
  Possible error codes: `bad_request`, `unauthenticated`, `forbidden`,
  `not_found`, `not_implemented`, `internal_error`.

## Endpoints

### POST /api/generate

Create a new problem pack and persist it.

Include the header `Authorization: Bearer <access_token>` for authenticated calls.

**Request body**
```json
{
  "category": "arrays",
  "difficulty": "medium",
  "mode": "llm",
  "customPrompt": "optional override",
  "provider": "anthropic",
  "llm": {
    "model": "gpt-4.1-mini",
    "baseUrl": "https://api.openai.com/v1",
    "provider": "openai"
  }
}
```

- `category` *(string, required)* — Requested topic category.
- `difficulty` *(string, required)* — Difficulty label (e.g. `easy`, `medium`).
- `mode` *(string, optional)* — Choose between `"static"` (default) and `"llm"`. When omitted the backend uses its configured default.
- `customPrompt` *(string, optional)* — Custom problem description prompt.
- `provider` *(string, optional)* — Downstream model/provider hint recorded with the request.
- `llm` *(object, optional)* — Per-request overrides for `model`, `baseUrl`, and `provider` when `mode` is `llm`.

**Response body**
```json
{
  "problem_id": "prob_123",
  "pack": {
    "problem": {
      "title": "...",
      "statement": "...",
      "constraints": ["..."],
      "examples": [
        {"input": ["..."], "output": "...", "explanation": "..."}
      ],
      "edge_cases": ["..."]
    },
    "api": {
      "function_name": "solve",
      "signature": "def solve(nums: List[int]) -> int",
      "params": [{"name": "nums", "type": "List[int]", "desc": "..."}],
      "returns": {"type": "int", "desc": "..."}
    },
    "time_estimate_minutes": 20,
    "hint": "...",
    "solutions": [
      {
        "approach": "...",
        "complexity": {"time": "O(n)", "space": "O(1)"},
        "code": "..."
      }
    ],
    "tests": {
      "public": [{"input": ["..."], "output": "..."}],
      "hidden": [{"input": ["..."], "output": "..."}]
    }
  }
}
```

### POST /api/attempt

Create an attempt record for a user starting to solve a problem.

**Request body**
```json
{
  "problem_id": "prob_123",
  "lang": "python"
}
```

- `problem_id` *(string, required)* — Identifier from `/api/generate`.
- `lang` *(string, required)* — Language code for the solution attempt.
- Caller identity is inferred from the bearer token supplied on the request.

**Response body**
```json
{
  "attempt": {
    "id": "att_456",
    "problem_id": "prob_123",
    "user_id": "user_42",
    "lang": "python",
    "started_at": 1711046400,
    "ended_at": 0,
    "hint_used": false,
    "pass_count": 0,
    "fail_count": 0,
    "duration_ms": 0
  }
}
```

### POST /api/run-tests

Execute code for a given attempt against public/hidden tests.

**Request body**
```json
{
  "attempt_id": "att_456",
  "code": "def solve(...): ...",
  "which": "public"
}
```

- `attempt_id` *(string, required)* — Attempt identifier.
- `code` *(string, required)* — User-submitted code bundle.
- `which` *(string, required)* — Test selection (e.g. `public`, `hidden`).

**Response body**
```json
{
  "summary": {
    "attempt_id": "att_456",
    "results": [
      {
        "test_id": "public_1",
        "status": "passed",
        "time_ms": 12,
        "stdout": "...",
        "stderr": ""
      }
    ]
  }
}
```

### POST /api/submit

Finalize an attempt, run full evaluation, and persist summary metrics.

**Request body**
```json
{
  "attempt_id": "att_456",
  "code": "def solve(...): ..."
}
```

- `attempt_id` *(string, required)* — Attempt identifier.
- `code` *(string, required)* — Final submitted solution.

**Response body**
```json
{
  "summary": {
    "attempt_id": "att_456",
    "passed": true,
    "runtime_ms": 128,
    "operations": 10000,
    "hidden_results": [
      {
        "test_id": "hidden_1",
        "status": "passed",
        "time_ms": 30,
        "stdout": "",
        "stderr": ""
      }
    ]
  }
}
```

### GET /api/attempt/{attempt_id}

Fetch attempt metadata and recorded run history.

**Response body**
```json
{
  "attempt": {
    "id": "att_456",
    "problem_id": "prob_123",
    "user_id": "user_42",
    "lang": "python",
    "started_at": 1711046400,
    "ended_at": 1711047300,
    "hint_used": false,
    "pass_count": 2,
    "fail_count": 1,
    "duration_ms": 900000
  },
  "runs": [
    {
      "test_id": "public_1",
      "status": "passed",
      "time_ms": 12,
      "stdout": "",
      "stderr": ""
    }
  ]
}
```

### GET /api/problem/{problem_id}

Retrieve a previously generated problem pack.

**Response body**
```json
{
  "problem": { "title": "...", "statement": "...", "constraints": ["..."], "examples": [] },
  "api": { "function_name": "solve", "signature": "...", "params": [], "returns": {"type": "...", "desc": "..."} },
  "time_estimate_minutes": 20,
  "hint": "...",
  "solutions": [],
  "tests": {"public": [], "hidden": []}
}
```

### GET /api/healthz

Perform a health check. Returns `200` when healthy; otherwise error envelope.

**Response body**
```json
{ "status": "ok" }
```

### GET /api/version

Report the backend version string.

**Response body**
```json
{ "version": "v0.1.0" }
```

### GET /api/user/profile

Fetch the authenticated user's profile.

**Response body**
```json
{
  "profile": {
    "user_id": "user_123",
    "handle": "jvolpe",
    "display_name": "James Volpe",
    "bio": "Product engineer by day.",
    "avatar_url": "https://cdn.example.com/avatars/jvolpe.png",
    "timezone": "America/New_York",
    "preferences": {
      "editor.theme": "dark",
      "language.default": "typescript"
    },
    "created_at": 1711046400,
    "updated_at": 1711047300
  }
}
```

### PUT /api/user/profile

Create or update the authenticated user's profile. Empty or missing fields leave existing values unchanged.

**Request body**
```json
{
  "handle": "jvolpe",
  "display_name": "James Volpe",
  "bio": "Product engineer by day.",
  "avatar_url": "https://cdn.example.com/avatars/jvolpe.png",
  "timezone": "America/New_York",
  "preferences": {
    "editor.theme": "dark",
    "language.default": "typescript"
  }
}
```

**Response body**
```json
{
  "profile": {
    "user_id": "user_123",
    "handle": "jvolpe",
    "display_name": "James Volpe",
    "bio": "Product engineer by day.",
    "avatar_url": "https://cdn.example.com/avatars/jvolpe.png",
    "timezone": "America/New_York",
    "preferences": {
      "editor.theme": "dark",
      "language.default": "typescript"
    },
    "created_at": 1711046400,
    "updated_at": 1711047400
  }
}
```

### GET /api/user/saved-problems

List saved problems for the authenticated user. Supports optional query params: `status` (`in_progress`, `completed`, `archived`) and `limit` (defaults to 50, max 200).

**Response body**
```json
{
  "saved_problems": [
    {
      "id": "usp_456",
      "problem_id": "prob_123",
      "title": "Two Sum",
      "language": "typescript",
      "status": "in_progress",
      "tags": ["arrays", "two-pointer"],
      "notes": "Revisit the two-pointer variant.",
      "created_at": 1711046400,
      "updated_at": 1711047300
    }
  ],
  "next_token": null
}
```

### POST /api/user/saved-problems

Persist a problem to the user's library.

**Request body**
```json
{
  "problem_id": "prob_123",
  "title": "Two Sum",
  "language": "typescript",
  "status": "in_progress",
  "tags": ["arrays", "two-pointer"],
  "notes": "Revisit the two-pointer variant.",
  "hint_unlocked": false
}
```

**Response body**
```json
{
  "saved_problem": {
    "id": "usp_456",
    "problem_id": "prob_123",
    "title": "Two Sum",
    "language": "typescript",
    "status": "in_progress",
    "tags": ["arrays", "two-pointer"],
    "notes": "Revisit the two-pointer variant.",
    "hint_unlocked": false,
    "created_at": 1711046400,
    "updated_at": 1711046400
  }
}
```

### GET /api/user/saved-problems/{saved_problem_id}

Fetch full metadata for a saved problem, including attempt history.

**Response body**
```json
{
  "saved_problem": {
    "id": "usp_456",
    "problem_id": "prob_123",
    "title": "Two Sum",
    "language": "typescript",
    "status": "in_progress",
    "tags": ["arrays", "two-pointer"],
    "notes": "Revisit the two-pointer variant.",
    "hint_unlocked": true,
    "created_at": 1711046400,
    "updated_at": 1711047600,
    "attempts": [
      {
        "attempt_id": "att_999",
        "status": "passed",
        "submitted_at": 1711047500,
        "pass_count": 8,
        "fail_count": 0,
        "runtime_ms": 127,
        "code": "function solve(nums, target) {\n  return [0, 1];\n}"
      },
      {
        "attempt_id": "att_998",
        "status": "failed",
        "submitted_at": 1711047200,
        "pass_count": 5,
        "fail_count": 3,
        "runtime_ms": 180,
        "code": "function solve(nums, target) {\n  return [];\n}"
      }
    ]
  }
}
```

### PUT /api/user/saved-problems/{saved_problem_id}

Update saved problem metadata (notes, tags, status, or whether hints are unlocked).

**Request body**
```json
{
  "status": "completed",
  "tags": ["arrays", "two-pointer", "practice"],
  "notes": "Shipped submission on 2024-03-22.",
  "hint_unlocked": true
}
```

**Response body**
```json
{
  "saved_problem": {
    "id": "usp_456",
    "problem_id": "prob_123",
    "title": "Two Sum",
    "language": "typescript",
    "status": "completed",
    "tags": ["arrays", "two-pointer", "practice"],
    "notes": "Shipped submission on 2024-03-22.",
    "hint_unlocked": true,
    "created_at": 1711046400,
    "updated_at": 1711132800,
    "last_attempt": {
      "attempt_id": "att_999",
      "status": "passed",
      "updated_at": 1711047500,
      "pass_count": 8,
      "fail_count": 0
    }
  }
}
```

### DELETE /api/user/saved-problems/{saved_problem_id}

Remove a problem from the user's saved list. Returns `204 No Content` on success.

### POST /api/user/saved-problems/{saved_problem_id}/attempts

Append a new attempt snapshot (including source code) to a saved problem.

**Request body**
```json
{
  "attempt_id": "att_1001",
  "code": "function solve(nums, target) {\n  return [1, 2];\n}",
  "status": "submitted",
  "pass_count": 7,
  "fail_count": 1,
  "runtime_ms": 143,
  "submitted_at": 1711132000
}
```

**Response body**
```json
{
  "attempt": {
    "attempt_id": "att_1001",
    "status": "submitted",
    "submitted_at": 1711132000,
    "pass_count": 7,
    "fail_count": 1,
    "runtime_ms": 143,
    "code": "function solve(nums, target) {\n  return [1, 2];\n}"
  }
}
```

### GET /api/user/saved-problems/{saved_problem_id}/attempts

List attempt snapshots for a saved problem (ordered newest first).

**Response body**
```json
{
  "attempts": [
    {
      "attempt_id": "att_1001",
      "status": "passed",
      "submitted_at": 1711132000,
      "pass_count": 7,
      "fail_count": 1,
      "runtime_ms": 143,
      "code": "function solve(nums, target) {\n  return [1, 2];\n}"
    },
    {
      "attempt_id": "att_999",
      "status": "failed",
      "submitted_at": 1711130000,
      "pass_count": 3,
      "fail_count": 5,
      "runtime_ms": 180,
      "code": "function solve(nums, target) {\n  return [0, 0];\n}"
    }
  ]
}
```

## Notes

- `POST` endpoints may return `501 Not Implemented` when the corresponding
  service dependency is not wired.
- Timestamps are expressed as Unix seconds where applicable.
- Large string fields (e.g. `statement`, `code`) are free-form text and may
  contain newlines.

## DynamoDB Data Model for Profiles and Saved Problems

- Table: `improview-${ENV}-main` (shared single-table design).
- Partition key (`pk`) and sort key (`sk`) encode entity types:
  - User profile: `pk = USER#<user_id>`, `sk = PROFILE`.
  - Saved problem metadata: `pk = USER#<user_id>`, `sk = SAVED#<saved_problem_id>`.
  - Saved problem attempt snapshot: `pk = SAVED#<saved_problem_id>`, `sk = ATTEMPT#<iso8601_ts>#<attempt_id>`.
- Global secondary indexes provide alternative lookups:
  - `gsi1` maps natural identifiers (`gsi1pk = ATTEMPT#<attempt_id>` or `gsi1pk = PROBLEM#<problem_id>#USER#<user_id>`) to their parent `saved_problem_id`.
  - `gsi2` (added in this revision) maps the user to attempt/activity feed (`gsi2pk = USER#<user_id>#ATTEMPT`, `gsi2sk = <iso8601_ts>#<saved_problem_id>#<attempt_id>`).
- Saved problem attempts retain source code directly when the payload stays under the 400 KB DynamoDB item limit; larger submissions are uploaded to S3 (`ARTIFACT_BUCKET`) and referenced via `code_s3_key`.
- All items carry `created_at` and `updated_at` Unix millisecond timestamps to support ordering and optimistic concurrency checks.
- Only final submissions are recorded; interim “run tests” executions remain in-memory on the client.

## Live Integration Tests

The easiest way to hit the deployed API is the helper script:

```bash
./backend/scripts/run-smoke.sh --env dev --mode static
```

That command resolves the API endpoint, fetches smoke credentials, exchanges them for a Cognito token, and launches the `Live` tests with debug logging. To run them manually instead, set `BASE_URL` to your deployed API Gateway base URL (for the dev stack this is `https://bh853brv47.execute-api.us-east-1.amazonaws.com`) and execute:

```bash
cd backend
export BASE_URL="https://your-env.example.com"
CI_SMOKE_DEBUG=1 go test ./internal/api -run Live -v
```

These tests issue real HTTPS calls against the deployment. Drop `CI_SMOKE_DEBUG` when you want quieter output.

### Sample Debug Log

```text
=== RUN   TestLiveHealthz
    live_api_test.go:166: [GET /api/healthz] sending request
    live_api_test.go:166: [RESP GET /api/healthz] status=200 body={
      "status": "ok"
    }
=== RUN   TestLiveGenerate
    live_api_test.go:315: [POST /api/generate] payload={
      "category": "arrays",
      "difficulty": "easy"
    }
    live_api_test.go:315: [RESP POST /api/generate] status=200 body={
      "problem_id": "...",
      "pack": {
        "problem": {
          "title": "Two Sum",
          "examples": [
            {
              "input": [ [2, 7, 11, 15], 9 ],
              "output": [0, 1]
            }
          ]
        },
        "tests": {
          "public": [ { "input": [[1, 3, 4, 2], 6], "output": [1, 3] } ]
        }
      }
    }
```

The snippet above comes from a dev run; values change as the generator evolves.

## OpenAPI Specification

The machine-readable contract lives alongside this document at
`docs/backend_api_contract.yaml`. Import it into tooling such as Swagger UI or
Speakeasy when you need generated clients, request validators, or SDK diffs.
