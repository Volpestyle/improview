import type { Meta, StoryObj } from '@storybook/react';
import { Spinner, SpinnerProps } from './Spinner';

const meta: Meta<SpinnerProps> = {
  title: 'Feedback/Spinner',
  component: Spinner,
  parameters: {
    layout: 'centered'
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    }
  },
  args: {
    size: 'md'
  }
};

export default meta;

type Story = StoryObj<SpinnerProps>;

export const Medium: Story = {};

export const Small: Story = {
  args: { size: 'sm' }
};

export const Large: Story = {
  args: { size: 'lg' }
};
