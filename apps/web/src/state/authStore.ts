import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { authService, composeAuthUser } from '../services/authService';

let refreshPromise: Promise<void> | null = null;

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type AuthUser = {
  username: string;
  email?: string;
};

type LoginPayload = {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user: AuthUser;
};

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  hasHydrated: boolean;
  login: (payload: LoginPayload) => void;
  logout: () => void;
  markUnauthorized: () => void;
  setHydrated: () => void;
  refresh: () => Promise<void>;
};

const storage: Storage =
  typeof window !== 'undefined'
    ? window.localStorage
    : ({
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
        clear: () => undefined,
        key: () => null,
        length: 0,
      } as Storage);

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      status: 'loading',
      user: null,
      accessToken: null,
      idToken: null,
      refreshToken: null,
      expiresAt: null,
      hasHydrated: false,
      login: ({ accessToken, idToken, refreshToken, expiresIn, user }) => {
        const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : null;
        set({
          user,
          accessToken,
          idToken: idToken ?? null,
          refreshToken: refreshToken ?? null,
          expiresAt,
          status: 'authenticated',
        });
      },
      logout: () => {
        set({
          user: null,
          accessToken: null,
          idToken: null,
          refreshToken: null,
          expiresAt: null,
          status: 'unauthenticated',
        });
      },
      markUnauthorized: () => {
        set({
          user: null,
          accessToken: null,
          idToken: null,
          refreshToken: null,
          expiresAt: null,
          status: 'unauthenticated',
        });
      },
      setHydrated: () => {
        const { accessToken, expiresAt } = get();
        const stillValid = Boolean(accessToken) && (!expiresAt || expiresAt > Date.now());
        set((state) => {
          if (stillValid) {
            return {
              ...state,
              hasHydrated: true,
              status: 'authenticated',
            };
          }
          return {
            user: null,
            accessToken: null,
            idToken: null,
            refreshToken: null,
            expiresAt: null,
            hasHydrated: true,
            status: 'unauthenticated',
          };
        });
      },
      refresh: async () => {
        if (refreshPromise) {
          return refreshPromise;
        }
        const { refreshToken, user } = get();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        refreshPromise = (async () => {
          const result = await authService.refreshWithToken(refreshToken);
          const expiresAt = result.expiresIn ? Date.now() + result.expiresIn * 1000 : null;
          const nextUser = composeAuthUser({ idToken: result.idToken, fallbackUsername: user?.username });

          set({
            accessToken: result.accessToken,
            idToken: result.idToken ?? null,
            refreshToken: result.refreshToken ?? refreshToken,
            expiresAt,
            status: 'authenticated',
            user: nextUser.username ? nextUser : user,
          });
        })();

        try {
          await refreshPromise;
        } finally {
          refreshPromise = null;
        }
      },
    }),
    {
      name: 'improview-auth',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        idToken: state.idToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
      }),
    },
  ),
);

useAuthStore.persist.onFinishHydration(() => {
  useAuthStore.getState().setHydrated();
});

export const waitForAuthHydration = async () => {
  if (useAuthStore.getState().hasHydrated) {
    return;
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem('improview-auth');
      if (stored) {
        const parsed = JSON.parse(stored) as {
          state?: {
            user?: AuthUser | null;
            accessToken?: string | null;
            idToken?: string | null;
            refreshToken?: string | null;
            expiresAt?: number | null;
          };
        };

        if (parsed?.state) {
          useAuthStore.setState((state) => ({
            ...state,
            user: parsed.state?.user ?? null,
            accessToken: parsed.state?.accessToken ?? null,
            idToken: parsed.state?.idToken ?? null,
            refreshToken: parsed.state?.refreshToken ?? null,
            expiresAt: parsed.state?.expiresAt ?? null,
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to hydrate auth state from storage', error);
    } finally {
      useAuthStore.getState().setHydrated();
      return;
    }
  }

  await new Promise<void>((resolve) => {
    const unsubscribe = useAuthStore.subscribe(
      (state) => state.hasHydrated,
      (hasHydrated) => {
        if (hasHydrated) {
          unsubscribe();
          resolve();
        }
      },
      { fireImmediately: true },
    );
  });
};
