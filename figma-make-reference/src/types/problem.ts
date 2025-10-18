export interface Example {
  input: unknown[];
  output: unknown;
  explanation?: string;
}

export interface ProblemPack {
  id: string;
  problem: {
    title: string;
    statement: string;
    constraints: string[];
    examples: Example[];
    edge_cases: string[];
  };
  api: {
    function_name: string;
    signature: string;
    params: Array<{ name: string; type: string; desc: string }>;
    returns: { type: string; desc: string };
  };
  time_estimate_minutes: number;
  hint: string;
  solutions: Array<{
    approach: string;
    complexity: { time: string; space: string };
    code: string;
  }>;
  tests: {
    public: Example[];
    hidden: Example[];
  };
}

export interface TestResult {
  test_id: string;
  status: 'pass' | 'fail' | 'timeout' | 'error';
  time_ms: number;
  stdout?: string;
  stderr?: string;
  expected?: unknown;
  actual?: unknown;
}

export type MacroCategory = 'dsa' | 'frontend' | 'system-design';

export type DsaCategory = 'arrays' | 'bfs-dfs' | 'maps-sets' | 'dp' | 'graphs' | 'strings' | 'math' | 'heaps' | 'two-pointers';
export type FrontendCategory = 'react-components' | 'css-layouts' | 'accessibility' | 'state-management' | 'performance' | 'forms-validation';
export type SystemDesignCategory = 'scalability' | 'databases' | 'caching' | 'load-balancing' | 'microservices' | 'api-design';

export type Category = DsaCategory | FrontendCategory | SystemDesignCategory;
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Provider = 'openai' | 'grok';
