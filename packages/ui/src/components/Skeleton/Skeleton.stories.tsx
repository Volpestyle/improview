import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton, SkeletonProps } from './Skeleton';

const meta: Meta<SkeletonProps> = {
  title: 'Feedback/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered'
  },
  args: {
    className: 'h-6 w-40'
  }
};

export default meta;

type Story = StoryObj<SkeletonProps>;

export const Default: Story = {};

export const Rounded: Story = {
  args: {
    radius: 'lg',
    className: 'h-10 w-64'
  }
};

export const Circle: Story = {
  args: {
    radius: 'full',
    className: 'h-16 w-16'
  }
};
