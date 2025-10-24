import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@improview/ui';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  History,
  Loader2,
  XCircle,
} from 'lucide-react';
import { BreadcrumbsNav } from '../../components/BreadcrumbsNav';
import { getApiClient } from '../../lib/apiClient';
import { queryKeys } from '../../lib/queryClient';
import { formatDuration } from '../../lib/hooks';
import type { SavedProblemSummary, SavedProblemDetail, SavedAttemptSnapshot } from '../../types/api';

const PAGE_SIZE = 20;

const savedProblemStatusMeta: Record<string, { label: string; tone: string }> = {
  in_progress: { label: 'In Progress', tone: 'text-warning-600 border-warning-600' },
  completed: { label: 'Completed', tone: 'text-success-600 border-success-600' },
  archived: { label: 'Archived', tone: 'text-fg-muted border-border-subtle' },
};

const attemptStatusMeta: Record<
  string,
  { label: string; tone: string; icon: typeof CheckCircle2 }
> = {
  passed: { label: 'Passed', tone: 'text-success-600', icon: CheckCircle2 },
  failed: { label: 'Failed', tone: 'text-danger-600', icon: XCircle },
  submitted: { label: 'Submitted', tone: 'text-warning-600', icon: Clock },
};

type StatusFilter = 'all' | 'in_progress' | 'completed' | 'archived';

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const UNKNOWN_META = { label: 'Unknown', tone: 'text-fg-muted border-border-subtle' };

