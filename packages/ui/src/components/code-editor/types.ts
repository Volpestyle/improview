import type {
  SandpackFiles,
  SandpackOptions,
  SandpackPredefinedTemplate,
  SandpackSetup,
  SandpackThemeProp,
} from '@codesandbox/sandpack-react';

export type SupportedLanguage = 'javascript' | 'typescript' | 'plaintext';

export type TestStatus = 'pass' | 'fail' | 'error';

export interface TestResult {
  id: string;
  status: TestStatus;
  label?: string;
  timeMs?: number;
  expected?: unknown;
  actual?: unknown;
  stdout?: string;
  stderr?: string;
  message?: string;
}

export interface SubmitResult {
  passed: boolean;
  results: TestResult[];
}

export type {
  SandpackFiles,
  SandpackOptions,
  SandpackPredefinedTemplate,
  SandpackSetup,
  SandpackThemeProp,
};
