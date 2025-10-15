import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    css: true,
    passWithNoTests: true,
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}']
    }
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, './src'),
      '@improview/ui': path.resolve(__dirname, '../../packages/ui/src')
    }
  }
});
