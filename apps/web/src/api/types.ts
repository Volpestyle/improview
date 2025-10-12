import { z } from 'zod';

export const ExampleSchema = z.object({
  input: z.array(z.unknown()),
  output: z.unknown(),
  explanation: z.string().optional(),
});

export const ProblemPackSchema = z.object({
  problem: z.object({
    title: z.string(),
    statement: z.string(),
    constraints: z.array(z.string()),
    examples: z.array(ExampleSchema),
    edge_cases: z.array(z.string()).default([]),
  }),
  api: z.object({
    function_name: z.string(),
    signature: z.string(),
    params: z.array(
      z.object({
        name: z.string(),
        type: z.string(),
        desc: z.string(),
      }),
    ),
    returns: z.object({
      type: z.string(),
      desc: z.string(),
    }),
  }),
  time_estimate_minutes: z.number().int().min(1),
  hint: z.string(),
  solutions: z
    .array(
      z.object({
        approach: z.string(),
        complexity: z.object({
          time: z.string(),
          space: z.string(),
        }),
        code: z.string(),
      }),
    )
    .min(1),
  tests: z.object({
    public: z.array(ExampleSchema),
    hidden: z.array(ExampleSchema),
  }),
});

export type ProblemPack = z.infer<typeof ProblemPackSchema>;

export const GenerateRequestSchema = z.object({
  category: z.string(),
  difficulty: z.string(),
  customPrompt: z.string().optional(),
  provider: z.string().optional(),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const GenerateResponseSchema = z.object({
  problem_id: z.string(),
  pack: ProblemPackSchema,
});

export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;

export const AttemptSchema = z.object({
  id: z.string(),
  problem_id: z.string(),
  user_id: z.string().optional(),
  lang: z.string(),
  started_at: z.number().optional(),
  ended_at: z.number().optional(),
  hint_used: z.boolean().optional(),
  pass_count: z.number().optional(),
  fail_count: z.number().optional(),
  duration_ms: z.number().optional(),
});

export type Attempt = z.infer<typeof AttemptSchema>;

export const RunResultSchema = z.object({
  test_id: z.string(),
  status: z.enum(['passed', 'failed']),
  time_ms: z.number().optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  message: z.string().optional(),
});

export type RunResult = z.infer<typeof RunResultSchema>;

export const CreateAttemptRequestSchema = z.object({
  problem_id: z.string(),
  lang: z.string(),
  user_id: z.string().optional(),
});

export type CreateAttemptRequest = z.infer<typeof CreateAttemptRequestSchema>;

export const CreateAttemptResponseSchema = z.object({
  attempt: AttemptSchema,
});

export type CreateAttemptResponse = z.infer<typeof CreateAttemptResponseSchema>;

export const RunTestsRequestSchema = z.object({
  attempt_id: z.string(),
  code: z.string(),
  which: z.enum(['public', 'hidden']),
});

export type RunTestsRequest = z.infer<typeof RunTestsRequestSchema>;

export const RunTestsResponseSchema = z.object({
  summary: z.object({
    attempt_id: z.string(),
    results: z.array(RunResultSchema),
  }),
});

export type RunTestsResponse = z.infer<typeof RunTestsResponseSchema>;

export const SubmitRequestSchema = z.object({
  attempt_id: z.string(),
  code: z.string(),
});

export type SubmitRequest = z.infer<typeof SubmitRequestSchema>;

export const SubmitResponseSchema = z.object({
  summary: z.object({
    attempt_id: z.string(),
    passed: z.boolean(),
    runtime_ms: z.number().optional(),
    operations: z.number().optional(),
    hidden_results: z.array(RunResultSchema),
  }),
});

export type SubmitResponse = z.infer<typeof SubmitResponseSchema>;

export const GetAttemptResponseSchema = z.object({
  attempt: AttemptSchema,
  runs: z.array(RunResultSchema),
});

export type GetAttemptResponse = z.infer<typeof GetAttemptResponseSchema>;
