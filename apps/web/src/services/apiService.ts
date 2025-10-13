import { ApiError } from '../api/errors';
import { useAuthStore } from '../state/authStore';

const joinUrl = (baseUrl: string, path: string) => {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

export type ApiServiceOptions = {
  baseUrl: string;
};

export class ApiService {
  constructor(private readonly options: ApiServiceOptions) {}

  async request(path: string, init: RequestInit = {}) {
    const { accessToken, markUnauthorized } = useAuthStore.getState();
    const headers = new Headers(init.headers ?? undefined);
    headers.set('Content-Type', 'application/json');

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(joinUrl(this.options.baseUrl, path), {
      ...init,
      headers,
      credentials: 'include',
    });

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json().catch(() => null) : await response.text();

    if (response.status === 401) {
      markUnauthorized();
    }

    if (!response.ok) {
      throw new ApiError('Request failed', response.status, payload ?? undefined);
    }

    return payload;
  }
}

export const createApiService = (baseUrl: string) => new ApiService({ baseUrl });
