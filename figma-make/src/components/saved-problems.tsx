import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  BookMarked, 
  Plus,
  Calendar,
  Code,
  Star,
  FolderOpen,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Attempt, ProblemList } from '../types/user';
import { BreadcrumbsNav } from './breadcrumbs-nav';

interface SavedProblem extends Omit<Attempt, 'id'> {
  id: string;
  saved_at: string;
  lists: string[]; // List IDs this problem belongs to
}

interface SavedProblemsProps {
  attempts: Attempt[];
  savedProblems: SavedProblem[];
  lists: ProblemList[];
  onNavigateHome: () => void;
  onViewAttempt: (attemptId: string) => void;
  onCreateList: () => void;
  onUnsaveProblem?: (problemId: string) => void;
  onAddToList?: (problemId: string, listId: string) => void;
}

export function SavedProblems({ 
  attempts, 
  savedProblems,
  lists, 
  onNavigateHome,
  onViewAttempt,
  onCreateList,
  onUnsaveProblem,
  onAddToList,
}: SavedProblemsProps) {
  const [selectedTab, setSelectedTab] = useState('history');
  const [selectedSavedTab, setSelectedSavedTab] = useState('all');
  const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'var(--success-600)';
      case 'medium': return 'var(--warning-600)';
      case 'hard': return 'var(--danger-600)';
      default: return 'var(--fg-muted)';
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg-default)' }}
    >
      {/* Header */}
      <header 
        className="border-b px-6 py-4"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-default)',
        }}
        role="banner"
      >
        <div className="max-w-7xl mx-auto space-y-3">
          <BreadcrumbsNav
            items={[
              { label: 'Home', onClick: onNavigateHome },
              { label: 'Saved Problems' },
            ]}
          />
          <div className="flex items-center justify-between">
            <div>
              <h1>Saved Problems</h1>
              <p style={{ color: 'var(--fg-muted)' }}>
                View your attempt history and curated problem lists
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8" role="main">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" aria-hidden="true" />
              History
              <Badge variant="secondary" className="ml-1">
                {attempts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Star className="h-4 w-4" aria-hidden="true" />
              Saved
              <Badge variant="secondary" className="ml-1">
                {savedProblems.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p style={{ color: 'var(--fg-muted)' }}>
                {attempts.length} total attempts
              </p>
            </div>

            <div className="grid gap-4">
              {attempts.map((attempt, idx) => (
                <motion.div
                  key={attempt.id}
                  initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: shouldReduceMotion ? 0 : idx * 0.05 }}
                >
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="mb-2">
                            {attempt.problem_title}
                          </CardTitle>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono">
                              {attempt.category}
                            </Badge>
                            <Badge 
                              variant="outline"
                              style={{ 
                                borderColor: getDifficultyColor(attempt.difficulty),
                                color: getDifficultyColor(attempt.difficulty),
                              }}
                            >
                              {attempt.difficulty}
                            </Badge>
                            {attempt.hint_used && (
                              <Badge variant="secondary" className="gap-1">
                                <Eye className="h-3 w-3" />
                                Hint used
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {attempt.passed ? (
                            <div 
                              className="px-3 py-1 rounded-full flex items-center gap-1"
                              style={{
                                backgroundColor: 'var(--success-soft)',
                                color: 'var(--success-600)',
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Passed</span>
                            </div>
                          ) : (
                            <div 
                              className="px-3 py-1 rounded-full flex items-center gap-1"
                              style={{
                                backgroundColor: 'var(--danger-soft)',
                                color: 'var(--danger-600)',
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                              <span>Failed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-6" style={{ color: 'var(--fg-muted)' }}>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="font-mono">
                              {formatDuration(attempt.duration_ms)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(attempt.started_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Code className="h-4 w-4" />
                            <span>
                              {attempt.pass_count} / {attempt.pass_count + attempt.fail_count} tests
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewAttempt(attempt.id)}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Saved Tab */}
          <TabsContent value="saved" className="space-y-6">
            {/* Saved Sub-tabs */}
            <Tabs value={selectedSavedTab} onValueChange={setSelectedSavedTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="all">
                  All Saved
                </TabsTrigger>
                <TabsTrigger value="lists" className="gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Lists
                  <Badge variant="secondary" className="ml-1">
                    {lists.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* All Saved Problems */}
              <TabsContent value="all" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <p style={{ color: 'var(--fg-muted)' }}>
                    {savedProblems.length} saved problems
                  </p>
                </div>

                <div className="grid gap-4">
                  {savedProblems.map((problem, idx) => (
                    <motion.div
                      key={problem.id}
                      initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: shouldReduceMotion ? 0 : idx * 0.05 }}
                    >
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 mb-2">
                                <Star className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--warning-600)' }} fill="var(--warning-600)" />
                                <CardTitle>{problem.problem_title}</CardTitle>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="font-mono">
                                  {problem.category}
                                </Badge>
                                <Badge 
                                  variant="outline"
                                  style={{ 
                                    borderColor: getDifficultyColor(problem.difficulty),
                                    color: getDifficultyColor(problem.difficulty),
                                  }}
                                >
                                  {problem.difficulty}
                                </Badge>
                                {problem.lists.length > 0 && (
                                  <Badge variant="secondary" className="gap-1">
                                    <FolderOpen className="h-3 w-3" />
                                    {problem.lists.length} {problem.lists.length === 1 ? 'list' : 'lists'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-6" style={{ color: 'var(--fg-muted)' }}>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Saved {formatDate(problem.saved_at)}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onViewAttempt(problem.id)}
                              >
                                View
                              </Button>
                              {onUnsaveProblem && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onUnsaveProblem(problem.id)}
                                  className="gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                  
                  {savedProblems.length === 0 && (
                    <div className="text-center py-12" style={{ color: 'var(--fg-muted)' }}>
                      <Star className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--fg-subtle)' }} />
                      <p className="mb-2">No saved problems yet</p>
                      <p className="text-sm">Save problems from your practice sessions to review later</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Lists Sub-tab */}
              <TabsContent value="lists" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <p style={{ color: 'var(--fg-muted)' }}>
                    {lists.length} custom lists
                  </p>
                  <Button onClick={onCreateList} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create List
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {lists.map((list, idx) => (
                    <motion.div
                      key={list.id}
                      initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: shouldReduceMotion ? 0 : idx * 0.05 }}
                    >
                      <Card className="h-full">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <FolderOpen className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                                <CardTitle>{list.name}</CardTitle>
                              </div>
                              <CardDescription>{list.description}</CardDescription>
                            </div>
                            <Badge variant="secondary" className="font-mono">
                              {list.problem_count}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <span style={{ color: 'var(--fg-muted)' }}>
                              Created {formatDate(list.created_at)}
                            </span>
                            <Button size="sm" variant="ghost">
                              View List
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                  
                  {lists.length === 0 && (
                    <div className="col-span-full text-center py-12" style={{ color: 'var(--fg-muted)' }}>
                      <FolderOpen className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--fg-subtle)' }} />
                      <p className="mb-2">No lists yet</p>
                      <p className="text-sm mb-4">Create lists to organize your saved problems</p>
                      <Button onClick={onCreateList} variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Your First List
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
