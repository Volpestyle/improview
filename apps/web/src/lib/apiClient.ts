import { ApiService } from '../api/client';
import { RestClient } from '../api/restClient';
import { useAuthStore } from '../state/authStore';

let apiClientInstance: RestClient | null = null;

/**
 * Get or create the API client singleton
 */
export function getApiClient(): RestClient {
    if (!apiClientInstance) {
        const apiService = new ApiService({
            baseURL: import.meta.env.VITE_API_BASE_URL || '',
            getAccessToken: () => useAuthStore.getState().accessToken,
            onUnauthorized: () => useAuthStore.getState().markUnauthorized(),
        });

        apiClientInstance = new RestClient(apiService);
    }

    return apiClientInstance;
}

