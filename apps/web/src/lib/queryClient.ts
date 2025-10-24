import { QueryClient } from '@tanstack/react-query';

/**
 * Create and configure the React Query client
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30 * 1000, // 30 seconds
            retry: 2,
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: false,
        },
    },
});

/**
 * Query keys factory for type-safe query keys
 */
export const queryKeys = {
    // Problem keys
    problem: (id: string) => ['problem', id] as const,

    // Attempt keys
    attempt: (id: string) => ['attempt', id] as const,
    runs: (attemptId: string) => ['runs', attemptId] as const,
    attemptResults: (id: string) => ['attempt', id, 'results'] as const,

    // Test run history keys
    testRuns: (attemptId: string) => ['test-runs', attemptId] as const,
    testRun: (attemptId: string, runId: string) => ['test-runs', attemptId, runId] as const,
    testRunsInfinite: (attemptId: string) => ['test-runs-infinite', attemptId] as const,

    // Submission keys
    submission: (attemptId: string) => ['submission', attemptId] as const,

    // History keys
    history: () => ['history'] as const,
    historyAttempt: (id: string) => ['history', 'attempt', id] as const,

    // Saved problems keys
    savedProblems: (status?: string) => ['saved-problems', status ?? 'all'] as const,
    savedProblemDetail: (id: string) => ['saved-problems', id, 'detail'] as const,
    savedProblemAttempts: (id: string) => ['saved-problems', id, 'attempts'] as const,
} as const;
