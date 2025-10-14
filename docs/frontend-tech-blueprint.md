# Improview Frontend Blueprint

This document explains how to rebuild the Improview web client from the ground up, even if you swap out the existing UI kit. It focuses on architecture, data flow, and integration contracts rather than styling, so you can reproduce the current behavior with any component library—as long as the replacement satisfies the UX primitives listed in `docs/product_spec.md`.

---

## Dependency Categories

### Contracts that Must Be Preserved

- **Authentication store contract:** exposes status, user, token management, and hydration gating (see §3).
- **Routing + guard contract:** supports eager redirects before protected pages render, loader-style data prefetching, and router-level context (see §2).
- **Server-state management contract:** cache writes, optimistic updates, and mutation lifecycles (React Query today; SWR/Apollo/Urql equivalents are acceptable if they satisfy the contract in §4).
- **Toast/notification contract:** global publish/dismiss API with timed auto-dismiss (see §1).
- **Code editor contract:** controlled component accepting `value`, `onChange`, and language metadata (see §6).

### Recommended but Swappable Libraries

- TanStack Router (or any router that provides nested routes, async guards, and loader-style data prefetching).
- React Query (or any server-state layer supporting cache priming + mutations).
- Zustand (Redux Toolkit, Jotai, MobX, or Context/reducer solutions are fine if they implement the auth-store contract).

### Pure UI Dependencies

These can be replaced wholesale provided the product spec’s components exist:

- Toast/notification surface.
- Form controls, tabs, tables, cards, dialogs, markdown renderer.
- Animation helpers (Framer Motion today).
- Syntax/code editor (currently `@uiw/react-codemirror`).

---

## 1. Application Shell

### Bundler & Entry

- The current app uses Vite (`apps/web/vite.config.ts`) with React + TypeScript. `main.tsx` mounts the tree with React 18’s `createRoot` and wraps it in several global providers.
- Rebuild steps:
  1. Resolve the user’s preferred theme before the first paint (see §6).
  2. Instantiate the shared server-state client (React Query’s `QueryClient` today).
  3. Render `<RouterProvider router={router} />` inside the provider stack below.

### Global Providers

1. **Server-state provider** (`QueryClientProvider` today): inject the singleton client used by loaders and mutations.
2. **Toast provider** (`@improview/ui`’s `ToastProvider` today): see “Toast contract” below.
3. **Theme provider** (custom, §6): stores mode, applies it to the DOM, and persists it.
4. **Router provider** (`RouterProvider` from TanStack Router): consumes the configured router.

Keep the context hooks (`useToast`, `useTheme`) stable so feature modules remain library-agnostic.

### Toast Contract

Any replacement must provide this contract:

```ts
type ToastVariant = 'default' | 'success' | 'error' | 'warning';
interface ToastOptions {
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}
interface ToastContextValue {
  publish(options: ToastOptions): string;
  dismiss(id: string): void;
}
```

The reference implementation (`packages/ui/src/components/Toast/Toast.tsx`) maintains internal state with:

- `useState<ToastInstance[]>` for active toasts.
- `useRef` counters for auto-generated IDs (`toast-1`, `toast-2`, …).
- `Map<string, number>` to track `setTimeout` handles for auto-dismiss.
- A viewport rendered alongside the app that animates entries/exits (Framer Motion) and exposes a manual close button.

Any UI system can be used so long as it honours the same publish/dismiss semantics, deduplicates IDs, schedules auto-dismiss, and renders accessible toast containers (`role="status"`).

---

## 2. Routing & Navigation

### Guard & Loader Contract

```ts
interface RouteGuardContext {
  locationHref: string;
  redirect(to: string, search?: Record<string, string>): never;
}
type RequireAuth = (ctx: RouteGuardContext) => Promise<void>;
```

- Guards must run before protected layouts render, await the auth store’s hydration state, and throw/return redirects.
- Loader equivalents must accept a shared context (API client + server-state client) and seed caches before the screen renders.

### Current Implementation

- Router: `@tanstack/react-router`. `router.tsx` defines:
  - `RootRoute` with `AppLayout` (header, auth watcher, and outlet).
  - Child routes for `/`, `/workspace/$attemptId`, `/results/$attemptId`, `/history`, `/auth/login`, `/auth/callback`.
  - A shared router context `{ queryClient, apiClient }` consumed by loaders.

- Guards:
  - `requireAuth(location.href)` waits for hydration (see §3) then inspects the auth store.
  - Protected routes call `requireAuth` from `beforeLoad`. If unauthenticated, they issue `redirect({ to: '/auth/login', search: { redirect } })`.
  - `AuthStatusWatcher` (mounted in `AppLayout`) reacts post-render: it redirects if the user loses auth after hydration and triggers token refreshes when expiry nears.

When adopting a different router, ensure it can perform these checks prior to rendering and can pre-populate server state through the loader equivalent.

---

## 3. Authentication Flow (PKCE + Cognito/OpenID)

### Store Contract

