import { AuthService, AuthConfig } from '../services/authService';

let authServiceInstance: AuthService | null = null;

/**
 * Get or create the auth service singleton
 */
export function getAuthService(): AuthService {
    if (!authServiceInstance) {
        const config: AuthConfig = {
            domain: import.meta.env.VITE_AUTH_DOMAIN || '',
            clientId: import.meta.env.VITE_AUTH_CLIENT_ID || '',
            clientSecret: import.meta.env.VITE_AUTH_CLIENT_SECRET,
            redirectUri: import.meta.env.VITE_AUTH_REDIRECT_URI,
            logoutRedirectUri: import.meta.env.VITE_AUTH_LOGOUT_REDIRECT_URI,
            scope: import.meta.env.VITE_AUTH_SCOPE,
            identityProviders: import.meta.env.VITE_AUTH_IDENTITY_PROVIDERS
                ? import.meta.env.VITE_AUTH_IDENTITY_PROVIDERS.split(',')
                : undefined,
            googleProvider: import.meta.env.VITE_AUTH_GOOGLE_PROVIDER,
        };

        authServiceInstance = new AuthService(config);
    }

    return authServiceInstance;
}

