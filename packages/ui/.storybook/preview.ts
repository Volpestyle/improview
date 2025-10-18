import type { Preview } from '@storybook/react';
import { applyTokenTheme } from '../src/theme/applyTokens';
import { ThemeProvider } from '../src/theme/ThemeProvider';
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
  },
  decorators: [
    (Story) => (
      <ThemeProvider defaultTheme="system">
        <Story />
      </ThemeProvider>
    )
  ]
};

export default preview;
