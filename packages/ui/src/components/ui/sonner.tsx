"use client";

import * as React from "react";
import { Toaster as Sonner, ToasterProps } from "sonner";

type ThemeProp = ToasterProps["theme"] | "system";

const resolveTheme = (theme?: ThemeProp): ToasterProps["theme"] => {
  if (theme && theme !== "system") {
    return theme;
  }

  if (typeof document !== "undefined") {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    if (currentTheme === "dark" || currentTheme === "light") {
      return currentTheme;
    }
  }

  if (theme === "system") {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  }

  return theme ?? "light";
};

const Toaster = ({ theme = "system", ...props }: ToasterProps & { theme?: ThemeProp }) => {
  const [resolvedTheme, setResolvedTheme] = React.useState<ToasterProps["theme"]>(() =>
    resolveTheme(theme),
  );

  React.useEffect(() => {
    setResolvedTheme(resolveTheme(theme));
  }, [theme]);

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
