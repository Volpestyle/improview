import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, './src'),
      '@improview/ui': path.resolve(__dirname, '../../packages/ui/src')
    }
  },
  css: {
    preprocessorOptions: {},
    postcss: path.resolve(__dirname, 'postcss.config.cjs')
  },
  server: {
    port: 5173,
    host: true
  }
});
