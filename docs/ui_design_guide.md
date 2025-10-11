# Improview UI Design Guide

Version: 0.1 (draft)
Audience: Frontend engineer agents and UI contributors working on Improview
Context: Improview is a dark-first, serverless coding interview practice platform that generates problem packs via LLMs and delivers a Zed-inspired, Vim-friendly workspace.

## Scope & Principles
- **North-star**: clarity of problem solving, speed across devices, accessibility, consistency with Anysphere Dark aesthetic, resilience to flaky providers.
- **Deterministic outputs**: same inputs (categories, prompts) must generate identical UI and code—never randomize layout, copy, or visual treatments.
- **Design tokens first**: every visual value maps to tokens in `/tokens/tokens.json`; never hard-code colors, spacing, radii, or typographic values.
- **Accessibility baseline**: WCAG 2.2 AA minimum, keyboard-first UX, screen reader parity, reduced-motion compliance.
- **Dark-mode primary**: app chrome is always Anysphere Dark; the editor offers an in-editor Gruvbox Soft preview only.
- **Edge-first performance**: hit cold TTI ≤ 1.0s (spec) and TTI ≤ 1.2s worst-case (acceptance criteria) via lightweight bundles and eager skeletons.

## Product Context
- **Primary flows**: (1) Generate problem → (2) Solve in two-pane workspace → (3) Run public tests → (4) Submit & review results → (5) Review history.
- **Key personas**: SWE candidates, practicing engineers, mentors/recruiters. Expect power users who rely on keyboard shortcuts and Vim habits.
- **Phase awareness**: follow implementation phases (docs/implementation_plan.md) so UI states exist ahead of backend milestones (e.g., mocked data during Phase 2, timer persistence Phase 4).
- **Non-goals**: social feeds, multi-language judging (beyond JS/TS at launch), light theme outside editor preview.

## Design Tokens & Theming
### Token schema
Store tokens as JSON with the following shape (extend only via documented keys):

```json
{
  "color": {
    "bg": { "default": "#0F1115", "panel": "#151821", "sunken": "#0B0D12" },
    "fg": { "default": "#E6E8EE", "muted": "#A9B1C6", "inverse": "#0F1115" },
    "accent": { "primary": "#7AA2F7", "emphasis": "#4C7CF3" },
    "info": { "600": "#64B5F6" },
    "success": { "600": "#4FB286" },
    "warning": { "600": "#E5C07B" },
    "danger": { "600": "#E5484D" },
    "border": { "subtle": "#1E2230", "focus": "#7AA2F7" }
  },
  "space": { "0": 0, "1": 4, "2": 8, "3": 12, "4": 16, "5": 20, "6": 24, "8": 32, "10": 40, "12": 48, "16": 64 },
  "radius": { "sm": 6, "md": 12, "lg": 16, "xl": 24 },
  "shadow": { "sm": "0 2px 6px rgba(8, 10, 15, 0.32)", "md": "0 8px 20px rgba(8, 10, 15, 0.4)" },
  "font": {
    "family": { "sans": "Geist, system-ui, sans-serif", "mono": "'CursorMono','JetBrains Mono','Fira Code','ui-monospace'" },
    "size": { "xs": 12, "sm": 13, "base": 14, "md": 16, "lg": 18, "xl": 20, "2xl": 24 },
    "weight": { "regular": 400, "medium": 500, "semibold": 600 }
  },
  "breakpoints": { "sm": 640, "md": 768, "lg": 1024, "xl": 1280 },
  "z": { "base": 0, "dropdown": 1000, "modal": 2000, "toast": 3000 },
  "motion": {
    "duration": { "instant": 0, "fast": 120, "base": 180, "slow": 240 },
    "easing": { "inOut": "cubic-bezier(0.4, 0, 0.2, 1)", "spring": "cubic-bezier(0.16, 1, 0.3, 1)" }
  }
}
```

