import { z } from 'zod';

// ============================================================================
// Base Types
// ============================================================================

export const ExampleSchema = z.object({
    input: z.array(z.unknown()),
    output: z.unknown(),
    explanation: z.string().optional(),
});

export const ComplexitySchema = z.object({
    time: z.string(),
    space: z.string(),
});

export const APIParamSchema = z.object({
    name: z.string(),
    type: z.string(),
    desc: z.string(),
});

export const APIParamReturnSchema = z.object({
    type: z.string(),
    desc: z.string(),
});

export const APISignatureSchema = z.object({
    function_name: z.string(),
    signature: z.string(),
    params: z.array(APIParamSchema),
    returns: APIParamReturnSchema,
});

export const ProblemMetadataSchema = z.object({
    title: z.string(),
    statement: z.string(),
    constraints: z.array(z.string()),
    examples: z.array(ExampleSchema),
    edge_cases: z.array(z.string()),
});

export const SolutionOutlineSchema = z.object({
    approach: z.string(),
    complexity: ComplexitySchema,
    code: z.string(),
});

export const TestSuiteSchema = z.object({
    public: z.array(ExampleSchema),
    hidden: z.array(ExampleSchema),
});

export const WorkspaceFileSchema = z.object({
    code: z.string(),
    hidden: z.boolean().optional(),
});

export const WorkspaceTemplateSchema = z.object({
    entry: z.string(),
    files: z.record(WorkspaceFileSchema),
    dependencies: z.record(z.string()).optional(),
    dev_dependencies: z.record(z.string()).optional(),
    template: z.string().optional(),
    environment: z.string().optional(),
});

export const ProblemPackSchema = z.object({
    problem: ProblemMetadataSchema,
    api: APISignatureSchema,
    time_estimate_minutes: z.number(),
    hint: z.string(),
    solutions: z.array(SolutionOutlineSchema),
    tests: TestSuiteSchema,
    macro_category: z.enum(['dsa', 'frontend', 'system-design']),
    workspace_template: WorkspaceTemplateSchema.optional(),
});

export const RunResultSchema = z.object({
    test_id: z.string(),
    status: z.string(),
    time_ms: z.number(),
    stdout: z.string(),
    stderr: z.string(),
});

export const AttemptSchema = z.object({
    id: z.string(),
    problem_id: z.string(),
    user_id: z.string(),
    lang: z.string(),
    started_at: z.number(),
    ended_at: z.number(),
    hint_used: z.boolean(),
    pass_count: z.number(),
    fail_count: z.number(),
    duration_ms: z.number(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type Example = z.infer<typeof ExampleSchema>;
export type Complexity = z.infer<typeof ComplexitySchema>;
export type APIParam = z.infer<typeof APIParamSchema>;
export type APIParamReturn = z.infer<typeof APIParamReturnSchema>;
export type APISignature = z.infer<typeof APISignatureSchema>;
export type ProblemMetadata = z.infer<typeof ProblemMetadataSchema>;
export type SolutionOutline = z.infer<typeof SolutionOutlineSchema>;
export type TestSuite = z.infer<typeof TestSuiteSchema>;
export type ProblemPack = z.infer<typeof ProblemPackSchema>;
export type WorkspaceTemplate = z.infer<typeof WorkspaceTemplateSchema>;
export type WorkspaceFile = z.infer<typeof WorkspaceFileSchema>;
export type RunResult = z.infer<typeof RunResultSchema>;
export type Attempt = z.infer<typeof AttemptSchema>;

// ============================================================================
// UI-specific Types
// ============================================================================

export type MacroCategory = 'dsa' | 'frontend' | 'system-design';

export type DsaCategory =
    | 'arrays'
    | 'bfs-dfs'
    | 'maps-sets'
    | 'dp'
    | 'graphs'
    | 'strings'
    | 'math'
    | 'heaps'
    | 'two-pointers';

export type FrontendCategory =
    | 'react-components'
    | 'css-layouts'
    | 'accessibility'
    | 'state-management'
    | 'performance'
    | 'forms-validation';

export type SystemDesignCategory =
    | 'scalability'
    | 'databases'
    | 'caching'
    | 'load-balancing'
    | 'microservices'
    | 'api-design';

export type Category = DsaCategory | FrontendCategory | SystemDesignCategory;
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Provider = 'openai' | 'grok';
export type TestVisibility = 'public' | 'hidden';
export type TestStatus = 'pass' | 'fail' | 'timeout' | 'error';

// ============================================================================
// Test Result UI Type
// ============================================================================

export interface TestResult {
    test_id: string;
    status: TestStatus;
    time_ms: number;
    stdout?: string;
    stderr?: string;
    expected?: unknown;
    actual?: unknown;
}
