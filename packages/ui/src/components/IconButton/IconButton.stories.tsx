import type { Meta, StoryObj } from '@storybook/react';
import { Menu, Play } from 'lucide-react';
import { IconButton, IconButtonProps } from './IconButton';

const meta: Meta<IconButtonProps> = {
  title: 'Inputs/IconButton',
  component: IconButton,
  parameters: {
    layout: 'centered'
  },
  args: {
    variant: 'primary',
    icon: <Menu size={16} aria-hidden="true" />,
    'aria-label': 'Open navigation'
  }
};

export default meta;

type Story = StoryObj<IconButtonProps>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    variant: 'secondary'
  }
};

export const Ghost: Story = {
  args: {
    variant: 'ghost'
  }
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    icon: <Play size={16} aria-hidden="true" />,
    'aria-label': 'Stop attempt'
  }
};
