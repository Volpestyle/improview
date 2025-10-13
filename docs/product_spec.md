Improview — Design Doc & Implementation Plan

Status: v1.0 (draft)
Owner: James
Editor: ChatGPT (GPT-5 Thinking)
Goal: Ship a lightning‑fast, serverless coding‑interview practice platform with AI‑generated problems, tests, and a Zed‑inspired editing UX. Dark‑mode first.

⸻

1) Product Overview

Elevator pitch: Like LeetCode on turbo. Pick a category (e.g., BFS, Arrays, Maps) and a difficulty, click Generate. Improview asks an LLM (OpenAI or Grok 4 Fast) to produce a full problem pack: statement, constraints, example solutions, hidden/public tests, a time estimate, and an optional hint (hidden until user clicks Show). Solve it in a Zed‑style, Vim‑friendly editor with fluid Framer Motion micro‑interactions and a built‑in timer.

Primary users:
	•	SWE candidates practicing interviews
	•	Engineers keeping sharp on algorithms
	•	Recruiters/mentors generating quick drills

Non‑goals (initial): discussion forums, company‑specific problem sets, multi‑language judging beyond JS/TS (Python later), full social features.

⸻

2) Core Requirements

2.1 Features
	•	Problem generation: category + difficulty + optional custom prompt → LLM returns structured JSON (problem, constraints, examples, time estimate, hint, solution outlines, unit tests). Allow JavaScript or TypeScript annotations in signatures/solutions (`number[]`, etc.).
	•	Editor: Zed‑inspired minimal UI, Vim keybindings, IntelliSense, inline errors, split view for statement ↔ code. Dark mode (Anysphere Dark theme) only at launch; editor can toggle to Gruvbox Soft preview mode for readability comparison.
	•	Timer: auto‑starts from the LLM’s recommended duration; pause/resume; submit auto‑stops.
	•	Testing: run public tests on demand; hidden tests run on submission. Deterministic, resource‑capped runner with per‑test stdout/stderr capture.
	•	Hints: hidden until toggled; count hint usages for analytics.
	•	Example solutions: collapsed accordion (don’t show by default).
	•	Result sheet: pass/fail, runtime/ops count (if measured), test breakdown, diff on expected vs actual for failed cases.
	•	History: local+cloud session history (problem, code, results, time spent).
	•	Authentication: Passwordless (Passkeys via WebAuthn) + magic links fallback; offer “Continue with Google” via Cognito when the Google IdP is configured.
	•	Them­ing & Fonts:
	•	UI: Geist (sans).
	•	Code: Cursor IDE font if provided (custom load); fallback JetBrains Mono → Fira Code.
	•	Themes: Anysphere Dark (default), Gruvbox Soft (light preview only inside editor toggle). Entire app is dark mode; only the editor can preview a light theme for comparison.

2.2 Non‑Functional
	•	Performance: TTI < 1.0s on broadband, Lighthouse Perf ≥ 95.
	•	Cost: Edge‑first, serverless; cheap cold starts; aggressive caching.
	•	Security: Strict CSP, code execution isolation, no secrets in client, least‑privileged tokens, prompt‑injection guards.
	•	Privacy: Only store prompt/results if user is logged in and consents.

⸻

3) Architecture

Principles: Fully AWS‑native, serverless/edge‑accelerated, minimal latency, no Next.js.

3.1 High‑Level Diagram (AWS)

[Browser]
  ├─ React SPA (Vite) + TanStack Router
  ├─ Monaco/CodeMirror + Vim
  ├─ Framer Motion UI
  └─ Cognito (Passkeys + magic link via SES)
      │
      ▼
[Amazon CloudFront]
  ├─ Static Origin → S3 (website hosting disabled; CloudFront origin access control)
  └─ API Origin → API Gateway (HTTP API)
                        │
                        ▼
                 [AWS Lambda (Go 1.x)]
                   ├─ /generate → LLM Provider Broker
                   ├─ /run-tests → JS sandbox runner
                   ├─ /submit → hidden tests
                   ├─ /attempt → timers/state
                   └─ /history → user data
                        │
                        ├─ DynamoDB (problems/attempts/tests)
                        ├─ S3 (artifacts, redacted traces)
                        ├─ EventBridge (async jobs / cleanup)
                        └─ CloudWatch + X-Ray (logs/traces)

Note: Lambdas are not placed in a VPC (so they have outbound internet for OpenAI/xAI without NAT costs). If later we need VPC access (e.g., to RDS), place them in a VPC and add a NAT Gateway only to those that require egress, or use VPC endpoints where possible.

