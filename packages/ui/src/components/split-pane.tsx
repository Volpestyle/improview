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
    width: `${fraction * 100}%`,
    minWidth: minLeft,
  };

  const rightStyle: React.CSSProperties = {
    width: `${(1 - fraction) * 100}%`,
    minWidth: minRight,
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
        className="group relative flex h-full w-4 flex-none select-none items-center justify-center border-l border-border-subtle bg-bg-panel"
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className="flex h-full w-full cursor-col-resize select-none items-center justify-center bg-transparent outline-none transition-colors"
          onPointerDown={handlePointerDown}
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
