import { Moon, Sun } from 'lucide-react';
import { Button } from './button';
import { useTheme } from '../theme/ThemeProvider';

export interface ThemeToggleProps extends React.ComponentProps<typeof Button> {}

export const ThemeToggle = ({ className, ...props }: ThemeToggleProps) => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className={className}
      {...props}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
};
