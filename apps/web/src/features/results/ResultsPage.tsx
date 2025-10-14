import { useMemo } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScrollArea,
} from '@improview/ui';
import { BreadcrumbsNav } from '../../components/BreadcrumbsNav';
import { mockAttempts } from '../../data/mockUser';
import { CheckCircle2, Clock, Code, Flame, RefreshCcw, XCircle } from 'lucide-react';

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

export function ResultsPage() {
  const { attemptId } = useParams({ from: '/results/$attemptId' });
  const navigate = useNavigate();

  const attempt = useMemo(
    () => mockAttempts.find((entry) => entry.id === attemptId),
    [attemptId],
  );

  if (!attempt) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-default)' }}>
        <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center">
          <h1>Results unavailable</h1>
          <p style={{ color: 'var(--fg-muted)' }}>
            We couldn’t find a record for this attempt yet. Submissions created before this update
            may not include detailed results. Try running a new problem to generate fresh data.
          </p>
          <Button onClick={() => navigate({ to: '/' })}>Back to practice</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-default)' }}>
      <header
        className="border-b px-6 py-4"
        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-default)' }}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <BreadcrumbsNav
            items={[
              { label: 'Home', onClick: () => navigate({ to: '/' }) },
              {
                label: 'Workspace',
                onClick: () =>
                  navigate({
                    to: '/workspace/$attemptId',
                    params: { attemptId },
                  }),
              },
              { label: 'Results' },
            ]}
          />
          <div>
            <h1>{attempt.problem_title}</h1>
            <p style={{ color: 'var(--fg-muted)' }}>Review your submission outcome and next steps.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <section className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-2">
                {attempt.passed ? (
                  <Badge variant="outline" className="gap-1 text-success-600">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Passed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-danger-600">
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    Failed
                  </Badge>
                )}
                <Badge variant="secondary" className="uppercase">{attempt.category}</Badge>
              </div>
              <CardTitle className="text-3xl">Attempt summary</CardTitle>
              <CardDescription>
                Started {new Date(attempt.started_at).toLocaleString()} · Completed{' '}
                {new Date(attempt.ended_at).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <SummaryMetric
                icon={<Clock className="h-5 w-5" aria-hidden="true" />}
                label="Duration"
                value={formatDuration(attempt.duration_ms)}
              />
              <SummaryMetric
                icon={<Code className="h-5 w-5" aria-hidden="true" />}
                label="Public tests"
                value={`${attempt.pass_count} pass / ${attempt.fail_count} fail`}
              />
              <SummaryMetric
                icon={<Flame className="h-5 w-5" aria-hidden="true" />}
                label="Hint usage"
                value={attempt.hint_used ? 'Hint viewed' : 'No hints used'}
              />
              <SummaryMetric
                icon={<RefreshCcw className="h-5 w-5" aria-hidden="true" />}
                label="Next steps"
                value={attempt.passed ? 'Review solution and iterate' : 'Revisit approach'}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Solution snapshot</CardTitle>
              <CardDescription>Quick reference of the code you submitted.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-80 rounded-lg border border-border-subtle bg-bg-sunken p-4">
                <pre className="text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
                  <code>{attempt.code}</code>
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>What to do next</CardTitle>
            <CardDescription>
              Reflect on this attempt and schedule another practice session to stay sharp.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button onClick={() => navigate({ to: '/' })}>Generate new problem</Button>
            <Button
              variant="outline"
              onClick={() =>
                navigate({ to: '/workspace/$attemptId', params: { attemptId } })
              }
            >
              Re-open workspace
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

interface SummaryMetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const SummaryMetric = ({ icon, label, value }: SummaryMetricProps) => (
  <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-bg-panel/60 p-3">
    <span className="rounded-full bg-bg-sunken p-2" aria-hidden="true">
      {icon}
    </span>
    <div className="space-y-1">
      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
        {label}
      </p>
      <p className="font-medium text-fg-default">{value}</p>
    </div>
  </div>
);