3.2 Tech Choices (AWS)
	•	Frontend hosting: S3 + CloudFront, OAC, gzip/brotli, long‑TTL immutable assets.
	•	Compute: AWS Lambda (Go 1.x), Provisioned Concurrency for hot paths (/generate, /run-tests) at small baseline.
	•	API: API Gateway HTTP API (lower latency/cost than REST), JWT authorizer with Cognito.
	•	Auth: Amazon Cognito User Pools with Passkeys (WebAuthn); magic link via Amazon SES (Lambda signer).
	•	Data: DynamoDB (single‑table design) + DAX optional; S3 for artifacts; optional OpenSearch Serverless for analytics later.
	•	Timers/state: Client timer + server truth in DynamoDB; optional EventBridge Scheduler for long‑running expirations/cleanup.
	•	Queues/Async: EventBridge + Lambda destinations (e.g., post‑submission grading fan‑out if needed).
	•	Observability: CloudWatch metrics/logs, AWS X‑Ray traces; AWS Distro for OpenTelemetry if needed.
	•	CDN/Edge logic: CloudFront Functions/Lambda@Edge for security headers, SPA routing, A/B cookies.
	•	Secrets: AWS Secrets Manager for provider keys; rotated via AWS KMS.

3.3 Data Model (DynamoDB single‑table)

Partition key design to keep access patterns O(1):
	•	PK/SK examples:
	•	USER#<uid> / PROFILE# → user profile
	•	USER#<uid> / ATTEMPT#<attemptId> → attempt row
	•	PROBLEM#<problemId> / META# → problem pack
	•	PROBLEM#<problemId> / TEST#<testId> → tests
	•	ATTEMPT#<attemptId> / RUN#<runId> → per‑test run results
GSI1 for user → attempts by created_at desc; GSI2 for category+difficulty → problemId (cache/lookups).

⸻

4) Data Model

Tables (Postgres/Neon or D1):
	•	user(id, email, passkey_pubkey, created_at)
	•	session(id, user_id, created_at, expires_at)
	•	problem(id, category, difficulty, prompt_hash, provider, json, created_by, created_at)
	•	attempt(id, user_id, problem_id, lang, code, started_at, ended_at, hint_used, pass_count, fail_count, duration_ms)
	•	run(id, attempt_id, test_id, status, stdout, stderr, time_ms, memory_kb, created_at)
	•	test(id, problem_id, is_public, input_json, expected_json, timeout_ms)
	•	feature_flags(user_id, flags_json)

KV (Cloudflare KV): ephemeral session state, timers, last‑seen problem id, UI prefs.

R2: artifacts (zipped test bundles, provider traces redacted).

⸻

5) LLM Contract

5.1 System Prompt Template (core)

You are Improview’s problem generator. Return ONLY JSON matching the schema.
Constraints:
- Category: {category}
- Difficulty: {difficulty} (easy|medium|hard)
- Language: JavaScript (ES2022) for reference solutions and tests.
Provide:
- problem: title, statement (markdown), constraints, examples (I/O), edge_cases
- api: function_name, signature, params (name,type,desc), returns(type,desc)
- time_estimate_minutes: integer in [10,120]
- hint: short, actionable
- tests: public[] and hidden[] with deterministic inputs and expected outputs
- solutions: 1-2 idiomatic approaches with Big-O
Rules:
- Keep tests minimal but comprehensive; avoid randomness.
- No external libs; pure functions only.
- Ensure tests align with the signature exactly.
- Prefer BFS/DFS/Two-Pointers/etc as per category.

5.2 JSON Schema (Zod/TypeScript)

const Example = z.object({
  input: z.array(z.unknown()),
  output: z.unknown(),
  explanation: z.string().optional()
});

export const ProblemPack = z.object({
  problem: z.object({
    title: z.string(),
    statement: z.string(), // markdown
    constraints: z.array(z.string()),
    examples: z.array(Example),
    edge_cases: z.array(z.string()).default([])
  }),
  api: z.object({
    function_name: z.string(),
    signature: z.string(),
    params: z.array(z.object({ name: z.string(), type: z.string(), desc: z.string() })),
    returns: z.object({ type: z.string(), desc: z.string() })
  }),
  time_estimate_minutes: z.number().int().min(10).max(120),
  hint: z.string(),
  solutions: z.array(z.object({
    approach: z.string(),
    complexity: z.object({ time: z.string(), space: z.string() }),
    code: z.string()
  })).min(1).max(2),
  tests: z.object({
    public: z.array(Example),
    hidden: z.array(Example)
  })
});

