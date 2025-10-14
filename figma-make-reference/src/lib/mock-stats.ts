import { UserStats, UserPreferences } from '../types/stats';

export const mockUserStats: UserStats = {
  total_attempts: 47,
  total_passed: 34,
  total_failed: 13,
  total_time_ms: 3420000, // ~57 minutes total
  success_rate: 72.3,
  average_time_ms: 1260000, // ~21 minutes average
  current_streak: 3,
  longest_streak: 7,
  problems_saved: 12,
  hints_used: 18,
  difficulty_breakdown: {
    easy: { attempted: 15, passed: 14 },
    medium: { attempted: 22, passed: 16 },
    hard: { attempted: 10, passed: 4 },
  },
  category_breakdown: [
    { category: 'Arrays', attempted: 12, passed: 9 },
    { category: 'BFS/DFS', attempted: 8, passed: 6 },
    { category: 'Strings', attempted: 7, passed: 5 },
    { category: 'Dynamic Programming', attempted: 6, passed: 4 },
    { category: 'Graphs', attempted: 5, passed: 3 },
    { category: 'Heaps', attempted: 4, passed: 3 },
    { category: 'Two Pointers', attempted: 3, passed: 2 },
    { category: 'Maps/Sets', attempted: 2, passed: 2 },
  ],
  recent_activity: [
    { date: '2024-10-14', attempts: 3 },
    { date: '2024-10-13', attempts: 2 },
    { date: '2024-10-12', attempts: 4 },
    { date: '2024-10-11', attempts: 1 },
    { date: '2024-10-10', attempts: 0 },
    { date: '2024-10-09', attempts: 2 },
    { date: '2024-10-08', attempts: 3 },
  ],
};

export const mockUserPreferences: UserPreferences = {
  theme: 'dark',
  default_provider: 'openai',
  show_hints_by_default: false,
  auto_save_code: true,
  vim_mode: false,
  font_size: 14,
};
