import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState, useEffect } from 'react';
import { getApiClient } from './apiClient';
import { queryKeys } from './queryClient';
import { RunTestsRequest, RunTestsResponse } from '../types/api';
import { TestResult } from '../types/problem';


/**
 * Hook for managing test run history
 */
export function useTestRunHistory(attemptId: string) {
    const queryClient = useQueryClient();
    const apiClient = getApiClient();

    // Local state to store run history (since API might not provide structured history yet)
    const [runHistory, setRunHistory] = usePersistedState<TestResult[][]>(
        `test-runs-${attemptId}`,
        []
    );

    // Track code hash to invalidate history when code changes significantly
    const [lastCodeHash, setLastCodeHash] = usePersistedState<string>(
        `code-hash-${attemptId}`,
        ''
    );

    // Query for fetching attempt data (for now, we won't use runs from API)
    const attemptQuery = useQuery({
        queryKey: queryKeys.attempt(attemptId),
        queryFn: async () => {
            const attemptData = await apiClient.getAttempt(attemptId);
            return attemptData;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Simple string hash function
    const hashCode = (str: string): string => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    };

    // Mutation for running tests and updating history
    const runTestsMutation = useMutation({
        mutationFn: async (request: RunTestsRequest): Promise<RunTestsResponse> => {
            return apiClient.runTests(request);
        },
        onSuccess: (response, variables) => {
            const currentCodeHash = hashCode(variables.code);

            // Check if code has changed significantly since last run
            if (lastCodeHash && lastCodeHash !== currentCodeHash) {
                // Code changed, clear previous history
                setRunHistory([]);
            }

            // Update last code hash
            setLastCodeHash(currentCodeHash);

            // Transform API response to UI format
            const newRun: TestResult[] = response.summary.results.map((r) => ({
                test_id: r.test_id,
                status: r.status as TestResult['status'],
                time_ms: Number(r.time_ms),
                stdout: r.stdout,
                stderr: r.stderr,
            }));

            // Add new run to the beginning of the history
            setRunHistory(prev => [newRun, ...prev]);

            // Invalidate attempt data to refresh run count/stats
            queryClient.invalidateQueries({ queryKey: queryKeys.attempt(attemptId) });
        },
        onError: (error) => {
            console.error('Test execution failed:', error);
            // Could add toast notification here
        },
    });

    // Helper function to get latest run
    const getLatestRun = useCallback(() => {
        return runHistory.length > 0 ? runHistory[0] : null;
    }, [runHistory]);

    // Helper function to check if code has changed significantly since last run
    const hasCodeChanged = useCallback((currentCode: string) => {
        const currentCodeHash = hashCode(currentCode);
        return lastCodeHash !== '' && lastCodeHash !== currentCodeHash;
    }, [lastCodeHash]);

    return {
        // Query state
        attempt: attemptQuery.data,
        isLoadingAttempt: attemptQuery.isLoading,
        attemptError: attemptQuery.error,

        // Run history state
        runs: runHistory,
        isLoadingRuns: false, // We manage this locally
        runsError: null,

        // Mutation state
        runTests: runTestsMutation.mutate,
        runTestsAsync: runTestsMutation.mutateAsync,
        isRunningTests: runTestsMutation.isPending,
        runTestsError: runTestsMutation.error,

        // Helpers
        getLatestRun,
        hasCodeChanged,
    };
}

/**
 * Hook to persist state to localStorage
 */
export function usePersistedState<T>(
    key: string,
    defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
    const [value, setValue] = useState<T>(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error loading persisted state for key "${key}":`, error);
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Error saving persisted state for key "${key}":`, error);
        }
    }, [key, value]);

    return [value, setValue];
}

/**
 * Hook to track elapsed time
 */
export function useElapsedTime(autoStart = false): {
    elapsed: number;
    start: () => void;
    pause: () => void;
    reset: () => void;
    isRunning: boolean;
} {
    const [elapsed, setElapsed] = useState(0);
    const [isRunning, setIsRunning] = useState(autoStart);
    const [startTime, setStartTime] = useState(autoStart ? Date.now() : 0);

    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            setElapsed(Date.now() - startTime);
        }, 100);

        return () => clearInterval(interval);
    }, [isRunning, startTime]);

    const start = () => {
        setStartTime(Date.now() - elapsed);
        setIsRunning(true);
    };

    const pause = () => {
        setIsRunning(false);
    };

    const reset = () => {
        setElapsed(0);
        setStartTime(Date.now());
        setIsRunning(false);
    };

    return { elapsed, start, pause, reset, isRunning };
}

/**
 * Format milliseconds to MM:SS
 */
export function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Hook for executing tests (no persistence)
 * Just runs tests without storing history - submissions are handled separately
 */
export function useTestExecution() {
    const apiClient = getApiClient();

    // Mutation for running tests (just execution, no persistence)
    const runTestsMutation = useMutation({
        mutationFn: async (request: RunTestsRequest) => {
            return apiClient.runTests(request);
        },
        onError: (error) => {
            console.error('Test execution failed:', error);
        },
    });

    return {
        // Mutation state
        runTests: runTestsMutation.mutate,
        runTestsAsync: runTestsMutation.mutateAsync,
        isRunningTests: runTestsMutation.isPending,
        runTestsError: runTestsMutation.error,
    };
}

/**
 * Format milliseconds to human-readable duration
 */
export function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    if (totalSeconds < 60) {
        return `${totalSeconds}s`;
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes < 60) {
        return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Hook for saving problems
 */
export function useSaveProblem() {
    const queryClient = useQueryClient();
    const apiClient = getApiClient();

    const saveProblemMutation = useMutation({
        mutationFn: async (request: {
            problem_id: string;
            title: string;
            language: string;
            status: 'in_progress' | 'completed';
            tags: string[];
            hint_unlocked: boolean;
        }) => {
            return apiClient.createSavedProblem(request);
        },
        onSuccess: (response) => {
            // Invalidate saved problems list to refresh all status variants
            queryClient.invalidateQueries({ queryKey: ['saved-problems'] });

            // Seed the saved problem detail cache
            queryClient.setQueryData(queryKeys.savedProblemDetail(response.saved_problem.id), {
                ...response.saved_problem,
                attempts: [],
            });
        },
        onError: (error) => {
            console.error('Failed to save problem:', error);
        },
    });

    return {
        saveProblem: saveProblemMutation.mutate,
        saveProblemAsync: saveProblemMutation.mutateAsync,
        isSaving: saveProblemMutation.isPending,
        isSuccess: saveProblemMutation.isSuccess,
        error: saveProblemMutation.error,
        savedProblemId: saveProblemMutation.data?.saved_problem.id,
        reset: saveProblemMutation.reset,
    };
}
