# Improview UI Design Guide

Version: 0.1 (draft)
Audience: Frontend engineer agents and UI contributors working on Improview
Context: Improview is a serverless coding interview practice platform with seamless light/dark themes, pastel accents, and a minimalist aesthetic. It generates problem packs via LLMs and delivers a Zed-inspired, Vim-friendly workspace.

## Scope & Principles

- **North-star**: clarity of problem solving, speed across devices, accessibility, resilience to flaky providers.
- **Deterministic outputs**: same inputs (categories, prompts) must generate identical UI and code—never randomize layout, copy, or visual treatments.
- **Design tokens first**: every visual value maps to tokens in `/tokens/tokens.json`; never hard-code colors, spacing, radii, or typographic values.
- **Accessibility baseline**: WCAG 2.2 AA minimum, keyboard-first UX, screen reader parity, reduced-motion compliance.
- **Theme flexibility**: seamless light/dark theme support with pastel accents in both modes; light mode uses minimal black-on-paper aesthetic with off-white (#FBF1C7) background; dark mode uses white-on-dark-grey with matching pastel palette.
- **Edge-first performance**: hit cold TTI ≤ 1.0s (spec) and TTI ≤ 1.2s worst-case (acceptance criteria) via lightweight bundles and eager skeletons.

## Product Context

- **Key personas**: SWE candidates, practicing engineers, mentors/recruiters. Expect power users who rely on keyboard shortcuts and Vim habits.

## Design Tokens & Theming

### Token schema (EXAMPLE ONLY)

Store tokens as JSON with the following shape (extend only via documented keys). Color tokens define both light and dark theme values using semantic naming:

```json
{
  "color": {
    "light": {
      "bg": {
        "default": "#FBF1C7",
        "panel": "#F2E5BC",
        "sunken": "#EBDBB2",
        "elevated": "#FFFFFF"
      },
      "fg": {
        "default": "#1C1C1C",
        "muted": "#504945",
        "subtle": "#7C6F64",
        "inverse": "#FBF1C7"
      },
      "accent": {
        "primary": "#83A598",
        "emphasis": "#689D6A",
        "soft": "#B8D4CB"
      },
      "info": { "600": "#76A9D8", "soft": "#B3D4ED" },
      "success": { "600": "#689D6A", "soft": "#A8CEA1" },
      "warning": { "600": "#D79921", "soft": "#F2CC8F" },
      "danger": { "600": "#CC241D", "soft": "#F5A9A3" },
      "border": {
        "default": "#D5C4A1",
        "subtle": "#E5D5B7",
        "focus": "#83A598"
      }
    },
    "dark": {
      "bg": {
        "default": "#1C1C1C",
        "panel": "#282828",
        "sunken": "#161616",
        "elevated": "#323232"
      },
      "fg": {
        "default": "#EBDBB2",
        "muted": "#A89984",
        "subtle": "#928374",
        "inverse": "#1C1C1C"
      },
      "accent": {
        "primary": "#83A598",
        "emphasis": "#8EC07C",
        "soft": "#5A7E72"
      },
      "info": { "600": "#7DAEA3", "soft": "#5A8A7E" },
      "success": { "600": "#8EC07C", "soft": "#6A9A60" },
      "warning": { "600": "#FABD2F", "soft": "#D79921" },
      "danger": { "600": "#FB4934", "soft": "#CC241D" },
      "border": {
        "default": "#3C3836",
        "subtle": "#504945",
        "focus": "#83A598"
      }
    }
  },
  "space": {
    "0": 0,
    "1": 4,
    "2": 8,
    "3": 12,
    "4": 16,
    "5": 20,
    "6": 24,
    "8": 32,
    "10": 40,
    "12": 48,
    "16": 64
  },
  "radius": { "sm": 6, "md": 12, "lg": 16, "xl": 24 },
  "shadow": {
    "light": {
      "sm": "0 2px 6px rgba(60, 56, 54, 0.08)",
      "md": "0 8px 20px rgba(60, 56, 54, 0.12)"
    },
    "dark": {
      "sm": "0 2px 6px rgba(0, 0, 0, 0.32)",
      "md": "0 8px 20px rgba(0, 0, 0, 0.48)"
    }
  },
  "font": {
    "family": {
      "sans": "Geist, system-ui, sans-serif",
      "mono": "'CursorMono','JetBrains Mono','Fira Code','ui-monospace'"
    },
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

**Color Philosophy:**

- **Light mode**: Minimal, papier aesthetic with warm off-white (#FBF1C7) background—evoking paper quality. Pure black (#1C1C1C) text and icons maximize readability and create stark, clean lines. Pastel accents (muted blues, greens, warm yellows) provide subtle visual hierarchy without overwhelming the content-first experience.
- **Dark mode**: Soft white-on-charcoal for comfortable low-light reading. Dark grey backgrounds (#1C1C1C base) with slightly elevated panels (#282828) maintain depth. The same pastel accent palette persists, adjusted for sufficient contrast against dark backgrounds.
- **Pastel strategy**: Accent colors are desaturated and luminosity-balanced to feel calm and professional, never garish. They communicate state (success/warning/danger) and interaction affordances while maintaining visual harmony across both themes.

### Theming rules

- **Contrast requirements**: body text ≥4.5:1 against `color.bg.default`; large text and iconography ≥3:1 in both light and dark modes.
- **Theme switching**: respect `prefers-color-scheme` by default; provide manual theme toggle that persists to localStorage; theme applies globally including editor chrome (editor content styling remains independent).
- **Semantic tokens**: components reference theme-agnostic semantic tokens (e.g., `bg.default`, `fg.default`) that map to light/dark values via CSS custom properties.
- **RTL support**: all spacing/margins respond to RTL by mirroring via logical properties (e.g., `margin-inline-start`).
- **Transition smoothness**: theme switches animate color properties over 180ms with `prefers-reduced-motion` fallback to instant swap.

### Token governance

- Tokens live in `/tokens/tokens.json` with versioning per release; designers consume via plugin.
- Breaking token changes require semantic version bump and deprecation notice; provide codemod when renaming tokens.

### Theme implementation

- **CSS Custom Properties**: Generate CSS variables from tokens at build time, with theme-specific values applied via `[data-theme="light"]` and `[data-theme="dark"]` selectors on `:root`.
- **Theme Provider**: React context provider manages theme state, persists to localStorage, and syncs with `prefers-color-scheme`.
- **Tailwind Integration**: Extend Tailwind config to consume CSS custom properties (e.g., `bg-default` maps to `var(--color-bg-default)`).
- **Component Patterns**: Components use semantic token references; never conditionally render styles based on theme—let CSS variables handle the swap.
- **SSR Considerations**: Inject theme script in `<head>` before first paint to prevent flash of wrong theme (FOUT).

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
- ThemeToggle (light/dark switcher)
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

- Mobile / Tablet responsive-ness is a core functional requirement.
- Grid: 12-column with 16px base gutter; use spacing tokens for margins/padding.
- Breakpoints: `sm` (<640px collapses workspace to stacked panes); `md` introduces dual-column layout; `lg` adds history sidebar; `xl` increases max-width to 1280px.
- Maintain minimum interactive target 44×44px; timer chip 48×48px.
- Density variants: `comfortable` default; `compact` for history tables (uses `space.2` / `space.3`).
- RTL: mirror layout automatically; ensure icons and animations flip when directional (e.g., arrow icons, code diff markers).

## Motion & Feedback

### Philosophy: Tactile Everything, Instant Navigation

- **Tactile interactions**: Every interactive component must provide immediate visual/haptic feedback. Users should _feel_ the interface respond to their input.
- **No page transition animations**: Route changes, page loads, and navigation are **instant** (0ms). Speed perception trumps smoothness for navigation.
- **Micro-interactions everywhere**: Buttons, inputs, switches, cards, chips, tabs—anything clickable/tappable get subtle animation feedback.
- **Loading states, not loading animations**: Show skeleton UI or spinners for async data, but never animate the page structure itself on navigation.

### Navigation & Page Loads (Zero Animation)

- **Route transitions**: Instant swap (0ms). No fade, slide, or any transition effect.
- **Page-level layout**: Never animate structural changes. Content appears immediately.
- **Scroll position**: Restore instantly; no smooth scroll on navigation.
- **Why**: Perceived performance > animation polish for navigation. Users want to _feel_ speed.

### Loading States (Show State, Don't Animate Structure)

**Problem pack generation:**

- Show skeleton UI instantly (0ms transition)
- Pulse animation on skeleton (1.5s cycle, subtle)
- Replace with content via opacity crossfade (120ms) when ready

**Editor loading:**

- Show empty editor frame immediately
- Monaco loads in background; show lightweight spinner
- Once ready, swap instantly (0ms)

**Test results streaming:**

- Results appear as they complete (0ms per result)
- Success/failure icons have micro scale entrance (120ms)
- No "waiting for all tests" animation

**History/data fetching:**

- Show page structure immediately
- Skeleton cards in place of content
- Swap to real content as chunks arrive (120ms crossfade per chunk)

### Performance Constraints

- **Allowed transitions**: `opacity`, `transform` (translate/scale/rotate), `box-shadow`. Never animate `width`, `height`, `top`, `left`, `margin`, or `padding` (causes layout thrashing).
- **Duration limits**: Micro-interactions ≤120ms; standard interactions ≤180ms; complex interactions ≤240ms. Anything longer feels sluggish.
- **Spring damping**: Use `motion.easing.spring` with damping=0.7 for natural feel without excessive bounce.
- **Reduced motion**: All animations must have a `prefers-reduced-motion` fallback that either removes animation entirely or reduces to instant state change with subtle opacity fade (60ms max).
- **INP budget**: Animations cannot delay interactivity. Use `transform` and `opacity` (GPU-accelerated) only.

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
- **Theme testing**: each component test suite includes light and dark theme variants; verify contrast ratios programmatically; test theme switching transitions.
- Visual regression via Storybook (or Ladle) chromatic baseline; capture snapshots in both light and dark themes for critical components (Button, Workspace, Editor wrapper).
- Automated a11y: run axe on Storybook stories in both themes; capture DOM snapshots; verify focus indicators meet contrast in both modes.
- E2E via Playwright: cover generate → solve (mock) → run tests → submit; include mobile viewport; test theme persistence across navigation.
- Pre-commit hooks run `pnpm lint`, `pnpm test`, `pnpm format`, `pnpm test:a11y`.

## Analytics & Telemetry

- Event taxonomy (namespace `ui.*`): `ui.generate_click`, `ui.generate_success`, `ui.hint_reveal`, `ui.run_public`, `ui.run_hidden`, `ui.submit`, `ui.pass`, `ui.fail`, `ui.time_overrun`, `ui.theme_switch`.
- Required event props: `{ component, action, variant, status, latencyMs, attemptId? }`.
- Respect privacy: log events only for authenticated users who opted in; anonymize/aggregate for guests.
- Quality metrics: track click success rate, hint usage vs pass rate, rage-click detection on Generate CTA.

## Delivery & Handoff

- Treat tokens as single source of truth; designers consume them via plugin; code reads from `/tokens/tokens.json` and generates CSS vars/Tailwind config.
- Component spec template must include: purpose & anatomy, typed props, states (default/hover/focus/active/disabled/error/loading), accessibility notes, content rules, usage dos/don’ts.
- Use semantic versioning for component packages; document deprecations and provide codemods for breaking changes.
- Handoff artifacts: Figma spec link, Storybook URL, token diff, and test results summary.

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
  - Focus ring visible and contrast-healthy in both light and dark themes.
  - Keyboard navigation + screen reader labels verified.
  - RTL layout exercised via Storybook story.
  - Stories cover all variants/states in both themes.
  - Tests cover keyboard + error states + theme switching.
  - Bundle impact measured and under budget.
  - Visual regression tests pass for both light and dark modes.

- **Page template checklist**:
  - Skip-to-content link visible on focus.
  - Responsive layouts validated at sm/md/lg/xl.
  - Analytics events instrumented for critical interactions.
