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

    // Submission keys
    submission: (attemptId: string) => ['submission', attemptId] as const,

    // History keys
    history: () => ['history'] as const,
    historyAttempt: (id: string) => ['history', 'attempt', id] as const,
} as const;
