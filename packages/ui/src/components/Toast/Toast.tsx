import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';

type ToastVariant = 'default' | 'success' | 'error' | 'warning';

interface ToastOptions {
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastInstance extends Required<Pick<ToastOptions, 'title'>> {
  id: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  publish: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: 'bg-bg-panel text-fg border-border-subtle',
  success: 'bg-success-600/15 text-success-600 border-success-600/40',
  error: 'bg-danger-600/15 text-danger-600 border-danger-600/40',
  warning: 'bg-warning-600/15 text-warning-600 border-warning-600/40',
};

export interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastInstance[]>([]);
  const counterRef = useRef(0);
  const timeoutsRef = useRef(new Map<string, number>());

  const cleanupTimeout = useCallback((id: string) => {
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId && typeof window !== 'undefined') {
      window.clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      cleanupTimeout(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    },
    [cleanupTimeout],
  );

  const scheduleDismiss = useCallback(
    (id: string, duration: number) => {
      cleanupTimeout(id);
      if (typeof window === 'undefined') {
        return;
      }
      const timeoutId = window.setTimeout(() => {
        dismiss(id);
      }, duration);
      timeoutsRef.current.set(id, timeoutId);
    },
    [cleanupTimeout, dismiss],
  );

  const publish = useCallback(
    (options: ToastOptions) => {
      const id = options.id ?? `toast-${++counterRef.current}`;
      const instance: ToastInstance = {
        id,
        title: options.title,
        description: options.description,
        variant: options.variant ?? 'default',
        duration: options.duration ?? 4000,
      };

      setToasts((current) => {
        const withoutExisting = current.filter((toast) => toast.id !== id);
        return [...withoutExisting, instance];
      });

      scheduleDismiss(id, instance.duration);
      return id;
    },
    [scheduleDismiss],
  );

  const contextValue = useMemo<ToastContextValue>(
    () => ({ publish, dismiss }),
    [dismiss, publish],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
};

interface ToastViewportProps {
  toasts: ToastInstance[];
  dismiss: (id: string) => void;
}

const ToastViewport = ({ toasts, dismiss }: ToastViewportProps) => (
  <div className="pointer-events-none fixed inset-0 flex flex-col items-center justify-end gap-3 px-4 py-6 sm:items-end">
    <AnimatePresence initial={false}>
      {toasts.map((toast) => (
        <motion.div
          key={toast.id}
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={clsx(
            'pointer-events-auto w-full max-w-sm rounded-md border px-4 py-3 shadow-md backdrop-blur',
            VARIANT_STYLES[toast.variant],
          )}
          role="status"
        >
          <div className="flex items-start gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-semibold leading-tight">{toast.title}</span>
              {toast.description ? (
                <p className="text-sm leading-snug text-fg-muted">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-md p-1 text-sm text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
              onClick={() => dismiss(toast.id)}
            >
              ✕
            </button>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>.');
  }
  return ctx;
};
