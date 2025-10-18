import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types/user';
import { getAuthService } from '../lib/auth';

/**
 * Authentication status types
 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * Auth store state
 */
export interface AuthState {
    // Status
    status: AuthStatus;
    hasHydrated: boolean;

    // User data
    user: User | null;

    // Tokens
    accessToken: string | null;
    refreshToken: string | null;
    idToken: string | null;
    expiresAt: number | null;

    // Actions
    login: (payload: {
        accessToken: string;
        refreshToken?: string;
        idToken?: string;
        expiresIn?: number;
        user: User;
    }) => void;
    logout: () => void;
    markUnauthorized: () => void;
    setHydrated: () => void;
    refresh: () => Promise<void>;
}

// Module-level promise for deduplicating concurrent refresh calls
let refreshPromise: Promise<void> | null = null;

/**
 * Create the auth store with persistence
 */
export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Initial state
            status: 'loading',
            hasHydrated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            idToken: null,
            expiresAt: null,

            // Login action
            login: (payload) => {
                const expiresAt = payload.expiresIn
                    ? Date.now() + payload.expiresIn * 1000
                    : null;

                set({
                    status: 'authenticated',
                    user: payload.user,
                    accessToken: payload.accessToken,
                    refreshToken: payload.refreshToken || null,
                    idToken: payload.idToken || null,
                    expiresAt,
                });
            },

            // Logout action
            logout: () => {
                set({
                    status: 'unauthenticated',
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    idToken: null,
                    expiresAt: null,
                });
            },

            // Mark unauthorized (for API 401 responses)
            markUnauthorized: () => {
                set({
                    status: 'unauthenticated',
                    user: null,
                    accessToken: null,
                    // Keep refresh token to allow re-auth
                    idToken: null,
                    expiresAt: null,
                });
            },

            // Mark hydration complete
            setHydrated: () => {
                const state = get();

                // Check if token is expired
                const isExpired = state.expiresAt && Date.now() >= state.expiresAt;

                set({
                    hasHydrated: true,
                    status: state.accessToken && !isExpired ? 'authenticated' : 'unauthenticated',
                });
            },

            // Refresh token action (deduplicates concurrent calls)
            refresh: async () => {
                // Return existing promise if refresh is in progress
                if (refreshPromise) {
                    return refreshPromise;
                }

                const state = get();

                // Can't refresh without a refresh token
                if (!state.refreshToken) {
                    state.markUnauthorized();
                    return;
                }

                refreshPromise = (async () => {
                    try {
                        const authService = getAuthService();

                        const response = await authService.refreshToken(state.refreshToken!);
                        const user = response.id_token
                            ? authService.decodeIdToken(response.id_token)
                            : state.user;

                        if (!user) {
                            throw new Error('No user data available');
                        }

                        state.login({
                            accessToken: response.access_token,
                            refreshToken: response.refresh_token,
                            idToken: response.id_token,
                            expiresIn: response.expires_in,
                            user,
                        });
                    } catch (error) {
                        console.error('Token refresh failed:', error);
                        state.markUnauthorized();
                        throw error;
                    } finally {
                        refreshPromise = null;
                    }
                })();

                return refreshPromise;
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                // Only persist these fields
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                idToken: state.idToken,
                expiresAt: state.expiresAt,
            }),
            onRehydrateStorage: () => (state) => {
                // Mark hydration complete after rehydrating
                if (state) {
                    state.setHydrated();
                }
            },
        }
    )
);

/**
 * Wait for auth store to hydrate before accessing persisted data
 */
export async function waitForAuthHydration(): Promise<void> {
    return new Promise((resolve) => {
        const unsubscribe = useAuthStore.subscribe((state) => {
            if (state.hasHydrated) {
                unsubscribe();
                resolve();
            }
        });

        // If already hydrated, resolve immediately
        if (useAuthStore.getState().hasHydrated) {
            unsubscribe();
            resolve();
        }
    });
}

/**
 * Check if access token is close to expiry (within 5 minutes)
 */
export function isTokenExpiringSoon(): boolean {
    const state = useAuthStore.getState();
    if (!state.expiresAt) return false;

    const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
    return Date.now() + EXPIRY_BUFFER_MS >= state.expiresAt;
}

/**
 * Check if access token is expired
 */
export function isTokenExpired(): boolean {
    const state = useAuthStore.getState();
    if (!state.expiresAt) return false;

    return Date.now() >= state.expiresAt;
}

