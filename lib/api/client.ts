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

// In-memory token store for security and fast access
let activeAccessToken: string | null = null;
let activeRefreshToken: string | null = null;

// Synchronized in-flight refresh promise to deduplicate concurrent refresh calls
let refreshPromise: Promise<string | null> | null = null;

/**
 * Checks if a JWT token is expired or within `offsetSeconds` of expiring.
 */
export function isTokenExpired(token: string | null | undefined, offsetSeconds: number = 30): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const { exp } = JSON.parse(jsonPayload);
    if (!exp) return false;
    // Expired if current epoch is >= (exp - offset) in milliseconds
    return Date.now() >= (exp * 1000) - (offsetSeconds * 1000);
  } catch {
    return true;
  }
}

/**
 * Persists or clears auth tokens based on the rememberMe preference.
 * - rememberMe = true: stored in localStorage (persists across browser restarts).
 * - rememberMe = false: stored in sessionStorage (cleared on browser/tab close).
 */
export function setAuthTokens(
  tokens: { accessToken: string; refreshToken: string } | null,
  rememberMe?: boolean
) {
  if (!tokens) {
    activeAccessToken = null;
    activeRefreshToken = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    }
  } else {
    activeAccessToken = tokens.accessToken;
    activeRefreshToken = tokens.refreshToken;

    if (typeof window !== 'undefined') {
      const isRemembered =
        rememberMe !== undefined
          ? rememberMe
          : localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';

      if (isRemembered) {
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, tokens.accessToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
        // Also mirror into sessionStorage for immediate active tab access
        sessionStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, tokens.accessToken);
        sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      } else {
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        sessionStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, tokens.accessToken);
        sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      }
    }
  }
}

export function getAccessToken(): string | null {
  if (activeAccessToken) return activeAccessToken;
  if (typeof window !== 'undefined') {
    activeAccessToken =
      sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ||
      localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }
  return activeAccessToken;
}

export function getRefreshToken(): string | null {
  if (activeRefreshToken) return activeRefreshToken;
  if (typeof window !== 'undefined') {
    activeRefreshToken =
      sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) ||
      localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }
  return activeRefreshToken;
}

export function isRememberMeActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
}

/**
 * Refreshes the access token using the stored refresh token.
 * Deduplicates in-flight calls so multiple parallel requests share a single refresh network call.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const currentRefresh = getRefreshToken();
    if (!currentRefresh) {
      setAuthTokens(null);
      return null;
    }

    // If the refresh token itself is already expired, logout immediately
    if (isTokenExpired(currentRefresh, 0)) {
      setAuthTokens(null);
      return null;
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: currentRefresh }),
      });

      if (!res.ok) {
        // Only wipe tokens if the refresh token is truly expired or invalid (401/403)
        if (res.status === 401 || res.status === 403) {
          setAuthTokens(null);
        }
        return null;
      }

      const data = await res.json();
      if (data.accessToken && data.refreshToken) {
        setAuthTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
        return data.accessToken;
      }
      return null;
    } catch {
      // Network hiccup: do not wipe tokens, allow subsequent retries
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

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

  if (!options.skipAuth) {
    let token = getAccessToken();
    const refreshToken = getRefreshToken();

    // Proactively refresh if access token is expired or within 30s of expiration
    if (token && isTokenExpired(token, 30) && refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        token = refreshed;
      }
    } else if (!token && refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        token = refreshed;
      }
    }

    if (token) {
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
      0,
    );
  }

  // Handle 401 token refresh retry if not caught by pre-flight
  if (response.status === 401 && !options.skipAuth && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      const retryRes = await fetch(url, { ...config, headers });
      return handleResponse<T>(retryRes);
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
