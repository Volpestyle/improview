import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  orientation: 'horizontal' | 'vertical';
  registerTrigger: (value: string, node: HTMLButtonElement | null) => () => void;
  focusByOffset: (currentValue: string, offset: number) => void;
  focusFirst: () => void;
  focusLast: () => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

const toDomId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();

export interface TabsRootProps {
  value?: string;
  defaultValue: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  children: React.ReactNode;
  className?: string;
}

export const TabsRoot = ({
  value,
  defaultValue,
  onValueChange,
  orientation = 'horizontal',
  children,
  className,
}: TabsRootProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const mergedValue = value ?? internalValue;
  const triggersRef = useRef(new Map<string, HTMLButtonElement>());

  const setValue = useCallback(
    (next: string) => {
      if (value === undefined) {
        setInternalValue(next);
      }
      onValueChange?.(next);
    },
    [onValueChange, value],
  );

  const registerTrigger = useCallback((triggerValue: string, node: HTMLButtonElement | null) => {
    if (node) {
      triggersRef.current.set(triggerValue, node);
    }
    return () => {
      triggersRef.current.delete(triggerValue);
    };
  }, []);

  const focusByOffset = useCallback(
    (currentValue: string, offset: number) => {
      const entries = Array.from(triggersRef.current.entries());
      const currentIndex = entries.findIndex(([valueKey]) => valueKey === currentValue);
      if (currentIndex === -1 || entries.length === 0) {
        return;
      }
      const nextIndex = (currentIndex + offset + entries.length) % entries.length;
      const [nextValue, nextNode] = entries[nextIndex];
      if (nextNode) {
        nextNode.focus();
        setValue(nextValue);
      }
    },
    [setValue],
  );

  const focusFirst = useCallback(() => {
    const entries = Array.from(triggersRef.current.entries());
    if (entries.length === 0) {
      return;
    }
    const [nextValue, node] = entries[0];
    if (node) {
      node.focus();
      setValue(nextValue);
    }
  }, [setValue]);

  const focusLast = useCallback(() => {
    const entries = Array.from(triggersRef.current.entries());
    if (entries.length === 0) {
      return;
    }
    const [nextValue, node] = entries[entries.length - 1];
    if (node) {
      node.focus();
      setValue(nextValue);
    }
  }, [setValue]);

  const contextValue: TabsContextValue = useMemo(
    () => ({
      value: mergedValue,
      setValue,
      orientation,
      registerTrigger,
      focusByOffset,
      focusFirst,
      focusLast,
    }),
    [focusByOffset, focusFirst, focusLast, mergedValue, orientation, registerTrigger, setValue],
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={clsx('flex flex-col gap-4', className)} data-orientation={orientation}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const TabsList = ({ children, className, ...rest }: TabsListProps) => {
  const context = useTabsContext();
  return (
    <div
      role="tablist"
      aria-orientation={context.orientation}
      className={clsx(
        'inline-flex gap-2 rounded-md bg-bg-sunken p-1',
        context.orientation === 'vertical' && 'flex-col',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
};

export interface TabsTriggerProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'id'> {
  value: string;
  children: React.ReactNode;
}

export const TabsTrigger = ({
  value,
  children,
  className,
  disabled,
  ...rest
}: TabsTriggerProps) => {
  const context = useTabsContext();
  const { registerTrigger } = context;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const idFragment = useMemo(() => toDomId(value), [value]);
  const triggerId = useMemo(() => `tab-${idFragment}`, [idFragment]);
  const panelId = useMemo(() => `tabpanel-${idFragment}`, [idFragment]);

  useLayoutEffect(() => registerTrigger(value, triggerRef.current), [registerTrigger, value]);

  const isSelected = context.value === value;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (context.orientation === 'horizontal') {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        context.focusByOffset(value, 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        context.focusByOffset(value, -1);
      }
    } else if (context.orientation === 'vertical') {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        context.focusByOffset(value, 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        context.focusByOffset(value, -1);
      }
    }
    if (event.key === 'Home') {
      event.preventDefault();
      context.focusFirst();
    }
    if (event.key === 'End') {
      event.preventDefault();
      context.focusLast();
    }
  };

  return (
    <button
      {...rest}
      id={triggerId}
      ref={triggerRef}
      role="tab"
      type="button"
      aria-selected={isSelected}
      aria-controls={panelId}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      className={clsx(
        'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        isSelected
          ? 'bg-bg-panel text-fg shadow-sm focus-visible:ring-border-focus focus-visible:ring-offset-bg'
          : 'text-fg-muted hover:text-fg focus-visible:ring-border-focus focus-visible:ring-offset-bg',
        disabled && 'opacity-60',
        className,
      )}
      onClick={() => context.setValue(value)}
      onKeyDown={handleKeyDown}
    >
      {children}
    </button>
  );
};

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
}

export const TabsContent = ({ value, children, className, ...rest }: TabsContentProps) => {
  const context = useTabsContext();
  const idFragment = useMemo(() => toDomId(value), [value]);
  const triggerId = useMemo(() => `tab-${idFragment}`, [idFragment]);
  const panelId = useMemo(() => `tabpanel-${idFragment}`, [idFragment]);
  const isSelected = context.value === value;

  return (
    <div
      {...rest}
      role="tabpanel"
      id={panelId}
      aria-labelledby={triggerId}
      hidden={!isSelected}
      className={clsx(
        'rounded-md border border-border-subtle bg-bg-panel p-4 shadow-sm',
        className,
      )}
    >
      {isSelected ? children : null}
    </div>
  );
};

const useTabsContext = () => {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('Tabs components must be used within a <TabsRoot>.');
  }
  return ctx;
};

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});
