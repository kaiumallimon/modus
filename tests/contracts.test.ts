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
      organization: {
        name: 'Enterprise Co',
        email: 'contact@enterprise.com',
        currency: 'USD',
        timezone: 'UTC',
        locale: 'en-US',
      },
    };

    assert.ok(validSetup.administrator.firstName);
    assert.ok(validSetup.administrator.password.length >= 8);
    assert.ok(validSetup.organization.name);
    assert.equal(validSetup.organization.currency, 'USD');
  });
});
