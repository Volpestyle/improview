import type { Meta, StoryObj } from '@storybook/react';
import { LogOut, Play, Sparkles } from 'lucide-react';
import { Button, ButtonProps } from './Button';

const meta: Meta<ButtonProps> = {
  title: 'Inputs/Button',
  component: Button,
  parameters: {
    layout: 'centered'
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    }
  },
  args: {
    children: 'Generate problem',
    size: 'md',
    variant: 'primary'
  }
};

export default meta;

type Story = StoryObj<ButtonProps>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    variant: 'secondary'
  }
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'View history'
  }
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Delete session'
  }
};

export const WithIcon: Story = {
  args: {
    startIcon: <Sparkles size={16} aria-hidden="true" />,
    children: 'AI assist'
  }
};

export const Loading: Story = {
  args: {
    loading: true,
    children: 'Running tests'
  }
};

export const IconEnd: Story = {
  args: {
    endIcon: <LogOut size={16} aria-hidden="true" />,
    children: 'Sign out'
  }
};

export const Large: Story = {
  args: {
    size: 'lg',
    startIcon: <Play size={18} aria-hidden="true" />,
    children: 'Start timer'
  }
};
