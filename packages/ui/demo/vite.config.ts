import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            { find: '@improview/ui/styles', replacement: resolve(__dirname, '../src/styles/theme.css') },
            { find: '@improview/ui', replacement: resolve(__dirname, '../src') },
        ],
    },
    server: {
        port: 3001,
    },
});
