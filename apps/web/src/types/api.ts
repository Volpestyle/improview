import { z } from 'zod';
import { ProblemPackSchema, AttemptSchema, RunResultSchema } from './problem';

// ============================================================================
// Request Schemas
// ============================================================================

export const GenerateRequestSchema = z.object({
    category: z.string(),
    difficulty: z.string(),
    customPrompt: z.string().optional(),
    provider: z.string().optional(),
    mode: z.enum(['static', 'llm']).optional(),
});

export const CreateAttemptRequestSchema = z.object({
    problem_id: z.string(),
    lang: z.string(),
});

export const CreateSavedProblemRequestSchema = z.object({
    problem_id: z.string(),
    title: z.string().optional(),
    language: z.string(),
    status: z.string().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    hint_unlocked: z.boolean().optional(),
});

export const RunTestsRequestSchema = z.object({
    attempt_id: z.string(),
    code: z.string(),
    which: z.enum(['public', 'hidden']),
});

export const SubmitRequestSchema = z.object({
    attempt_id: z.string(),
    code: z.string(),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const GenerateResponseSchema = z.object({
    problem_id: z.string(),
    pack: ProblemPackSchema,
});

export const CreateAttemptResponseSchema = z.object({
    attempt: AttemptSchema,
});

export const SavedAttemptSnapshotSchema = z.object({
    attempt_id: z.string(),
    status: z.string(),
    updated_at: z.number(),
    pass_count: z.number(),
    fail_count: z.number(),
    submitted_at: z.number().optional(),
    runtime_ms: z.number(),
    code: z.string().optional(),
    code_s3_key: z.string().optional(),
});

export const SavedProblemSummarySchema = z.object({
    id: z.string(),
    problem_id: z.string(),
    title: z.string().optional(),
    language: z.string(),
    status: z.string(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    hint_unlocked: z.boolean(),
    created_at: z.number(),
    updated_at: z.number(),
    last_attempt: SavedAttemptSnapshotSchema.optional(),
});

export const SavedProblemDetailSchema = SavedProblemSummarySchema.extend({
    attempts: z.array(SavedAttemptSnapshotSchema),
});

export const CreateSavedProblemResponseSchema = z.object({
    saved_problem: SavedProblemSummarySchema,
});

export const RunSummarySchema = z.object({
    attempt_id: z.string(),
    results: z.array(RunResultSchema),
});

export const RunTestsResponseSchema = z.object({
    summary: RunSummarySchema,
});

export const SubmissionSummarySchema = z.object({
    attempt_id: z.string(),
    passed: z.boolean(),
    runtime_ms: z.number(),
    operations: z.number(),
    hidden_results: z.array(RunResultSchema),
});

export const SubmitResponseSchema = z.object({
    summary: SubmissionSummarySchema,
});

export const AttemptWithRunsSchema = z.object({
    attempt: AttemptSchema,
    runs: z.array(RunResultSchema),
});

export const ErrorResponseSchema = z.object({
    error: z.string(),
    message: z.string().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type CreateAttemptRequest = z.infer<typeof CreateAttemptRequestSchema>;
export type RunTestsRequest = z.infer<typeof RunTestsRequestSchema>;
export type SubmitRequest = z.infer<typeof SubmitRequestSchema>;
export type CreateSavedProblemRequest = z.infer<typeof CreateSavedProblemRequestSchema>;

export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;
export type CreateAttemptResponse = z.infer<typeof CreateAttemptResponseSchema>;
export type SavedProblemSummary = z.infer<typeof SavedProblemSummarySchema>;
export type RunSummary = z.infer<typeof RunSummarySchema>;
export type RunTestsResponse = z.infer<typeof RunTestsResponseSchema>;
export type SubmissionSummary = z.infer<typeof SubmissionSummarySchema>;
export type SubmitResponse = z.infer<typeof SubmitResponseSchema>;
export type AttemptWithRuns = z.infer<typeof AttemptWithRunsSchema>;
export type CreateSavedProblemResponse = z.infer<typeof CreateSavedProblemResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type SavedAttemptSnapshot = z.infer<typeof SavedAttemptSnapshotSchema>;
export type SavedProblemDetail = z.infer<typeof SavedProblemDetailSchema>;
