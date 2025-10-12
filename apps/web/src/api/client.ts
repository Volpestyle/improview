import { MockApiClient } from './mockClient';
import { RestApiClient } from './restClient';
import {
  CreateAttemptRequest,
  CreateAttemptResponse,
  GenerateRequest,
  GenerateResponse,
  GetAttemptResponse,
  ProblemPack,
  RunTestsRequest,
  RunTestsResponse,
  SubmitRequest,
  SubmitResponse,
} from './types';

export interface ApiClient {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  createAttempt(request: CreateAttemptRequest): Promise<CreateAttemptResponse>;
  runTests(request: RunTestsRequest): Promise<RunTestsResponse>;
  submit(request: SubmitRequest): Promise<SubmitResponse>;
  getAttempt(attemptId: string): Promise<GetAttemptResponse>;
  getProblem(problemId: string): Promise<ProblemPack>;
}

const DEFAULT_LIVE_BASE_URL = 'http://localhost:8080';

export const createApiClient = (): ApiClient => {
  const mode = import.meta.env.VITE_API_MODE as 'live' | 'mock' | undefined;
  const overrideBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (mode === 'live') {
    const baseUrl = overrideBase ?? DEFAULT_LIVE_BASE_URL;
    return new RestApiClient(baseUrl);
  }

  return new MockApiClient();
};

export const apiClient: ApiClient = createApiClient();