5.3 Provider Broker
	•	Abstract interface: generateProblemPack({category, difficulty, customPrompt?, provider}) → ProblemPack
	•	Retries + backoff, timeout 20s, streaming disabled (JSON mode), schema validation, minimal redaction of PII.

⸻

6) API Design (Go HTTP Lambdas)

Auth
	•	POST /api/auth/start → begin magic link or passkey registration
	•	POST /api/auth/callback → finalize login; set HttpOnly cookie
	•	POST /api/auth/logout

Problems
	•	POST /api/generate {category, difficulty, customPrompt?, provider} → ProblemPack
	•	GET /api/problem/:id → cached ProblemPack

Runs/Attempts
	•	POST /api/attempt {problem_id, lang} → attempt_id (starts timer in Durable Object)
	•	POST /api/run-tests {attempt_id, code, which:“public”|“hidden”} → per‑test results
	•	POST /api/submit {attempt_id, code} → final grade (runs hidden tests)
	•	GET /api/attempt/:id → summary + history

Hints/Solutions
	•	POST /api/hint {attempt_id} → reveal + record usage
	•	GET /api/solutions/:problem_id → collapsed content unless explicit expand

Health/Observability
	•	GET /api/healthz
	•	GET /api/version

⸻

7) Code Execution & Safety (AWS)

7.1 JS/TS Runner (Phase 1 on Lambda)
	•	Lambda (Node 20) executes user code inside a sandboxed VM (e.g., vm2) with:
	•	Hard timeouts per test (e.g., 150ms) and overall Lambda timeout (e.g., 3s public runs, 5s submit).
	•	Memory limit via Lambda size (128–256MB) + guardrails in harness.
	•	No network: runner Lambda uses an explicit deny for outbound requests at code level; optional allowlist only for logging.
	•	Test harness compiles user export to ES module, validates signature against schema, and runs deterministic vectors.
	•	Capture stdout/stderr; return structured results.
	•	Local dev stub (Go) simply marks submissions that include "fail" in source as failures; replace with real sandbox before beta.

7.2 Python Runner (Phase 2)
	•	Option A (simpler): Pyodide WASM inside Lambda (via @cloudflare/pyodide-style bundling adapted for Lambda layers).
	•	Option B (stronger isolation): Firecracker (native Lambda) with container image; run Python and execute tests via a judge binary; still within Lambda boundaries.

7.3 Future Polyglot
	•	Offload heavy/long jobs to AWS Fargate (ECS) on demand with queueing (EventBridge → SQS → Fargate service). Each job pulls tests, runs in an nsjail/caps‑dropped container, pushes results.

Security
	•	Schema‑validate all LLM outputs (Zod), never eval LLM code.
	•	Restrict Node built‑ins in sandbox; disable require, fs, child_process, worker_threads.
	•	Size limits on code/problem; WAF on API Gateway; CloudFront + Shield Standard; rate limiting via API GW usage plans.

⸻

8) UX & UI Spec

8.1 Screens
	1.	Home: Category pills (Arrays, BFS/DFS, Maps/Sets, DP, Graphs, Strings, Math, Heaps, Two Pointers), Difficulty chips, Provider selector (OpenAI/Grok), Generate CTA. Subtext field for custom prompt.
	2.	Workspace: Two‑pane layout

	•	Left: Problem statement (markdown renderer), Constraints, Examples. Buttons: Show Hint, Example Solutions (accordion). Timer chip (animated).
	•	Right: Editor (Monaco or CM6) with Vim, linting, run tests button, test output pane, status toasts. Submit button.

	3.	Results: Confetti micro‑burst on pass, otherwise failure callouts; table of tests (public vs hidden), diffs; time spent vs estimate; “Replay” button loads same problem.

8.2 Motion/Polish
	•	Page transitions via Framer Motion (spring), micro‑interactions on hover/press.
	•	Skeleton loaders for initial problem pack.
	•	Respect reduced‑motion.

8.3 Theming & Fonts
	•	App: Anysphere Dark tokens across UI (Tailwind custom config).
	•	Editor: Default Anysphere Dark theme; optional Gruvbox Soft toggle inside editor only.
	•	Fonts: UI Geist; Code Cursor IDE font (if licensed/provided) → fallback JetBrains Mono → Fira Code.

⸻

9) Implementation Plan (AWS‑specific)

Milestone 0 — Foundations (Week 1)
	•	Monorepo (pnpm + Turborepo). Vite React app; Tailwind + shadcn/ui; Framer Motion; TanStack Router.
	•	Theme tokens (Anysphere Dark); fonts (Geist + code font fallback).
	•	CDK bootstrap; S3 bucket (private) + CloudFront OAC; basic SPA routing function.

