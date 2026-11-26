import { ApiError } from './errors';

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  skipAuth?: boolean;
}

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'modus_auth_token',
  REFRESH_TOKEN: 'modus_refresh_token',
  REMEMBER_ME: 'modus_remember_me',
} as const;

export const AUTH_EVENTS = {
  UPDATED: 'modus:auth-updated',
  CLEARED: 'modus:auth-cleared',
} as const;

// In-memory token store fallback (used on SSR or if Web Storage is restricted)
let activeAccessToken: string | null = null;
let activeRefreshToken: string | null = null;

// Synchronized in-flight refresh promise to deduplicate concurrent refresh calls in this tab
let refreshPromise: Promise<string | null> | null = null;

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    let jsonPayload: string;
    if (typeof atob === 'function') {
      jsonPayload = decodeURIComponent(
        atob(padded)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } else {
      jsonPayload = Buffer.from(padded, 'base64').toString('utf8');
    }

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Returns the expiration timestamp of a JWT in epoch milliseconds, or null if absent/invalid.
 */
export function getTokenExpirationMs(token: string | null | undefined): number | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  if (typeof payload.exp !== 'number') return null;
  return payload.exp * 1000;
}

/**
 * Checks if a JWT token is expired or within `offsetSeconds` of expiring.
 */
export function isTokenExpired(token: string | null | undefined, offsetSeconds: number = 30): boolean {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  if (!payload.exp) return false;
  return Date.now() >= payload.exp * 1000 - offsetSeconds * 1000;
}

function readStorageItem(store: Storage, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageItem(store: Storage, key: string, value: string): void {
  try {
    store.setItem(key, value);
  } catch {
    // Web Storage may be unavailable in restricted contexts
  }
}

function removeStorageItem(store: Storage, key: string): void {
  try {
    store.removeItem(key);
  } catch {
    // Web Storage may be unavailable in restricted contexts
  }
}

function emitAuthEvent(name: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name));
  }
}

/**
 * Persists or clears auth tokens based on the rememberMe preference.
 * - rememberMe = true: stored authoritatively in localStorage (persists across tabs & restarts).
 * - rememberMe = false: stored in sessionStorage (scoped to current browser session).
 */
export function setAuthTokens(
  tokens: { accessToken: string; refreshToken: string } | null,
  rememberMe?: boolean
) {
  if (!tokens) {
    activeAccessToken = null;
    activeRefreshToken = null;
    if (typeof window !== 'undefined') {
      removeStorageItem(window.sessionStorage, STORAGE_KEYS.AUTH_TOKEN);
      removeStorageItem(window.sessionStorage, STORAGE_KEYS.REFRESH_TOKEN);
      removeStorageItem(window.localStorage, STORAGE_KEYS.AUTH_TOKEN);
      removeStorageItem(window.localStorage, STORAGE_KEYS.REFRESH_TOKEN);
      removeStorageItem(window.localStorage, STORAGE_KEYS.REMEMBER_ME);
      emitAuthEvent(AUTH_EVENTS.CLEARED);
    }
    return;
  }

  activeAccessToken = tokens.accessToken;
  activeRefreshToken = tokens.refreshToken;

  if (typeof window !== 'undefined') {
    const isRemembered =
      rememberMe !== undefined
        ? rememberMe
        : readStorageItem(window.localStorage, STORAGE_KEYS.REMEMBER_ME) === 'true';

    if (isRemembered) {
      writeStorageItem(window.localStorage, STORAGE_KEYS.REMEMBER_ME, 'true');
      writeStorageItem(window.localStorage, STORAGE_KEYS.AUTH_TOKEN, tokens.accessToken);
      writeStorageItem(window.localStorage, STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      // Avoid stale sessionStorage copies shadowing cross-tab rotations in localStorage
      removeStorageItem(window.sessionStorage, STORAGE_KEYS.AUTH_TOKEN);
      removeStorageItem(window.sessionStorage, STORAGE_KEYS.REFRESH_TOKEN);
    } else {
      removeStorageItem(window.localStorage, STORAGE_KEYS.REMEMBER_ME);
      removeStorageItem(window.localStorage, STORAGE_KEYS.AUTH_TOKEN);
      removeStorageItem(window.localStorage, STORAGE_KEYS.REFRESH_TOKEN);
      writeStorageItem(window.sessionStorage, STORAGE_KEYS.AUTH_TOKEN, tokens.accessToken);
      writeStorageItem(window.sessionStorage, STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    }

    emitAuthEvent(AUTH_EVENTS.UPDATED);
  }
}

export function isRememberMeActive(): boolean {
  if (typeof window === 'undefined') return false;
  return readStorageItem(window.localStorage, STORAGE_KEYS.REMEMBER_ME) === 'true';
}

export function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    const stored = isRememberMeActive()
      ? readStorageItem(window.localStorage, STORAGE_KEYS.AUTH_TOKEN) ||
        readStorageItem(window.sessionStorage, STORAGE_KEYS.AUTH_TOKEN)
      : readStorageItem(window.sessionStorage, STORAGE_KEYS.AUTH_TOKEN) ||
        readStorageItem(window.localStorage, STORAGE_KEYS.AUTH_TOKEN);

    if (stored) {
      activeAccessToken = stored;
      return stored;
    }
  }
  return activeAccessToken;
}

