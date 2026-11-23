import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../lib/api/errors';
import { API_ENDPOINTS } from '../lib/api/endpoints';

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
    assert.equal(API_ENDPOINTS.ROLE_BY_ID('abc'), '/roles/abc');
    assert.equal(API_ENDPOINTS.MODULE_BY_ID('users'), '/modules/users');
    assert.equal(API_ENDPOINTS.MODULE_ACTIVATION('users'), '/modules/users/activation');
    assert.equal(API_ENDPOINTS.AUDIT_LOG_BY_ID('log-1'), '/audit-logs/log-1');
  });
});
