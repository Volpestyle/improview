import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Card, Spinner } from '@improview/ui';
import {
  AUTH_SESSION_KEYS,
  authService,
  createCodeChallenge,
  createCodeVerifier,
  createState,
} from '../../services/authService';
import { useAuthStore, waitForAuthHydration } from '../../state/authStore';

type LoginPageProps = {
  redirectTo: string;
};

export const LoginPage = ({ redirectTo }: LoginPageProps) => {
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const googleProvider = (import.meta.env.VITE_AUTH_GOOGLE_PROVIDER as string | undefined)?.trim() || 'Google';

  useEffect(() => {
    if (hasHydrated) {
      return;
    }
    void waitForAuthHydration().catch((error) => {
      console.warn('Auth hydration failed on login page', error);
    });
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    if (status === 'authenticated') {
      void navigate({ to: redirectTo as never, replace: true });
    }
  }, [hasHydrated, status, navigate, redirectTo]);

  const beginLogin = async (identityProvider?: string) => {
    setError(null);
    try {
      const verifier = createCodeVerifier();
      const challenge = await createCodeChallenge(verifier);
      const stateToken = createState();
      sessionStorage.setItem(AUTH_SESSION_KEYS.codeVerifier, verifier);
      sessionStorage.setItem(AUTH_SESSION_KEYS.state, stateToken);
      sessionStorage.setItem(AUTH_SESSION_KEYS.redirect, redirectTo);
      const authorizeUrl = authService.buildAuthorizeUrl({
        state: stateToken,
        codeChallenge: challenge,
        identityProvider,
      });
      setIsRedirecting(true);
      window.location.assign(authorizeUrl);
    } catch (err) {
      console.error('Failed to start authentication', err);
      setIsRedirecting(false);
      setError(err instanceof Error ? err.message : 'Unable to start authentication.');
    }
  };

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    );
  }

  if (status === 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10">
      <Card
        heading="Sign in"
        description="Authenticate to access Improview."
        padding="lg"
        className="w-full max-w-md shadow-lg"
      >
        <div className="flex flex-col gap-4">
          <Button size="lg" onClick={() => void beginLogin(googleProvider)} loading={isRedirecting}>
            {isRedirecting ? 'Redirecting…' : 'Continue with Google'}
          </Button>
          {error ? <p className="text-center text-sm text-danger-600">{error}</p> : null}
        </div>
      </Card>
    </div>
  );
};
