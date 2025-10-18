import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@improview/ui';
// Simple Google icon component
const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

import { Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore, waitForAuthHydration } from '../../state/authStore';
import { getAuthService } from '../../lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  // Wait for hydration, then redirect if already authenticated
  useEffect(() => {
    waitForAuthHydration().then(() => {
      const currentStatus = useAuthStore.getState().status;
      if (currentStatus === 'authenticated') {
        // Get redirect path from session storage
        const authService = getAuthService();
        const redirectPath = authService.getRedirectPath();
        authService.clearRedirectPath();

        navigate({ to: redirectPath || '/' });
      }
    });
  }, [navigate]);

  const handleLogin = async () => {
    try {
      const authService = getAuthService();
      await authService.initiateGoogleLogin(window.location.pathname);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // Show loading while hydrating
  if (!hasHydrated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-default)' }}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--bg-default)' }}
    >
      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
        className="w-full max-w-md"
        role="main"
        aria-label="Login"
      >
        {/* Card */}
        <div
          className="border p-8 space-y-6"
          style={{
            backgroundColor: 'var(--bg-panel)',
            borderColor: 'var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-2"
              style={{
                backgroundColor: 'var(--accent-soft)',
                borderColor: 'var(--accent-primary)',
                borderWidth: '1px',
              }}
            >
              <Sparkles
                className="h-4 w-4"
                style={{ color: 'var(--accent-primary)' }}
                aria-hidden="true"
              />
              <span style={{ color: 'var(--accent-primary)' }}>Improview</span>
            </div>
            <h1>Welcome back</h1>
            <p style={{ color: 'var(--fg-muted)' }}>Sign in to continue your interview practice</p>
          </div>

          {/* Google Sign In */}
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={handleLogin}
            disabled={status === 'loading'}
            aria-label="Sign in with Google"
          >
            {status === 'loading' ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <GoogleIcon />
            )}
            Sign in with Google
          </Button>

          {/* Privacy Notice */}
          <p className="text-sm text-center" style={{ color: 'var(--fg-subtle)' }}>
            By signing in, you agree to our Terms of Service.
            <br />
            Improview is not meant for collecting PII or securing sensitive data.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center mt-6" style={{ color: 'var(--fg-muted)' }}>
          Passwordless authentication • Secure & fast
        </p>
      </motion.div>
    </div>
  );
}
