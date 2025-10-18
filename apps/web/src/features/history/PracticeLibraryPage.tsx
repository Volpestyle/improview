import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ScrollArea,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@improview/ui';
import {
  BookMarked,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FolderOpen,
  Plus,
  Star,
  Trash2,
  XCircle,
} from 'lucide-react';
import { BreadcrumbsNav } from '../../components/BreadcrumbsNav';
import { mockAttempts, mockLists, mockSavedProblems } from '../../data/mockUser';
import type { ProblemList, SavedProblem } from '../../types/user';

const difficultyTone: Record<string, string> = {
  easy: 'text-success-600 border-success-600',
  medium: 'text-warning-600 border-warning-600',
  hard: 'text-danger-600 border-danger-600',
};

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const relativeDate = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(iso);
};

export function PracticeLibraryPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/history' });
  const [tab, setTab] = useState<'history' | 'saved'>(search.tab === 'saved' ? 'saved' : 'history');
  const [savedFilter, setSavedFilter] = useState<'all' | 'lists'>('all');

  useEffect(() => {
    setTab(search.tab === 'saved' ? 'saved' : 'history');
  }, [search.tab]);

  const savedProblems = useMemo(() => mockSavedProblems, []);
  const attempts = useMemo(() => mockAttempts, []);
  const lists = useMemo(() => mockLists, []);
  const problemsByList = useMemo(
    () =>
      lists.map((list) => ({
        list,
        problems: savedProblems.filter((problem) => problem.lists.includes(list.id)),
      })),
    [lists, savedProblems],
  );

  const handleViewAttempt = (attemptId: string) => {
    navigate({ to: '/results/$attemptId', params: { attemptId } });
  };

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
              Review past attempts, manage saved problems, and organise your practice lists.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            const tabValue = value as 'history' | 'saved';
            setTab(tabValue);
            navigate({
              to: '/history',
              search: (prev) => ({ ...prev, tab: tabValue === 'saved' ? 'saved' : undefined }),
              replace: true,
            });
          }}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" aria-hidden="true" />
              History
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Star className="h-4 w-4" aria-hidden="true" />
              Saved
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between">
              <p style={{ color: 'var(--fg-muted)' }}>
                {attempts.length} total attempts · {attempts.filter((a) => a.passed).length} passed
              </p>
              <Button variant="outline" size="sm" className="gap-2">
                <FolderOpen className="h-4 w-4" aria-hidden="true" />
                Export Session
              </Button>
            </div>

            <div className="grid gap-4">
              {attempts.map((attempt) => (
                <Card key={attempt.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                    <div className="space-y-2">
                      <CardTitle>{attempt.problem_title}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="outline" className="font-mono uppercase">
                          {attempt.category}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={difficultyTone[attempt.difficulty] ?? 'text-fg-muted'}
                        >
                          {attempt.difficulty}
                        </Badge>
                        {attempt.hint_used ? (
                          <Badge variant="secondary" className="gap-1">
                            <Eye className="h-3 w-3" aria-hidden="true" />
                            Hint used
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="rounded-full px-3 py-1 text-sm font-medium">
                        {attempt.passed ? (
                          <span className="flex items-center gap-1 text-success-600">
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            Passed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-danger-600">
                            <XCircle className="h-4 w-4" aria-hidden="true" />
                            Failed
                          </span>
                        )}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        {formatDate(attempt.ended_at)} · {formatDuration(attempt.duration_ms)}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <Separator />
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div
                        className="flex items-center gap-4 text-sm"
                        style={{ color: 'var(--fg-muted)' }}
                      >
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" aria-hidden="true" />
                          {new Date(attempt.started_at).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" aria-hidden="true" />
                          {formatDuration(attempt.duration_ms)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewAttempt(attempt.id)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          View attempt
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                          <BookMarked className="h-4 w-4" aria-hidden="true" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p style={{ color: 'var(--fg-muted)' }}>
                Saved problems sync across devices. Curate lists to organise your practice.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant={savedFilter === 'all' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSavedFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={savedFilter === 'lists' ? 'primary' : 'outline'}
                  size="sm"
                  className="gap-2"
                  onClick={() => setSavedFilter('lists')}
                >
                  <BookMarked className="h-4 w-4" aria-hidden="true" />
                  Lists
                </Button>
                <Button variant="primary" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New List
                </Button>
              </div>
            </div>

            {savedFilter === 'lists' ? (
              <div className="grid gap-4 md:grid-cols-2">
                {problemsByList.map(({ list, problems }) => (
                  <Card key={list.id} className="flex flex-col gap-3 p-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{list.name}</h3>
                      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        {list.description}
                      </p>
                    </div>
                    <div
                      className="flex flex-wrap items-center gap-2 text-sm"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      <span>
                        {problems.length} problem{problems.length === 1 ? '' : 's'}
                      </span>
                      <span>Created {formatDate(list.created_at)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {problems.slice(0, 3).map((problem) => (
                        <Badge key={problem.id} variant="secondary">
                          {problem.problem_title}
                        </Badge>
                      ))}
                      {problems.length > 3 ? (
                        <Badge variant="outline">+{problems.length - 3} more</Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-2"
                        onClick={() => setSavedFilter('all')}
                      >
                        <BookMarked className="h-4 w-4" aria-hidden="true" />
                        View problems
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <ScrollArea className="max-h-[600px] rounded-lg border border-border-subtle">
                <div className="divide-y divide-border-subtle">
                  {savedProblems.map((problem) => (
                    <SavedProblemRow
                      key={problem.id}
                      problem={problem}
                      lists={lists}
                      onViewAttempt={() => handleViewAttempt(problem.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

interface SavedProblemRowProps {
  problem: SavedProblem;
  lists: ProblemList[];
  onViewAttempt: () => void;
}

const SavedProblemRow = ({ problem, lists, onViewAttempt }: SavedProblemRowProps) => {
  const linkedLists = problem.lists
    .map((listId) => lists.find((list) => list.id === listId))
    .filter((list): list is ProblemList => Boolean(list));

  return (
    <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">{problem.problem_title}</h3>
          <Badge variant="outline" className="font-mono uppercase">
            {problem.category}
          </Badge>
          <Badge
            variant="outline"
            className={difficultyTone[problem.difficulty] ?? 'text-fg-muted'}
          >
            {problem.difficulty}
          </Badge>
        </div>
        <div
          className="flex flex-wrap items-center gap-3 text-sm"
          style={{ color: 'var(--fg-muted)' }}
        >
          <span>{relativeDate(problem.saved_at)}</span>
          <span>Duration {formatDuration(problem.duration_ms)}</span>
          {problem.hint_used ? (
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" aria-hidden="true" />
              Hint viewed
            </span>
          ) : null}
        </div>
        {linkedLists.length ? (
          <div
            className="flex flex-wrap items-center gap-2 text-sm"
            style={{ color: 'var(--fg-muted)' }}
          >
            Lists:
            {linkedLists.map((list) => (
              <Badge key={list.id} variant="secondary">
                {list.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-2" onClick={onViewAttempt}>
          <Eye className="h-4 w-4" aria-hidden="true" />
          View
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <BookMarked className="h-4 w-4" aria-hidden="true" />
          Add to list
        </Button>
        <Button variant="ghost" size="sm" className="gap-2 text-danger-600">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Remove
        </Button>
      </div>
    </div>
  );
};