export function getRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    const stored = isRememberMeActive()
      ? readStorageItem(window.localStorage, STORAGE_KEYS.REFRESH_TOKEN) ||
        readStorageItem(window.sessionStorage, STORAGE_KEYS.REFRESH_TOKEN)
      : readStorageItem(window.sessionStorage, STORAGE_KEYS.REFRESH_TOKEN) ||
        readStorageItem(window.localStorage, STORAGE_KEYS.REFRESH_TOKEN);

    if (stored) {
      activeRefreshToken = stored;
      return stored;
    }
  }
  return activeRefreshToken;
}

function extractTokenPair(payload: any): { accessToken: string; refreshToken: string } | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload.tokens ?? payload.data?.tokens ?? payload.data ?? payload;
  if (
    candidate &&
    typeof candidate.accessToken === 'string' &&
    typeof candidate.refreshToken === 'string'
  ) {
    return {
      accessToken: candidate.accessToken,
      refreshToken: candidate.refreshToken,
    };
  }
  return null;
}

async function runCrossTabRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.locks &&
    typeof navigator.locks.request === 'function'
  ) {
    return navigator.locks.request('modus_auth_token_refresh', task);
  }
  return task();
}

/**
 * Refreshes the access token using the stored refresh token.
 * Deduplicates in-flight calls in the current tab AND synchronizes across browser tabs via Web Locks
 * so parallel tabs never replay an already-rotated refresh token.
 */
export async function refreshAccessToken(options?: {
  force?: boolean;
  rejectedAccessToken?: string | null;
}): Promise<string | null> {
  if (refreshPromise) {
    const inFlightToken = await refreshPromise;
    if (
      !options?.force ||
      !options.rejectedAccessToken ||
      inFlightToken !== options.rejectedAccessToken
    ) {
      return inFlightToken;
    }
  }

  refreshPromise = runCrossTabRefreshLock(async () => {
    // Re-read inside lock in case another tab just rotated tokens while we waited
    const latestAccess = getAccessToken();
    const currentRefresh = getRefreshToken();

    const canReuseLatest =
      Boolean(latestAccess) &&
      !isTokenExpired(latestAccess, 30) &&
      Boolean(currentRefresh) &&
      (!options?.force ||
        (Boolean(options.rejectedAccessToken) &&
          latestAccess !== options.rejectedAccessToken));

    if (canReuseLatest && latestAccess) {
      return latestAccess;
    }

    if (!currentRefresh) {
      setAuthTokens(null);
      return null;
    }

    // If the refresh token itself is already expired, terminate session cleanly
    if (isTokenExpired(currentRefresh, 0)) {
      setAuthTokens(null);
      return null;
    }

    const baseUrl = getApiBaseUrl().replace(/\/$/, '');

    try {
      const res = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: currentRefresh }),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          // Check if another tab rotated storage concurrently before clearing tokens
          const newerAccess = getAccessToken();
          const newerRefresh = getRefreshToken();
          if (
            newerRefresh &&
            newerRefresh !== currentRefresh &&
            newerAccess &&
            !isTokenExpired(newerAccess, 15)
          ) {
            return newerAccess;
          }
          setAuthTokens(null);
        }
        return null;
      }

      const raw = await res.json();
      const pair = extractTokenPair(raw);
      if (pair) {
        setAuthTokens(pair);
        return pair.accessToken;
      }
      return null;
    } catch {
      // Transient network hiccup: keep stored tokens intact so later retries succeed
      return null;
    }
  }).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * Universal API client with pre-flight proactive refresh and reactive 401 token retry.
 */
export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  let url = `${baseUrl}${cleanEndpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const headers: Record<string, string> = {
    ...(!(typeof FormData !== 'undefined' && options.body instanceof FormData) && {
      'Content-Type': 'application/json',
    }),
    ...(options.headers as Record<string, string>),
  };

  let tokenUsed: string | null = null;

  if (!options.skipAuth) {
    let token = getAccessToken();
    const refreshToken = getRefreshToken();

    // Proactively refresh if access token is missing or within 30s of expiration
    if ((!token || isTokenExpired(token, 30)) && refreshToken) {
      const refreshed = await refreshAccessToken();
      token = refreshed || getAccessToken();
    }

    if (token) {
      tokenUsed = token;
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (err: any) {
    throw new ApiError(
      `Network error communicating with Modus backend: ${err.message || String(err)}`,
      0
    );
  }

  // Handle 401 token refresh retry (including cross-tab fresh token check)
  if (response.status === 401 && !options.skipAuth) {
    const currentAccess = getAccessToken();
    if (
      currentAccess &&
      currentAccess !== tokenUsed &&
      !isTokenExpired(currentAccess, 10)
    ) {
      headers['Authorization'] = `Bearer ${currentAccess}`;
      const retryRes = await fetch(url, { ...config, headers });
      return handleResponse<T>(retryRes);
    }

    if (getRefreshToken()) {
      const newToken = await refreshAccessToken({
        force: true,
        rejectedAccessToken: tokenUsed,
      });
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(url, { ...config, headers });
        return handleResponse<T>(retryRes);
      }
    }
  }

  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return {} as T;
  }

  let body: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  } else {
    try {
      body = await response.text();
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    if (body) {
      if (typeof body === 'string') {
        errorMessage = body;
      } else if (Array.isArray(body.message)) {
        errorMessage = body.message.join(', ');
      } else if (body.message) {
        errorMessage = body.message;
      } else if (body.error) {
        errorMessage = body.error;
      }
    }
    throw new ApiError(errorMessage, response.status, body);
  }

  return body as T;
}
