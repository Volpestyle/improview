import { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ThemeToggle,
  useToast,
} from '@improview/ui';
import { ArrowLeft, Play, Send, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiClient } from '../../lib/apiClient';
import { queryKeys } from '../../lib/queryClient';
import { TestResult } from '../../types/problem';
import { usePersistedState } from '../../lib/hooks';

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

  // Editor state
  const initialCode = problem
    ? `function ${problem.api.function_name}(${problem.api.params.map((p) => p.name).join(', ')}) {
  // Your implementation here
  
}`
    : '';

  const [code, setCode] = usePersistedState(`attempt:${attemptId}:code`, initialCode);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const response = await apiClient.runTests({
        attempt_id: attemptId,
        code,
        which: 'public',
      });
      setTestResults(
        response.summary.results.map((r) => ({
          test_id: r.test_id,
          status: r.status as TestResult['status'],
          time_ms: Number(r.time_ms),
          stdout: r.stdout,
          stderr: r.stderr,
        })),
      );
    } catch (error) {
      console.error('Test execution failed:', error);
      publish({
        title: 'Test execution failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await apiClient.submit({
        attempt_id: attemptId,
        code,
      });

      // Navigate to results page
      navigate({
        to: '/results/$attemptId',
        params: { attemptId },
      });

      publish({
        title: response.summary.passed ? 'Submission passed!' : 'Submission failed',
        description: response.summary.passed
          ? 'All tests passed! View your results.'
          : 'Some tests failed. Review your solution.',
        variant: response.summary.passed ? 'success' : 'error',
      });
    } catch (error) {
      console.error('Submission failed:', error);
      publish({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
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

  const lineNumbers = code.split('\n').length;
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
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleRunTests}
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            Run public tests
          </Button>
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
                <AnimatePresence>
                  {hintVisible && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-lg p-4"
                      style={{
                        backgroundColor: 'var(--accent-soft)',
                        borderColor: 'var(--accent-primary)',
                        borderWidth: '1px',
                      }}
                    >
                      💡 {problem.hint}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Editor Panel */}
        <div className="w-1/2 flex flex-col" style={{ backgroundColor: 'var(--bg-sunken)' }}>
          {/* Editor Header */}
          <div
            className="flex items-center justify-between px-4 py-2 border-b"
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border-default)',
            }}
          >
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--fg-muted)' }}>solution.js</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRunTests}
                disabled={isRunning || isSubmitting}
                className="gap-2"
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Run Tests
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isRunning || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit
              </Button>
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 flex overflow-hidden">
            <div className="flex flex-1">
              {/* Line Numbers */}
              <div
                className="px-3 py-4 font-mono select-none border-r"
                style={{
                  backgroundColor: 'var(--bg-sunken)',
                  color: 'var(--fg-subtle)',
                  borderColor: 'var(--border-default)',
                }}
              >
                {Array.from({ length: lineNumbers }, (_, i) => (
                  <div key={i} className="leading-6">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Code Area */}
              <ScrollArea className="flex-1">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full min-h-full px-4 py-4 leading-6 resize-none focus:outline-none font-mono"
                  style={{
                    backgroundColor: 'var(--bg-sunken)',
                    color: 'var(--fg-default)',
                    tabSize: 2,
                  }}
                  spellCheck={false}
                />
              </ScrollArea>
            </div>
          </div>

          {/* Test Results */}
          <AnimatePresence>
            {testResults && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t overflow-hidden"
                style={{
                  borderColor: 'var(--border-default)',
                  backgroundColor: 'var(--bg-panel)',
                }}
              >
                <Tabs defaultValue="results" className="w-full">
                  <TabsList
                    className="w-full justify-start rounded-none border-b px-4"
                    style={{ borderColor: 'var(--border-default)' }}
                  >
                    <TabsTrigger value="results">Test Results</TabsTrigger>
                    <TabsTrigger value="console">Console</TabsTrigger>
                  </TabsList>
                  <TabsContent value="results" className="m-0">
                    <ScrollArea className="h-64">
                      <div className="p-4 space-y-2">
                        {testResults.map((result, idx) => (
                          <motion.div
                            key={result.test_id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="p-3 rounded-lg border"
                            style={{
                              backgroundColor:
                                result.status === 'pass'
                                  ? 'var(--success-soft)'
                                  : 'var(--danger-soft)',
                              borderColor:
                                result.status === 'pass'
                                  ? 'var(--success-600)'
                                  : 'var(--danger-600)',
                            }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-2 flex-1">
                                {result.status === 'pass' ? (
                                  <CheckCircle2
                                    className="h-4 w-4 mt-0.5 flex-shrink-0"
                                    style={{ color: 'var(--success-600)' }}
                                  />
                                ) : (
                                  <XCircle
                                    className="h-4 w-4 mt-0.5 flex-shrink-0"
                                    style={{ color: 'var(--danger-600)' }}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono">Test {idx + 1}</span>
                                    <span style={{ color: 'var(--fg-muted)' }}>•</span>
                                    <span
                                      style={{ color: 'var(--fg-muted)' }}
                                      className="font-mono"
                                    >
                                      {result.time_ms}ms
                                    </span>
                                  </div>
                                  {result.status === 'fail' && result.expected !== undefined && (
                                    <div className="space-y-1 mt-2">
                                      <div className="font-mono">
                                        <span style={{ color: 'var(--fg-muted)' }}>Expected: </span>
                                        <span style={{ color: 'var(--success-600)' }}>
                                          {JSON.stringify(result.expected)}
                                        </span>
                                      </div>
                                      <div className="font-mono">
                                        <span style={{ color: 'var(--fg-muted)' }}>Got: </span>
                                        <span style={{ color: 'var(--danger-600)' }}>
                                          {JSON.stringify(result.actual)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="console" className="m-0">
                    <ScrollArea className="h-64">
                      <div className="p-4 font-mono" style={{ color: 'var(--fg-muted)' }}>
                        {testResults.some((r) => r.stdout || r.stderr) ? (
                          <div className="space-y-2">
                            {testResults.map((result, idx) => (
                              <div key={idx}>
                                {result.stdout && <div>{result.stdout}</div>}
                                {result.stderr && (
                                  <div style={{ color: 'var(--danger-600)' }}>{result.stderr}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">No console output</div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
