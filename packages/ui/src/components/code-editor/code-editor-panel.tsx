import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Play, Send, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import {
  Fragment,
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  SandpackFileExplorer,
  useSandpack,
} from '@codesandbox/sandpack-react';
import type {
  SandpackFile,
  SandpackFiles,
  SandpackOptions,
  SandpackPredefinedTemplate,
  SandpackSetup,
  SandpackTheme,
  SandpackThemeProp,
} from '@codesandbox/sandpack-react';
import { useThemeContext } from '../../theme/ThemeProvider';
import type { DesignTokens, ThemeMode } from '../../theme/types';
import defaultTokensJson from '../../theme/tokens.json';
import { Button } from '../button';
import { ScrollArea } from '../scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';
import { cn } from '../../utils/cn';
import type { SubmitResult, TestResult, SupportedLanguage } from './types';

const DEFAULT_FILE_NAME = 'solution.ts';

const toRem = (value: number): string => `${value / 16}rem`;

const FALLBACK_TOKENS = defaultTokensJson as DesignTokens;

const createSandpackThemeFromTokens = (tokens: DesignTokens, mode: ThemeMode): SandpackTheme => {
  const editor = tokens.editor[mode];
  const palette = tokens.color[mode];

  return {
    colors: {
      surface1: editor.background,
      surface2: palette.bg.panel,
      surface3: palette.bg.elevated,
      disabled: palette.border.subtle,
      base: palette.fg.default,
      clickable: palette.accent.primary,
      hover: palette.accent.emphasis,
      accent: palette.accent.primary,
      error: palette.danger['600'],
      errorSurface: palette.danger.soft,
      warning: palette.warning['600'],
      warningSurface: palette.warning.soft,
    },
    syntax: {
      plain: editor.text,
      comment: editor.tokenComment,
      keyword: editor.tokenKeyword,
      definition: editor.tokenFunction,
      punctuation: editor.tokenPunctuation,
      property: editor.tokenFunction,
      tag: editor.tokenKeyword,
      static: editor.tokenNumber,
      string: editor.tokenString,
    },
    font: {
      body: tokens.font.family.sans,
      mono: tokens.font.family.mono,
      size: toRem(tokens.font.size.sm),
      lineHeight: '1.55',
    },
  };
};

const FALLBACK_SANDBOX_THEME = createSandpackThemeFromTokens(FALLBACK_TOKENS, 'light');

