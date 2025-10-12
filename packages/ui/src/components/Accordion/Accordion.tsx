import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

export interface AccordionItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
  className?: string;
  itemClassName?: string;
}

export const Accordion = ({
  items,
  allowMultiple = true,
  defaultOpenIds = [],
  className,
  itemClassName,
}: AccordionProps) => {
  const defaultSet = useMemo(() => new Set(defaultOpenIds), [defaultOpenIds]);
  const [openIds, setOpenIds] = useState(() => defaultSet);

  useEffect(() => {
    setOpenIds(new Set(defaultOpenIds));
  }, [defaultOpenIds]);

  const handleToggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      const isOpen = next.has(id);

      if (allowMultiple) {
        if (isOpen) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return new Set(next);
      }

      if (isOpen) {
        next.delete(id);
        return new Set(next);
      }

      return new Set([id]);
    });
  };

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        const panelId = `accordion-panel-${item.id}`;
        const triggerId = `accordion-trigger-${item.id}`;

        return (
          <div
            key={item.id}
            className={clsx(
              'rounded-md border border-border-subtle bg-bg-panel shadow-sm transition-colors',
              isOpen && 'border-border-focus',
              itemClassName,
            )}
          >
            <button
              id={triggerId}
              type="button"
              onClick={() => handleToggle(item.id)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className={clsx(
                'flex w-full items-center justify-between gap-3 rounded-md px-4 py-3 text-left text-md font-medium text-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2',
                isOpen ? 'bg-bg-sunken text-fg' : 'hover:bg-bg-sunken',
              )}
            >
              <span>{item.title}</span>
              <span
                className={clsx(
                  'inline-flex h-5 w-5 items-center justify-center rounded-full border border-border-subtle text-sm text-fg-muted transition-transform',
                  isOpen && 'rotate-90',
                )}
                aria-hidden="true"
              >
                ▶
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!isOpen}
              className="px-4 pb-4 text-sm text-fg"
            >
              {isOpen ? item.content : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};
