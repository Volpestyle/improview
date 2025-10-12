import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  splitting: false,
  sourcemap: true,
  dts: true,
  clean: true,
  target: 'es2020',
  minify: false
});
