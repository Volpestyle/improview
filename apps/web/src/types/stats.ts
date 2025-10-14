import { z } from 'zod';

export const DifficultyBreakdownSchema = z.object({
  easy: z.object({ attempted: z.number(), passed: z.number() }),
  medium: z.object({ attempted: z.number(), passed: z.number() }),
  hard: z.object({ attempted: z.number(), passed: z.number() }),
});

export const CategoryBreakdownSchema = z.array(
  z.object({
    category: z.string(),
    attempted: z.number(),
    passed: z.number(),
  }),
);

export const RecentActivitySchema = z.array(
  z.object({
    date: z.string(),
    attempts: z.number(),
  }),
);

export const UserStatsSchema = z.object({
  total_attempts: z.number(),
  total_passed: z.number(),
  total_failed: z.number(),
  total_time_ms: z.number(),
  success_rate: z.number(),
  average_time_ms: z.number(),
  current_streak: z.number(),
  longest_streak: z.number(),
  problems_saved: z.number(),
  hints_used: z.number(),
  difficulty_breakdown: DifficultyBreakdownSchema,
  category_breakdown: CategoryBreakdownSchema,
  recent_activity: RecentActivitySchema,
});

export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  default_provider: z.enum(['openai', 'grok']),
  show_hints_by_default: z.boolean(),
  auto_save_code: z.boolean(),
  vim_mode: z.boolean(),
  font_size: z.number(),
});

export type UserStats = z.infer<typeof UserStatsSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
