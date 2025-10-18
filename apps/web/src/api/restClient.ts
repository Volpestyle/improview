import { ApiService } from './client';
import {
    GenerateRequest,
    GenerateResponse,
    CreateAttemptRequest,
    CreateAttemptResponse,
    RunTestsRequest,
    RunTestsResponse,
    SubmitRequest,
    SubmitResponse,
    AttemptWithRuns,
    GenerateResponseSchema,
    CreateAttemptResponseSchema,
    RunTestsResponseSchema,
    SubmitResponseSchema,
    AttemptWithRunsSchema,
} from '../types/api';
import { ProblemPack, ProblemPackSchema } from '../types/problem';

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
}