Milestone 1 — Auth & LLM (Week 2)
	•	Cognito User Pool with Passkeys; SES domain verified; magic‑link Lambda.
	•	Secrets Manager for provider keys.
	•	Provider Broker Lambda (/generate) with OpenAI first; DynamoDB table (single‑table) + Zod schema validation.

Milestone 2 — Editor & Public Tests (Week 3)
	•	Monaco/CM6 + Vim; linting.
	•	/run-tests Lambda with vm2 sandbox; API Gateway HTTP API + JWT authorizer.
	•	Result panel UX.

Milestone 3 — Hidden Tests & History (Week 4)
	•	/submit Lambda executes hidden tests; write attempt + run rows to DynamoDB.
	•	History views (user attempts) via GSI; S3 artifacts for traces.

Milestone 4 — Perf/Edge/Alt Provider (Week 5)
	•	Provisioned Concurrency for hot Lambdas; CloudFront caching for GETtable problem packs (hash key in URL).
	•	Add Grok 4 Fast provider; add WAF rules + Shield tuning.

Milestone 5 — Beta & Python POC (Week 6)
	•	Python runner POC (Pyodide or container image) behind feature flag.
	•	Dashboards (CloudWatch, X-Ray); canaries (CloudWatch Synthetics); error budgets.

Stretch: EventBridge Scheduler for stale attempt cleanup; Fargate runner for polyglot; OpenSearch Serverless for queryable analytics.

⸻

10) Example Contracts

10.1 POST /api/generate (req/resp)

{
  "category": "bfs",
  "difficulty": "medium",
  "customPrompt": "Prefer grid graphs",
  "provider": "openai"
}

Response (truncated):

{
  "problem": {"title": "Shortest Grid Islands", "statement": "...", "constraints": ["..."], "examples": [ {"input": [["110","010","011"]], "output": 2 } ]},
  "api": {"function_name":"shortestIslands","signature":"function shortestIslands(grid){...}","params":[{"name":"grid","type":"string[]","desc":"..."}],"returns":{"type":"number","desc":"..."}},
  "time_estimate_minutes": 25,
  "hint": "Think BFS from all sources simultaneously.",
  "solutions": [{"approach":"Multi-source BFS","complexity":{"time":"O(nm)","space":"O(nm)"},"code":"function shortestIslands(...) { /* ... */ }"}],
  "tests": {"public": [{"input":[["10"]],"output":1}], "hidden": [{"input":[["..."]],"output":0}]}
}

10.2 POST /api/run-tests

{
  "attempt_id": "att_123",
  "code": "export function shortestIslands(grid){ /* ... */ }",
  "which": "public"
}

Response:

{
  "status":"ok",
  "results":[{"test_id":"t1","status":"pass","time_ms":8,"stdout":""}]
}


⸻

11) Security & Compliance
	•	Secrets: Workers Secrets; never exposed to client; rotate quarterly.
	•	CSP: default-src 'self'; connect-src 'self' https://api.openai.com https://...; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval' (scoped for editor as needed).
	•	Rate limits: token bucket per IP/user; stricter on /api/generate and /api/run-tests.
	•	Abuse: length caps on prompts and code; ban list for suspicious patterns; manual moderation webhook.
	•	PII: minimize; allow user to delete data (GDPR‑style).

⸻

12) Analytics & A/B
	•	Events: generate_click, generate_success, hint_reveal, run_public, run_hidden, submit, pass, fail, time_overrun.
	•	Funnels: generation → first run → submit → pass.
	•	A/B: motion intensity, timer default (estimate vs estimate+buffer), hint position.

⸻

13) Local Dev & DX
	•	pnpm monorepo, Turborepo (frontend) + Go module for backend services.
	•	Go toolchain with Makefile/task runner; SAM/LocalStack for Lambda + DynamoDB emulation in dev.
	•	Local dev server via `go run ./cmd/api`; Lambda build uses `go build -tags lambda ./cmd/lambda` with aws-lambda-go proxy adapter.
	•	End‑to‑end tests: Playwright (mock provider); unit tests: Vitest (frontend) + Go test suites for handlers; schema tests for LLM JSON.

⸻

14) Future Roadmap
	•	Company‑style interview packs (Amazon/Google problem patterns).
	•	Teams mode for mock interviews; live shared editor via Durable Objects.
	•	Ref/Discuss tabs (curated editorial).
	•	iPad optimized layout with hardware keyboard Vim.

⸻

