import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, Spinner } from '@improview/ui';
import {
  AUTH_SESSION_KEYS,
  authService,
  composeAuthUser,
} from '../../services/authService';
import { useAuthStore } from '../../state/authStore';

type CallbackPageProps = {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
};

type CallbackStatus = 'processing' | 'error';

export const AuthCallbackPage = ({ code, state, error, errorDescription }: CallbackPageProps) => {
  const navigate = useNavigate();
  const login = useAuthStore((store) => store.login);
  const markUnauthorized = useAuthStore((store) => store.markUnauthorized);
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [message, setMessage] = useState<string>('Finishing sign-in…');

  useEffect(() => {
    if (error) {
      setStatus('error');
      setMessage(errorDescription || error || 'Authentication cancelled.');
      sessionStorage.removeItem(AUTH_SESSION_KEYS.codeVerifier);
      sessionStorage.removeItem(AUTH_SESSION_KEYS.state);
      sessionStorage.removeItem(AUTH_SESSION_KEYS.redirect);
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('Missing authorization code.');
      sessionStorage.removeItem(AUTH_SESSION_KEYS.codeVerifier);
      sessionStorage.removeItem(AUTH_SESSION_KEYS.state);
      sessionStorage.removeItem(AUTH_SESSION_KEYS.redirect);
      return;
    }

    const storedState = sessionStorage.getItem(AUTH_SESSION_KEYS.state);
    const storedVerifier = sessionStorage.getItem(AUTH_SESSION_KEYS.codeVerifier);
    const redirectTo = sessionStorage.getItem(AUTH_SESSION_KEYS.redirect) ?? '/';

    if (!storedState || !storedVerifier) {
      setStatus('error');
      setMessage('Authorization session expired. Please try signing in again.');
      sessionStorage.removeItem(AUTH_SESSION_KEYS.codeVerifier);
      sessionStorage.removeItem(AUTH_SESSION_KEYS.state);
      sessionStorage.removeItem(AUTH_SESSION_KEYS.redirect);
      return;
    }

    if (!state || state !== storedState) {
      setStatus('error');
      setMessage('State mismatch detected. Please retry signing in.');
      sessionStorage.removeItem(AUTH_SESSION_KEYS.codeVerifier);
      sessionStorage.removeItem(AUTH_SESSION_KEYS.state);
      sessionStorage.removeItem(AUTH_SESSION_KEYS.redirect);
      markUnauthorized();
      return;
    }

    const finishLogin = async () => {
      try {
        const tokens = await authService.exchangeCode(code, storedVerifier);
        const user = composeAuthUser({ idToken: tokens.idToken, fallbackUsername: 'user' });
        login({
          accessToken: tokens.accessToken,
          idToken: tokens.idToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          user,
        });
        sessionStorage.removeItem(AUTH_SESSION_KEYS.codeVerifier);
        sessionStorage.removeItem(AUTH_SESSION_KEYS.state);
        sessionStorage.removeItem(AUTH_SESSION_KEYS.redirect);
        setMessage('Signed in successfully. Redirecting…');
        await navigate({ to: redirectTo as never, replace: true });
      } catch (err) {
        console.error('Failed to exchange authorization code', err);
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Failed to complete sign-in. Please try again.');
        sessionStorage.removeItem(AUTH_SESSION_KEYS.codeVerifier);
        sessionStorage.removeItem(AUTH_SESSION_KEYS.state);
        sessionStorage.removeItem(AUTH_SESSION_KEYS.redirect);
        markUnauthorized();
      }
    };

    void finishLogin();
  }, [code, error, errorDescription, login, markUnauthorized, navigate, state]);

  if (status === 'processing') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10">
        <Card padding="lg" className="w-full max-w-md text-center shadow-lg">
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p className="text-sm text-fg-muted">{message}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10">
      <Card padding="lg" className="w-full max-w-md text-center shadow-lg">
        <div className="flex flex-col items-center gap-4">
          <p className="text-md font-semibold text-danger-600">Sign-in failed</p>
          <p className="text-sm text-fg-muted">{message}</p>
          <button
            type="button"
            className="text-sm font-medium text-accent underline"
            onClick={() => {
              window.location.href = '/auth/login';
            }}
          >
            Return to sign-in
          </button>
        </div>
      </Card>
    </div>
  );
};
