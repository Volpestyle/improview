import type { Preview } from '@storybook/react';
import { applyTokenTheme } from '../src/theme/applyTokens';
import '../src/styles/storybook.css';

applyTokenTheme();

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    }
  }
};

export default preview;
