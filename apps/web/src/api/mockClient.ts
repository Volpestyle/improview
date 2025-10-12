import { ProblemPack } from './types';
import {
  Attempt,
  CreateAttemptRequest,
  CreateAttemptResponse,
  GenerateRequest,
  GenerateResponse,
  RunResult,
  RunTestsRequest,
  RunTestsResponse,
  SubmitRequest,
  SubmitResponse,
  GetAttemptResponse,
} from './types';
import { sampleProblemPack } from '../mocks/sampleProblem';

interface StoredRun extends RunResult {
  scope: 'public' | 'hidden';
  createdAt: number;
}

export class MockApiClient {
  private problems = new Map<string, ProblemPack>();

  private attempts = new Map<string, Attempt>();

  private runs = new Map<string, StoredRun[]>();

  private problemCounter = 0;

  private attemptCounter = 0;

  constructor() {
    const problemId = 'prob_mock';
    this.problems.set(problemId, sampleProblemPack);
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const problemId = `prob_${++this.problemCounter}`;
    const pack: ProblemPack = {
      ...sampleProblemPack,
      problem: {
        ...sampleProblemPack.problem,
        title:
          request.customPrompt && request.customPrompt.length > 0
            ? `${sampleProblemPack.problem.title} — Custom`
            : sampleProblemPack.problem.title,
      },
    };

    this.problems.set(problemId, pack);

    return {
      problem_id: problemId,
      pack,
    };
  }

  async createAttempt(request: CreateAttemptRequest): Promise<CreateAttemptResponse> {
    const attemptId = `att_${++this.attemptCounter}`;
    const attempt: Attempt = {
      id: attemptId,
      problem_id: request.problem_id,
      user_id: 'mock-user',
      lang: request.lang,
      started_at: Math.floor(Date.now() / 1000),
      ended_at: 0,
      hint_used: false,
      pass_count: 0,
      fail_count: 0,
      duration_ms: 0,
    };
    this.attempts.set(attemptId, attempt);
    this.runs.set(attemptId, []);
    return { attempt };
  }

  async runTests(request: RunTestsRequest): Promise<RunTestsResponse> {
    const attempt = this.attempts.get(request.attempt_id);
    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const pack = this.problems.get(attempt.problem_id);
    if (!pack) {
      throw new Error('Problem not found');
    }

    const tests = request.which === 'public' ? pack.tests.public : pack.tests.hidden;
    const shouldFail = request.code.toLowerCase().includes('fail');
    const results: RunResult[] = tests.map((_, index) => ({
      test_id: `${request.which}_${index}`,
      status: shouldFail ? 'failed' : 'passed',
      time_ms: 12 + index * 3,
      stdout: shouldFail ? '' : 'ok',
      stderr: shouldFail ? 'Expected different output' : '',
    }));

    const storedRuns = this.runs.get(request.attempt_id) ?? [];
    storedRuns.push(
      ...results.map((result) => ({
        ...result,
        scope: request.which,
        createdAt: Date.now(),
      })),
    );
    this.runs.set(request.attempt_id, storedRuns);

    const passCount = results.filter((r) => r.status === 'passed').length;
    const failCount = results.length - passCount;

    this.attempts.set(request.attempt_id, {
      ...attempt,
      pass_count: (attempt.pass_count ?? 0) + passCount,
      fail_count: (attempt.fail_count ?? 0) + failCount,
    });

    return {
      summary: {
        attempt_id: request.attempt_id,
        results,
      },
    };
  }

  async submit(request: SubmitRequest): Promise<SubmitResponse> {
    const runSummary = await this.runTests({ ...request, which: 'hidden' });
    const attempt = this.attempts.get(request.attempt_id);
    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const passed = runSummary.summary.results.every((result) => result.status === 'passed');

    const updatedAttempt: Attempt = {
      ...attempt,
      ended_at: Math.floor(Date.now() / 1000),
    };
    this.attempts.set(request.attempt_id, updatedAttempt);

    return {
      summary: {
        attempt_id: request.attempt_id,
        passed,
        runtime_ms: runSummary.summary.results.reduce((acc, result) => acc + (result.time_ms ?? 0), 0),
        operations: passed ? 1000 : 0,
        hidden_results: runSummary.summary.results,
      },
    };
  }

  async getAttempt(attemptId: string): Promise<GetAttemptResponse> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const runs = this.runs.get(attemptId) ?? [];
    const sortedRuns = [...runs].sort((a, b) => a.createdAt - b.createdAt).map((run) => ({
      test_id: run.test_id,
      status: run.status,
      time_ms: run.time_ms,
      stdout: run.stdout,
      stderr: run.stderr,
    }));

    return {
      attempt,
      runs: sortedRuns,
    };
  }

  async getProblem(problemId: string): Promise<ProblemPack> {
    const problem = this.problems.get(problemId);
    if (!problem) {
      throw new Error('Problem not found');
    }
    return problem;
  }
}
