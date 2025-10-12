import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('renders with status role and accessible label', () => {
    render(<Spinner label="Fetching data" />);
    const spinner = screen.getByRole('status', { name: /fetching data/i });
    expect(spinner).toBeInTheDocument();
    expect(screen.getByText(/fetching data/i)).toHaveClass('sr-only');
  });

  it('applies size classes', () => {
    const { rerender } = render(<Spinner size="sm" />);
    expect(screen.getByRole('status')).toHaveClass('h-4', 'w-4');
    rerender(<Spinner size="lg" />);
    expect(screen.getByRole('status')).toHaveClass('h-8', 'w-8');
  });

  it('supports tone variants', () => {
    const { rerender } = render(<Spinner />);
    const [ring] = within(screen.getByRole('status')).getAllByRole('generic');
    expect(ring).toHaveClass('border-border-subtle');
    rerender(<Spinner tone="accent" />);
    const [accentRing] = within(screen.getByRole('status')).getAllByRole('generic');
    expect(accentRing).toHaveClass('border-accent');
  });
});
