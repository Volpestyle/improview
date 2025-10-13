import { ApiService, createApiService } from '../services/apiService';
import {
  CreateAttemptRequest,
  CreateAttemptResponse,
  GenerateRequest,
  GenerateResponse,
  GetAttemptResponse,
  ProblemPack,
  ProblemPackSchema,
  RunTestsRequest,
  RunTestsResponse,
  SubmitRequest,
  SubmitResponse,
  CreateAttemptResponseSchema,
  GenerateResponseSchema,
  GetAttemptResponseSchema,
  RunTestsResponseSchema,
  SubmitResponseSchema,
} from './types';

export class RestApiClient {
  private readonly api: ApiService;

  constructor(private readonly baseUrl: string, apiService?: ApiService) {
    this.api = apiService ?? createApiService(baseUrl);
  }

  private async request<T>(path: string, init: RequestInit, schema: { parse: (data: unknown) => T }) {
    const payload = await this.api.request(path, init);
    return schema.parse(payload);
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    return this.request('/api/generate', { method: 'POST', body: JSON.stringify(request) }, GenerateResponseSchema);
  }

  async createAttempt(request: CreateAttemptRequest): Promise<CreateAttemptResponse> {
    return this.request('/api/attempt', { method: 'POST', body: JSON.stringify(request) }, CreateAttemptResponseSchema);
  }

  async runTests(request: RunTestsRequest): Promise<RunTestsResponse> {
    return this.request('/api/run-tests', { method: 'POST', body: JSON.stringify(request) }, RunTestsResponseSchema);
  }

  async submit(request: SubmitRequest): Promise<SubmitResponse> {
    return this.request('/api/submit', { method: 'POST', body: JSON.stringify(request) }, SubmitResponseSchema);
  }

  async getAttempt(attemptId: string): Promise<GetAttemptResponse> {
    return this.request(`/api/attempt/${attemptId}`, { method: 'GET' }, GetAttemptResponseSchema);
  }

  async getProblem(problemId: string): Promise<ProblemPack> {
    return this.request(`/api/problem/${problemId}`, { method: 'GET' }, ProblemPackSchema);
  }
}
