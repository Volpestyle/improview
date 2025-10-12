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

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const joinUrl = (baseUrl: string, path: string) => {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

export class RestApiClient {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init: RequestInit, schema: { parse: (data: unknown) => T }) {
    const response = await fetch(joinUrl(this.baseUrl, path), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
      credentials: 'include',
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      throw new ApiError('Request failed', response.status, payload);
    }

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
