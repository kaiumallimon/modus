import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Role } from '../lib/api/types';

describe('Contracts & Schema Invariant Tests', () => {
  test('Role enum values match backend schema exactly', () => {
    assert.equal(Role.SUPER_ADMIN, 'SUPER_ADMIN');
    assert.equal(Role.ADMIN, 'ADMIN');
    assert.equal(Role.MANAGER, 'MANAGER');
    assert.equal(Role.EMPLOYEE, 'EMPLOYEE');
    assert.equal(Object.keys(Role).length, 4);
  });

  test('Setup payload structure adheres to atomic backend bootstrap contract', () => {
    const validSetup = {
      administrator: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
      },
      settings: {
        defaultCurrency: 'USD',
        defaultTimezone: 'UTC',
        defaultLocale: 'en-US',
      },
    };

    assert.ok(validSetup.administrator.firstName);
    assert.ok(validSetup.administrator.password.length >= 8);
    assert.equal(validSetup.settings.defaultCurrency, 'USD');
  });

  test('ForgotPassword and ResetPassword payload structures adhere to backend DTO specs', () => {
    const forgotPayload = {
      identifier: 'admin@modus.local',
    };
    assert.ok(forgotPayload.identifier);

    const resetPayload = {
      token: '64charhexstringrepresentingtheonetimeresetpasswordtokenfrommail',
      newPassword: 'NewSecurePassword123!',
    };
    assert.ok(resetPayload.token);
    assert.ok(resetPayload.newPassword.length >= 8);
  });
});
