import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@improview/ui';
import { ThemeProvider } from './providers/ThemeProvider';
import { createAppRouter } from './router';
import { queryClient } from './lib/queryClient';
import { getApiClient } from './lib/apiClient';
import './index.css';

/**
 * Create router with context
 */
const router = createAppRouter({
  queryClient,
  apiClient: getApiClient(),
});

/**
 * Root element
 */
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

/**
 * Render app
 */
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
