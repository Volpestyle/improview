import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

export interface TimerHandle {
  start: () => void;
  pause: () => void;
  reset: (nextDuration?: number) => void;
}

export interface TimerProps extends React.HTMLAttributes<HTMLDivElement> {
  durationMs: number;
  autoStart?: boolean;
  onComplete?: () => void;
  variant?: 'chip' | 'inline';
  runningLabel?: string;
  pausedLabel?: string;
}

const formatTime = (ms: number) => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export const Timer = forwardRef<TimerHandle, TimerProps>(
  (
    {
      durationMs,
      autoStart = true,
      onComplete,
      variant = 'chip',
      runningLabel = 'Timer running',
      pausedLabel = 'Timer paused',
      className,
      ...rest
    },
    ref,
  ) => {
    const [remainingMs, setRemainingMs] = useState(durationMs);
    const [isRunning, setIsRunning] = useState(autoStart);
    const durationRef = useRef(durationMs);
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
      durationRef.current = durationMs;
      setRemainingMs(durationMs);
      setIsRunning(autoStart);
    }, [autoStart, durationMs]);

    useEffect(() => {
      if (typeof window === 'undefined') {
        return;
      }

      if (!isRunning) {
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      intervalRef.current = window.setInterval(() => {
        setRemainingMs((current) => {
          const next = Math.max(0, current - 1000);
          if (next === 0) {
            setIsRunning(false);
            if (intervalRef.current) {
              window.clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            onComplete?.();
          }
          return next;
        });
      }, 1000);

      return () => {
        if (intervalRef.current && typeof window !== 'undefined') {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [isRunning, onComplete]);

    useImperativeHandle(
      ref,
      () => ({
        start: () => setIsRunning(true),
        pause: () => setIsRunning(false),
        reset: (nextDuration) => {
          const targetDuration = nextDuration ?? durationRef.current;
          durationRef.current = targetDuration;
          setRemainingMs(targetDuration);
          setIsRunning(autoStart);
        },
      }),
      [autoStart],
    );

    const formatted = useMemo(() => formatTime(remainingMs), [remainingMs]);

    return (
      <div
        {...rest}
        role="timer"
        aria-live="polite"
        aria-label={isRunning ? runningLabel : pausedLabel}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-full border border-border-subtle px-3 py-1 text-sm font-medium text-fg shadow-sm',
          variant === 'chip' ? 'bg-bg-panel' : 'bg-transparent border-none px-0 py-0',
          className,
        )}
      >
        <span>{formatted}</span>
        <span className="text-xs uppercase text-fg-muted">{isRunning ? 'running' : 'paused'}</span>
      </div>
    );
  },
);

Timer.displayName = 'Timer';
