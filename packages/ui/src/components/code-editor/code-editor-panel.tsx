import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Play, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Fragment,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type TextareaHTMLAttributes,
  useEffect,
} from 'react';
import { Button } from '../button';
import { ScrollArea } from '../scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';
import { cn } from '../../utils/cn';
import { highlightCode, type SupportedLanguage } from './syntax-highlighter';
import type { SubmitResult, TestResult } from './types';

const DEFAULT_FILE_NAME = 'solution.ts';

type MaybeResults = TestResult[] | null;

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
  actions?: React.ReactNode;
  toolbarStart?: React.ReactNode;
  readOnly?: boolean;
  textareaProps?: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>;
}

export const CodeEditorPanel = ({
  value,
  defaultValue,
  onChange,
  fileName = DEFAULT_FILE_NAME,
  language = 'javascript',
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
  textareaProps,
}: CodeEditorPanelProps) => {
  const isControlled = typeof value === 'string';
  const [internalCode, setInternalCode] = useState(defaultValue ?? '');
  const code = isControlled ? value! : internalCode;
  const [internalResults, setInternalResults] = useState<MaybeResults>(null);
  const effectiveResults = results ?? internalResults;

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [minLines, setMinLines] = useState(20);

  const editorRef = useRef<HTMLDivElement>(null);

  const setResults = useCallback(
    (next: MaybeResults) => {
      setInternalResults(next);
      onResultsChange?.(next);
    },
    [onResultsChange],
  );

  const handleCodeChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value;

      if (!isControlled) {
        setInternalCode(newValue);
      }
      onChange?.(newValue);
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
      setErrorMessage(error instanceof Error ? error.message : 'Failed to run tests');
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
      setErrorMessage(error instanceof Error ? error.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [code, onSubmit, setResults]);

  // Calculate minimum lines to fill the viewport
  useEffect(() => {
    const calculateMinLines = () => {
      if (editorRef.current) {
        const editorHeight = editorRef.current.clientHeight;
        // Line height is 24px (leading-6 in Tailwind = 1.5 * 16px)
        const lineHeight = 24;
        const minVisibleLines = Math.floor(editorHeight / lineHeight);
        setMinLines(Math.max(minVisibleLines, 20));
      }
    };

    calculateMinLines();

    const resizeObserver = new ResizeObserver(calculateMinLines);
    if (editorRef.current) {
      resizeObserver.observe(editorRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const codeLines = useMemo(() => code.split('\n'), [code]);
  const lineNumbers = useMemo(
    () => Math.max(codeLines.length, minLines),
    [codeLines.length, minLines],
  );

  const highlightedCode = useMemo(() => {
    if (language === 'plaintext') return null;
    return highlightCode(code, language);
  }, [code, language]);

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

  const renderResult = (result: TestResult, index: number) => {
    const isPass = result.status === 'pass';
    const showExpectation =
      result.status !== 'pass' && (result.expected !== undefined || result.actual !== undefined);
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
    <div
      className={cn(
        'flex h-full min-h-[420px] flex-col overflow-hidden rounded-lg border border-border-subtle bg-[var(--editor-background)]',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border-subtle bg-bg-panel px-4 py-2">
        <div className="flex items-center gap-2">
          {toolbarStart}
          <span className="text-sm font-medium text-fg-muted">{fileName}</span>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunTests}
            disabled={!onRunTests || isRunning || isSubmitting || readOnly}
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

      <div className="flex flex-1 overflow-hidden" ref={editorRef}>
        <div className="flex w-full">
          <div className="flex select-none border-r border-border-subtle bg-[var(--editor-gutter)] px-3 py-3 font-mono text-xs text-[var(--editor-line-number)]">
            <div className="space-y-0.5">
              {Array.from({ length: lineNumbers }, (_, index) => (
                <div key={index} className="leading-6 text-right tabular-nums">
                  {index + 1}
                </div>
              ))}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div
              className="relative min-h-full bg-[var(--editor-background)]"
              style={{ minHeight: `${lineNumbers * 24}px` }}
            >
              <textarea
                value={code}
                readOnly={readOnly}
                spellCheck={false}
                className={cn(
                  'relative z-10 min-h-full w-full resize-none whitespace-pre font-mono text-sm leading-6',
                  'bg-transparent p-4 outline-none',
                  readOnly ? 'cursor-not-allowed opacity-80' : 'cursor-text',
                  highlightedCode
                    ? 'text-transparent caret-[var(--editor-cursor)]'
                    : 'text-[var(--editor-text)]',
                )}
                style={{
                  caretColor: 'var(--editor-cursor)',
                  minHeight: `${lineNumbers * 24}px`,
                }}
                onChange={handleCodeChange}
                {...textareaProps}
              />
              {highlightedCode ? (
                <div
                  className="pointer-events-none absolute inset-0 z-0 whitespace-pre font-mono text-sm leading-6 p-4"
                  style={{ minHeight: `${lineNumbers * 24}px` }}
                  dangerouslySetInnerHTML={{ __html: highlightedCode }}
                  aria-hidden="true"
                />
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </div>

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
  );
};