function formatRelativeDay(epochSeconds?: number) {
  if (!epochSeconds) {
    return 'Unknown';
  }
  const date = new Date(epochSeconds * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(epochSeconds?: number) {
  if (!epochSeconds) {
    return '—';
  }
  return new Date(epochSeconds * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getSavedProblemTitle(problem: SavedProblemSummary | SavedProblemDetail) {
  if (problem.title && problem.title.trim().length > 0) {
    return problem.title;
  }
  return `Problem ${problem.problem_id}`;
}

function getAttemptMeta(status?: string) {
  if (!status) {
    return {
      label: 'No submissions',
      tone: 'text-fg-muted',
      icon: Clock,
    };
  }
  const key = status.toLowerCase();
  return attemptStatusMeta[key] ?? {
    label: status,
    tone: 'text-fg-muted',
    icon: Clock,
  };
}

interface AttemptRowProps {
  attempt: SavedAttemptSnapshot;
  onViewAttempt: (attemptId: string) => void;
}

const AttemptRow = ({ attempt, onViewAttempt }: AttemptRowProps) => {
  const meta = getAttemptMeta(attempt.status);
  const StatusIcon = meta.icon;
  const submittedAt = attempt.submitted_at ?? attempt.updated_at;

  return (
    <div className="rounded-md border border-border-subtle bg-bg-sunken p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${meta.tone}`} aria-hidden="true" />
          <span className={`text-sm font-medium ${meta.tone}`}>
            {meta.label}
          </span>
          <span className="text-xs font-mono text-fg-muted">
            {attempt.attempt_id}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => onViewAttempt(attempt.attempt_id)}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          View results
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
        <span>
          Submitted {formatRelativeDay(submittedAt)} · {formatDateTime(submittedAt)}
        </span>
        <span>Runtime {formatDuration(Number(attempt.runtime_ms ?? 0))}</span>
        <span>Pass {attempt.pass_count}</span>
        <span>Fail {attempt.fail_count}</span>
      </div>
    </div>
  );
};

interface SavedProblemCardProps {
  summary: SavedProblemSummary;
  onViewAttempt: (attemptId: string) => void;
}

const SavedProblemCard = ({ summary, onViewAttempt }: SavedProblemCardProps) => {
  const [showAttempts, setShowAttempts] = useState(false);
  const apiClient = getApiClient();

  const { data: detail, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.savedProblemDetail(summary.id),
    queryFn: async () => {
      return apiClient.getSavedProblem(summary.id);
    },
    enabled: showAttempts,
    staleTime: 60 * 1000,
  });

  const problem = detail ?? summary;
  const attempts = detail?.attempts ?? [];
  const lastAttempt = detail?.last_attempt ?? summary.last_attempt ?? attempts[0];
  const statusMeta = savedProblemStatusMeta[problem.status] ?? UNKNOWN_META;
  const attemptMeta = getAttemptMeta(lastAttempt?.status);
  const AttemptMetaIcon = attemptMeta.icon;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <CardTitle>{getSavedProblemTitle(problem)}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={statusMeta.tone}>
              {statusMeta.label}
            </Badge>
            <Badge variant="outline" className="font-mono uppercase">
              {problem.language}
            </Badge>
            {problem.hint_unlocked ? (
              <Badge variant="secondary" className="gap-1">
                <Eye className="h-3 w-3" aria-hidden="true" />
                Hint unlocked
              </Badge>
            ) : null}
            {problem.tags?.map((tag) => (
              <Badge key={tag} variant="secondary">
                #{tag}
              </Badge>
            ))}
          </div>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            Updated {formatRelativeDay(problem.updated_at)} · {formatDateTime(problem.updated_at)}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 text-sm md:items-end">
          <span className={`inline-flex items-center gap-2 font-medium ${attemptMeta.tone}`}>
            <AttemptMetaIcon className="h-4 w-4" aria-hidden="true" />
            {attemptMeta.label}
          </span>
          {lastAttempt ? (
            <span style={{ color: 'var(--fg-muted)' }}>
              Runtime {formatDuration(Number(lastAttempt.runtime_ms ?? 0))}
            </span>
          ) : (
            <span style={{ color: 'var(--fg-muted)' }}>No attempts recorded yet</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
            <span>Created {formatDateTime(problem.created_at)}</span>
            {problem.notes ? <span>Notes: {problem.notes}</span> : null}
          </div>
          <div className="flex items-center gap-2">
            {lastAttempt ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => onViewAttempt(lastAttempt.attempt_id)}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                View latest
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowAttempts((prev) => !prev)}
            >
              <History className="h-4 w-4" aria-hidden="true" />
              {showAttempts ? 'Hide history' : 'Show history'}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showAttempts ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>
        {showAttempts ? (
          <div className="space-y-3 border-t border-border-subtle pt-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading attempt history…
              </div>
            ) : isError ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-sunken p-4">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                  <AlertTriangle className="h-4 w-4 text-danger-600" aria-hidden="true" />
                  Failed to load attempt history. {error instanceof Error ? error.message : ''}
                </div>
                <Button size="sm" variant="ghost" onClick={() => refetch()} className="gap-2">
                  <History className="h-4 w-4" aria-hidden="true" />
                  Retry
                </Button>
              </div>
            ) : attempts.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                Attempts will appear here after you submit solutions for this problem.
              </p>
            ) : (
              attempts.map((attempt) => (
                <AttemptRow key={attempt.attempt_id} attempt={attempt} onViewAttempt={onViewAttempt} />
              ))
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

interface LoadMoreButtonProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}

const LoadMoreButton = ({ hasNextPage, isFetchingNextPage, fetchNextPage }: LoadMoreButtonProps) => {
  if (!hasNextPage) {
    return null;
  }

  return (
    <div className="flex justify-center pt-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={isFetchingNextPage}
        onClick={() => fetchNextPage()}
      >
        {isFetchingNextPage ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading…
          </>
        ) : (
          'Load more'
        )}
      </Button>
    </div>
  );
};

const LoadingState = () => (
  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
    Loading Practice Library…
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-sunken p-4 text-sm">
    <div className="flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
      <AlertTriangle className="h-4 w-4 text-danger-600" aria-hidden="true" />
      {message}
    </div>
    <Button variant="ghost" size="sm" className="gap-2" onClick={onRetry}>
      <History className="h-4 w-4" aria-hidden="true" />
      Retry
    </Button>
  </div>
);

const EmptyState = () => (
  <Card>
    <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
      <History className="h-8 w-8 text-fg-muted" aria-hidden="true" />
      <div>
        <p className="text-base font-medium">No saved problems yet</p>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Generate a problem and save it to start building your practice history.
        </p>
      </div>
    </CardContent>
  </Card>
);

export function PracticeLibraryPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/history' });
  const apiClient = getApiClient();

  const [tab, setTab] = useState<'history' | 'saved'>(search.tab === 'saved' ? 'saved' : 'history');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    setTab(search.tab === 'saved' ? 'saved' : 'history');
  }, [search.tab]);

  const savedProblemsQuery = useInfiniteQuery({
    queryKey: ['saved-problems', 'all', 'infinite'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      return apiClient.getSavedProblems({
        limit: PAGE_SIZE,
        next_token: typeof pageParam === 'string' ? pageParam : undefined,
      });
    },
    getNextPageParam: (lastPage) => lastPage.next_token ?? undefined,
  });

  const savedProblems = useMemo(
    () => savedProblemsQuery.data?.pages.flatMap((page) => page.saved_problems) ?? [],
    [savedProblemsQuery.data],
  );

  const sortedByUpdated = useMemo(
    () => [...savedProblems].sort((a, b) => b.updated_at - a.updated_at),
    [savedProblems],
  );

  const filteredByStatus = useMemo(() => {
    if (statusFilter === 'all') {
      return savedProblems;
    }
    return savedProblems.filter((problem) => problem.status === statusFilter);
  }, [savedProblems, statusFilter]);

  const handleTabChange = (value: string) => {
    const tabValue = value === 'saved' ? 'saved' : 'history';
    setTab(tabValue);
    navigate({ to: '/history', search: { tab: tabValue } });
  };

  const handleViewAttempt = (attemptId: string) => {
    navigate({ to: '/results/$attemptId', params: { attemptId } });
  };

  const latestUpdate = sortedByUpdated[0];
  const latestUpdateSummary = latestUpdate
    ? `${formatRelativeDay(latestUpdate.updated_at)} · ${formatDateTime(latestUpdate.updated_at)}`
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-default)' }}>
      <header
        className="border-b px-6 py-4"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          <BreadcrumbsNav
            items={[
              {
                label: 'Home',
                onClick: () =>
                  navigate({
                    to: '/',
                  }),
              },
              { label: 'Practice Library' },
            ]}
          />
          <div className="flex flex-col gap-1">
            <h1>Practice Library</h1>
            <p style={{ color: 'var(--fg-muted)' }}>
              Review saved problems and drill into your attempt history across devices.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" aria-hidden="true" />
              History
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <History className="h-4 w-4" aria-hidden="true" />
              Saved
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p style={{ color: 'var(--fg-muted)' }}>
                {savedProblems.length} saved problem{savedProblems.length === 1 ? '' : 's'}
                {latestUpdateSummary ? ` · Latest activity ${latestUpdateSummary}` : ''}
              </p>
            </div>

            {savedProblemsQuery.isLoading ? (
              <LoadingState />
            ) : savedProblemsQuery.isError ? (
              <ErrorState
                message={
                  savedProblemsQuery.error instanceof Error
                    ? savedProblemsQuery.error.message
                    : 'Failed to load Practice Library.'
                }
                onRetry={() => savedProblemsQuery.refetch()}
              />
            ) : sortedByUpdated.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="space-y-4">
                  {sortedByUpdated.map((problem) => (
                    <SavedProblemCard
                      key={problem.id}
                      summary={problem}
                      onViewAttempt={handleViewAttempt}
                    />
                  ))}
                </div>
                <LoadMoreButton
                  hasNextPage={Boolean(savedProblemsQuery.hasNextPage)}
                  isFetchingNextPage={savedProblemsQuery.isFetchingNextPage}
                  fetchNextPage={() => savedProblemsQuery.fetchNextPage()}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p style={{ color: 'var(--fg-muted)' }}>
                Manage the problems you have saved to revisit later.
              </p>
              <div className="flex items-center gap-2">
                {STATUS_FILTERS.map((filter) => (
                  <Button
                    key={filter.value}
                    variant={statusFilter === filter.value ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(filter.value)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
            <Separator />

            {savedProblemsQuery.isLoading ? (
              <LoadingState />
            ) : savedProblemsQuery.isError ? (
              <ErrorState
                message={
                  savedProblemsQuery.error instanceof Error
                    ? savedProblemsQuery.error.message
                    : 'Failed to load saved problems.'
                }
                onRetry={() => savedProblemsQuery.refetch()}
              />
            ) : filteredByStatus.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="space-y-4">
                  {filteredByStatus.map((problem) => (
                    <SavedProblemCard
                      key={problem.id}
                      summary={problem}
                      onViewAttempt={handleViewAttempt}
                    />
                  ))}
                </div>
                <LoadMoreButton
                  hasNextPage={Boolean(savedProblemsQuery.hasNextPage)}
                  isFetchingNextPage={savedProblemsQuery.isFetchingNextPage}
                  fetchNextPage={() => savedProblemsQuery.fetchNextPage()}
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
