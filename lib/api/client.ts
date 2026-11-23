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

// In-memory token store for security
let activeAccessToken: string | null = null;
let activeRefreshToken: string | null = null;

// Allow token sync with storage handler
export function setAuthTokens(tokens: { accessToken: string; refreshToken: string } | null) {
  if (!tokens) {
    activeAccessToken = null;
    activeRefreshToken = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('modus_auth_token');
      sessionStorage.removeItem('modus_refresh_token');
    }
  } else {
    activeAccessToken = tokens.accessToken;
    activeRefreshToken = tokens.refreshToken;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('modus_auth_token', tokens.accessToken);
      sessionStorage.setItem('modus_refresh_token', tokens.refreshToken);
    }
  }
}

export function getAccessToken(): string | null {
  if (activeAccessToken) return activeAccessToken;
  if (typeof window !== 'undefined') {
    activeAccessToken = sessionStorage.getItem('modus_auth_token');
  }
  return activeAccessToken;
}

export function getRefreshToken(): string | null {
  if (activeRefreshToken) return activeRefreshToken;
  if (typeof window !== 'undefined') {
    activeRefreshToken = sessionStorage.getItem('modus_refresh_token');
  }
  return activeRefreshToken;
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const currentRefresh = getRefreshToken();
  if (!currentRefresh) return null;

  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: currentRefresh }),
    });

    if (!res.ok) {
      setAuthTokens(null);
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
    setAuthTokens(null);
    return null;
  }
}

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
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!options.skipAuth) {
    const token = getAccessToken();
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

  // Handle 401 token refresh retry
  if (response.status === 401 && !options.skipAuth && getRefreshToken()) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      if (newToken) {
        onRefreshed(newToken);
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(url, { ...config, headers });
        return handleResponse<T>(retryRes);
      }
    } else {
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh(async (newToken) => {
          try {
            headers['Authorization'] = `Bearer ${newToken}`;
            const retryRes = await fetch(url, { ...config, headers });
            resolve(await handleResponse<T>(retryRes));
          } catch (e) {
            reject(e);
          }
        });
      });
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
