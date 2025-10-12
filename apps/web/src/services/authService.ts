type AuthConfig = {
  domain: string;
  clientId: string;
  redirectUri: string;
  logoutUri: string;
  clientSecret?: string;
  scope?: string;
  identityProviders?: string;
};

export type AuthTokenResponse = {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
};

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

const DEFAULT_SCOPE = 'openid profile email';
const DEFAULT_IDENTITY_PROVIDERS = (import.meta.env.VITE_AUTH_IDENTITY_PROVIDERS as string | undefined)?.trim();

const normalizeDomain = (domain: string) => {
  const trimmed = domain.trim();
  if (!trimmed) {
    return trimmed;
  }
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, '');
  return withoutProtocol.endsWith('/') ? withoutProtocol.slice(0, -1) : withoutProtocol;
};

const getCrypto = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  throw new Error('No crypto implementation available for PKCE.');
};

const randomString = (length = 43) => {
  const crypto = getCrypto();
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const result = [];
  const randomValues = new Uint8Array(length);
  if ('getRandomValues' in crypto) {
    crypto.getRandomValues(randomValues);
  } else {
    throw new Error('No random generator available for PKCE.');
  }

  for (let i = 0; i < length; i++) {
    result.push(charset.charAt(randomValues[i]! % charset.length));
  }
  return result.join('');
};

const base64UrlEncode = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const sha256 = async (text: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const crypto = getCrypto();
  if ('subtle' in crypto && crypto.subtle?.digest) {
    return crypto.subtle.digest('SHA-256', data);
  }
  throw new Error('No SHA-256 implementation available.');
};

