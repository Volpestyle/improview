import { forwardRef, useId } from 'react';
import clsx from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  supportingText?: string;
  errorMessage?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  optional?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      supportingText,
      errorMessage,
      startIcon,
      endIcon,
      optional,
      className,
      id,
      ...rest
    },
    ref,
  ) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const hasError = Boolean(errorMessage);
    const descriptionId = supportingText ? `${inputId}-description` : undefined;
    const errorId = hasError ? `${inputId}-error` : undefined;
    const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="flex flex-col gap-2">
        {label ? (
          <label
            htmlFor={inputId}
            className="flex items-center justify-between text-sm font-medium text-fg"
          >
            <span>{label}</span>
            {optional ? <span className="text-fg-muted text-xs font-regular">Optional</span> : null}
          </label>
        ) : null}
        <div
          className={clsx(
            'group relative flex min-h-[2.75rem] items-center rounded-md border border-border-subtle bg-bg-panel px-3 text-md transition-colors focus-within:border-border-focus focus-within:ring-2 focus-within:ring-border-focus',
            hasError && 'border-danger-600 focus-within:ring-danger-600',
          )}
        >
          {startIcon ? (
            <span className="mr-2 flex items-center text-fg-muted" aria-hidden="true">
              {startIcon}
            </span>
          ) : null}
          <input
            {...rest}
            ref={ref}
            id={inputId}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            className={clsx(
              'h-full w-full bg-transparent text-fg placeholder:text-fg-muted focus:outline-none',
              className,
            )}
          />
          {endIcon ? (
            <span className="ml-2 flex items-center text-fg-muted" aria-hidden="true">
              {endIcon}
            </span>
          ) : null}
        </div>
        {supportingText ? (
          <p id={descriptionId} className="text-sm text-fg-muted">
            {supportingText}
          </p>
        ) : null}
        {hasError ? (
          <p id={errorId} className="text-sm font-medium text-danger-600">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
