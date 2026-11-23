import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../lib/api/errors';
import { API_ENDPOINTS } from '../lib/api/endpoints';
import { isTokenExpired } from '../lib/api/client';

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
  });
});
