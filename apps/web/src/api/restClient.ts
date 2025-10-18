import { ApiService } from './client';
import {
    GenerateRequest,
    GenerateResponse,
    CreateAttemptRequest,
    CreateAttemptResponse,
    CreateSavedProblemRequest,
    CreateSavedProblemResponse,
    RunTestsRequest,
    RunTestsResponse,
    SubmitRequest,
    SubmitResponse,
    AttemptWithRuns,
    GenerateResponseSchema,
    CreateAttemptResponseSchema,
    CreateSavedProblemResponseSchema,
    RunTestsResponseSchema,
    SubmitResponseSchema,
    AttemptWithRunsSchema,
    SavedProblemSummary,
    SavedProblemSummarySchema,
    SavedAttemptSnapshot,
    SavedAttemptSnapshotSchema,
} from '../types/api';
import { ProblemPack, ProblemPackSchema, RunResult } from '../types/problem';

/**
 * REST client for the Improview API
 * Provides typed methods for all API endpoints with Zod validation
 */
export class RestClient {
    constructor(private readonly apiService: ApiService) { }

    /**
     * Generate a new problem pack
     */
    public async generate(request: GenerateRequest): Promise<GenerateResponse> {
        const response = await this.apiService.post<unknown>('/api/generate', request);
        return GenerateResponseSchema.parse(response);
    }

    /**
     * Create a new attempt for a problem
     */
    public async createAttempt(request: CreateAttemptRequest): Promise<CreateAttemptResponse> {
        const response = await this.apiService.post<unknown>('/api/attempt', request);
        return CreateAttemptResponseSchema.parse(response);
    }

    /**
     * Run tests for an attempt
     */
    public async runTests(request: RunTestsRequest): Promise<RunTestsResponse> {
        const response = await this.apiService.post<unknown>('/api/run-tests', request);
        return RunTestsResponseSchema.parse(response);
    }

    /**
     * Submit an attempt (runs hidden tests)
     */
    public async submit(request: SubmitRequest): Promise<SubmitResponse> {
        const response = await this.apiService.post<unknown>('/api/submit', request);
        return SubmitResponseSchema.parse(response);
    }

    /**
     * Get attempt by ID with runs
     */
    public async getAttempt(attemptId: string): Promise<AttemptWithRuns> {
        const response = await this.apiService.get<unknown>(`/api/attempt/${attemptId}`);
        return AttemptWithRunsSchema.parse(response);
    }

    /**
     * Get problem pack by ID
     */
    public async getProblem(problemId: string): Promise<ProblemPack> {
        const response = await this.apiService.get<unknown>(`/api/problem/${problemId}`);
        return ProblemPackSchema.parse(response);
    }

    /**
     * Health check
     */
    public async healthz(): Promise<{ status: string }> {
        return this.apiService.get<{ status: string }>('/api/healthz');
    }

    /**
     * Get version info
     */
    public async version(): Promise<{ version: string }> {
        return this.apiService.get<{ version: string }>('/api/version');
    }

    /**
     * Get test runs for an attempt (for database sync)
     */
    public async getTestRuns(attemptId: string): Promise<{ runs: RunResult[] }> {
        return this.apiService.get<{ runs: RunResult[] }>(`/api/test-runs/${attemptId}`);
    }

    /**
     * Get saved problems for the authenticated user
     */
    public async getSavedProblems(params?: { status?: string; limit?: number }): Promise<{
        saved_problems: SavedProblemSummary[];
        next_token?: string | null;
    }> {
        const searchParams = new URLSearchParams();
        if (params?.status) {
            searchParams.set('status', params.status);
        }
        if (params?.limit !== undefined) {
            searchParams.set('limit', params.limit.toString());
        }
        const queryString = searchParams.toString();
        const queryParams = queryString ? `?${queryString}` : '';
        const response = await this.apiService.get<{ saved_problems: unknown[]; next_token?: string | null }>(
            `/api/user/saved-problems${queryParams}`,
        );
        return {
            saved_problems: SavedProblemSummarySchema.array().parse(response.saved_problems),
            next_token: response.next_token,
        };
    }

    /**
     * Create a saved problem
     */
    public async createSavedProblem(request: CreateSavedProblemRequest): Promise<CreateSavedProblemResponse> {
        const response = await this.apiService.post<unknown>('/api/user/saved-problems', request);
        return CreateSavedProblemResponseSchema.parse(response);
    }

    /**
     * Get attempts for a saved problem
     */
    public async getSavedProblemAttempts(savedProblemId: string): Promise<{ attempts: SavedAttemptSnapshot[] }> {
        const response = await this.apiService.get<{ attempts: unknown[] }>(
            `/api/user/saved-problems/${savedProblemId}/attempts`,
        );
        return {
            attempts: SavedAttemptSnapshotSchema.array().parse(response.attempts),
        };
    }

    /**
     * Create an attempt snapshot for a saved problem
     */
    public async createSavedProblemAttempt(savedProblemId: string, attemptData: {
        attempt_id: string;
        code: string;
        status: 'draft' | 'submitted';
        pass_count: number;
        fail_count: number;
        runtime_ms: number;
        submitted_at?: number;
    }): Promise<{ attempt: SavedAttemptSnapshot }> {
        const response = await this.apiService.post<{ attempt: unknown }>(
            `/api/user/saved-problems/${savedProblemId}/attempts`,
            attemptData,
        );
        return {
            attempt: SavedAttemptSnapshotSchema.parse(response.attempt),
        };
    }
}