```ts
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
interface AuthUser {
  username: string;
  email?: string;
}
interface AuthStore {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  hasHydrated: boolean;
  login(payload: {
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
    expiresIn?: number;
    user: AuthUser;
  }): void;
  logout(): void;
  markUnauthorized(): void;
  refresh(): Promise<void>;
  waitForHydration(): Promise<void>;
}
```

Any state library can be used, provided it exposes equivalent methods, persists the necessary fields, and signals hydration completion.

### Configuration

- Required env vars: `VITE_AUTH_DOMAIN`, `VITE_AUTH_CLIENT_ID`.
- Optional overrides:
  - `VITE_AUTH_REDIRECT_URI` → defaults to `${window.location.origin}/auth/callback`
  - `VITE_AUTH_LOGOUT_REDIRECT_URI` → defaults to `${window.location.origin}`
  - `VITE_AUTH_SCOPE` → defaults to `openid profile email`
  - `VITE_AUTH_IDENTITY_PROVIDERS`, `VITE_AUTH_GOOGLE_PROVIDER` (provider selection)
  - `VITE_AUTH_CLIENT_SECRET` (only for confidential clients)

### Auth Service

- Normalizes the domain, builds authorize/token/logout endpoints.
- Generates PKCE verifier + code challenge (`createCodeVerifier`, `createCodeChallenge`).
- Exchanges authorization codes and refresh tokens via `fetch`, returning an `AuthTokenResponse`.
- Decodes ID tokens to derive a lightweight `AuthUser`.

### Auth Store Implementation

- Zustand + `persist` store with state shape `{ status, user, accessToken, idToken, refreshToken, expiresAt, hasHydrated }`.
- Actions:
  - `login(payload)` stores tokens, user, expiry, sets `status: 'authenticated'`.
  - `logout()` / `markUnauthorized()` clear credentials.
  - `refresh()` exchanges the refresh token; concurrent calls share a module-level `refreshPromise`.
  - `setHydrated()` finalizes hydration after persisted data loads and validates expiry.
- `waitForAuthHydration()` (the concrete `waitForHydration`) resolves once persisted data have been read so guards avoid premature redirects.

### Pages

- **LoginPage**: waits for hydration; if already authenticated, redirects immediately. Initiates PKCE flow by storing verifier/state/redirect in sessionStorage and navigating to the hosted UI.
- **AuthCallbackPage**: validates state, exchanges the code, populates the store, clears session keys, and redirects to the stored target. Handles errors (including double invocation in StrictMode) by resetting session data and marking the user unauthenticated.

---

## 4. Data Access & Server State

### Server-State Contract

```ts
interface ServerStateClient {
  setQueryData<T>(key: unknown[], updater: T | ((prev?: T) => T)): void;
  getQueryData<T>(key: unknown[]): T | undefined;
  invalidateQueries(key: unknown[]): Promise<void>;
  mutation<TVars, TResult>(options: {
    mutationFn(vars: TVars): Promise<TResult>;
    onSuccess?(result: TResult, vars: TVars): void;
    onError?(error: unknown, vars: TVars): void;
  }): { mutate(vars: TVars): void };
}
```

React Query satisfies this contract today. SWR (with `mutate`), Apollo Client, or Urql can be configured similarly if they provide cache priming, optimistic updates, and mutation lifecycle hooks.

### Current Usage

- Singleton `QueryClient` (`lib/queryClient.ts`) with defaults: retry twice, 30 s stale time, no refetch on window focus.
- Router loaders:
  - `workspaceRoute.loader` fetches attempt/problem data, seeds cache keys `['attempt', id]`, `['runs', id]`, `['problem', problemId]`.
  - `resultsRoute.loader` fetches attempt/problem, infers/loads submission summaries and seeds `['submission', id]`.
- Mutations:
  - `HomePage`: orchestrates `generate` + `createAttempt`, caches results, records history, navigates to workspace.
  - `WorkspacePage`: `runTests` (public/hidden) and `submit`; updates caches and local history.
  - Error handling uses `ApiError` to surface 401-specific messaging.

When migrating to a different data layer, replicate these cache keys and mutation side-effects.

---

## 5. API Layer

### Type Validation

- Zod schemas in `apps/web/src/api/types.ts` define contracts for requests/responses (Attempt, ProblemPack, RunResult, etc.).
- Types are re-exported to keep feature code type-safe regardless of transport changes.

### REST Client

- `api/restClient.ts` wraps an `ApiService` and exposes methods:
  - `POST /api/generate`
  - `POST /api/attempt`
  - `POST /api/run-tests`
  - `POST /api/submit`
  - `GET /api/attempt/:id`
  - `GET /api/problem/:id`
- Each method calls `ApiService.request` and validates the payload with the appropriate zod schema before returning it to callers.

### ApiService

- Joins base URL and path, always sends `Content-Type: application/json`.
- Injects `Authorization: Bearer ${accessToken}` when a token exists.
- Sends `credentials: 'include'` for compatibility with cookie-backed deployments.
- On HTTP 401, calls `useAuthStore.getState().markUnauthorized()` so guards respond accordingly.
- Throws `ApiError` with parsed payload (when JSON) for upper layers to display.

