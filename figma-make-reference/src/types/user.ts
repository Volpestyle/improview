export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Attempt {
  id: string;
  user_id: string;
  problem_id: string;
  problem_title: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  started_at: string;
  ended_at: string;
  duration_ms: number;
  passed: boolean;
  pass_count: number;
  fail_count: number;
  hint_used: boolean;
  code: string;
}

export interface ProblemList {
  id: string;
  name: string;
  description: string;
  user_id: string;
  created_at: string;
  problem_ids: string[];
  problem_count: number;
}
