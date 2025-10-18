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

export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;
export type CreateAttemptResponse = z.infer<typeof CreateAttemptResponseSchema>;
export type RunSummary = z.infer<typeof RunSummarySchema>;
export type RunTestsResponse = z.infer<typeof RunTestsResponseSchema>;
export type SubmissionSummary = z.infer<typeof SubmissionSummarySchema>;
export type SubmitResponse = z.infer<typeof SubmitResponseSchema>;
export type AttemptWithRuns = z.infer<typeof AttemptWithRunsSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