### Theming rules
- Respect minimum contrast: body text ≥4.5:1 against `color.bg.default`; large text and iconography ≥3:1.
- Provide light/dark token pairs for future theming but ship dark-only skin; editor’s Gruvbox Soft values live under `color.editor.light` tokens and apply locally.
- Support `prefers-color-scheme` for system toggles even if UI remains dark (still required for OS-managed UI like scrollbars).
- All spacing/margins respond to RTL by mirroring via logical properties (e.g., `margin-inline-start`).
- Fallback tokens for localization: store bidi-aware spacing variants (e.g., `space.inline.compact`).

### Token governance
- Tokens live in `/tokens/tokens.json` with versioning per release; designers consume via plugin referenced in docs/implementation_plan.md Phase 1.
- Breaking token changes require semantic version bump and deprecation notice; provide codemod when renaming tokens.

## Components & Patterns
### Atomic inventory (ship as accessible primitives in `/components/{Component}/`)
- Button, ButtonGroup, IconButton
- Input, TextArea, Select, Combobox (category picker)
- Checkbox, Switch, RadioGroup
- Tabs (workspace panes), Tooltip, Toast
- Card, Panel, Sheet/Dialog, Drawer (mobile nav)
- Navbar, Sidebar (History), Breadcrumbs (History detail)
- Table (results + history), Pagination (History), Tag/Chip (difficulty, category)
- Accordion (example solutions), Disclosure (hint)
- Skeleton, Spinner, Empty State
- Timer widget, Progress Chip
- Code editor wrapper (Monaco/CM6 host), Test output list

### Authoring rules
- Export controlled components by default; allow uncontrolled with explicit prop gate (e.g., `allowUncontrolled` with docs explaining risks).
- Structure accessible markup first: label/input associations, `aria-*` states, focus traps in dialogs, `role=alert` for toasts.
- Variant prop sets must be deterministic (`variant: 'primary' | 'secondary' | 'ghost' | 'danger'`). Map directly to tokens.
- Motion respects `prefers-reduced-motion`; fall back to instant transitions when set.
- Provide Storybook stories and Playwright/RTL tests for all variants before merging (Definition of Done).

### Interaction patterns
- **Forms**: inline validation on blur/change; error messages under fields using `aria-live="polite"`; disable submit until async validation resolves; debounce to 150ms max.
- **Navigation**: skip link at top routes to `main`; maintain logical tab order; highlight current route in sidebar.
- **Dialogs/Sheets**: close via ESC, explicit buttons; restore focus to trigger; mobile breakpoints use bottom sheet variant.
- **Editor actions**: keyboard equivalents for run tests (`⌘⏎` / `Ctrl+Enter`), submit (`⇧⌘⏎` / `Shift+Ctrl+Enter`), toggle hint (`?`), toggle solutions (`s`). Document shortcuts within help modal.
- **Loading/Error surfaces**: prefer skeleton placeholders for problem pack; toasts for background successes/failures; inline error banners for blocking issues (e.g., run-tests failure).

### Product-specific compositions
- **Home screen**: category pills (wrap at `md`, convert to horizontal carousel <640px), difficulty chips, provider selector (radio segmented control), optional custom prompt textarea, Generate CTA pinned at bottom on mobile.
- **Workspace layout**: 12-column grid; left pane min 40% width (statement) collapsible on `sm`; right pane houses editor + test runner; timer chip pinned top-right of statement pane; Show Hint button with safe state transitions (counts reveal).
- **Results view**: success uses `accent.primary` glow and confetti micro animation (≤200ms); failure uses `danger` palette with call-to-action to retry; table shows Public vs Hidden tests with badges; diff viewer uses monospace font with inline color tokens.
- **History**: list view paginated; summary cards include category, difficulty, pass/fail, time spent; detail view uses Tabs for Code, Tests, Metrics.

## Copy & Content Design
- Voice: concise, action-oriented, motivational; avoid jargon beyond algorithm terms.
- Buttons use verbs (`Generate`, `Run tests`, `Submit attempt`, `Reveal hint`).
- Error copy communicates cause + next action (“Problem generation failed. Retry or switch providers.”).
- Hints labeled with cost (“Reveal hint · deducts 1 insight”).
- Placeholder text never doubles as label; use helper text for constraints (e.g., “Optional. Nudges the LLM if you want grid-based BFS.”).
- Localize strings via ICU messages; avoid concatenation; support pluralization (`{count, plural, one {# attempt} other {# attempts}}`).

