import { ApiError } from './errors';

/**
 * Configuration for the API service
 */
export interface ApiServiceConfig {
    baseURL: string;
    getAccessToken?: () => string | null;
    onUnauthorized?: () => void;
}

/**
 * Core API service for making HTTP requests
 */
export class ApiService {
    private readonly baseURL: string;
    private readonly getAccessToken?: () => string | null;
    private readonly onUnauthorized?: () => void;

    constructor(config: ApiServiceConfig) {
        this.baseURL = config.baseURL;
        this.getAccessToken = config.getAccessToken;
        this.onUnauthorized = config.onUnauthorized;
    }

    /**
     * Make a request to the API
     */
    public async request<TResponse>(
        method: string,
        path: string,
        body?: unknown
    ): Promise<TResponse> {
        const url = `${this.baseURL}${path}`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        // Inject authorization token if available
        if (this.getAccessToken) {
            const token = this.getAccessToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const options: RequestInit = {
            method,
            headers,
            credentials: 'include', // Include cookies for compatibility
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);

            // Handle unauthorized responses
            if (response.status === 401) {
                if (this.onUnauthorized) {
                    this.onUnauthorized();
                }
            }

            // Parse response body
            let responseBody: unknown;
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                try {
                    responseBody = await response.json();
                } catch {
                    // Ignore JSON parse errors
                    responseBody = await response.text();
                }
            } else {
                responseBody = await response.text();
            }

            // Throw on error status
            if (!response.ok) {
                throw new ApiError(response.status, response.statusText, responseBody);
            }

            return responseBody as TResponse;
        } catch (error) {
            // Re-throw ApiError instances
            if (error instanceof ApiError) {
                throw error;
            }

            // Wrap network errors
            if (error instanceof TypeError) {
                throw new ApiError(0, 'Network error', { originalError: error });
            }

            // Unknown error
            throw new ApiError(0, 'Unknown error', { originalError: error });
        }
    }

    /**
     * Convenience methods
     */
    public get<TResponse>(path: string): Promise<TResponse> {
        return this.request<TResponse>('GET', path);
    }

    public post<TResponse>(path: string, body?: unknown): Promise<TResponse> {
        return this.request<TResponse>('POST', path, body);
    }

    public put<TResponse>(path: string, body?: unknown): Promise<TResponse> {
        return this.request<TResponse>('PUT', path, body);
    }

    public delete<TResponse>(path: string): Promise<TResponse> {
        return this.request<TResponse>('DELETE', path);
    }
}

