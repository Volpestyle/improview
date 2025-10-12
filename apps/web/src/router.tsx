import { Link, Outlet, RootRoute, Route, Router } from '@tanstack/react-router';
import type { SubmitResponse } from './api/types';
import { apiClient, type ApiClient } from './api/client';
import { queryClient } from './lib/queryClient';
import { HomePage } from './features/home/HomePage';
import { WorkspacePage } from './features/workspace/WorkspacePage';
import { ResultsPage } from './features/results/ResultsPage';
import { HistoryPage } from './features/history/HistoryPage';
import { SettingsMenu } from './components/SettingsMenu';

type AppRouterContext = {
  queryClient: typeof queryClient;
  apiClient: ApiClient;
};

const AppLayout = () => (
  <div className="min-h-screen bg-bg text-fg">
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

const rootRoute = new RootRoute({
  component: AppLayout,
});

const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const workspaceRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/workspace/$attemptId',
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
  component: HistoryPage,
});

const routeTree = rootRoute.addChildren([indexRoute, workspaceRoute, resultsRoute, historyRoute]);

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

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
