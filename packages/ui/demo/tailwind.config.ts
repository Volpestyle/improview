import type { Config } from 'tailwindcss';
import baseConfig from '../tailwind.config';

const config: Config = {
  ...baseConfig,
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    '../src/**/*.{ts,tsx}',
    '../../tokens/**/*.json',
  ],
};

export default config;
