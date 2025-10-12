import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Card, Tag } from '@improview/ui';
import { HistoryEntry, clearHistory, loadHistory } from '../../storage/history';

export const HistoryPage = () => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setEntries(loadHistory().sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  const handleClear = () => {
    clearHistory();
    setEntries([]);
  };

  if (entries.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-4 py-8 text-center sm:px-6 lg:px-8">
        <Tag tone="info">History</Tag>
        <h1 className="text-3xl font-semibold text-fg">No attempts recorded yet</h1>
        <p className="text-lg text-fg-muted sm:max-w-md">
          Generate your first problem to see it appear here alongside status, runtime, and insights.
        </p>
        <Button variant="primary" onClick={() => navigate({ to: '/' })}>
          Generate a problem
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-fg">Attempt history</h1>
          <p className="text-lg text-fg-muted">
            Stored locally. Clear to remove all attempt metadata on this device.
          </p>
        </div>
        <Button variant="ghost" onClick={handleClear}>
          Clear history
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {entries.map((entry) => (
          <Card
            key={entry.attemptId}
            heading={entry.problemTitle}
            description={`${entry.category} · ${entry.difficulty}`}
            actions={
              <div className="flex flex-wrap gap-2">
                <Tag tone={entry.status === 'passed' ? 'success' : entry.status === 'failed' ? 'danger' : 'info'}>
                  {entry.status.replace('_', ' ')}
                </Tag>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate({ to: '/workspace/$attemptId', params: { attemptId: entry.attemptId } })}
                >
                  Re-open
                </Button>
              </div>
            }
            padding="lg"
          >
            <div className="grid gap-4 sm:grid-cols-4">
              <HistoryStat label="Created" value={new Date(entry.createdAt).toLocaleString()} />
              <HistoryStat label="Updated" value={new Date(entry.updatedAt).toLocaleString()} />
              <HistoryStat label="Passes" value={entry.passCount.toString()} />
              <HistoryStat label="Fails" value={entry.failCount.toString()} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const HistoryStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border-subtle bg-bg-sunken p-4 text-sm text-fg">
    <span className="text-xs uppercase tracking-wide text-fg-muted">{label}</span>
    <p className="mt-1 font-semibold">{value}</p>
  </div>
);
