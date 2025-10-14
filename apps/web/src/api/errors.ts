/**
 * Custom API error class with structured error handling
 */
export class ApiError extends Error {
    public readonly status: number;
    public readonly statusText: string;
    public readonly body?: unknown;

    constructor(status: number, statusText: string, body?: unknown) {
        super(`API Error ${status}: ${statusText}`);
        this.name = 'ApiError';
        this.status = status;
        this.statusText = statusText;
        this.body = body;

        // Maintains proper stack trace for where error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApiError);
        }
    }

    /**
     * Returns true if this is an authentication error (401/403)
     */
    public isUnauthorized(): boolean {
        return this.status === 401 || this.status === 403;
    }

    /**
     * Returns true if this is a client error (4xx)
     */
    public isClientError(): boolean {
        return this.status >= 400 && this.status < 500;
    }

    /**
     * Returns true if this is a server error (5xx)
     */
    public isServerError(): boolean {
        return this.status >= 500;
    }

    /**
     * Returns a user-friendly error message
     */
    public getUserMessage(): string {
        if (this.isUnauthorized()) {
            return 'Your session has expired. Please log in again.';
        }

        if (this.status === 404) {
            return 'The requested resource was not found.';
        }

        if (this.status === 429) {
            return 'Too many requests. Please try again later.';
        }

        if (this.isServerError()) {
            return 'A server error occurred. Please try again later.';
        }

        // Try to extract message from response body
        if (
            this.body &&
            typeof this.body === 'object' &&
            'message' in this.body &&
            typeof this.body.message === 'string'
        ) {
            return this.body.message;
        }

        return this.message;
    }
}

