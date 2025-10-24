import type { SandpackOptions } from '@improview/ui';
import type { MacroCategory } from '../types/problem';

interface SandboxConfig {
  showPreview: boolean;
  showFileExplorer: boolean;
  showSandpackConsole: boolean;
  sandpackOptions?: SandpackOptions;
}

const minimalSandpackOptions: SandpackOptions = {
  showTabs: false,
  showConsoleButton: false,
  showLineNumbers: true,
  resizablePanels: false,
};

const frontendSandpackOptions: SandpackOptions = {
  showTabs: true,
  showConsoleButton: true,
  resizablePanels: true,
  showInlineErrors: true,
};

const MINIMAL_CONFIG: SandboxConfig = {
  showPreview: false,
  showFileExplorer: false,
  showSandpackConsole: false,
  sandpackOptions: minimalSandpackOptions,
};

const FRONTEND_CONFIG: SandboxConfig = {
  showPreview: true,
  showFileExplorer: true,
  showSandpackConsole: true,
  sandpackOptions: frontendSandpackOptions,
};

export const getSandboxConfigForCategory = (category: MacroCategory): SandboxConfig => {
  if (category === 'frontend') {
    return FRONTEND_CONFIG;
  }
  return MINIMAL_CONFIG;
};

export type { SandboxConfig };
