import { User, UserSchema } from '../types/user';

/**
 * PKCE helper functions for OAuth 2.0 with PKCE
 */

/**
 * Generate a cryptographically secure random string for PKCE code verifier
 */
export function createCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64URLEncode(array);
}

/**
 * Create a code challenge from a code verifier using SHA-256
 */
export async function createCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return base64URLEncode(new Uint8Array(hash));
}

/**
 * Base64URL encode (RFC 4648 Section 5)
 */
function base64URLEncode(array: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...array));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function createState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return base64URLEncode(array);
}

/**
 * Configuration for the Auth service
 */
export interface AuthConfig {
    domain: string;
    clientId: string;
    clientSecret?: string;
    redirectUri?: string;
    logoutRedirectUri?: string;
    scope?: string;
    identityProviders?: string[];
    googleProvider?: string;
}

/**
 * Token response from OAuth provider
 */
export interface AuthTokenResponse {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    token_type: string;
    expires_in: number;
}

/**
 * Authentication service for OAuth 2.0 / Cognito
 */
export class AuthService {
    private readonly config: AuthConfig;
    private readonly authorizeEndpoint: string;
    private readonly tokenEndpoint: string;
    private readonly logoutEndpoint: string;

    constructor(config: AuthConfig) {
        this.config = {
            ...config,
            redirectUri: config.redirectUri || `${window.location.origin}/auth/callback`,
            logoutRedirectUri: config.logoutRedirectUri || window.location.origin,
            scope: config.scope || 'openid profile email',
        };

        // Normalize domain (remove protocol if present)
        const domain = config.domain.replace(/^https?:\/\//, '');

        this.authorizeEndpoint = `https://${domain}/oauth2/authorize`;
        this.tokenEndpoint = `https://${domain}/oauth2/token`;
        this.logoutEndpoint = `https://${domain}/logout`;
    }

    /**
     * Initiate OAuth login flow with PKCE
     */
    public async initiateLogin(redirectPath?: string): Promise<void> {
        const verifier = createCodeVerifier();
        const challenge = await createCodeChallenge(verifier);
        const state = createState();

        // Store PKCE parameters and redirect path in sessionStorage
        sessionStorage.setItem('pkce_verifier', verifier);
        sessionStorage.setItem('pkce_state', state);
        if (redirectPath) {
            sessionStorage.setItem('auth_redirect', redirectPath);
        }

        // Build authorization URL
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            response_type: 'code',
            redirect_uri: this.config.redirectUri!,
            scope: this.config.scope!,
            state,
            code_challenge: challenge,
            code_challenge_method: 'S256',
        });

        // Add identity provider if specified
        if (this.config.identityProviders && this.config.identityProviders.length > 0) {
            params.set('identity_provider', this.config.identityProviders[0]);
        }

        const authorizeUrl = `${this.authorizeEndpoint}?${params.toString()}`;
        window.location.href = authorizeUrl;
    }

    /**
     * Initiate direct Google OAuth login flow (skips Cognito hosted UI)
     */
    public async initiateGoogleLogin(redirectPath?: string): Promise<void> {
        const verifier = createCodeVerifier();
        const challenge = await createCodeChallenge(verifier);
        const state = createState();

        // Store PKCE parameters and redirect path in sessionStorage
        sessionStorage.setItem('pkce_verifier', verifier);
        sessionStorage.setItem('pkce_state', state);
        if (redirectPath) {
            sessionStorage.setItem('auth_redirect', redirectPath);
        }

        // Build authorization URL with Google as the identity provider
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            response_type: 'code',
            redirect_uri: this.config.redirectUri!,
            scope: this.config.scope!,
            state,
            code_challenge: challenge,
            code_challenge_method: 'S256',
            identity_provider: 'Google', // Force direct Google OAuth flow
        });

        const authorizeUrl = `${this.authorizeEndpoint}?${params.toString()}`;
        window.location.href = authorizeUrl;
    }

    /**
     * Handle OAuth callback and exchange code for tokens
     */
    public async handleCallback(code: string, state: string): Promise<AuthTokenResponse> {
        // Validate state parameter
        const storedState = sessionStorage.getItem('pkce_state');
        if (!storedState || storedState !== state) {
            throw new Error('Invalid state parameter');
        }

        // Retrieve code verifier
        const verifier = sessionStorage.getItem('pkce_verifier');
        if (!verifier) {
            throw new Error('Missing PKCE verifier');
        }

        // Exchange authorization code for tokens
        const response = await this.exchangeCode(code, verifier);

        // Clean up session storage
        sessionStorage.removeItem('pkce_verifier');
        sessionStorage.removeItem('pkce_state');

        return response;
    }

    /**
     * Exchange authorization code for tokens
     */
    private async exchangeCode(code: string, verifier: string): Promise<AuthTokenResponse> {
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: this.config.clientId,
            code,
            redirect_uri: this.config.redirectUri!,
            code_verifier: verifier,
        });

        // Add client secret for confidential clients
        if (this.config.clientSecret) {
            body.set('client_secret', this.config.clientSecret);
        }

        const response = await fetch(this.tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token exchange failed: ${errorText}`);
        }

        return response.json();
    }

    /**
     * Refresh access token using refresh token
     */
    public async refreshToken(refreshToken: string): Promise<AuthTokenResponse> {
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: this.config.clientId,
            refresh_token: refreshToken,
        });

        if (this.config.clientSecret) {
            body.set('client_secret', this.config.clientSecret);
        }

        const response = await fetch(this.tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token refresh failed: ${errorText}`);
        }

        return response.json();
    }

    /**
     * Initiate logout flow
     */
    public logout(): void {
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            logout_uri: this.config.logoutRedirectUri!,
        });

        const logoutUrl = `${this.logoutEndpoint}?${params.toString()}`;
        window.location.href = logoutUrl;
    }

    /**
     * Decode JWT ID token to extract user information
     */
    public decodeIdToken(idToken: string): User {
        try {
            const parts = idToken.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid ID token format');
            }

            const payload = JSON.parse(atob(parts[1]));

            // Extract user information from standard OIDC claims
            const username =
                payload['cognito:username'] || payload.preferred_username || payload.sub || undefined;
            const displayName = payload.name || username || payload.email || undefined;

            const user = {
                id: payload.sub ?? undefined,
                username,
                name: displayName,
                email: payload.email,
                created_at: payload['custom:created_at'] || payload.updated_at || undefined,
                avatar_url: payload.picture || undefined,
            };

            return UserSchema.parse(user);
        } catch (error) {
            throw new Error(`Failed to decode ID token: ${error}`);
        }
    }

    /**
     * Get stored redirect path from session storage
     */
    public getRedirectPath(): string | null {
        return sessionStorage.getItem('auth_redirect');
    }

    /**
     * Clear stored redirect path
     */
    public clearRedirectPath(): void {
        sessionStorage.removeItem('auth_redirect');
    }
}
