import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/styles/theme.css', 'src/styles/fonts.css'],
  format: ['esm', 'cjs'],
  splitting: false,
  sourcemap: true,
  dts: true,
  clean: true,
  target: 'es2020',
  minify: false,
  loader: {
    '.woff2': 'copy',
    '.woff': 'copy',
    '.ttf': 'copy'
  },
  publicDir: 'src/assets'
});