15) Acceptance Criteria (Beta)
	•	Generate → Solve (JS) → Submit (hidden tests) works end‑to‑end with ≥95% success on JSON schema validation.
	•	Cold TTI ≤ 1.2s (US), route <2 edge hops.
	•	Sandbox blocks import/network; timeouts enforced.
	•	Timer synced server‑side; survives reload.
	•	Hint hidden by default; revealed on click.
	•	App fully dark; editor light preview toggle works (Gruvbox Soft inside editor only).

⸻

16) Snippets (Starter)

Go services (excerpt)

```go
type Server struct {
	services Services
	mux      *http.ServeMux
}

func NewServer(services Services) *Server {
	if services.Clock == nil {
		services.Clock = RealClock{}
	}

	s := &Server{services: services, mux: http.NewServeMux()}
	s.mux.Handle("/api/generate", s.jsonHandler(http.MethodPost, s.handleGenerate))
	s.mux.Handle("/api/attempt", s.jsonHandler(http.MethodPost, s.handleCreateAttempt))
	s.mux.Handle("/api/run-tests", s.jsonHandler(http.MethodPost, s.handleRunTests))
	s.mux.Handle("/api/submit", s.jsonHandler(http.MethodPost, s.handleSubmit))
	s.mux.Handle("/api/problem/", http.HandlerFunc(s.handleProblemByID))
	return s
}

func (s *Server) handleGenerate(w http.ResponseWriter, r *http.Request) error {
	if s.services.Generator == nil || s.services.Problems == nil {
		return ErrNotImplemented
	}

	var req GenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return ErrBadRequest
	}

	pack, err := s.services.Generator.Generate(r.Context(), req)
	if err != nil {
		return err
	}

	id, err := s.services.Problems.Save(r.Context(), pack)
	if err != nil {
		return err
	}

	return json.NewEncoder(w).Encode(GenerateResponse{ProblemID: id, Pack: pack})
}

func NewInMemoryServices(clock api.Clock) api.Services {
	generator := NewStaticProblemGenerator()
	problems := NewMemoryProblemRepository()
	attempts := NewMemoryAttemptStore(clock)
	runner := SimpleTestRunner{}

	return api.Services{
		Generator:  generator,
		Problems:   problems,
		Attempts:   attempts,
		Tests:      runner,
		Submission: SubmissionService{Runner: runner, Attempts: attempts},
		Clock:      clock,
	}
}
```

Timer persistence helper (DynamoDB outline)

```go
type AttemptTimerStore struct {
	Table DynamoTable
}

func (s *AttemptTimerStore) Start(ctx context.Context, attemptID string, duration time.Duration) error {
	item := map[string]types.AttributeValue{
		"PK": &types.AttributeValueMemberS{Value: "ATTEMPT#" + attemptID},
		"SK": &types.AttributeValueMemberS{Value: "TIMER"},
		"duration_ms": &types.AttributeValueMemberN{Value: strconv.FormatInt(duration.Milliseconds(), 10)},
		"started_at": &types.AttributeValueMemberN{Value: strconv.FormatInt(time.Now().UnixMilli(), 10)},
	}
	_, err := s.Table.PutItem(ctx, item)
	return err
}
```

Editor theme tokens (Tailwind config excerpt)

theme: {
  extend: {
    colors: {
      bg: {
        DEFAULT: '#0F1115', // Anysphere Dark vibe
        panel: '#151821',
      },
      text: { primary: '#E6E8EE', secondary: '#A9B1C6' },
      accent: { DEFAULT: '#7AA2F7' }
    },
    fontFamily: {
      sans: ['Geist', 'ui-sans-serif', 'system-ui'],
      mono: ['CursorMono','JetBrains Mono','Fira Code','ui-monospace']
    }
  }
}


⸻

17) Risks & Mitigations
	•	LLM JSON drift → strict schema + retries + few‑shot examples.
	•	Sandbox escapes → Workers isolate only JS initially; ban unfriendly APIs; add time/memory caps; fuzz tests.
	•	Cold starts → Workers are warm; keep provider TCP warm via periodic pings; cache problem packs.
	•	Licensing (Cursor font/theme) → allow custom upload; ship with permissive fallbacks.
	•	Vendor lock‑in → pluggable provider broker; abstract storage adapters.

⸻

18) Launch Checklist
	•	Legal/Privacy/ToS
	•	Branding + domain + favicon
	•	LLM keys & usage caps
	•	SLO dashboards
	•	Seed sanity suite of categories
	•	Beta allowlist
	•	Crash‑free sessions ≥ 99.9%
