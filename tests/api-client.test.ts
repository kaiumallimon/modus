import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../lib/api/errors';
import { API_ENDPOINTS } from '../lib/api/endpoints';
import {
  apiClient,
  getAccessToken,
  getRefreshToken,
  getTokenExpirationMs,
  isTokenExpired,
  refreshAccessToken,
  setAuthTokens,
} from '../lib/api/client';

describe('API Client & Error Classification Tests', () => {
  test('ApiError correctly classifies HTTP 401 Unauthorized', () => {
    const error = new ApiError('Unauthorized', 401);
    assert.equal(error.isUnauthorized, true);
    assert.equal(error.isForbidden, false);
    assert.equal(error.isValidationError, false);
    assert.equal(error.isServerError, false);
  });

  test('ApiError correctly classifies HTTP 403 Forbidden', () => {
    const error = new ApiError('Forbidden', 403);
    assert.equal(error.isUnauthorized, false);
    assert.equal(error.isForbidden, true);
  });

  test('ApiError correctly classifies HTTP 400 & 422 Validation Errors', () => {
    const err400 = new ApiError('Bad Request', 400, { field: 'email' });
    const err422 = new ApiError('Unprocessable', 422);
    assert.equal(err400.isValidationError, true);
    assert.equal(err422.isValidationError, true);
    assert.deepEqual(err400.details, { field: 'email' });
  });

  test('ApiError correctly classifies HTTP 404 Not Found', () => {
    const error = new ApiError('Not Found', 404);
    assert.equal(error.isNotFound, true);
  });

  test('ApiError correctly classifies HTTP 409 Conflict', () => {
    const error = new ApiError('Conflict', 409);
    assert.equal(error.isConflict, true);
  });

  test('ApiError correctly classifies 5xx Server Errors', () => {
    const err500 = new ApiError('Internal Server Error', 500);
    const err503 = new ApiError('Service Unavailable', 503);
    assert.equal(err500.isServerError, true);
    assert.equal(err503.isServerError, true);
  });

  test('Endpoint helpers produce compliant REST paths', () => {
    assert.equal(API_ENDPOINTS.USER_BY_ID('123'), '/users/123');
    assert.equal(API_ENDPOINTS.USER_STATUS('123'), '/users/123/status');
    assert.equal(API_ENDPOINTS.USER_ROLE('123'), '/users/123/role');
    assert.equal(API_ENDPOINTS.ROLE_BY_ID('abc'), '/roles/abc');
    assert.equal(API_ENDPOINTS.MODULE_BY_ID('users'), '/modules/users');
    assert.equal(API_ENDPOINTS.MODULE_ACTIVATION('users'), '/modules/users/activation');
    assert.equal(API_ENDPOINTS.AUDIT_LOG_BY_ID('log-1'), '/audit-logs/log-1');
  });

  test('isTokenExpired correctly detects expired and active JWTs', () => {
    // Generate valid base64 payload for test
    const createMockJwt = (expSeconds: number) => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: 'user-1', exp: expSeconds })).toString('base64url');
      return `${header}.${payload}.mock-signature`;
    };

    const pastEpoch = Math.floor(Date.now() / 1000) - 300; // 5 min ago
    const futureEpoch = Math.floor(Date.now() / 1000) + 3600; // 1 hour future
    const nearEpoch = Math.floor(Date.now() / 1000) + 15; // 15s future (within 30s threshold)

    const expiredJwt = createMockJwt(pastEpoch);
    const validJwt = createMockJwt(futureEpoch);
    const nearJwt = createMockJwt(nearEpoch);

    assert.equal(isTokenExpired(expiredJwt, 0), true);
    assert.equal(isTokenExpired(validJwt, 30), false);
    // 15s remaining is within 30s offset threshold, so should be classified as expiring/expired
    assert.equal(isTokenExpired(nearJwt, 30), true);
    assert.equal(isTokenExpired(null), true);
    assert.equal(isTokenExpired('malformed-token'), true);
    assert.equal(getTokenExpirationMs(validJwt), futureEpoch * 1000);
  });

  describe('Automatic Token Refresh & Recovery', () => {
    const originalFetch = globalThis.fetch;

    const createJwt = (expSeconds: number, sid = 'sid-test') => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: 'user-1', exp: expSeconds, sid })).toString('base64url');
      return `${header}.${payload}.sig`;
    };

    beforeEach(() => {
      setAuthTokens(null);
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      setAuthTokens(null);
    });

    test('deduplicates concurrent refreshAccessToken calls and stores rotated pair', async () => {
      const expiredAccess = createJwt(Math.floor(Date.now() / 1000) - 60);
      const freshRefresh = createJwt(Math.floor(Date.now() / 1000) + 3600);
      const nextAccess = createJwt(Math.floor(Date.now() / 1000) + 900);
      const nextRefresh = createJwt(Math.floor(Date.now() / 1000) + 7200);

      setAuthTokens({ accessToken: expiredAccess, refreshToken: freshRefresh });

      let refreshCalls = 0;
      globalThis.fetch = (async () => {
        refreshCalls += 1;
        await new Promise((r) => setTimeout(r, 10));
        return new Response(
          JSON.stringify({ accessToken: nextAccess, refreshToken: nextRefresh }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }) as typeof fetch;

      const [r1, r2, r3] = await Promise.all([
        refreshAccessToken(),
        refreshAccessToken(),
        refreshAccessToken(),
      ]);

      assert.equal(refreshCalls, 1);
      assert.equal(r1, nextAccess);
      assert.equal(r2, nextAccess);
      assert.equal(r3, nextAccess);
      assert.equal(getAccessToken(), nextAccess);
      assert.equal(getRefreshToken(), nextRefresh);
    });

    test('preserves tokens on transient 5xx / network failures instead of logging out', async () => {
      const expiredAccess = createJwt(Math.floor(Date.now() / 1000) - 60);
      const validRefresh = createJwt(Math.floor(Date.now() / 1000) + 3600);
      setAuthTokens({ accessToken: expiredAccess, refreshToken: validRefresh });

      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ message: 'Service Unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })) as typeof fetch;

      const res503 = await refreshAccessToken();
      assert.equal(res503, null);
      assert.equal(getRefreshToken(), validRefresh);

      globalThis.fetch = (async () => {
        throw new Error('ECONNRESET');
      }) as typeof fetch;

      const resNet = await refreshAccessToken();
      assert.equal(resNet, null);
      assert.equal(getRefreshToken(), validRefresh);
    });

    test('apiClient proactively refreshes expired access token before sending API request', async () => {
      const expiredAccess = createJwt(Math.floor(Date.now() / 1000) - 60);
      const validRefresh = createJwt(Math.floor(Date.now() / 1000) + 3600);
      const nextAccess = createJwt(Math.floor(Date.now() / 1000) + 900);
      const nextRefresh = createJwt(Math.floor(Date.now() / 1000) + 7200);

      setAuthTokens({ accessToken: expiredAccess, refreshToken: validRefresh });

      const calls: Array<{ url: string; auth?: string }> = [];
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const headers = new Headers(init?.headers);
        calls.push({ url, auth: headers.get('Authorization') || undefined });

        if (url.endsWith('/auth/refresh')) {
          return new Response(
            JSON.stringify({ accessToken: nextAccess, refreshToken: nextRefresh }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(JSON.stringify({ id: 'user-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      const profile = await apiClient<{ id: string }>('/auth/me');
      assert.equal(profile.id, 'user-1');
      assert.equal(calls.length, 2);
      assert.ok(calls[0].url.endsWith('/auth/refresh'));
      assert.ok(calls[1].url.endsWith('/auth/me'));
      assert.equal(calls[1].auth, `Bearer ${nextAccess}`);
    });

    test('apiClient retries reactively when a valid-looking token receives 401 from backend', async () => {
      const initialAccess = createJwt(Math.floor(Date.now() / 1000) + 600);
      const validRefresh = createJwt(Math.floor(Date.now() / 1000) + 3600);
      const rotatedAccess = createJwt(Math.floor(Date.now() / 1000) + 900);
      const rotatedRefresh = createJwt(Math.floor(Date.now() / 1000) + 7200);

      setAuthTokens({ accessToken: initialAccess, refreshToken: validRefresh });

      let meAttempts = 0;
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const headers = new Headers(init?.headers);

        if (url.endsWith('/auth/refresh')) {
          return new Response(
            JSON.stringify({ accessToken: rotatedAccess, refreshToken: rotatedRefresh }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        meAttempts += 1;
        if (headers.get('Authorization') === `Bearer ${initialAccess}`) {
          return new Response(JSON.stringify({ message: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      const res = await apiClient<{ ok: boolean }>('/auth/me');
      assert.equal(res.ok, true);
      assert.equal(meAttempts, 2);
      assert.equal(getAccessToken(), rotatedAccess);
    });
  });
});
