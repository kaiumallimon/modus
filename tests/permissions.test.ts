import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isSameUser,
  canChangeUserRole,
} from '../lib/permissions';
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

  test('isSameUser correctly detects self identity across fields', () => {
    assert.equal(isSameUser(superAdminUser, superAdminUser), true);
    assert.equal(
      isSameUser(superAdminUser, { ...superAdminUser, email: 'ADMIN@MODUS.LOCAL' }),
      true
    );
    assert.equal(
      isSameUser({ ...superAdminUser, _id: 'mongo-id-1' }, { ...superAdminUser, id: 'mongo-id-1' }),
      true
    );
    assert.equal(isSameUser(superAdminUser, managerUser), false);
    assert.equal(isSameUser(null, superAdminUser), false);
    assert.equal(isSameUser(superAdminUser, null), false);
  });

  test('Super Admin cannot change own role, but can change other users roles', () => {
    // Current logged in super user cannot change his role
    assert.equal(canChangeUserRole(superAdminUser, superAdminUser), false);

    // Super user CAN change role of other users
    assert.equal(canChangeUserRole(superAdminUser, managerUser), true);

    // Non-super-admin cannot change anyone's role
    assert.equal(canChangeUserRole(managerUser, superAdminUser), false);
    assert.equal(canChangeUserRole(managerUser, managerUser), false);

    // Inactive super admin cannot change role
    assert.equal(canChangeUserRole({ ...superAdminUser, isActive: false }, managerUser), false);
  });
});
