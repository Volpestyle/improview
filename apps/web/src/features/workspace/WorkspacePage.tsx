import { useMemo, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  ThemeToggle,
  useToast,
  type SubmitResult,
  type TestResult as EditorTestResult,
} from '@improview/ui';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getApiClient } from '../../lib/apiClient';
import { queryKeys } from '../../lib/queryClient';
import { RunResult, MacroCategory } from '../../types/problem';
import { useTestExecution, usePersistedState } from '../../lib/hooks';
import { getSandboxConfigForCategory } from '../../utils/sandboxConfig';
import { deriveWorkspaceConfig } from '../../utils/workspaceTemplate';
import { WorkspaceSplitView } from '../../components/WorkspaceSplitView';

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
    () => (problem ? problem.macro_category : 'dsa'),
    [problem],
  );

  const sandboxConfig = useMemo(
    () => getSandboxConfigForCategory(inferredMacroCategory),
    [inferredMacroCategory],
  );

  // Test execution (no persistence - just runs tests)
  const { runTestsAsync } = useTestExecution();

  const workspaceConfig = useMemo(
    () => (problem ? deriveWorkspaceConfig(problem) : null),
    [problem],
  );

  // Editor state
  const initialCode = workspaceConfig?.initialCode ?? '';
  const editorFileName = workspaceConfig?.fileName ?? 'solution.js';
  const editorLanguage = workspaceConfig?.language ?? 'javascript';

  const [code, setCode] = usePersistedState(`attempt:${attemptId}:code`, initialCode);
  useEffect(() => {
    if (!problem || !workspaceConfig) {
      return;
    }
    if (!code) {
      setCode(workspaceConfig.initialCode);
    }
  }, [problem, workspaceConfig, code, setCode]);

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
      <main className="flex-1 min-h-0 overflow-hidden" role="main">
        <WorkspaceSplitView
          problem={problem}
          editorKey={problem.problem.title}
          editorProps={{
            value: code,
            defaultValue: initialCode,
            onChange: setCode,
            fileName: editorFileName,
            language: editorLanguage,
            onRunTests: handleRunTests,
            onSubmit: handleSubmit,
            runLabel: 'Run public tests',
            submitLabel: 'Submit',
            className: 'flex-1 rounded-none border-0 shadow-none',
            showPreview: sandboxConfig.showPreview,
            showFileExplorer: sandboxConfig.showFileExplorer,
            showSandpackConsole: sandboxConfig.showSandpackConsole,
            sandpackOptions: sandboxConfig.sandpackOptions,
            sandpackTemplate: workspaceConfig?.sandpackTemplate,
            sandpackFiles: workspaceConfig?.sandpackFiles,
            sandpackSetup: workspaceConfig?.sandpackSetup,
          }}
        />
      </main>
    </div>
  );
}
