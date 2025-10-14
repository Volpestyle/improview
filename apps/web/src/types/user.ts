import { z } from 'zod';

// ============================================================================
// User Schemas
// ============================================================================

export const UserSchema = z.object({
    id: z.string().optional(),
    username: z.string().optional(),
    name: z.string().optional(),
    email: z.string().email().optional(),
    created_at: z.string().optional(),
    avatar_url: z.string().url().optional(),
});

export const AttemptHistorySchema = z.object({
    id: z.string(),
    user_id: z.string(),
    problem_id: z.string(),
    problem_title: z.string(),
    category: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    started_at: z.string(),
    ended_at: z.string(),
    duration_ms: z.number(),
    passed: z.boolean(),
    pass_count: z.number(),
    fail_count: z.number(),
    hint_used: z.boolean(),
    code: z.string(),
});

export const ProblemListSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    user_id: z.string(),
    created_at: z.string(),
    problem_ids: z.array(z.string()),
    problem_count: z.number().nonnegative(),
});

export const SavedProblemSchema = AttemptHistorySchema.extend({
    saved_at: z.string(),
    lists: z.array(z.string()),
    saved_id: z.string().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type User = z.infer<typeof UserSchema>;
export type AttemptHistory = z.infer<typeof AttemptHistorySchema>;
export type ProblemList = z.infer<typeof ProblemListSchema>;
export type SavedProblem = z.infer<typeof SavedProblemSchema>;
