import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from './Spinner';

describe('Spinner a11y', () => {
  it('exposes polite live region for assistive tech', () => {
    render(<Spinner label="Loading content" />);
    const spinner = screen.getByRole('status', { name: /loading content/i });
    expect(spinner).toHaveAttribute('aria-live', 'polite');
  });
});
