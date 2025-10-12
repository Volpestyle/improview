import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('renders icon and accessible label', () => {
    render(
      <IconButton icon={<span data-testid="icon" />} aria-label="Open panel" />,
    );
    expect(screen.getByRole('button', { name: /open panel/i })).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('throws if aria-label missing', () => {
    expect(() =>
      render(<IconButton icon={<span />} aria-label={undefined as unknown as string} />),
    ).toThrow();
  });
});
