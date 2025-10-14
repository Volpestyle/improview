import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";
import "./button.css";

const buttonVariants = cva("improview-button", {
  variants: {
    variant: {
      default: "improview-button--default",
      secondary: "improview-button--secondary",
      outline: "improview-button--outline",
      ghost: "improview-button--ghost",
      destructive: "improview-button--destructive",
      link: "improview-button--link",
    },
    size: {
      default: "improview-button--size-default",
      sm: "improview-button--size-sm",
      lg: "improview-button--size-lg",
      icon: "improview-button--size-icon",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
