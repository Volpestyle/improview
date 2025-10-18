import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Fingerprint, Mail, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ThemeToggle } from './theme-toggle';

interface LoginScreenProps {
  onLogin: (user: { email: string }) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handlePasskeyLogin = async () => {
    setIsLoading(true);
    // Simulate passkey authentication
    await new Promise(resolve => setTimeout(resolve, 1500));
    onLogin({ email: 'james@improview.dev' });
    setIsLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    // Simulate magic link send
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsMagicLinkSent(true);
    setIsLoading(false);
    
    // Auto-login after a delay (simulating user clicking link)
    setTimeout(() => {
      onLogin({ email });
    }, 2000);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--bg-default)' }}
    >
      {/* Theme Toggle - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-2"
              style={{
                backgroundColor: 'var(--accent-soft)',
                borderColor: 'var(--accent-primary)',
                borderWidth: '1px',
              }}
            >
              <Sparkles className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} aria-hidden="true" />
              <span style={{ color: 'var(--accent-primary)' }}>Improview</span>
            </div>
            <h1>Welcome back</h1>
            <p style={{ color: 'var(--fg-muted)' }}>
              Sign in to continue your interview practice
            </p>
          </div>

          {!isMagicLinkSent ? (
            <>
              {/* Passkey Login */}
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={handlePasskeyLogin}
                disabled={isLoading}
                aria-label="Sign in with passkey"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <Fingerprint className="h-5 w-5" aria-hidden="true" />
                )}
                Sign in with Passkey
              </Button>

              <div className="relative">
                <Separator />
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: 'transparent' }}
                >
                  <span 
                    className="px-2"
                    style={{ 
                      backgroundColor: 'var(--bg-panel)',
                      color: 'var(--fg-subtle)',
                    }}
                  >
                    or
                  </span>
                </div>
              </div>

              {/* Magic Link */}
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    aria-required="true"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={isLoading || !email}
                  aria-label="Send magic link to email"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Mail className="h-5 w-5" aria-hidden="true" />
                  )}
                  Send Magic Link
                </Button>
              </form>
            </>
          ) : (
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
              className="text-center space-y-4 py-6"
            >
              <div 
                className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--success-soft)' }}
              >
                <Mail className="h-8 w-8" style={{ color: 'var(--success-600)' }} />
              </div>
              <div className="space-y-2">
                <h3>Check your email</h3>
                <p style={{ color: 'var(--fg-muted)' }}>
                  We've sent a magic link to <strong style={{ color: 'var(--fg-default)' }}>{email}</strong>
                </p>
                <p style={{ color: 'var(--fg-subtle)' }}>
                  Click the link in the email to sign in
                </p>
              </div>
            </motion.div>
          )}

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
