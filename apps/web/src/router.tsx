import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { RestClient } from './api/restClient';
import { waitForAuthHydration, useAuthStore } from './state/authStore';
import { HomePage } from './features/home/HomePage';
import { LoginPage } from './features/auth/LoginPage';
import { AuthCallbackPage } from './features/auth/AuthCallbackPage';
import { WorkspacePage } from './features/workspace/WorkspacePage';
import { App } from './App';
import { PracticeLibraryPage } from './features/history/PracticeLibraryPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { ResultsPage } from './features/results/ResultsPage';

/**
 * Router context
 */
export interface RouterContext {
  queryClient: QueryClient;
  apiClient: RestClient;
}

/**
 * Auth guard - ensures user is authenticated before accessing protected routes
 */
async function requireAuth(pathname: string) {
  await waitForAuthHydration();

  const status = useAuthStore.getState().status;

  if (status !== 'authenticated') {
    throw redirect({
      to: '/auth/login',
      search: { redirect: pathname },
    });
  }
}

/**
 * Root route (layout with providers)
 */
const rootRoute = createRootRoute({
  component: App,
});

/**
 * Home route (protected)
 */
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async ({ location }) => {
    await requireAuth(location.pathname);
  },
  component: HomePage,
});

/**
 * Auth routes
 */
const authLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/login',
  component: LoginPage,
});

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: AuthCallbackPage,
});

/**
 * Workspace route (protected, with loader for problem data)
 */
const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspace/$attemptId',
  beforeLoad: async ({ location }) => {
    await requireAuth(location.pathname);
  },
  component: WorkspacePage,
});

/**
 * Results route (protected, with loader for submission data)
 */
const resultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/results/$attemptId',
  beforeLoad: async ({ location }) => {
    await requireAuth(location.pathname);
  },
  component: ResultsPage,
});

/**
 * History route (protected)
 */
const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  beforeLoad: async ({ location }) => {
    await requireAuth(location.pathname);
  },
  component: PracticeLibraryPage,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search.tab === 'saved' ? 'saved' : undefined,
  }),
});

/**
 * Profile route (protected)
 */
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: async ({ location }) => {
    await requireAuth(location.pathname);
  },
  component: ProfilePage,
});

/**
 * Route tree
 */
const routeTree = rootRoute.addChildren([
  indexRoute,
  authLoginRoute,
  authCallbackRoute,
  workspaceRoute,
  resultsRoute,
  historyRoute,
  profileRoute,
]);

/**
 * Create and export router
 */
export function createAppRouter(context: RouterContext) {
  return createRouter({
    routeTree,
    context,
    defaultPreload: 'intent',
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;

// Type augmentation for router
declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
