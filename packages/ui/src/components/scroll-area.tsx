import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { forwardRef } from 'react';
import { cn } from '../utils/cn';

export const ScrollArea = forwardRef<
  HTMLDivElement,
  ScrollAreaPrimitive.ScrollAreaProps
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn('relative overflow-hidden', className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner className="bg-border-subtle" />
  </ScrollAreaPrimitive.Root>
));

ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = forwardRef<
  HTMLDivElement,
  ScrollAreaPrimitive.ScrollAreaScrollbarProps
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.Scrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'flex touch-none select-none transition-colors',
      orientation === 'vertical' ? 'h-full w-2.5 border-l border-l-border-subtle' : 'h-2.5 border-t border-t-border-subtle',
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border-focus" />
  </ScrollAreaPrimitive.Scrollbar>
));

ScrollBar.displayName = ScrollAreaPrimitive.Scrollbar.displayName;

export { ScrollBar };
