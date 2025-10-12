import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    globals: true,
    css: true,
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}']
    }
  },
  resolve: {
    alias: {
      '@improview/ui': path.resolve(__dirname, './src')
    }
  }
});