## Accessibility Checklist (must-pass)
- Full keyboard coverage: tab/shift+tab traversal, arrow nav for lists/pills, enter/space activation.
- Focus ring: 2px outline using `color.border.focus`; never suppress outlines.
- Use native semantics before ARIA; when using ARIA ensure no role conflicts (especially in Monaco wrapper).
- Validate color/contrast for hover, active, disabled, and focus states.
- Screen reader support: editor wrapper announces line/column; timer updates via polite live region; test results streamed via `aria-live`.
- Each component doc includes dedicated accessibility notes and “Don’t” examples.

## Layout & Responsive Behavior
- Grid: 12-column with 16px base gutter; use spacing tokens for margins/padding.
- Breakpoints: `sm` (<640px collapses workspace to stacked panes); `md` introduces dual-column layout; `lg` adds history sidebar; `xl` increases max-width to 1280px.
- Maintain minimum interactive target 44×44px; timer chip 48×48px.
- Density variants: `comfortable` default; `compact` for history tables (uses `space.2` / `space.3`).
- RTL: mirror layout automatically; ensure icons and animations flip when directional (e.g., arrow icons, code diff markers).

## Motion & Feedback
- Allowed transitions: opacity, translate, scale ≤1.05, box-shadow; avoid layout-shifting animations.
- Default duration `motion.duration.base` (180ms); global nav uses `slow` (240ms) for smooth in/out; micro-interactions `fast` (120ms).
- Framer Motion springs use `motion.easing.spring` with damping tuned for minimal bounce; always provide `prefers-reduced-motion` fallback to no animation.
- Optimistic UI: start showing skeleton + timer when generate call begins; revert gracefully on failure with inline banner + retry.
- Toasts appear top-right (desktop) / bottom (mobile) for 4s; success uses `success.600`, failure uses `danger.600` background.

## Performance & Quality Budgets
- Targets: Lighthouse Performance ≥95, LCP ≤2.5s, CLS ≤0.1, INP ≤200ms on mid-tier hardware.
- Bundle budgets: initial JS ≤250kB gz (goal 200kB); per-route chunk ≤150kB; enforce via CI bundle analyzer.
- Code splitting: lazy-load Monaco editor, history routes, confetti library; keep home hero under 100kB.
- Icons: use sprite or build-time tree-shaken icon imports; never inline base64 data URIs.
- Images: prefer AVIF/WEBP, include `srcset` + `sizes`, lazy-load below the fold.
- Deduplicate imports; agent must tree-shake libs and forbid unused deps (lint error).

## Security & Privacy
- Sanitize any LLM-rendered markdown via trusted renderer (no raw HTML injection); HTML user inputs sanitized; never use `dangerouslySetInnerHTML` without review.
- Enforce CSP-compatible patterns: no inline `<style>` or `<script>`; use Tailwind/tokens + CSS variables; for Monaco, scope required `unsafe-eval` to editor only.
- Secrets/config values come from env or Cognito; never embed keys.
- Display privacy affordances: when history sync is enabled, show tooltip clarifying retention and opt-out toggle.
- Prompt-injection guardrails: highlight to users when custom prompts disabled due to security.

## Testing & Verification
- Unit/component tests via Vitest + React Testing Library with a11y queries; maintain ≥80% line coverage per package.
- Visual regression via Storybook (or Ladle) chromatic baseline; run on critical components (Button, Workspace, Editor wrapper).
- Automated a11y: run axe on Storybook stories; capture DOM snapshots.
- E2E via Playwright: cover generate → solve (mock) → run tests → submit; include mobile viewport.
- Pre-commit hooks run `pnpm lint`, `pnpm test`, `pnpm format`, `pnpm test:a11y`.

