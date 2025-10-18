import * as React from 'react';
import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastInstance extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  publish(options: ToastOptions): string;
  dismiss(id: string): void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const variantIcons = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastInstance[]>([]);
  const counterRef = useRef(0);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));

    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  };

  const publish = (options: ToastOptions): string => {
    const id = options.id || `toast-${++counterRef.current}`;
    const duration = options.duration ?? 5000;

    const toast: ToastInstance = {
      ...options,
      id,
      variant: options.variant || 'default',
    };

    setToasts((prev) => [...prev, toast]);

    // Auto-dismiss
    if (duration > 0) {
      const timer = window.setTimeout(() => {
        dismiss(id);
      }, duration);
      timersRef.current.set(id, timer);
    }

    return id;
  };

  // Cleanup on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <ToastContext.Provider value={{ publish, dismiss }}>
      {children}

      {/* Toast viewport */}
      <div
        className="fixed top-0 right-0 z-[3000] p-6 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = variantIcons[toast.variant!];

            return (
              <motion.div
                key={toast.id}
                initial={shouldReduceMotion ? {} : { opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
                className={cn(
                  'mb-4 w-96 p-4 rounded-lg shadow-lg pointer-events-auto',
                  'border flex items-start gap-3',
                )}
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor:
                    toast.variant === 'success'
                      ? 'var(--success-600)'
                      : toast.variant === 'error'
                        ? 'var(--danger-600)'
                        : toast.variant === 'warning'
                          ? 'var(--warning-600)'
                          : toast.variant === 'info'
                            ? 'var(--info-600)'
                            : 'var(--border-default)',
                }}
              >
                <Icon
                  className="h-5 w-5 flex-shrink-0 mt-0.5"
                  style={{
                    color:
                      toast.variant === 'success'
                        ? 'var(--success-600)'
                        : toast.variant === 'error'
                          ? 'var(--danger-600)'
                          : toast.variant === 'warning'
                            ? 'var(--warning-600)'
                            : toast.variant === 'info'
                              ? 'var(--info-600)'
                              : 'var(--fg-muted)',
                  }}
                  aria-hidden="true"
                />

                <div className="flex-1 min-w-0">
                  <div className="font-medium" style={{ color: 'var(--fg-default)' }}>
                    {toast.title}
                  </div>

                  {toast.description && (
                    <div className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                      {toast.description}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => dismiss(toast.id)}
                  className="flex-shrink-0 rounded p-1 transition-colors"
                  style={{
                    color: 'var(--fg-subtle)',
                  }}
                  aria-label="Close notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
