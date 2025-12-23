import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  minLeft?: number;
  minRight?: number;
  initialFraction?: number;
  className?: string;
}

const HANDLE_WIDTH_PX = 16;

export const SplitPane = ({
  left,
  right,
  minLeft = 320,
  minRight = 320,
  initialFraction = 0.5,
  className,
}: SplitPaneProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fraction, setFraction] = useState(() => initialFraction);
  const dragging = useRef(false);
  const activeHandle = useRef<HTMLElement | null>(null);

  const clampFraction = useCallback(
    (nextFraction: number) => {
      if (!containerRef.current) {
        return nextFraction;
      }
      const width = Math.max(containerRef.current.clientWidth, 1);
      const minFraction = Math.min(minLeft / width, 1);
      const maxFraction = 1 - Math.min(minRight / width, 1);
      const clampedBounds = minFraction > maxFraction ? minFraction : maxFraction;
      const lowerBound = Math.min(minFraction, clampedBounds);
      const upperBound = Math.max(maxFraction, clampedBounds);
      const clamped = Math.min(Math.max(nextFraction, lowerBound), upperBound);
      if (!Number.isFinite(clamped)) {
        return nextFraction;
      }
      return clamped;
    },
    [minLeft, minRight],
  );

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const target = event.currentTarget;
    activeHandle.current = target;
    target.setPointerCapture(event.pointerId);
    dragging.current = true;
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const bounds = containerRef.current.getBoundingClientRect();
      const relativeX = event.clientX - bounds.left;
      const nextFraction = clampFraction(relativeX / bounds.width);
      setFraction(nextFraction);
    },
    [clampFraction],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!containerRef.current) return;
      const bounds = containerRef.current.getBoundingClientRect();
      const step = Math.max(1 / Math.max(bounds.width, 1), 0.005) * 24; // ~24px step
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        setFraction((prev) => clampFraction(prev + (event.key === 'ArrowRight' ? step : -step)));
      }
    },
    [clampFraction],
  );

  const handlePointerUp = useCallback((event: PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    activeHandle.current?.releasePointerCapture(event.pointerId);
    activeHandle.current = null;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => {
      setFraction((prev) => clampFraction(prev));
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, [clampFraction]);

  const leftStyle: React.CSSProperties = {
    width: `calc(${fraction * 100}% - ${fraction * HANDLE_WIDTH_PX}px)`,
  };

  const rightStyle: React.CSSProperties = {
    width: `calc(${(1 - fraction) * 100}% - ${(1 - fraction) * HANDLE_WIDTH_PX}px)`,
  };

  return (
    <div ref={containerRef} className={cn('flex h-full w-full', className)}>
      <div
        style={leftStyle}
        className="min-w-0 grow-0 shrink-0 overflow-hidden h-full flex flex-col"
      >
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-hidden="true"
        className="group relative flex h-full flex-none select-none items-center justify-center border-l border-border-subtle bg-bg-panel"
        style={{ width: `${HANDLE_WIDTH_PX}px` }}
      >
        <button
          type="button"
          tabIndex={0}
          aria-label="Resize panel"
          className="flex h-full w-full cursor-col-resize select-none items-center justify-center bg-transparent outline-none transition-colors"
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
        >
          <span className="pointer-events-none h-16 w-[2px] rounded-full bg-border-default transition-colors group-hover:bg-border-focus" />
        </button>
      </div>
      <div
        style={rightStyle}
        className="min-w-0 grow-0 shrink-0 overflow-hidden h-full flex flex-col"
      >
        {right}
      </div>
    </div>
  );
};
