import { useState, useEffect } from 'react';

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

