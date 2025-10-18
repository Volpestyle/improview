import { useEffect, useRef } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../state/authStore';
import { getAuthService } from '../../lib/auth';
import { useToast } from '@improview/ui';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/auth/callback' }) as {
    code?: string;
    state?: string;
    error?: string;
  };
  const login = useAuthStore((state) => state.login);
  const { publish } = useToast();

  // Track whether we've already handled the callback (prevents double-call in StrictMode)
  const handledRef = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (handledRef.current) return;
    handledRef.current = true;

    const handleCallback = async () => {
      try {
        // Check for errors
        if (search.error) {
          throw new Error(search.error);
        }

        // Validate required params
        if (!search.code || !search.state) {
          throw new Error('Missing required OAuth parameters');
        }

        const authService = getAuthService();

        // Exchange code for tokens
        const tokenResponse = await authService.handleCallback(search.code, search.state);

        // Decode user from ID token
        const user = tokenResponse.id_token
          ? authService.decodeIdToken(tokenResponse.id_token)
          : { username: 'unknown', name: 'Improview user' };

        // Update auth store
        login({
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          idToken: tokenResponse.id_token,
          expiresIn: tokenResponse.expires_in,
          user,
        });

        // Get redirect path
        const redirectPath = authService.getRedirectPath();
        authService.clearRedirectPath();

        // Navigate to redirect path or home
        navigate({ to: redirectPath || '/' });

        // Show success toast
        const welcomeName = user.name ?? user.username ?? 'there';
        publish({
          title: 'Signed in successfully',
          description: `Welcome back, ${welcomeName}!`,
          variant: 'success',
        });
      } catch (error) {
        console.error('OAuth callback error:', error);

        // Clear session storage
        sessionStorage.removeItem('pkce_verifier');
        sessionStorage.removeItem('pkce_state');
        sessionStorage.removeItem('auth_redirect');

        // Mark unauthorized
        useAuthStore.getState().markUnauthorized();

        // Show error toast
        publish({
          title: 'Authentication failed',
          description: error instanceof Error ? error.message : 'An unknown error occurred',
          variant: 'error',
        });

        // Redirect to login
        navigate({ to: '/auth/login' });
      }
    };

    handleCallback();
  }, [search, login, navigate, publish]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--bg-default)' }}
    >
      <div className="text-center space-y-4">
        <Loader2
          className="h-12 w-12 animate-spin mx-auto"
          style={{ color: 'var(--accent-primary)' }}
        />
        <p style={{ color: 'var(--fg-muted)' }}>Completing sign in...</p>
      </div>
    </div>
  );
}