Regardless of transport (REST, GraphQL, RPC), ensure responses are validated and unauthorized responses trigger the auth store reset.

---

## 6. Local State & Persistence

### Theme Management

- `providers/ThemeProvider.tsx` determines the initial theme (stored value → system preference) and persists updates in `localStorage`.
- `applyThemeMode` from the UI kit synchronizes global styles with the selected theme.
- Exposes `useTheme()` returning `{ theme, setTheme, toggleTheme }`.

### Auth Persistence

- The auth store uses `persist` to store a subset of fields in `localStorage`.
- `hasHydrated` indicates when cached credentials are available so guards and pages can safely render.

### Workspace Session State

- Code editor drafts persist via `usePersistedState('attempt:${id}:code', defaultSource)`, keeping edits across reloads or tab switches.
- Test results are stored locally as `{ public: RunResult[]; hidden: RunResult[] }`, allowing the UI to toggle between sheets without refetching.
- Timers (`TimerHandle` refs) track elapsed time per attempt, enabling pause/resume without rerenders.

Any rewrite should reproduce these behaviors even if the UI implementation changes.

### History Storage

- `storage/history.ts` keeps a local attempt history keyed by `attemptId`, recording status, pass/fail counts, and durations.
- Actions:
  - `recordAttemptStart` seeds a new entry when an attempt is created.
  - `recordRunUpdate` increments pass/fail counters after each run.
  - `recordSubmission` updates status/duration upon submission.
  - `clearHistory` wipes the storage key.

---

## 7. Performance Considerations

- **Query caching** avoids redundant fetches; loaders seed the cache so screens render with data immediately after navigation.
- **Memoization** (`useMemo`, `useRef`) reduces recomputation (e.g., default code stub, total runtime, timer tracking).
- **LocalStorage access** occurs in initializers/effects to prevent blocking renders.
- **StrictMode guards** (e.g., `handledParamsRef` in the auth callback) prevent double submission during development.
- **Fine-grained selectors** (Zustand’s `useAuthStore((s) => s.status)`) limit re-renders to relevant components.
- When integrating a new UI library, watch for heavy components (code editors, markdown renderers) and lazy-load or virtualize as needed.

---

## 8. Environment & Build Configuration

| Variable                        | Required | Default / Notes                                                                        |
| ------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `VITE_AUTH_DOMAIN`              | ✅       | Cognito/IdP domain (no protocol, e.g., `your-domain.auth.us-east-1.amazoncognito.com`) |
| `VITE_AUTH_CLIENT_ID`           | ✅       | OAuth client ID                                                                        |
| `VITE_AUTH_REDIRECT_URI`        | ❌       | Defaults to `${origin}/auth/callback`                                                  |
| `VITE_AUTH_LOGOUT_REDIRECT_URI` | ❌       | Defaults to `${origin}`                                                                |
| `VITE_AUTH_SCOPE`               | ❌       | Defaults to `openid profile email`                                                     |
| `VITE_AUTH_IDENTITY_PROVIDERS`  | ❌       | Fallback hosted UI providers                                                           |
| `VITE_AUTH_GOOGLE_PROVIDER`     | ❌       | Provider label for the login button (defaults to `Google`)                             |
| `VITE_AUTH_CLIENT_SECRET`       | ❌       | Optional; only for confidential clients                                                |
| `VITE_API_BASE_URL`             | ❌       | Default `''` (same origin). Set when the API runs on another host.                     |
| `VITE_API_MODE`                 | ❌       | Optional (`static` / `llm`) forwarded to generation requests.                          |

Vite injects environment variables via `import.meta.env`. If you adopt a different build system, provide equivalent compile-time replacements.

---

## 9. Rebuild Sequence Summary

1. **Select your stack**: choose router, server-state, and client-state libraries that satisfy the contracts above (plus zod for runtime validation).
2. **Implement global providers** (§1), configuring toast and theme components to honour the documented contracts.
3. **Set up the auth service and store** (PKCE helpers, token exchange) and expose the `AuthStore` API.
4. **Configure routes** with guards/loaders (or equivalent) to seed server state prior to rendering protected screens.
5. **Implement feature flows** using the API client, ensuring cache writes, navigation, and history tracking behave as described.
6. **Wire up persistence** for theme, auth, code editor drafts, timers, and attempt history.
7. **Validate contract adherence**: confirm guards wait for hydration, toasts auto-dismiss, cache priming works, and end-to-end flows (login → generate → workspace → results → history) match current behavior.

---

## 10. Additional Details to Capture

Consider documenting the following alongside this blueprint:

- **Testing strategy**: how to run unit/integration tests (Vitest, Playwright) and which flows deserve automation.
- **Error observability**: where logging and user feedback occur (console errors, toast messaging) and any plans for production monitoring.
- **Accessibility expectations**: keyboard navigation, ARIA labelling, focus management (chips, dialogs, code editor) to maintain UX parity.
- **Internationalization**: strings are currently hardcoded in English; note what would need to change for localization.

Keeping this blueprint current ensures anyone can stand up a functionally equivalent frontend—even on a different component library—while respecting the existing backend contracts and authentication flow.
