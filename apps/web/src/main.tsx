import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider, applyThemeMode } from '@improview/ui';
import { router } from './router';
import { queryClient } from './lib/queryClient';
import { ThemeProvider, getInitialTheme } from './providers/ThemeProvider';
import './styles/global.css';

const initialTheme = getInitialTheme();
applyThemeMode(initialTheme);

const rootEl = document.getElementById('root');

if (!rootEl) {
  throw new Error('Root element not found');
}

const root = createRoot(rootEl);

root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ThemeProvider initialTheme={initialTheme}>
          <RouterProvider router={router} />
        </ThemeProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
