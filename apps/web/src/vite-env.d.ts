/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_AUTH_DOMAIN: string;
    readonly VITE_AUTH_CLIENT_ID: string;
    readonly VITE_AUTH_CLIENT_SECRET?: string;
    readonly VITE_AUTH_REDIRECT_URI?: string;
    readonly VITE_AUTH_LOGOUT_REDIRECT_URI?: string;
    readonly VITE_AUTH_SCOPE?: string;
    readonly VITE_AUTH_IDENTITY_PROVIDERS?: string;
    readonly VITE_AUTH_GOOGLE_PROVIDER?: string;
    readonly VITE_API_MODE?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

