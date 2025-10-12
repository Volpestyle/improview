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

const DEFAULT_API_BASE_URL = '';

export const createApiClient = (): ApiClient => {
  const overrideBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const baseUrl = overrideBase ?? DEFAULT_API_BASE_URL;
  return new RestApiClient(baseUrl);
};

export const apiClient: ApiClient = createApiClient();