const decodeJwtPayload = <T extends Record<string, unknown>>(token?: string): T | null => {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  const payload = parts[1] ?? '';
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  try {
    const decodeBase64 = (input: string) => {
      if (typeof atob === 'function') {
        return atob(input);
      }
      const globalBuffer = (globalThis as unknown as { Buffer?: { from: (value: string, encoding: string) => { toString: (encoding: string) => string } } }).Buffer;
      if (globalBuffer?.from) {
        return globalBuffer.from(input, 'base64').toString('binary');
      }
      throw new Error('Missing base64 decoder for JWT payload');
    };

    const decoded = decodeBase64(padded);
    const json = decodeURIComponent(
      decoded
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn('Failed to decode ID token payload', error);
    return null;
  }
};

const resolveConfigFromEnv = (): AuthConfig | null => {
  const domain = import.meta.env.VITE_AUTH_DOMAIN as string | undefined;
  const clientId = import.meta.env.VITE_AUTH_CLIENT_ID as string | undefined;

  if (!domain || !clientId) {
    return null;
  }

  return {
    domain: normalizeDomain(domain),
    clientId: clientId.trim(),
    redirectUri: (import.meta.env.VITE_AUTH_REDIRECT_URI as string | undefined)?.trim() || '',
    logoutUri: (import.meta.env.VITE_AUTH_LOGOUT_REDIRECT_URI as string | undefined)?.trim() || '',
    clientSecret: (import.meta.env.VITE_AUTH_CLIENT_SECRET as string | undefined)?.trim() || undefined,
    scope: (import.meta.env.VITE_AUTH_SCOPE as string | undefined)?.trim(),
    identityProviders: DEFAULT_IDENTITY_PROVIDERS || undefined,
  };
};

const authConfig = resolveConfigFromEnv();

const getTokenEndpoint = (config: AuthConfig) => `https://${config.domain}/oauth2/token`;
const getAuthorizeEndpoint = (config: AuthConfig) => `https://${config.domain}/oauth2/authorize`;
const getLogoutEndpoint = (config: AuthConfig) => `https://${config.domain}/logout`;

export const AUTH_SESSION_KEYS = {
  codeVerifier: 'improview_pkce_code_verifier',
  state: 'improview_pkce_state',
  redirect: 'improview_post_login_redirect',
} as const;

export const createCodeVerifier = () => randomString(64);

export const createState = () => randomString(32);

export const createCodeChallenge = async (verifier: string) => {
  const digest = await sha256(verifier);
  return base64UrlEncode(digest);
};

export class AuthService {
  constructor(private readonly config: AuthConfig | null) {}

  private ensureConfig(): AuthConfig {
    if (!this.config) {
      throw new AuthError(
        'Auth configuration is missing. Ensure VITE_AUTH_DOMAIN and VITE_AUTH_CLIENT_ID are set.',
        0,
      );
    }
    if (!this.config.redirectUri) {
      if (typeof window !== 'undefined') {
        this.config.redirectUri = `${window.location.origin}/auth/callback`;
      } else {
        throw new AuthError('Auth redirect URI is not configured.', 0);
      }
    }
    if (!this.config.logoutUri) {
      if (typeof window !== 'undefined') {
        this.config.logoutUri = window.location.origin;
      } else {
        throw new AuthError('Auth logout URI is not configured.', 0);
      }
    }
    return this.config;
  }

  buildAuthorizeUrl(params: { state: string; codeChallenge: string; identityProvider?: string; redirectUri?: string }) {
    const config = this.ensureConfig();
    const url = new URL(getAuthorizeEndpoint(config));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri ?? config.redirectUri);
    url.searchParams.set('scope', config.scope || DEFAULT_SCOPE);
    url.searchParams.set('state', params.state);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    if (params.identityProvider) {
      url.searchParams.set('identity_provider', params.identityProvider);
    } else if (config.identityProviders) {
      url.searchParams.set('identity_provider', config.identityProviders);
    }
    return url.toString();
  }

  async exchangeCode(code: string, codeVerifier: string, overrideRedirectUri?: string): Promise<AuthTokenResponse> {
    const config = this.ensureConfig();
    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('client_id', config.clientId);
    body.set('code', code);
    body.set('code_verifier', codeVerifier);
    body.set('redirect_uri', overrideRedirectUri ?? config.redirectUri);

    if (config.clientSecret) {
      body.set('client_secret', config.clientSecret);
    }

    const response = await fetch(getTokenEndpoint(config), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        (payload &&
          typeof payload === 'object' &&
          'error_description' in payload &&
          typeof payload.error_description === 'string'
          ? payload.error_description
          : 'Authentication failed');
      throw new AuthError(message, response.status, payload ?? undefined);
    }

    return this.normalizeTokenResponse(payload);
  }

  async refreshWithToken(refreshToken: string): Promise<AuthTokenResponse> {
    const config = this.ensureConfig();
    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('client_id', config.clientId);
    body.set('refresh_token', refreshToken);

    if (config.clientSecret) {
      body.set('client_secret', config.clientSecret);
    }

    const response = await fetch(getTokenEndpoint(config), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        (payload &&
          typeof payload === 'object' &&
          'error_description' in payload &&
          typeof payload.error_description === 'string'
          ? payload.error_description
          : 'Token refresh failed');
      throw new AuthError(message, response.status, payload ?? undefined);
    }

    return this.normalizeTokenResponse(payload);
  }

  getLogoutUrl(postLogoutRedirectUri?: string) {
    const config = this.ensureConfig();
    const url = new URL(getLogoutEndpoint(config));
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('logout_uri', postLogoutRedirectUri ?? config.logoutUri);
    return url.toString();
  }

  decodeUser(idToken: string | undefined, fallbackUsername?: string): { username: string; email?: string } {
    const payload = decodeJwtPayload<Record<string, unknown>>(idToken);
    if (!payload) {
      return { username: fallbackUsername ?? '' };
    }

    const email = typeof payload.email === 'string' ? payload.email : undefined;
    const usernameClaim =
      (typeof payload['cognito:username'] === 'string' && payload['cognito:username']) ||
      (typeof payload.preferred_username === 'string' && payload.preferred_username) ||
      (typeof payload.username === 'string' && payload.username) ||
      email ||
      fallbackUsername;

    return {
      username: (usernameClaim as string | undefined) ?? fallbackUsername ?? '',
      email,
    };
  }

  private normalizeTokenResponse(payload: Record<string, unknown> | null): AuthTokenResponse {
    const accessToken = typeof payload?.access_token === 'string' ? payload.access_token : '';
    if (!accessToken) {
      throw new AuthError('Authentication response missing access token', 500, payload ?? undefined);
    }

    return {
      accessToken,
      idToken: typeof payload?.id_token === 'string' ? payload.id_token : undefined,
      refreshToken: typeof payload?.refresh_token === 'string' ? payload.refresh_token : undefined,
      expiresIn: typeof payload?.expires_in === 'number' ? payload.expires_in : undefined,
      tokenType: typeof payload?.token_type === 'string' ? payload.token_type : undefined,
    };
  }
}

export const authService = new AuthService(authConfig);

export const composeAuthUser = (params: { idToken?: string; fallbackUsername?: string }) =>
  authService.decodeUser(params.idToken, params.fallbackUsername);
