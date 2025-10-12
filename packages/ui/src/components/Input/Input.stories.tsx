import type { Meta, StoryObj } from '@storybook/react';
import { Search, ShieldAlert } from 'lucide-react';
import { Input, InputProps } from './Input';

const meta: Meta<InputProps> = {
  title: 'Inputs/Input',
  component: Input,
  args: {
    label: 'Problem title',
    placeholder: 'Two Sum Variant',
  },
};

export default meta;

type Story = StoryObj<InputProps>;

export const Default: Story = {};

export const Optional: Story = {
  args: {
    optional: true,
    supportingText: 'Visible to collaborators only.',
  },
};

export const WithIcons: Story = {
  args: {
    label: 'Search problems',
    startIcon: <Search size={16} aria-hidden="true" />,
    placeholder: 'Binary search',
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Provider API key',
    endIcon: <ShieldAlert size={16} aria-hidden="true" />,
    errorMessage: 'Key is invalid or expired.',
    supportingText: 'Find your API key in provider settings.',
  },
};
