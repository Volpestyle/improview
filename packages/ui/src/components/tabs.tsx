import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { CSSProperties } from 'react';
import {
  Children,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '../utils/cn';

interface TabsProps extends TabsPrimitive.TabsProps {
  children: React.ReactNode;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(({ children, ...props }, ref) => {
  return (
    <TabsPrimitive.Root ref={ref} {...props}>
      {children}
    </TabsPrimitive.Root>
  );
});

Tabs.displayName = TabsPrimitive.Root.displayName;

interface TabsListProps extends TabsPrimitive.TabsListProps {
  value?: string;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, value, ...props }, ref) => {
    const [indicatorStyle, setIndicatorStyle] = useState<CSSProperties>({});
    const [isIndicatorReady, setIsIndicatorReady] = useState(false);
    const tabsListRef = useRef<HTMLDivElement | null>(null);
    const triggersCount = useMemo(() => Children.count(children), [children]);

    const updateIndicatorPosition = useCallback(() => {
      const list = tabsListRef.current;
      if (!list) return;

      const activeTab = list.querySelector<HTMLElement>('[data-state="active"]');
      if (!activeTab) {
        setIsIndicatorReady(false);
        return;
      }

      const listRect = list.getBoundingClientRect();
      const activeTabRect = activeTab.getBoundingClientRect();
      const width = `${activeTabRect.width}px`;
      const translateX = `translate3d(${activeTabRect.left - listRect.left}px, 0, 0)`;

      setIndicatorStyle((prev) => {
        const next: CSSProperties = {
          width,
          transform: translateX,
        };

        if (prev.width === next.width && prev.transform === next.transform) {
          return prev;
        }

        return next;
      });
      setIsIndicatorReady(true);
    }, []);

    useIsomorphicLayoutEffect(() => {
      updateIndicatorPosition();
    }, [updateIndicatorPosition, triggersCount, value]);

    useEffect(() => {
      const list = tabsListRef.current;
      if (!list || typeof window === 'undefined') return;

      const handleChange = () => updateIndicatorPosition();

      const mutationObserver = new MutationObserver(() => handleChange());
      mutationObserver.observe(list, {
        attributes: true,
        attributeFilter: ['data-state'],
        subtree: true,
      });

      let resizeObserver: ResizeObserver | undefined;
      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => handleChange());
        resizeObserver.observe(list);
      }

      window.addEventListener('resize', handleChange);

      return () => {
        mutationObserver.disconnect();
        resizeObserver?.disconnect();
        window.removeEventListener('resize', handleChange);
      };
    }, [updateIndicatorPosition]);

    return (
      <TabsPrimitive.List
        ref={(el) => {
          tabsListRef.current = el;
          if (ref) {
            if (typeof ref === 'function') {
              ref(el);
            } else {
              (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
            }
          }
        }}
        className={cn(
          'inline-flex h-9 items-center justify-center rounded-md border border-border-subtle bg-bg-sunken text-fg-muted shadow-sm relative overflow-hidden',
          className,
        )}
        {...props}
      >
        {children}
        <div
          className="pointer-events-none absolute top-0.5 bottom-0.5 rounded-md shadow-sm"
          style={{
            ...indicatorStyle,
            backgroundColor: 'var(--tabs-indicator-bg, var(--bg-panel))',
            opacity: isIndicatorReady ? 1 : 0,
            transitionProperty: 'transform, width, opacity, background-color',
            transitionDuration: 'var(--motion-duration-base, 180ms)',
            transitionTimingFunction: 'var(--motion-easing-inOut, cubic-bezier(0.4, 0, 0.2, 1))',
            left: 0,
            willChange: 'transform, width, background-color',
          }}
        />
      </TabsPrimitive.List>
    );
  },
);

TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsPrimitive.TabsTriggerProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex min-w-[100px] items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium relative z-10',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:text-fg-default',
        className,
      )}
      style={{
        transitionDuration: 'var(--motion-duration-base, 180ms)',
        transitionTimingFunction: 'var(--motion-easing-inOut, cubic-bezier(0.4, 0, 0.2, 1))',
      }}
      {...props}
    />
  ),
);

TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = forwardRef<HTMLDivElement, TabsPrimitive.TabsContentProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        className,
      )}
      {...props}
    />
  ),
);

TabsContent.displayName = TabsPrimitive.Content.displayName;
