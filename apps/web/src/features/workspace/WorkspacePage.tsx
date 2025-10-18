import { useState, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  CodeEditorPanel,
  ScrollArea,
  ThemeToggle,
  useToast,
  type SubmitResult,
  type TestResult as EditorTestResult,
} from '@improview/ui';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiClient } from '../../lib/apiClient';
import { queryKeys } from '../../lib/queryClient';
import { RunResult, MacroCategory } from '../../types/problem';
import { useTestExecution, usePersistedState } from '../../lib/hooks';
import { getSandboxConfigForCategory, inferMacroCategoryFromProblem } from '../../utils/sandboxConfig';

export function WorkspacePage() {
  const { attemptId } = useParams({ from: '/workspace/$attemptId' });
  const navigate = useNavigate();
  const { publish } = useToast();
  const apiClient = getApiClient();

  // Fetch attempt and problem data
  const { data: attemptData, isLoading } = useQuery({
    queryKey: queryKeys.attempt(attemptId),
    queryFn: async () => {
      const attempt = await apiClient.getAttempt(attemptId);
      const problem = await apiClient.getProblem(attempt.attempt.problem_id);
      return { attempt: attempt.attempt, problem };
    },
  });

  const problem = attemptData?.problem;

  const inferredMacroCategory = useMemo<MacroCategory>(
    () => (problem ? inferMacroCategoryFromProblem(problem) : 'dsa'),
    [problem],
  );

  const sandboxConfig = useMemo(
    () => getSandboxConfigForCategory(inferredMacroCategory),
    [inferredMacroCategory],
  );

  // Test execution (no persistence - just runs tests)
  const { runTestsAsync } = useTestExecution();

  // Editor state
  const initialCode = problem
    ? `function ${problem.api.function_name}(${problem.api.params.map((p) => p.name).join(', ')}) {
  // Your implementation here
  
}`
    : '';

  const [code, setCode] = usePersistedState(`attempt:${attemptId}:code`, initialCode);
  const [hintVisible, setHintVisible] = useState(false);

  const mapStatusToEditor = (status: string): EditorTestResult['status'] => {
    if (status === 'pass' || status === 'fail') {
      return status;
    }
    return 'error';
  };

  const mapRunResultToEditor = (result: RunResult): EditorTestResult => ({
    id: result.test_id,
    status: mapStatusToEditor(result.status),
    timeMs: Number(result.time_ms),
    stdout: result.stdout,
    stderr: result.stderr,
    message: result.status === 'timeout' || result.status === 'error' ? result.status : undefined,
  });

  const handleRunTests = async (source: string): Promise<EditorTestResult[]> => {
    try {
      const response = await runTestsAsync({
        attempt_id: attemptId,
        code: source,
        which: 'public',
      });

      return response.summary.results.map(mapRunResultToEditor);
    } catch (error) {
      console.error('Test execution failed:', error);
      publish({
        title: 'Test execution failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error',
      });
      throw error instanceof Error ? error : new Error('Test execution failed');
    }
  };

  const handleSubmit = async (source: string): Promise<SubmitResult> => {
    try {
      const response = await apiClient.submit({
        attempt_id: attemptId,
        code: source,
      });

      const results = response.summary.hidden_results.map(mapRunResultToEditor);

      publish({
        title: response.summary.passed ? 'Submission passed!' : 'Submission failed',
        description: response.summary.passed
          ? 'All tests passed! View your results.'
          : 'Some tests failed. Review your solution.',
        variant: response.summary.passed ? 'success' : 'error',
      });

      navigate({
        to: '/results/$attemptId',
        params: { attemptId },
      });

      return {
        passed: response.summary.passed,
        results,
      };
    } catch (error) {
      console.error('Submission failed:', error);
      publish({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error',
      });
      throw error instanceof Error ? error : new Error('Submission failed');
    }
  };

  if (isLoading || !problem) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-default)' }}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  const shouldReduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-default)' }}>
      {/* Header */}
      <motion.header
        initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-default)',
        }}
        role="banner"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/' })}
            className="gap-2"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Button>
          <div className="h-4 w-px" style={{ backgroundColor: 'var(--border-default)' }} />
          <div style={{ color: 'var(--fg-muted)' }}>{problem.problem.title}</div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex" role="main">
        {/* Problem Panel */}
        <div className="w-1/2 border-r" style={{ borderColor: 'var(--border-default)' }}>
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <h1 className="mb-2">{problem.problem.title}</h1>
              </div>

              {/* Statement */}
              <div>
                <p style={{ color: 'var(--fg-default)' }}>{problem.problem.statement}</p>
              </div>

              {/* Examples */}
              <div className="space-y-3">
                <h3>Examples</h3>
                {problem.problem.examples.map((example, idx) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-4 space-y-2"
                    style={{
                      backgroundColor: 'var(--bg-panel)',
                      borderColor: 'var(--border-default)',
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--fg-muted)' }} className="mb-1">
                        Input:
                      </div>
                      <code
                        className="block px-3 py-2 rounded font-mono"
                        style={{ backgroundColor: 'var(--bg-sunken)' }}
                      >
                        {JSON.stringify(example.input, null, 2)}
                      </code>
                    </div>
                    <div>
                      <div style={{ color: 'var(--fg-muted)' }} className="mb-1">
                        Output:
                      </div>
                      <code
                        className="block px-3 py-2 rounded font-mono"
                        style={{ backgroundColor: 'var(--bg-sunken)' }}
                      >
                        {JSON.stringify(example.output)}
                      </code>
                    </div>
                    {example.explanation && (
                      <div style={{ color: 'var(--fg-muted)' }} className="italic">
                        {example.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Constraints */}
              <div className="space-y-2">
                <h3>Constraints</h3>
                <ul className="space-y-1" style={{ color: 'var(--fg-muted)' }}>
                  {problem.problem.constraints.map((constraint, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span style={{ color: 'var(--accent-primary)' }} className="mt-1">
                        •
                      </span>
                      <code className="font-mono">{constraint}</code>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Hint */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => setHintVisible(!hintVisible)}
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    {hintVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {hintVisible ? 'Hide Hint' : 'Show Hint'}
                  </span>
                </Button>
                <AnimatePresence initial={false}>
                  {hintVisible ? (
                    <motion.div
                      key="hint"
                      layout
                      initial={{ opacity: 0, scaleY: 0.9 }}
                      animate={{ opacity: 1, scaleY: 1 }}
                      exit={{ opacity: 0, scaleY: 0.9 }}
                      transition={{
                        opacity: { duration: 0.16, ease: 'easeOut' },
                        scaleY: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
                        layout: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
                      }}
                      style={{
                        originY: 0,
                        backgroundColor: 'var(--accent-soft)',
                        borderColor: 'var(--accent-primary)',
                        borderWidth: '1px',
                      }}
                      className="mt-2 rounded-lg border p-4"
                    >
                      <motion.span
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="block"
                      >
                        💡 {problem.hint}
                      </motion.span>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Editor Panel */}
        <div
          className="flex min-h-0 w-1/2 flex-1 flex-col"
          style={{ backgroundColor: 'var(--bg-sunken)' }}
        >
          <CodeEditorPanel
            key={problem.problem.title}
            value={code}
            onChange={setCode}
            fileName="solution.js"
            language="javascript"
            onRunTests={handleRunTests}
            onSubmit={handleSubmit}
            runLabel="Run public tests"
            submitLabel="Submit"
            className="flex-1 rounded-none border-0 shadow-none"
            showPreview={sandboxConfig.showPreview}
            showFileExplorer={sandboxConfig.showFileExplorer}
            showSandpackConsole={sandboxConfig.showSandpackConsole}
            sandpackOptions={sandboxConfig.sandpackOptions}
          />
        </div>
      </main>
    </div>
  );
}
