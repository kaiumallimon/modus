import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '../lib/permissions';
import { type User, Role } from '../lib/api/types';

describe('Permissions Utility Tests', () => {
  const superAdminUser: User = {
    id: 'user-1',
    humanId: 'MOD-001',
    email: 'admin@modus.local',
    firstName: 'Super',
    lastName: 'Admin',
    role: Role.SUPER_ADMIN,
    isActive: true,
  };

  const managerUser: User = {
    id: 'user-2',
    humanId: 'MOD-002',
    email: 'manager@modus.local',
    firstName: 'Alice',
    lastName: 'Manager',
    role: Role.MANAGER,
    isActive: true,
  };

  const inactiveUser: User = {
    ...managerUser,
    id: 'user-3',
    isActive: false,
  };

  const managerPermissions = ['users.read', 'organization.read', 'modules.read', 'audit.read'];

  test('Super Admin has unrestricted permissions', () => {
    assert.equal(hasPermission(superAdminUser, [], 'users.delete'), true);
    assert.equal(hasPermission(superAdminUser, [], 'system.arbitrary.perm'), true);
    assert.equal(hasAnyPermission(superAdminUser, [], ['nonexistent']), true);
    assert.equal(hasAllPermissions(superAdminUser, [], ['nonexistent1', 'nonexistent2']), true);
  });

  test('Regular user matches only granted permissions', () => {
    assert.equal(hasPermission(managerUser, managerPermissions, 'users.read'), true);
    assert.equal(hasPermission(managerUser, managerPermissions, 'organization.read'), true);
    assert.equal(hasPermission(managerUser, managerPermissions, 'users.create'), false);
    assert.equal(hasPermission(managerUser, managerPermissions, 'roles.delete'), false);
  });

  test('hasAnyPermission correctly verifies subset matches', () => {
    assert.equal(
      hasAnyPermission(managerUser, managerPermissions, ['roles.create', 'users.read']),
      true
    );
    assert.equal(
      hasAnyPermission(managerUser, managerPermissions, ['roles.create', 'roles.delete']),
      false
    );
  });

  test('hasAllPermissions strictly requires every listed permission', () => {
    assert.equal(
      hasAllPermissions(managerUser, managerPermissions, ['users.read', 'organization.read']),
      true
    );
    assert.equal(
      hasAllPermissions(managerUser, managerPermissions, ['users.read', 'roles.delete']),
      false
    );
  });

  test('Inactive users are denied all permissions unconditionally', () => {
    assert.equal(hasPermission(inactiveUser, managerPermissions, 'users.read'), false);
    assert.equal(hasAnyPermission(inactiveUser, managerPermissions, ['users.read']), false);
    assert.equal(hasAllPermissions(inactiveUser, managerPermissions, ['users.read']), false);
  });

  test('Null user is denied all permissions', () => {
    assert.equal(hasPermission(null, managerPermissions, 'users.read'), false);
    assert.equal(hasAnyPermission(null, managerPermissions, ['users.read']), false);
    assert.equal(hasAllPermissions(null, managerPermissions, ['users.read']), false);
  });
});