const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Improview Sandbox</title>
    <style>
      html, body, #root {
        height: 100%;
      }
      body {
        margin: 0;
        background-color: #f5f5f5;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
      }
      * {
        box-sizing: border-box;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

type MaybeResults = TestResult[] | null;

const ensureLeadingSlash = (name: string): string =>
  name.startsWith('/') ? name : `/${name}`;

const getFileDisplayName = (path: string): string => path.replace(/^\//, '');

const isTypeScriptFileName = (name: string): boolean =>
  name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.mts');

const resolveLanguage = (
  language: SupportedLanguage | undefined,
  fileName: string,
): SupportedLanguage => {
  if (language && language !== 'plaintext') {
    return language;
  }
  return isTypeScriptFileName(fileName) ? 'typescript' : 'javascript';
};

const getImportPath = (filePath: string): string => {
  const normalized = ensureLeadingSlash(filePath).replace(/\/+/g, '/');
  return `.${normalized}`;
};

const getCodeFromEntry = (entry?: string | SandpackFile): string | undefined => {
  if (!entry) return undefined;
  if (typeof entry === 'string') return entry;
  return entry.code;
};

const isSandpackFileObject = (file: unknown): file is { code: string } =>
  typeof file === 'object' &&
  file !== null &&
  'code' in file &&
  typeof (file as { code: unknown }).code === 'string';

const getCodeFromBundlerFile = (entry: unknown): string => {
  if (typeof entry === 'string') {
    return entry;
  }
  if (isSandpackFileObject(entry)) {
    return entry.code;
  }
  return '';
};

const toSandpackFile = (
  entry: string | SandpackFile | undefined,
  code: string,
): SandpackFile => {
  if (entry && typeof entry === 'object') {
    return { ...entry, code };
  }
  return { code };
};

interface DefaultSandboxResult {
  files: SandpackFiles;
  appFile: string;
  indexFile: string;
}

const createJavaScriptAppCode = (importPath: string, displayName: string): string =>
  [
    `import React from "react";`,
    `import * as Solution from "${importPath}";`,
    ``,
    `const styles = {`,
    `  fontFamily: 'Inter, system-ui, sans-serif',`,
    `  padding: '1.5rem',`,
    `  lineHeight: 1.6,`,
    `  color: '#111827',`,
    `  backgroundColor: '#ffffff',`,
    `  borderRadius: '0.75rem',`,
    `  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',`,
    `};`,
    ``,
    `const DefaultExport = Solution?.default;`,
    ``,
    `export default function App() {`,
    `  if (typeof DefaultExport === "function") {`,
    `    const Component = DefaultExport;`,
    `    return <Component />;`,
    `  }`,
    ``,
    `  const namedExports = Object.entries(Solution).filter(([key]) => key !== "default");`,
    ``,
    `  return (`,
    `    <div style={{ padding: '2rem', minHeight: '100%', backgroundColor: '#f9fafb' }}>`,
    `      <div style={styles}>`,
    `        <h1 style={{ marginBottom: '0.75rem', fontSize: '1.25rem' }}>Sandbox ready</h1>`,
    `        {namedExports.length === 0 ? (`,
    `          <p style={{ marginBottom: 0, fontSize: '0.95rem' }}>`,
    `            Export a React component as the default export from <code>${displayName}</code> to render it here.`,
    `          </p>`,
    `        ) : (`,
    `          <div style={{ fontSize: '0.9rem' }}>`,
    `            <p style={{ marginBottom: '0.5rem' }}>`,
    `              Named exports detected in <code>${displayName}</code>:`,
    `            </p>`,
    `            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>`,
    `              {namedExports.map(([key]) => (`,
    `                <li key={key} style={{ marginBottom: '0.25rem' }}>`,
    `                  <code>{key}</code>`,
    `                </li>`,
    `              ))}`,
    `            </ul>`,
    `            <p style={{ marginTop: '0.75rem', color: '#6b7280' }}>`,
    `              Export a default component to render it automatically.`,
    `            </p>`,
    `          </div>`,
    `        )}`,
    `      </div>`,
    `    </div>`,
    `  );`,
    `}`,
  ].join('\n');

const createTypeScriptAppCode = (importPath: string, displayName: string): string =>
  [
    `import React from "react";`,
    `import * as Solution from "${importPath}";`,
    ``,
    `const styles: React.CSSProperties = {`,
    `  fontFamily: 'Inter, system-ui, sans-serif',`,
    `  padding: '1.5rem',`,
    `  lineHeight: 1.6,`,
    `  color: '#111827',`,
    `  backgroundColor: '#ffffff',`,
    `  borderRadius: '0.75rem',`,
    `  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',`,
    `};`,
    ``,
    `type PossibleComponent = React.ComponentType<Record<string, unknown>>;`,
    `const DefaultExport = (Solution as { default?: PossibleComponent }).default;`,
    ``,
    `export default function App(): JSX.Element {`,
    `  if (typeof DefaultExport === 'function') {`,
    `    const Component = DefaultExport as PossibleComponent;`,
    `    return <Component />;`,
    `  }`,
    ``,
    `  const namedExports = Object.entries(Solution).filter(([key]) => key !== 'default');`,
    ``,
    `  return (`,
    `    <div style={{ padding: '2rem', minHeight: '100%', backgroundColor: '#f9fafb' }}>`,
    `      <div style={styles}>`,
    `        <h1 style={{ marginBottom: '0.75rem', fontSize: '1.25rem' }}>Sandbox ready</h1>`,
    `        {namedExports.length === 0 ? (`,
    `          <p style={{ marginBottom: 0, fontSize: '0.95rem' }}>`,
    `            Export a React component as the default export from <code>${displayName}</code> to render it here.`,
    `          </p>`,
    `        ) : (`,
    `          <div style={{ fontSize: '0.9rem' }}>`,
    `            <p style={{ marginBottom: '0.5rem' }}>`,
    `              Named exports detected in <code>${displayName}</code>:`,
    `            </p>`,
    `            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>`,
    `              {namedExports.map(([key]) => (`,
    `                <li key={key} style={{ marginBottom: '0.25rem' }}>`,
    `                  <code>{key}</code>`,
    `                </li>`,
    `              ))}`,
    `            </ul>`,
    `            <p style={{ marginTop: '0.75rem', color: '#6b7280' }}>`,
    `              Export a default component to render it automatically.`,
    `            </p>`,
    `          </div>`,
    `        )}`,
    `      </div>`,
    `    </div>`,
    `  );`,
    `}`,
  ].join('\n');

const createIndexCode = (isTypeScript: boolean): string =>
  [
    `import React from "react";`,
    `import { createRoot } from "react-dom/client";`,
    `import App from "./App";`,
    ``,
    `const rootElement = document.getElementById("root");`,
    `if (!rootElement) {`,
    `  throw new Error("Root element not found");`,
    `}`,
    `const root = createRoot(rootElement${isTypeScript ? ' as HTMLElement' : ''});`,
    `root.render(`,
    `  <React.StrictMode>`,
    `    <App />`,
    `  </React.StrictMode>`,
    `);`,
  ].join('\n');

const createDefaultSandboxFiles = (
  mainFilePath: string,
  initialCode: string,
  isTypeScript: boolean,
): DefaultSandboxResult => {
  const appFile = isTypeScript ? '/App.tsx' : '/App.js';
  const indexFile = isTypeScript ? '/index.tsx' : '/index.js';
  const importPath = getImportPath(mainFilePath);
  const displayName = getFileDisplayName(mainFilePath);

  const appCode = isTypeScript
    ? createTypeScriptAppCode(importPath, displayName)
    : createJavaScriptAppCode(importPath, displayName);

  const indexCode = createIndexCode(isTypeScript);

  return {
    files: {
      [appFile]: { code: appCode },
      [indexFile]: { code: indexCode },
      '/public/index.html': { code: DEFAULT_HTML_TEMPLATE, hidden: true },
      [mainFilePath]: { code: initialCode },
    },
    appFile,
    indexFile,
  };
};

const mergeSandboxFiles = (
  defaults: SandpackFiles,
  overrides: SandpackFiles | undefined,
  mainFilePath: string,
  initialCode: string,
): SandpackFiles => {
  const merged: SandpackFiles = { ...defaults };

  if (overrides) {
    for (const [path, value] of Object.entries(overrides)) {
      merged[path] = value;
    }
  }

  merged[mainFilePath] = toSandpackFile(merged[mainFilePath], initialCode);

  return merged;
};

export interface CodeEditorPanelProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  fileName?: string;
  language?: SupportedLanguage;
  onRunTests?: (code: string) => Promise<TestResult[]>;
  onSubmit?: (code: string) => Promise<SubmitResult>;
  runLabel?: string;
  submitLabel?: string;
  results?: MaybeResults;
  onResultsChange?: (results: MaybeResults) => void;
  className?: string;
  actions?: ReactNode;
  toolbarStart?: ReactNode;
  readOnly?: boolean;
  sandpackTemplate?: SandpackPredefinedTemplate;
  sandpackFiles?: SandpackFiles;
  sandpackSetup?: SandpackSetup;
  sandpackOptions?: SandpackOptions;
  sandpackTheme?: SandpackThemeProp;
  showPreview?: boolean;
  showFileExplorer?: boolean;
  showSandpackConsole?: boolean;
  showReset?: boolean;
}

export const CodeEditorPanel = ({
  value,
  defaultValue,
  onChange,
  fileName = DEFAULT_FILE_NAME,
  language,
  onRunTests,
  onSubmit,
  runLabel = 'Run tests',
  submitLabel = 'Submit',
  results,
  onResultsChange,
  className,
  actions,
  toolbarStart,
  readOnly,
  sandpackTemplate,
  sandpackFiles: sandpackFilesProp,
  sandpackSetup,
  sandpackOptions,
  sandpackTheme,
  showPreview = true,
  showFileExplorer = true,
  showSandpackConsole = true,
  showReset = true,
}: CodeEditorPanelProps) => {
  const resolvedLanguage = resolveLanguage(language, fileName);
  const mainFilePath = ensureLeadingSlash(fileName);
  const isTypeScript = resolvedLanguage === 'typescript';

  const isControlled = typeof value === 'string';
  const providedMainFile = sandpackFilesProp?.[mainFilePath];

  const initialCodeRef = useRef<string>();
  if (initialCodeRef.current === undefined) {
    const providedCode = getCodeFromEntry(providedMainFile);
    const fallback =
      typeof value === 'string' ? value : defaultValue ?? providedCode ?? '';
    initialCodeRef.current = fallback;
  }

  const [internalCode, setInternalCode] = useState(initialCodeRef.current ?? '');
  const [internalResults, setInternalResults] = useState<MaybeResults>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const code = isControlled ? value ?? '' : internalCode;
  const effectiveResults = results ?? internalResults;

  const setResults = useCallback(
    (next: MaybeResults) => {
      setInternalResults(next);
      onResultsChange?.(next);
    },
    [onResultsChange],
  );

  const initialCode = initialCodeRef.current ?? '';

  const defaultSandbox = useMemo(
    () => createDefaultSandboxFiles(mainFilePath, initialCode, isTypeScript),
    [mainFilePath, initialCode, isTypeScript],
  );

  const sandpackFiles = useMemo(
    () =>
      mergeSandboxFiles(
        defaultSandbox.files,
        sandpackFilesProp,
        mainFilePath,
        initialCode,
      ),
    [defaultSandbox, sandpackFilesProp, mainFilePath, initialCode],
  );

  const themeContext = useThemeContext();
  const activeTokens = themeContext?.tokens ?? FALLBACK_TOKENS;
  const activeMode: ThemeMode = themeContext?.resolvedTheme ?? 'light';

  const template = sandpackTemplate ?? (isTypeScript ? 'react-ts' : 'react');

  const computedSandpackTheme = useMemo(
    () => createSandpackThemeFromTokens(activeTokens, activeMode),
    [activeTokens, activeMode],
  );

  const resolvedSandpackTheme = sandpackTheme ?? computedSandpackTheme ?? FALLBACK_SANDBOX_THEME;

  const providerOptions = useMemo(() => {
    const base: SandpackOptions = {
      showTabs: true,
      showLineNumbers: true,
      showInlineErrors: true,
      showConsoleButton: false,
      showConsole: false,
      wrapContent: true,
    };

    const merged: SandpackOptions = {
      ...base,
      ...(sandpackOptions ?? {}),
    };

    merged.activeFile = sandpackOptions?.activeFile ?? mainFilePath;
    merged.readOnly = sandpackOptions?.readOnly ?? !!readOnly;

    if (!sandpackOptions?.visibleFiles && !showFileExplorer) {
      merged.visibleFiles = [mainFilePath, defaultSandbox.appFile];
    }

    return merged;
  }, [
    sandpackOptions,
    mainFilePath,
    readOnly,
    showFileExplorer,
    defaultSandbox.appFile,
  ]);

  const providerKey = useMemo(
    () => `${template}-${mainFilePath}`,
    [template, mainFilePath],
  );

  const handleEditorCodeChange = useCallback(
    (next: string) => {
      if (!isControlled) {
        setInternalCode(next);
      }
      onChange?.(next);
      setErrorMessage(null);
    },
    [isControlled, onChange],
  );

  const handleRunTests = useCallback(async () => {
    if (!onRunTests) return;
    setIsRunning(true);
    setErrorMessage(null);
    try {
      const resultList = await onRunTests(code);
      setResults(resultList);
    } catch (error) {
      console.error('Run tests failed', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to run tests',
      );
    } finally {
      setIsRunning(false);
    }
  }, [code, onRunTests, setResults]);

  const handleSubmit = useCallback(async () => {
    if (!onSubmit) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await onSubmit(code);
      setResults(response.results);
    } catch (error) {
      console.error('Submit failed', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Submission failed',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [code, onSubmit, setResults]);

  const consoleOutput = useMemo(() => {
    if (!effectiveResults) return [];
    return effectiveResults.flatMap((result) => {
      const items: Array<{ type: 'stdout' | 'stderr'; text: string; id: string }> = [];
      if (result.stdout) {
        items.push({ type: 'stdout', text: result.stdout, id: `${result.id}-stdout` });
      }
      if (result.stderr) {
        items.push({ type: 'stderr', text: result.stderr, id: `${result.id}-stderr` });
      }
      return items;
    });
  }, [effectiveResults]);

  const isResetDisabled = readOnly || code === initialCode;

  const handleResetCode = useCallback(() => {
    if (readOnly) return;
    const startingCode = initialCodeRef.current ?? '';
    if (!isControlled) {
      setInternalCode(startingCode);
    }
    onChange?.(startingCode);
    setResults(null);
    setErrorMessage(null);
  }, [isControlled, onChange, readOnly, setResults, setInternalCode, setErrorMessage]);

  const renderResult = (result: TestResult, index: number) => {
    const isPass = result.status === 'pass';
    const showExpectation =
      result.status !== 'pass' &&
      (result.expected !== undefined || result.actual !== undefined);
    const statusLabel = result.label ?? `Test ${index + 1}`;
    return (
      <motion.div
        key={result.id ?? index}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className={cn(
          'rounded-lg border p-3 text-sm shadow-sm',
          isPass
            ? 'border-success-600/30 bg-success-soft/20 text-success-600'
            : 'border-danger-600/30 bg-danger-soft/20 text-danger-600',
        )}
      >
        <div className="flex items-start gap-2">
          {isPass ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm">{statusLabel}</span>
              {result.timeMs !== undefined ? (
                <span className="text-xs text-fg-muted">{result.timeMs} ms</span>
              ) : null}
              {result.message ? (
                <span className="text-xs text-fg-muted">{result.message}</span>
              ) : null}
            </div>
            {showExpectation ? (
              <div className="mt-2 space-y-1 font-mono text-xs text-fg-muted">
                {result.expected !== undefined ? (
                  <div>
                    <span className="text-fg-subtle">Expected:</span>{' '}
                    <span className="text-success-600">{JSON.stringify(result.expected)}</span>
                  </div>
                ) : null}
                {result.actual !== undefined ? (
                  <div>
                    <span className="text-fg-subtle">Received:</span>{' '}
                    <span className="text-danger-600">{JSON.stringify(result.actual)}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <SandpackProvider
      key={providerKey}
      template={template}
      files={sandpackFiles}
      customSetup={sandpackSetup}
      options={providerOptions}
      theme={resolvedSandpackTheme}
    >
      <SandpackCodeBridge
        filePath={mainFilePath}
        externalCode={code}
        isControlled={isControlled}
        onEditorCodeChange={handleEditorCodeChange}
      />
      <div
        className={cn(
          'flex h-full min-h-[420px] flex-col overflow-hidden rounded-lg border border-border-subtle bg-[var(--editor-background)]',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-border-subtle bg-bg-panel px-4 py-2">
          <div className="flex items-center gap-2">
            {toolbarStart}
            <span className="text-sm font-medium text-fg-muted">
              {getFileDisplayName(mainFilePath)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            {showReset ? (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={handleResetCode}
                disabled={isResetDisabled}
                className="h-8 w-8 p-0"
                title="Reset code"
                aria-label="Reset code to starting state"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunTests}
              disabled={!onRunTests || isRunning || isSubmitting || !!readOnly}
              className="gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{runLabel}</span>
              <span className="sr-only">({runLabel})</span>
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!onSubmit || isRunning || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{submitLabel}</span>
            </Button>
          </div>
        </div>

        <SandpackPanel
          showFileExplorer={showFileExplorer}
          showPreview={showPreview}
          showSandpackConsole={showSandpackConsole}
          readOnly={!!readOnly}
        />

        <AnimatePresence initial={false}>
          {(effectiveResults && effectiveResults.length > 0) || errorMessage ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="border-t border-border-subtle bg-bg-panel"
            >
              <Tabs defaultValue="results" className="w-full">
                <TabsList className="h-10 rounded-none border-b border-border-subtle bg-transparent px-4">
                  <TabsTrigger
                    value="results"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-border-focus data-[state=active]:bg-transparent data-[state=active]:text-fg-default"
                  >
                    Results
                  </TabsTrigger>
                  <TabsTrigger
                    value="console"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-border-focus data-[state=active]:bg-transparent data-[state=active]:text-fg-default"
                  >
                    Console
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="results" className="m-0 border-0 bg-transparent p-0">
                  <ScrollArea className="h-56">
                    <div className="space-y-3 p-4">
                      {errorMessage ? (
                        <div className="flex items-start gap-2 rounded-lg border border-danger-600/30 bg-danger-soft/20 p-3 text-danger-600">
                          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                          <p className="text-sm">{errorMessage}</p>
                        </div>
                      ) : (
                        effectiveResults?.map((result, index) => (
                          <Fragment key={result.id ?? index}>{renderResult(result, index)}</Fragment>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="console" className="m-0 border-0 bg-transparent p-0">
                  <ScrollArea className="h-56">
                    <div className="p-4">
                      {consoleOutput.length === 0 ? (
                        <p className="text-center text-sm text-fg-muted">No console output</p>
                      ) : (
                        <div className="space-y-2">
                          {consoleOutput.map((item) => (
                            <pre
                              key={item.id}
                              className={cn(
                                'whitespace-pre-wrap rounded bg-bg-sunken/50 p-2 text-xs',
                                item.type === 'stderr' ? 'text-danger-600' : 'text-fg-muted',
                              )}
                            >
                              {item.text}
                            </pre>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </SandpackProvider>
  );
};

interface SandpackPanelProps {
  showPreview: boolean;
  showFileExplorer: boolean;
  showSandpackConsole: boolean;
  readOnly: boolean;
}

const SandpackPanel = ({
  showPreview,
  showFileExplorer,
  showSandpackConsole,
  readOnly,
}: SandpackPanelProps) => {
  return (
    <div className="flex flex-1 flex-col overflow-hidden border-b border-border-subtle">
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {showFileExplorer ? (
          <div className="hidden w-60 flex-shrink-0 border-b border-border-subtle bg-[var(--editor-gutter)] lg:flex lg:flex-col lg:border-b-0 lg:border-r">
            <SandpackFileExplorer className="flex-1 overflow-auto text-xs text-[var(--editor-line-number)]" />
          </div>
        ) : null}
        <div className={cn('flex flex-1 flex-col overflow-hidden', showPreview ? 'lg:flex-row' : '')}>
          <div className={cn('flex flex-1 flex-col overflow-hidden', showPreview ? 'lg:w-[60%]' : 'lg:w-full')}>
            <SandpackCodeEditor
              className="flex-1 min-h-[260px] bg-[var(--editor-background)] text-sm"
              showTabs
              showLineNumbers
              showInlineErrors
              wrapContent
              readOnly={readOnly}
            />
          </div>
          {showPreview ? (
            <div className="flex flex-col border-t border-border-subtle bg-bg-panel lg:w-[40%] lg:border-t-0 lg:border-l">
              <SandpackPreview
                className="flex-1 min-h-[240px] bg-[var(--bg-elevated)] text-[var(--fg-default)]"
                showNavigator
              />
              {showSandpackConsole ? (
                <div className="border-t border-border-subtle bg-bg-panel">
                  <SandpackConsole
                    className="max-h-48 overflow-auto bg-bg-sunken p-3 text-xs"
                    showHeader
                    showSyntaxError
                    standalone
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

interface SandpackCodeBridgeProps {
  filePath: string;
  externalCode: string;
  isControlled: boolean;
  onEditorCodeChange: (value: string) => void;
}

const SandpackCodeBridge = ({
  filePath,
  externalCode,
  isControlled,
  onEditorCodeChange,
}: SandpackCodeBridgeProps) => {
  const { sandpack } = useSandpack();
  const skipNextNotificationRef = useRef(false);
  const lastCodeRef = useRef<string>(getCodeFromBundlerFile(sandpack.files[filePath]));
  const currentCode = useMemo(
    () => getCodeFromBundlerFile(sandpack.files[filePath]),
    [sandpack.files, filePath],
  );

  const previousFilePathRef = useRef(filePath);
  const lastAppliedExternalRef = useRef(externalCode);

  useEffect(() => {
    if (previousFilePathRef.current !== filePath) {
      previousFilePathRef.current = filePath;
      lastCodeRef.current = getCodeFromBundlerFile(sandpack.files[filePath]);
      lastAppliedExternalRef.current = externalCode;
    }
  }, [externalCode, filePath, sandpack.files]);

  useEffect(() => {
    if (!isControlled) {
      return;
    }
    if (lastAppliedExternalRef.current === externalCode) {
      return;
    }
    lastAppliedExternalRef.current = externalCode;
    skipNextNotificationRef.current = true;
    sandpack.updateFile(filePath, externalCode, true);
    lastCodeRef.current = externalCode;
  }, [externalCode, filePath, isControlled, sandpack]);

  useEffect(() => {
    if (sandpack.activeFile !== filePath) {
      return;
    }

    if (skipNextNotificationRef.current) {
      skipNextNotificationRef.current = false;
      lastCodeRef.current = currentCode;
      return;
    }

    if (currentCode !== lastCodeRef.current) {
      lastCodeRef.current = currentCode;
      lastAppliedExternalRef.current = currentCode;
      onEditorCodeChange(currentCode);
    }
  }, [currentCode, filePath, onEditorCodeChange, sandpack.activeFile]);

  useEffect(() => {
    if (sandpack.activeFile !== filePath) {
      sandpack.setActiveFile(filePath);
    }
  }, [sandpack, filePath]);

  return null;
};
