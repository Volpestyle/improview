import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IconButton } from './IconButton';

describe('IconButton a11y', () => {
  it('relies on aria-label for accessible name', () => {
    render(<IconButton icon={<span />} aria-label="Toggle menu" />);
    expect(screen.getByRole('button', { name: /toggle menu/i })).toBeInTheDocument();
  });
});
