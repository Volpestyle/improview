import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  ScrollArea,
  Separator,
  Select,
  Switch,
} from '@improview/ui';
import { BookMarked, Calendar, Clock, Flame, Mail, Target, TrendingUp } from 'lucide-react';
import { mockUser, mockUserPreferences, mockUserStats } from '../../data/mockUser';
import { BreadcrumbsNav } from '../../components/BreadcrumbsNav';
import type { UserPreferences } from '../../types/stats';

const formatJoinedDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown';

const formatDuration = (ms: number) => {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getInitials = (name?: string) =>
  name
    ? name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : 'IM';

const preferenceLabels: Record<keyof UserPreferences, string> = {
  theme: 'Theme',
  default_provider: 'Default provider',
  show_hints_by_default: 'Reveal hints automatically',
  auto_save_code: 'Auto-save code while editing',
  vim_mode: 'Enable Vim keybindings',
  font_size: 'Editor font size',
};

export function ProfilePage() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<UserPreferences>(mockUserPreferences);

  const stats = useMemo(() => mockUserStats, []);
  const user = useMemo(() => mockUser, []);

  const handlePreferenceChange = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    // TODO: Persist preference via API
  };

  const difficultyBreakdown = stats.difficulty_breakdown;

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
                onClick: () => navigate({ to: '/' }),
              },
              { label: 'Profile' },
            ]}
          />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        <Card>
          <CardContent className="flex flex-col gap-6 pt-6 md:flex-row md:items-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback
                className="text-xl"
                style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <h1>{user.name ?? 'Improview member'}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
                {user.email ? (
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    {user.email}
                  </span>
                ) : null}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  Joined {formatJoinedDate(user.created_at)}
                </span>
              </div>
            </div>
            <Button variant="secondary" className="gap-2 self-start md:self-center">
              <BookMarked className="h-4 w-4" aria-hidden="true" />
              View Saved Lists
            </Button>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2>Overview</h2>
            <Badge variant="secondary">Last 30 days</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Attempts"
              value={stats.total_attempts}
              icon={<Target className="h-5 w-5 text-accent" aria-hidden="true" />}
              helper={`${stats.total_passed} passed`}
            />
            <StatCard
              title="Success Rate"
              value={`${stats.success_rate.toFixed(1)}%`}
              icon={<TrendingUp className="h-5 w-5 text-success-600" aria-hidden="true" />}
              helper={`${stats.total_passed}/${stats.total_attempts}`}
            />
            <StatCard
              title="Time Practiced"
              value={formatDuration(stats.total_time_ms)}
              icon={<Clock className="h-5 w-5 text-fg-muted" aria-hidden="true" />}
              helper={`Avg ${formatDuration(stats.average_time_ms)}`}
            />
            <StatCard
              title="Current Streak"
              value={`${stats.current_streak} days`}
              icon={<Flame className="h-5 w-5 text-warning-600" aria-hidden="true" />}
              helper={`Best ${stats.longest_streak} days`}
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          <Card>
            <CardHeader>
              <CardTitle>Difficulty breakdown</CardTitle>
              <CardDescription>Balance your practice across easy, medium, and hard sets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {(['easy', 'medium', 'hard'] as const).map((level) => {
                  const entry = difficultyBreakdown[level];
                  const percent =
                    entry.attempted === 0 ? 0 : Math.round((entry.passed / entry.attempted) * 100);
                  return (
                    <div key={level} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize">{level}</span>
                        <span style={{ color: 'var(--fg-muted)' }}>
                          {entry.passed}/{entry.attempted} passed
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-bg-sunken">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Practice preferences</CardTitle>
              <CardDescription>Configure how Improview behaves while you practice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <PreferenceRow
                label={preferenceLabels.theme}
                description="Switch between Anysphere dark, Gruvbox soft, or follow system."
              >
                <Select
                  value={preferences.theme}
                  onChange={(event) =>
                    handlePreferenceChange('theme', event.target.value as UserPreferences['theme'])
                  }
                  options={[
                    { label: 'Light', value: 'light' },
                    { label: 'Dark', value: 'dark' },
                    { label: 'System', value: 'system' },
                  ]}
                />
              </PreferenceRow>

              <PreferenceRow
                label={preferenceLabels.default_provider}
                description="Choose the default LLM to generate problems."
              >
                <Select
                  value={preferences.default_provider}
                  onChange={(event) =>
                    handlePreferenceChange(
                      'default_provider',
                      event.target.value as UserPreferences['default_provider'],
                    )
                  }
                  options={[
                    { label: 'OpenAI', value: 'openai' },
                    { label: 'Grok', value: 'grok' },
                  ]}
                />
              </PreferenceRow>

              <PreferenceToggle
                label={preferenceLabels.auto_save_code}
                description="Persist your code continuously so you never lose progress."
                checked={preferences.auto_save_code}
                onCheckedChange={(checked) => handlePreferenceChange('auto_save_code', checked)}
              />
              <PreferenceToggle
                label={preferenceLabels.show_hints_by_default}
                description="Automatically reveal hints when you open a new problem."
                checked={preferences.show_hints_by_default}
                onCheckedChange={(checked) =>
                  handlePreferenceChange('show_hints_by_default', checked)
                }
              />
              <PreferenceToggle
                label={preferenceLabels.vim_mode}
                description="Enable Vim keybindings inside the Improview editor."
                checked={preferences.vim_mode}
                onCheckedChange={(checked) => handlePreferenceChange('vim_mode', checked)}
              />
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Track how consistent you’ve been over the last week.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              <div className="divide-y divide-border-subtle">
                {stats.recent_activity.map((activity) => (
                  <div
                    key={activity.date}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <span>{activity.date}</span>
                    <span style={{ color: 'var(--fg-muted)' }}>
                      {activity.attempts} attempt{activity.attempts === 1 ? '' : 's'}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  helper?: string;
  icon: React.ReactNode;
}

const StatCard = ({ title, value, helper, icon }: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-start justify-between gap-2">
      <div>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="mt-2 text-3xl">{value}</CardTitle>
      </div>
      {icon}
    </CardHeader>
    {helper ? (
      <CardContent style={{ color: 'var(--fg-muted)' }} className="text-sm">
        {helper}
      </CardContent>
    ) : null}
  </Card>
);

interface PreferenceRowProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

const PreferenceRow = ({ label, description, children }: PreferenceRowProps) => (
  <div className="space-y-2">
    <div className="space-y-1">
      <Label>{label}</Label>
      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
        {description}
      </p>
    </div>
    {children}
    <Separator />
  </div>
);

interface PreferenceToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

const PreferenceToggle = ({ label, description, checked, onCheckedChange }: PreferenceToggleProps) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex-1 space-y-1">
      <Label>{label}</Label>
      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
        {description}
      </p>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);
