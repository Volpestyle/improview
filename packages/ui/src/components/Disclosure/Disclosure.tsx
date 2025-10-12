import { useId, useState } from 'react';
import clsx from 'clsx';

export interface DisclosureProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
  className?: string;
  buttonClassName?: string;
  contentClassName?: string;
}

export const Disclosure = ({
  title,
  children,
  defaultOpen = false,
  onToggle,
  className,
  buttonClassName,
  contentClassName,
}: DisclosureProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const disclosureId = useId();

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      onToggle?.(next);
      return next;
    });
  };

  const panelId = `disclosure-panel-${disclosureId}`;

  return (
    <div className={clsx('rounded-md border border-border-subtle bg-bg-panel shadow-sm', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        className={clsx(
          'flex w-full items-center justify-between gap-3 rounded-md px-4 py-3 text-left text-md font-medium text-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2',
          open ? 'bg-bg-sunken text-fg' : 'hover:bg-bg-sunken',
          buttonClassName,
        )}
        onClick={handleToggle}
      >
        <span>{title}</span>
        <span
          className={clsx(
            'inline-flex h-5 w-5 items-center justify-center rounded-full border border-border-subtle text-sm text-fg-muted transition-transform',
            open && 'rotate-45',
          )}
          aria-hidden="true"
        >
          +
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        hidden={!open}
        className={clsx('px-4 pb-4 text-sm text-fg', contentClassName)}
      >
        {open ? children : null}
      </div>
    </div>
  );
};
