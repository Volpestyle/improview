import { forwardRef, useId } from 'react';
import clsx from 'clsx';

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  supportingText?: string;
  errorMessage?: string;
  optional?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    { label, supportingText, errorMessage, optional, className, id, rows = 4, ...rest },
    ref,
  ) => {
    const autoId = useId();
    const textareaId = id ?? autoId;
    const descriptionId = supportingText ? `${textareaId}-description` : undefined;
    const errorId = errorMessage ? `${textareaId}-error` : undefined;
    const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="flex flex-col gap-2">
        {label ? (
          <label
            htmlFor={textareaId}
            className="flex items-center justify-between text-sm font-medium text-fg"
          >
            <span>{label}</span>
            {optional ? <span className="text-xs text-fg-muted">Optional</span> : null}
          </label>
        ) : null}
        <textarea
          {...rest}
          id={textareaId}
          ref={ref}
          rows={rows}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={describedBy}
          className={clsx(
            'w-full rounded-md border border-border-subtle bg-bg-panel px-3 py-2 text-md text-fg placeholder:text-fg-muted shadow-sm transition-colors focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus',
            errorMessage && 'border-danger-600 focus:ring-danger-600',
            className,
          )}
        />
        {supportingText ? (
          <p id={descriptionId} className="text-sm text-fg-muted">
            {supportingText}
          </p>
        ) : null}
        {errorMessage ? (
          <p id={errorId} className="text-sm font-medium text-danger-600">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  },
);

TextArea.displayName = 'TextArea';
