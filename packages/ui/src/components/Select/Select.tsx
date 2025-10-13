import { forwardRef, useId } from 'react';
import clsx from 'clsx';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  supportingText?: string;
  errorMessage?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      supportingText,
      errorMessage,
      options,
      className,
      id,
      placeholder,
      defaultValue,
      value,
      ...rest
    },
    ref,
  ) => {
    const autoId = useId();
    const selectId = id ?? autoId;
    const descriptionId = supportingText ? `${selectId}-description` : undefined;
    const errorId = errorMessage ? `${selectId}-error` : undefined;
    const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="flex flex-col gap-2">
        {label ? (
          <label htmlFor={selectId} className="text-sm font-medium text-fg">
            {label}
          </label>
        ) : null}
        <div className="relative">
          <select
            {...rest}
            id={selectId}
            ref={ref}
            {...(value !== undefined
              ? { value }
              : { defaultValue: defaultValue ?? (placeholder ? '' : undefined) })}
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={describedBy}
            className={clsx(
              'w-full appearance-none rounded-md border border-border-subtle bg-bg-panel px-3 py-2 text-md text-fg placeholder:text-fg-muted shadow-sm transition-colors focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus',
              errorMessage && 'border-danger-600 focus:ring-danger-600',
              className,
            )}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-fg-muted"
            aria-hidden="true"
          >
            ▾
          </span>
        </div>
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

Select.displayName = 'Select';
