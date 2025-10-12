import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Card, Tag } from '@improview/ui';
import { Attempt, ProblemPack, RunResult, SubmitResponse } from '../../api/types';

interface ResultsPageProps {
  attempt: Attempt;
  problem: ProblemPack;
  summary: SubmitResponse['summary'];
  runs: RunResult[];
}

export const ResultsPage = ({ attempt, problem, summary, runs }: ResultsPageProps) => {
  const navigate = useNavigate();
  const hiddenResults = summary.hidden_results;
  const publicResults = runs.filter((run) => run.test_id.startsWith('public'));
  const passedHidden = hiddenResults.every((result) => result.status === 'passed');

  const totalRuntime = useMemo(() => {
    if (summary.runtime_ms) {
      return summary.runtime_ms;
    }
    return hiddenResults.reduce((acc, result) => acc + (result.time_ms ?? 0), 0);
  }, [hiddenResults, summary.runtime_ms]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Tag tone={passedHidden ? 'success' : 'danger'}>
            {passedHidden ? 'All tests passed' : 'Hidden tests failed'}
          </Tag>
          <Tag tone="accent">{problem.problem.title}</Tag>
          <Tag tone="default">{attempt.lang.toUpperCase()}</Tag>
        </div>
        <h1 className="text-3xl font-semibold text-fg">Results summary</h1>
        <p className="text-lg text-fg-muted">
          Hidden tests {passedHidden ? 'confirmed your solution.' : 'found regressions. Review the details below to iterate.'}
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card heading="Runtime" padding="lg">
          <p className="text-2xl font-semibold text-fg">{totalRuntime} ms</p>
          <p className="text-sm text-fg-muted">Aggregate hidden test runtime</p>
        </Card>
        <Card heading="Operations" padding="lg">
          <p className="text-2xl font-semibold text-fg">{summary.operations ?? '—'}</p>
          <p className="text-sm text-fg-muted">Estimated operations performed</p>
        </Card>
      </div>

      <Card heading="Hidden test results" padding="lg">
        <TestResultsTable results={hiddenResults} />
      </Card>

      <Card heading="Public test runs" padding="lg">
        {publicResults.length === 0 ? (
          <p className="text-sm text-fg-muted">No public test runs recorded for this attempt.</p>
        ) : (
          <TestResultsTable results={publicResults} />
        )}
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => navigate({ to: '/' })}>
          Generate another problem
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate({ to: '/workspace/$attemptId', params: { attemptId: attempt.id } })}
        >
          Re-open workspace
        </Button>
      </div>
    </div>
  );
};

const TestResultsTable = ({ results }: { results: RunResult[] }) => (
  <div className="overflow-hidden rounded-md border border-border-subtle">
    <table className="min-w-full divide-y divide-border-subtle text-sm text-fg">
      <thead className="bg-bg-sunken text-left text-xs uppercase tracking-wide text-fg-muted">
        <tr>
          <th className="px-4 py-3">Test</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Runtime</th>
          <th className="px-4 py-3">Stdout</th>
          <th className="px-4 py-3">Stderr</th>
        </tr>
      </thead>
      <tbody>
        {results.map((result) => (
          <tr key={result.test_id} className="divide-x divide-border-subtle">
            <td className="px-4 py-3 font-medium">{result.test_id}</td>
            <td
              className={`px-4 py-3 font-semibold ${
                result.status === 'passed' ? 'text-success-600' : 'text-danger-600'
              }`}
            >
              {result.status.toUpperCase()}
            </td>
            <td className="px-4 py-3 text-fg-muted">{result.time_ms ?? '—'} ms</td>
            <td className="px-4 py-3 text-xs text-fg-muted">
              <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all">
                {result.stdout ?? ''}
              </pre>
            </td>
            <td className="px-4 py-3 text-xs text-danger-600">
              <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all">
                {result.stderr ?? ''}
              </pre>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
