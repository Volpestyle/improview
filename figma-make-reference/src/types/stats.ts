export interface UserStats {
  total_attempts: number;
  total_passed: number;
  total_failed: number;
  total_time_ms: number;
  success_rate: number;
  average_time_ms: number;
  current_streak: number;
  longest_streak: number;
  problems_saved: number;
  hints_used: number;
  difficulty_breakdown: {
    easy: { attempted: number; passed: number };
    medium: { attempted: number; passed: number };
    hard: { attempted: number; passed: number };
  };
  category_breakdown: {
    category: string;
    attempted: number;
    passed: number;
  }[];
  recent_activity: {
    date: string;
    attempts: number;
  }[];
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  default_provider: 'openai' | 'grok';
  show_hints_by_default: boolean;
  auto_save_code: boolean;
  vim_mode: boolean;
  font_size: number;
}
