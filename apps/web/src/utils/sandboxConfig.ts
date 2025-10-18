import type { SandpackOptions } from '@improview/ui';
import type { MacroCategory, ProblemPack } from '../types/problem';

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

const SYSTEM_DESIGN_KEYWORDS = ['design', 'system', 'architecture', 'scalable', 'throughput'];
const FRONTEND_KEYWORDS = ['react', 'component', 'jsx', 'css', 'ui', 'dom', 'hook'];

export const getSandboxConfigForCategory = (category: MacroCategory): SandboxConfig => {
  if (category === 'frontend') {
    return FRONTEND_CONFIG;
  }
  return MINIMAL_CONFIG;
};

export const inferMacroCategoryFromProblem = (problem: ProblemPack): MacroCategory => {
  const signature = problem.api.signature.toLowerCase();
  const title = problem.problem.title.toLowerCase();
  const statement = problem.problem.statement.toLowerCase();
  const combined = `${signature} ${title} ${statement}`;

  if (FRONTEND_KEYWORDS.some((keyword) => combined.includes(keyword))) {
    return 'frontend';
  }
  if (SYSTEM_DESIGN_KEYWORDS.some((keyword) => combined.includes(keyword))) {
    return 'system-design';
  }
  return 'dsa';
};

export type { SandboxConfig };
