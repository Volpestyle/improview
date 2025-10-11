# Improview Step-by-Step Implementation Plan

## Phase 0 — Kickoff (Day 0)
1. Confirm AWS/Turborepo accounts, SES sandbox limits, and required IAM roles are provisioned.
2. Create shared Notion/Jira board with milestones above; log decisions and risks per sprint.
3. Freeze tech choices from Section 3; document any deltas before implementation begins.

## Phase 1 — Monorepo & CI/CD Foundations (Days 1-3)
1. Initialize pnpm + Turborepo workspace for frontend and create `backend/` Go module (go.mod, cmd/api) with shared tooling (Makefile, lint scripts).
2. Integrate ESLint, Prettier, Vitest, Playwright templates; add Go linters/tests (`golangci-lint`, `go test`) to baseline CI pipeline (GitHub Actions) that runs on PRs.
3. Add shared Tailwind/theme tokens, font assets, and Storybook (or Ladle) preview for UI primitives.
4. Stand up Infrastructure CDK stack for S3 + CloudFront with OAC and deploy “Hello World” SPA + Go API (cmd/api for local, cmd/lambda for AWS) through pipeline.

## Phase 2 — Auth & LLM Broker (Days 4-8)
1. Model DynamoDB single-table schema in Go structs (shared package) and provision via CDK.
2. Configure Cognito User Pool + Passkeys; implement SES-verified magic link Lambda and JWT authorizer wiring in API Gateway.
3. Implement `/api/generate` Lambda handler in Go (net/http adapter); integrate Secrets Manager + provider broker with OpenAI first, include schema validation + retries.
4. Ship minimal UI allowing category/difficulty selection and problem generation stub (render spinner and mock data until endpoint ready).

## Phase 3 — Workspace & Public Tests (Days 9-14)
1. Embed Monaco/CodeMirror with Vim keymap, linting, and theme tokens; wire Framer Motion base transitions.
2. Build problem statement pane (markdown renderer, constraints, examples, hint toggle shell) and two-pane layout responsive tweaks.
3. Implement `/api/run-tests` Lambda with vm2 sandbox, deterministic per-test harness, and result schema; add client run button with stdout/stderr display.
4. Introduce client timer widget seeded from LLM time estimate (local only) and submission CTA skeleton.

## Phase 4 — Hidden Tests, History, and Persistence (Days 15-21)
1. Complete `/api/submit` path: hidden tests, attempt persistence, result aggregation in DynamoDB + S3 artifact storage.
2. Persist timer state through Go timer service (DynamoDB record + EventBridge heartbeats) to survive reload; reconcile with server truth on submit.
3. Build attempt history view (list + detail) using TanStack Router loaders; expose `/api/attempt/:id` and `/api/attempt` list endpoints with GSI.
4. Record hint usages and example solution accesses; surface metrics in history detail.

## Phase 5 — Performance, Security, and Provider Expansion (Days 22-26)
1. Enable Provisioned Concurrency for hot Lambdas, configure CloudFront caching for GET `/api/problem/:id`, and add edge security headers via CloudFront Function.
2. Add Grok provider behind feature flag; expand broker tests; set usage quotas and alerting.
3. Implement WAF rate limiting rules, Shield monitoring hooks, and centralized CloudWatch/X-Ray dashboards + alerts.
4. Execute load and Lighthouse runs; tune bundle splitting, image optimization, and SPA hydration costs to hit TTI targets.

## Phase 6 — Beta Hardening & Python POC (Days 27-30)
1. Prototype Python runner (Pyodide Layer or container) behind feature flag; document constraints and perf baselines.
2. Run end-to-end Playwright flows (generate → solve → submit) with mocked providers + live API sanity checks; fix blockers.
3. Finalize launch checklist items (legal, ToS, branding, beta allowlist) and attach to release pipeline.
4. Conduct incident response tabletop and ensure on-call runbook + error budgets are published.

## Exit Criteria
- All acceptance criteria in Section 15 met in staging and spot-checked in production-like environment.
- Dashboards + alerts green for 48 hours of soak tests with synthetic traffic.
- Known post-beta stretch items triaged with owners/dates.
