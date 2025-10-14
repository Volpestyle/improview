import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  User as UserIcon,
  Mail,
  Calendar,
  TrendingUp,
  Target,
  Clock,
  Award,
  Flame,
  BookMarked,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../types/user';
import { UserStats, UserPreferences } from '../types/stats';
import { BreadcrumbsNav } from './breadcrumbs-nav';

interface ProfileScreenProps {
  user: User;
  stats: UserStats;
  preferences: UserPreferences;
  onNavigateHome: () => void;
  onUpdatePreferences?: (preferences: Partial<UserPreferences>) => void;
  onDeleteAccount?: () => void;
}

export function ProfileScreen({ 
  user, 
  stats, 
  preferences,
  onNavigateHome,
  onUpdatePreferences,
  onDeleteAccount,
}: ProfileScreenProps) {
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    const updated = { ...localPreferences, [key]: value };
    setLocalPreferences(updated);
    onUpdatePreferences?.(updated);
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
              { label: 'Profile' },
            ]}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8" role="main">
        <div className="space-y-8">
          {/* Profile Header */}
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback 
                      className="text-2xl"
                      style={{ 
                        backgroundColor: 'var(--accent-soft)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h1 className="mb-2">{user.name}</h1>
                    <div className="space-y-1" style={{ color: 'var(--fg-muted)' }}>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Joined {formatDate(user.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Statistics Overview */}
          <div>
            <h2 className="mb-4">Statistics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldReduceMotion ? 0 : 0.1 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription>Total Attempts</CardDescription>
                      <Target className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl" style={{ color: 'var(--accent-primary)' }}>
                      {stats.total_attempts}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldReduceMotion ? 0 : 0.15 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription>Success Rate</CardDescription>
                      <TrendingUp className="h-5 w-5" style={{ color: 'var(--success-600)' }} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl" style={{ color: 'var(--success-600)' }}>
                      {stats.success_rate.toFixed(1)}%
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                      {stats.total_passed} / {stats.total_attempts} passed
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldReduceMotion ? 0 : 0.2 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription>Current Streak</CardDescription>
                      <Flame className="h-5 w-5" style={{ color: 'var(--warning-600)' }} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl" style={{ color: 'var(--warning-600)' }}>
                      {stats.current_streak}
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                      Longest: {stats.longest_streak} days
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldReduceMotion ? 0 : 0.25 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription>Avg. Time</CardDescription>
                      <Clock className="h-5 w-5" style={{ color: 'var(--info-600)' }} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl" style={{ color: 'var(--info-600)' }}>
                      {formatDuration(stats.average_time_ms)}
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                      Total: {formatDuration(stats.total_time_ms)}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Difficulty Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Difficulty Breakdown</CardTitle>
                <CardDescription>Performance by difficulty level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(stats.difficulty_breakdown).map(([difficulty, data]) => (
                  <div key={difficulty} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline"
                          style={{ 
                            borderColor: difficulty === 'easy' ? 'var(--success-600)' : 
                                       difficulty === 'medium' ? 'var(--warning-600)' : 
                                       'var(--danger-600)',
                            color: difficulty === 'easy' ? 'var(--success-600)' : 
                                   difficulty === 'medium' ? 'var(--warning-600)' : 
                                   'var(--danger-600)',
                          }}
                        >
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </Badge>
                        <span style={{ color: 'var(--fg-muted)' }}>
                          {data.passed} / {data.attempted}
                        </span>
                      </div>
                      <span style={{ color: 'var(--fg-muted)' }}>
                        {data.attempted > 0 ? ((data.passed / data.attempted) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                    <div 
                      className="h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--bg-sunken)' }}
                    >
                      <div 
                        className="h-full transition-all"
                        style={{ 
                          width: `${data.attempted > 0 ? (data.passed / data.attempted) * 100 : 0}%`,
                          backgroundColor: difficulty === 'easy' ? 'var(--success-600)' : 
                                         difficulty === 'medium' ? 'var(--warning-600)' : 
                                         'var(--danger-600)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Practice Summary</CardTitle>
                <CardDescription>Quick stats overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--success-600)' }} />
                    <span>Problems Passed</span>
                  </div>
                  <span className="font-mono">{stats.total_passed}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5" style={{ color: 'var(--danger-600)' }} />
                    <span>Problems Failed</span>
                  </div>
                  <span className="font-mono">{stats.total_failed}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookMarked className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                    <span>Problems Saved</span>
                  </div>
                  <span className="font-mono">{stats.problems_saved}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5" style={{ color: 'var(--info-600)' }} />
                    <span>Hints Used</span>
                  </div>
                  <span className="font-mono">{stats.hints_used}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Customize your practice experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Default AI Provider</Label>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                      Choose your preferred provider for problem generation
                    </p>
                  </div>
                  <Select 
                    value={localPreferences.default_provider}
                    onValueChange={(value) => handlePreferenceChange('default_provider', value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="grok">Grok 4 Fast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto-save">Auto-save Code</Label>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                      Automatically save your code as you type
                    </p>
                  </div>
                  <Switch 
                    id="auto-save"
                    checked={localPreferences.auto_save_code}
                    onCheckedChange={(checked) => handlePreferenceChange('auto_save_code', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="vim-mode">Vim Mode</Label>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                      Enable Vim keybindings in the editor
                    </p>
                  </div>
                  <Switch 
                    id="vim-mode"
                    checked={localPreferences.vim_mode}
                    onCheckedChange={(checked) => handlePreferenceChange('vim_mode', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="show-hints">Show Hints by Default</Label>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                      Display hints automatically when viewing problems
                    </p>
                  </div>
                  <Switch 
                    id="show-hints"
                    checked={localPreferences.show_hints_by_default}
                    onCheckedChange={(checked) => handlePreferenceChange('show_hints_by_default', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card style={{ borderColor: 'var(--danger-600)' }}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" style={{ color: 'var(--danger-600)' }} />
                <CardTitle style={{ color: 'var(--danger-600)' }}>Danger Zone</CardTitle>
              </div>
              <CardDescription>Irreversible account actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button 
                  variant="destructive"
                  onClick={onDeleteAccount}
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
