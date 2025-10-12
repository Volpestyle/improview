import { useEffect } from 'react';
import {
  Link,
  Outlet,
  RootRoute,
  Route,
  Router,
  redirect,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { z } from 'zod';
import type { SubmitResponse } from './api/types';
import { apiClient, type ApiClient } from './api/client';
import { queryClient } from './lib/queryClient';
import { HomePage } from './features/home/HomePage';
import { WorkspacePage } from './features/workspace/WorkspacePage';
import { ResultsPage } from './features/results/ResultsPage';
import { HistoryPage } from './features/history/HistoryPage';
import { LoginPage } from './features/auth/LoginPage';
import { AuthCallbackPage } from './features/auth/AuthCallbackPage';
import { SettingsMenu } from './components/SettingsMenu';
import { useAuthStore, waitForAuthHydration } from './state/authStore';

type AppRouterContext = {
  queryClient: typeof queryClient;
  apiClient: ApiClient;
};

const AppLayout = () => {
  const location = useRouterState({ select: (state) => state.location });
  const isAuthRoute = location.pathname.startsWith('/auth');

  if (isAuthRoute) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <AuthStatusWatcher />
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-semibold text-fg">
            Improview
          </Link>
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-4 text-sm">
              <Link to="/" activeProps={{ className: 'text-accent' }} className="text-fg-muted hover:text-fg">
                Workspace
              </Link>
              <Link
                to="/history"
                activeProps={{ className: 'text-accent' }}
                className="text-fg-muted hover:text-fg"
              >
                History
              </Link>
            </nav>
            <SettingsMenu />
          </div>
        </div>
      </header>
      <main className="pb-16">
        <Outlet />
      </main>
    </div>
  );
};

const rootRoute = new RootRoute({
  component: AppLayout,
});

export const loginRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/auth/login',
  validateSearch: (search) => ({
    redirect: safeRedirect(typeof search.redirect === 'string' ? search.redirect : '/'),
  }),
  component: LoginRouteComponent,
});

const callbackSearchSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const callbackRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  validateSearch: (search) => callbackSearchSchema.parse(search),
  component: AuthCallbackRouteComponent,
});

const requireAuth = async (locationHref: string) => {
  await waitForAuthHydration();
  const { status } = useAuthStore.getState();
  if (status !== 'authenticated') {
    throw redirect({
      to: '/auth/login',
      search: { redirect: safeRedirect(locationHref) },
    });
  }
};

const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async ({ location }) => {
    await requireAuth(location.href);
  },
  component: HomePage,
});

const workspaceRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/workspace/$attemptId',
  beforeLoad: async ({ location }) => {
    await requireAuth(location.href);
  },
  loader: async ({ params, context }) => {
    const { apiClient, queryClient } = context as AppRouterContext;
    const attemptResponse = await apiClient.getAttempt(params.attemptId);
    queryClient.setQueryData(['attempt', params.attemptId], attemptResponse.attempt);
    queryClient.setQueryData(['runs', params.attemptId], attemptResponse.runs);
    const problem = await apiClient.getProblem(attemptResponse.attempt.problem_id);
    queryClient.setQueryData(['problem', attemptResponse.attempt.problem_id], problem);
    return {
      attempt: attemptResponse.attempt,
      runs: attemptResponse.runs,
      problem,
    };
  },
  component: WorkspaceRouteComponent,
});

const resultsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/results/$attemptId',
  beforeLoad: async ({ location }) => {
    await requireAuth(location.href);
  },
  loader: async ({ params, context }) => {
    const { apiClient, queryClient } = context as AppRouterContext;
    const attemptResponse = await apiClient.getAttempt(params.attemptId);
    const { attempt, runs } = attemptResponse;
    queryClient.setQueryData(['attempt', params.attemptId], attempt);
    queryClient.setQueryData(['runs', params.attemptId], runs);
    const problem = await apiClient.getProblem(attempt.problem_id);
    queryClient.setQueryData(['problem', attempt.problem_id], problem);

    const cachedSummary = queryClient.getQueryData<SubmitResponse['summary']>([
      'submission',
      params.attemptId,
    ]);

    const hiddenRuns = runs.filter((run) => run.test_id.startsWith('hidden'));
    const inferredSummary: SubmitResponse['summary'] = cachedSummary
      ? cachedSummary
      : {
          attempt_id: attempt.id,
          passed: hiddenRuns.every((run) => run.status === 'passed'),
          runtime_ms: hiddenRuns.reduce((total, run) => total + (run.time_ms ?? 0), 0),
          operations: undefined,
          hidden_results: hiddenRuns,
        };

    queryClient.setQueryData(['submission', params.attemptId], inferredSummary);

    return {
      attempt,
      problem,
      summary: inferredSummary,
      runs,
    };
  },
  component: ResultsRouteComponent,
});

const historyRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/history',
  beforeLoad: async ({ location }) => {
    await requireAuth(location.href);
  },
  component: HistoryPage,
});

const routeTree = rootRoute.addChildren([loginRoute, callbackRoute, indexRoute, workspaceRoute, resultsRoute, historyRoute]);

export const router = new Router({
  routeTree,
  context: { queryClient, apiClient },
});

function WorkspaceRouteComponent() {
  const { attempt, runs, problem } = workspaceRoute.useLoaderData();
  return <WorkspacePage attempt={attempt} runs={runs} problem={problem} />;
}

function ResultsRouteComponent() {
  const { attempt, problem, summary, runs } = resultsRoute.useLoaderData();
  return <ResultsPage attempt={attempt} problem={problem} summary={summary} runs={runs} />;
}

function LoginRouteComponent() {
  const { redirect: redirectTo } = loginRoute.useSearch();
  return <LoginPage redirectTo={redirectTo} />;
}

function AuthCallbackRouteComponent() {
  const { code, state, error, error_description: errorDescription } = callbackRoute.useSearch();
  return <AuthCallbackPage code={code} state={state} error={error} errorDescription={errorDescription} />;
}

const REFRESH_THRESHOLD_MS = 60_000;
const REFRESH_CHECK_INTERVAL_MS = 30_000;

const AuthStatusWatcher = () => {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const status = useAuthStore((state) => state.status);
  const refresh = useAuthStore((state) => state.refresh);
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const locationHref = location.href;
  const isAuthRoute = location.pathname.startsWith('/auth');

  useEffect(() => {
    if (!hasHydrated || status === 'authenticated') {
      return;
    }
    if (isAuthRoute) {
      return;
    }
    const redirectTarget = safeRedirect(locationHref);
    void navigate({
      to: '/auth/login',
      search: { redirect: redirectTarget },
      replace: true,
    });
  }, [hasHydrated, status, navigate, locationHref, isAuthRoute]);

  useEffect(() => {
    if (!hasHydrated || status !== 'authenticated' || isAuthRoute) {
      return;
    }

    const interval = window.setInterval(() => {
      const { expiresAt, refreshToken } = useAuthStore.getState();
      if (!refreshToken || !expiresAt) {
        return;
      }
      const remaining = expiresAt - Date.now();
      if (remaining > REFRESH_THRESHOLD_MS) {
        return;
      }
      refresh().catch((error) => {
        console.error('Token refresh failed', error);
        useAuthStore.getState().markUnauthorized();
      });
    }, REFRESH_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [hasHydrated, status, refresh, isAuthRoute]);

  return null;
};

const safeRedirect = (href?: string) => {
  if (!href) {
    return '/';
  }
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
    return '/';
  }
  if (href.startsWith('/auth/login') || href.startsWith('/auth/callback')) {
    return '/';
  }
  return href.startsWith('/') ? href : `/${href}`;
};

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