## Analytics & Telemetry
- Event taxonomy (namespace `ui.*`): `ui.generate_click`, `ui.generate_success`, `ui.hint_reveal`, `ui.run_public`, `ui.run_hidden`, `ui.submit`, `ui.pass`, `ui.fail`, `ui.time_overrun`.
- Required event props: `{ component, action, variant, status, latencyMs, attemptId? }`.
- Respect privacy: log events only for authenticated users who opted in; anonymize/aggregate for guests.
- Quality metrics: track click success rate, hint usage vs pass rate, rage-click detection on Generate CTA.

## Delivery & Handoff
- Treat tokens as single source of truth; designers consume them via plugin; code reads from `/tokens/tokens.json` and generates CSS vars/Tailwind config.
- Component spec template must include: purpose & anatomy, typed props, states (default/hover/focus/active/disabled/error/loading), accessibility notes, content rules, usage dos/don’ts.
- Use semantic versioning for component packages; document deprecations and provide codemods for breaking changes.
- Handoff artifacts: Figma spec link, Storybook URL, token diff, and test results summary.

## Agent-Specific Operating Rules
- Stack defaults: React + TypeScript (strict), Tailwind + CSS variables from tokens, shadcn/ui primitives allowed; avoid CSS-in-JS unless explicitly requested.
- File layout:
  - `/components/{Component}/index.ts`
  - `/components/{Component}/{Component}.tsx`
  - `/components/{Component}/{Component}.stories.tsx`
  - `/components/{Component}/{Component}.test.tsx`
  - `/components/{Component}/a11y.spec.ts`
  - `/tokens/tokens.json`
- Prompting contract: use tokens for all spacing/color/radius; implement keyboard and aria patterns before exporting; enforce variant names; generate stories and tests with each component; refuse to ship if a11y or perf budgets fail—return remediation report instead.
- Definition of Done: axe + keyboard checks pass, bundle budgets met, stories and RTL tests present, types exported/documented, no console errors, lint/format clean.

## Error Handling & Empty States
- Standardized errors: network error (retry with provider switch), auth error (prompt re-login), validation error (show inline), 404 (problem missing), 500 (generic failure with retry + contact link).
- Empty states include icon/illustration, one-line explanation, and primary action (e.g., “No attempts yet — Generate your first challenge”). Never present blank panels.
- Offline mode: show connectivity banner, disable server actions with helper text, queue actions when possible.

## Privacy & AI UX
- Disclose AI usage near Generate CTA (“Problems generated by AI providers; review outputs before sharing.”).
- Provide data usage note with opt-out toggle for history storage; show in settings and initial consent banner.
- Uncertainty UI: expose estimated difficulty/time; allow feedback (“Report issue with problem pack”).
- Latency handling: show skeleton + animated dots, stream timer start; allow cancel/cancelled state for generation; provide undo for destructive actions.
- Safety rails: redact PII/profanity in rendered markdown; consistent refusal messaging when provider declines (no anthropomorphizing).

## Tooling & Linting
- ESLint + Stylelint configs ship in repo; rules ban inline styles, hard-coded colors, unused variables.
- Enable `eslint-plugin-jsx-a11y`, `eslint-plugin-testing-library`, `@typescript-eslint` strict rules.
- Tailwind config generated from tokens; forbid arbitrary values unless added to safelist with justification.
- Pre-commit (lint-staged) runs typecheck, lint, format, tests, a11y snapshot.

## Quick Checklists
- **Component PR checklist**:
  - Uses tokens only (no raw hex/rgb literals).
  - Focus ring visible and contrast-healthy.
  - Keyboard navigation + screen reader labels verified.
  - RTL layout exercised via Storybook story.
  - Stories cover all variants/states.
  - Tests cover keyboard + error states.
  - Bundle impact measured and under budget.

- **Page template checklist**:
  - Landmark roles (header/main/nav/footer) present.
  - Page has single `h1`; headings in logical order.
  - Skip-to-content link visible on focus.
  - Responsive layouts validated at sm/md/lg/xl.
  - Analytics events instrumented for critical interactions.

