import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  ThemeProvider,
  applyTokenTheme,
} from '@improview/ui';
import '@improview/ui/styles';
import './index.css';
import App from './App';

applyTokenTheme();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system">
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
