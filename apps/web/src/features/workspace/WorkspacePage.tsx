import { useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Accordion, Button, Card, Chip, Disclosure, Tabs, Tag, Timer, TimerHandle, useToast } from '@improview/ui';
import { Play, Pause, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../api/client';
import { ApiError } from '../../api/errors';
import { Attempt, ProblemPack, RunResult } from '../../api/types';
import { recordRunUpdate, recordSubmission } from '../../storage/history';
import { usePersistedState } from '../../hooks/usePersistedState';

interface WorkspacePageProps {
  attempt: Attempt;
  runs: RunResult[];
  problem: ProblemPack;
}

type TestResultsState = {
  public: RunResult[];
  hidden: RunResult[];
};

const splitRuns = (runs: RunResult[]): TestResultsState => {
  const publicRuns = runs.filter((run) => run.test_id.startsWith('public'));
  const hiddenRuns = runs.filter((run) => run.test_id.startsWith('hidden'));
  return {
    public: publicRuns,
    hidden: hiddenRuns,
  };
};

const buildDefaultSource = (pack: ProblemPack) => {
  const params = pack.api.params.map((param) => param.name).join(', ');
  const signature = `export function ${pack.api.function_name}(${params}) {`;
  const closing = '}';
  return `${signature}\n  // TODO: implement\n  return null;\n${closing}\n`;
};

export const WorkspacePage = ({ attempt, runs, problem }: WorkspacePageProps) => {
  const defaultSource = useMemo(() => buildDefaultSource(problem), [problem]);
  const [code, setCode] = usePersistedState<string>(
    `attempt:${attempt.id}:code`,
    defaultSource,
    {
      serialize: (value) => value,
      deserialize: (value) => value,
    },
  );
  const [testResults, setTestResults] = useState<TestResultsState>(() => splitRuns(runs));
  const [activeTestsTab, setActiveTestsTab] = useState<'public' | 'hidden'>('public');
  const [hintRevealed, setHintRevealed] = useState(false);
  const timerRef = useRef<TimerHandle>(null);
  const startedAtRef = useRef(Date.now());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { publish } = useToast();

  const runTestsMutation = useMutation({
    mutationFn: (which: 'public' | 'hidden') =>
      apiClient.runTests({ attempt_id: attempt.id, code, which }),
    onSuccess: (response, which) => {
      setTestResults((prev) => ({
        ...prev,
        [which]: response.summary.results,
      }));
      queryClient.setQueryData<RunResult[]>(['runs', attempt.id], (prev) => [
        ...(prev ?? []),
        ...response.summary.results,
      ]);
      const passCount = response.summary.results.filter((result) => result.status === 'passed').length;
      const failCount = response.summary.results.length - passCount;
      recordRunUpdate(attempt.id, passCount, failCount);
      publish({
        title: which === 'public' ? 'Public tests ran' : 'Hidden tests ran',
        description: passCount === response.summary.results.length ? 'All tests passed.' : 'Some tests failed. Review output to debug.',
        variant: passCount === response.summary.results.length ? 'success' : 'warning',
      });
      if (which === 'hidden') {
        setActiveTestsTab('hidden');
      }
    },
    onError: (error) => {
      console.error(error);
      if (error instanceof ApiError && error.status === 401) {
        publish({
          title: 'Session expired',
          description: 'Please sign in again to continue running tests.',
          variant: 'error',
        });
        return;
      }
      publish({
        title: 'Test run failed',
        description: 'Unable to execute tests. Please retry.',
        variant: 'error',
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => apiClient.submit({ attempt_id: attempt.id, code }),
    onSuccess: async (response) => {
      const { summary } = response;
      setTestResults((prev) => ({
        ...prev,
        hidden: summary.hidden_results,
      }));
      queryClient.setQueryData(['submission', attempt.id], summary);
      queryClient.setQueryData<RunResult[]>(['runs', attempt.id], (prev) => [
        ...(prev ?? []),
        ...summary.hidden_results,
      ]);
      recordSubmission(
        attempt.id,
        summary.passed,
        Date.now() - startedAtRef.current,
      );
      publish({
        title: summary.passed ? 'All tests passed!' : 'Submission failed',
        description: summary.passed
          ? 'Great work — review the summary for details.'
          : 'Hidden tests revealed issues. Inspect results.',
        variant: summary.passed ? 'success' : 'warning',
      });
      await navigate({ to: '/results/$attemptId', params: { attemptId: attempt.id } });
    },
    onError: (error) => {
      console.error(error);
      if (error instanceof ApiError && error.status === 401) {
        publish({
          title: 'Session expired',
          description: 'Please sign in again to submit your solution.',
          variant: 'error',
        });
        return;
      }
      publish({
        title: 'Submission failed',
        description: 'We could not process your solution. Try again shortly.',
        variant: 'error',
      });
    },
  });

  const handleRunPublic = () => {
    runTestsMutation.mutate('public');
  };

  const handleSubmit = () => {
    submitMutation.mutate();
  };

  const handleRevealHint = (open: boolean) => {
    setHintRevealed(open);
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
  };

  const handleTabChange = (value: string) => {
    setActiveTestsTab(value as 'public' | 'hidden');
  };

  const testsForTab = testResults[activeTestsTab];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-bg-panel p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Tag tone="accent">{problem.problem.title}</Tag>
            <Tag tone="default">{attempt.lang.toUpperCase()}</Tag>
            <Tag tone="info">{problem.time_estimate_minutes} min estimate</Tag>
          </div>
          <h1 className="text-2xl font-semibold text-fg">{problem.problem.title}</h1>
          <p className="text-sm text-fg-muted">
            Solve the challenge in the editor. Run public tests as often as you like — submitting runs hidden tests for the final verdict.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Timer
            ref={timerRef}
            durationMs={problem.time_estimate_minutes * 60 * 1000}
            className="min-w-[120px]"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              timerRef.current?.pause();
            }}
            startIcon={<Pause size={16} />}
          >
            Pause
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              timerRef.current?.start();
            }}
            startIcon={<Play size={16} />}
          >
            Resume
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="flex flex-col gap-4">
          <Card padding="lg">
            <article className="space-y-4 text-sm leading-relaxed text-fg">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="text-sm leading-relaxed text-fg">{children}</p>,
                  ul: ({ children }) => (
                    <ul className="list-disc space-y-2 pl-5 text-sm text-fg-muted">{children}</ul>
                  ),
                  li: ({ children }) => <li>{children}</li>,
                  code: ({ children }) => (
                    <code className="rounded bg-bg-sunken px-1.5 py-0.5 text-xs text-fg-muted">
                      {children}
                    </code>
                  ),
                }}
              >
                {problem.problem.statement}
              </ReactMarkdown>
            </article>
            <div className="mt-6 flex flex-col gap-3">
              <h3 className="text-md font-semibold text-fg">Constraints</h3>
              <ul className="list-disc space-y-2 pl-5 text-sm text-fg-muted">
                {problem.problem.constraints.map((constraint) => (
                  <li key={constraint}>{constraint}</li>
                ))}
              </ul>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <h3 className="text-md font-semibold text-fg">Examples</h3>
              <div className="flex flex-col gap-4">
                {problem.problem.examples.map((example, index) => (
                  <div key={index} className="rounded-md border border-border-subtle bg-bg-sunken p-4">
                    <p className="text-sm font-medium text-fg">Input</p>
                    <pre className="mt-1 overflow-auto rounded bg-bg-panel p-3 text-sm text-fg-muted">
                      {JSON.stringify(example.input)}
                    </pre>
                    <p className="mt-3 text-sm font-medium text-fg">Output</p>
                    <pre className="mt-1 overflow-auto rounded bg-bg-panel p-3 text-sm text-fg-muted">
                      {JSON.stringify(example.output)}
                    </pre>
                    {example.explanation ? (
                      <p className="mt-3 text-sm text-fg-muted">{example.explanation}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Disclosure
            title={hintRevealed ? 'Hide hint' : 'Show hint'}
            defaultOpen={false}
            onToggle={handleRevealHint}
          >
            <p className="text-sm text-fg-muted">{problem.hint}</p>
          </Disclosure>

          <Accordion
            items={problem.solutions.map((solution, index) => ({
              id: `solution-${index}`,
              title: solution.approach,
              content: (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-3 text-sm text-fg-muted">
                    <span>Time: {solution.complexity.time}</span>
                    <span>Space: {solution.complexity.space}</span>
                  </div>
                  <pre className="overflow-auto rounded-md border border-border-subtle bg-bg-sunken p-4 text-sm text-fg-muted">
                    {solution.code}
                  </pre>
                </div>
              ),
            }))}
            allowMultiple
          />
        </section>

        <section className="flex flex-col gap-4">
          <Card
            heading="Editor"
            description="Implement the exported function and run tests to get immediate feedback."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  startIcon={<Play size={16} />}
                  onClick={handleRunPublic}
                  disabled={runTestsMutation.isPending || submitMutation.isPending}
                  loading={runTestsMutation.isPending}
                >
                  Run public tests
                </Button>
                <Button
                  variant="primary"
                  startIcon={<CheckCircle2 size={16} />}
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  loading={submitMutation.isPending}
                >
                  Submit
                </Button>
              </div>
            }
          >
            <div className="overflow-hidden rounded-md border border-border-subtle">
              <CodeMirror
                value={code}
                extensions={[javascript({ jsx: true, typescript: true })]}
                height="420px"
                theme="dark"
                onChange={handleCodeChange}
              />
            </div>
          </Card>

          <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-panel p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-semibold text-fg">Test results</h2>
              <Chip size="sm" variant="ghost">
                {testsForTab.length} cases
              </Chip>
            </div>
            <Tabs
              defaultValue={activeTestsTab}
              value={activeTestsTab}
              onValueChange={handleTabChange}
            >
              <Tabs.List>
                <Tabs.Trigger value="public">Public</Tabs.Trigger>
                <Tabs.Trigger value="hidden">Hidden</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="public">
                <TestResultList results={testResults.public} />
              </Tabs.Content>
              <Tabs.Content value="hidden">
                {testResults.hidden.length === 0 ? (
                  <EmptyState
                    icon={<AlertTriangle size={20} />}
                    title="Hidden tests not run yet"
                    description="Submit your solution to run the hidden suite."
                  />
                ) : (
                  <TestResultList results={testResults.hidden} />
                )}
              </Tabs.Content>
            </Tabs>
          </div>
        </section>
      </div>
    </div>
  );
};

const EmptyState = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border-subtle bg-bg-sunken p-6 text-center text-sm text-fg-muted">
    <div className="rounded-full bg-bg-panel p-3 text-fg">{icon}</div>
    <span className="text-md font-medium text-fg">{title}</span>
    <p>{description}</p>
  </div>
);

const TestResultList = ({ results }: { results: RunResult[] }) => {
  if (results.length === 0) {
    return <p className="text-sm text-fg-muted">No runs yet. Execute tests to populate results.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {results.map((result) => (
        <div
          key={result.test_id}
          className="flex flex-col gap-2 rounded-md border border-border-subtle bg-bg-sunken p-4 text-sm text-fg"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">{result.test_id}</span>
            <span
              className={
                result.status === 'passed'
                  ? 'text-success-600'
                  : 'text-danger-600'
              }
            >
              {result.status.toUpperCase()}
            </span>
          </div>
          {result.stderr ? (
            <p className="text-sm text-danger-600">{result.stderr}</p>
          ) : null}
          {result.stdout ? (
            <pre className="overflow-auto rounded bg-bg-panel p-3 text-xs text-fg-muted">
              {result.stdout}
            </pre>
          ) : null}
          {result.time_ms ? (
            <span className="text-xs text-fg-muted">{result.time_ms} ms</span>
          ) : null}
        </div>
      ))}
    </div>
  );
};
