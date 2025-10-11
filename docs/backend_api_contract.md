# Improview Backend HTTP API Contract

This document describes the HTTP interface exposed by `internal/api.Server`. All
responses are JSON encoded unless noted otherwise.

## Common Behavior

- Base path: `/api`
- Request/response bodies use UTF-8 JSON.
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

**Request body**
```json
{
  "category": "arrays",
  "difficulty": "medium",
  "customPrompt": "optional override",
  "provider": "anthropic"
}
```

- `category` *(string, required)* — Requested topic category.
- `difficulty` *(string, required)* — Difficulty label (e.g. `easy`, `medium`).
- `customPrompt` *(string, optional)* — Custom problem description prompt.
- `provider` *(string, optional)* — Downstream model/provider hint.

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
  "lang": "python",
  "user_id": "user_42"
}
```

- `problem_id` *(string, required)* — Identifier from `/api/generate`.
- `lang` *(string, required)* — Language code for the solution attempt.
- `user_id` *(string, optional)* — External user identifier for analytics.

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

## Notes

- `POST` endpoints may return `501 Not Implemented` when the corresponding
  service dependency is not wired.
- Timestamps are expressed as Unix seconds where applicable.
- Large string fields (e.g. `statement`, `code`) are free-form text and may
  contain newlines.

## Live Integration Tests

Set `IMPROVIEW_LIVE_BASE_URL` to your deployed API Gateway base URL (for the dev stack this is `https://bh853brv47.execute-api.us-east-1.amazonaws.com`). From `backend`, run the live checks with debugging enabled:

```bash
cd backend
export IMPROVIEW_LIVE_BASE_URL="https://your-env.example.com"
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
