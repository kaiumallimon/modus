import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canDeleteRole,
  canEditRole,
  canToggleRoleStatus,
  computeRoleSummaryStats,
  filterRoles,
  buildRolesCsv,
  groupPermissionsByModule,
  type RoleWithStats,
} from '../lib/roles/utils';

const sampleRoles: RoleWithStats[] = [
  {
    _id: 'r1',
    code: 'SUPER_ADMIN',
    name: 'Super Administrator',
    description: 'Full unrestricted administration',
    isSystem: true,
    isActive: true,
    permissions: ['users.read', 'roles.create'],
    permissionsCount: 2,
    userCount: 1,
  },
  {
    _id: 'r2',
    code: 'FINANCE_LEAD',
    name: 'Finance Lead',
    description: 'Approves billing and ledgers',
    isSystem: false,
    isActive: true,
    permissions: ['audit.read', 'organization.read'],
    permissionsCount: 2,
    userCount: 0,
  },
  {
    _id: 'r3',
    code: 'CONTRACTOR',
    name: 'External Contractor',
    description: 'Temporary asset uploader',
    isSystem: false,
    isActive: false,
    permissions: ['cdn.read'],
    permissionsCount: 1,
    userCount: 2,
  },
];

describe('Roles Utilities & RBAC Rules Tests', () => {
  it('enforces backend edit/toggle/delete constraints properly', () => {
    assert.equal(canEditRole(sampleRoles[0], true), false); // SUPER_ADMIN immutable
    assert.equal(canEditRole(sampleRoles[1], true), true);
    assert.equal(canEditRole(sampleRoles[1], false), false); // non-SuperAdmin cannot edit

    assert.equal(canToggleRoleStatus(sampleRoles[0], true), false);
    assert.equal(canToggleRoleStatus(sampleRoles[1], true), true);

    assert.equal(canDeleteRole(sampleRoles[0], true), false); // system role
    assert.equal(canDeleteRole(sampleRoles[1], true), true); // custom, 0 users
    assert.equal(canDeleteRole(sampleRoles[2], true), false); // custom, 2 assigned users
  });

  it('filters roles by search query (name, code, permission), type, and status', () => {
    assert.equal(filterRoles(sampleRoles, { type: 'system' }).length, 1);
    assert.equal(filterRoles(sampleRoles, { type: 'custom' }).length, 2);
    assert.equal(filterRoles(sampleRoles, { status: 'inactive' }).length, 1);
    assert.equal(filterRoles(sampleRoles, { search: 'cdn.read' })[0].code, 'CONTRACTOR');
    assert.equal(filterRoles(sampleRoles, { search: 'finance' })[0].code, 'FINANCE_LEAD');
  });

  it('computes accurate RBAC KPI stats with and without backend stats snapshot', () => {
    const derived = computeRoleSummaryStats(sampleRoles, null, 18);
    assert.equal(derived.totalRoles, 3);
    assert.equal(derived.systemRoles, 1);
    assert.equal(derived.customRoles, 2);
    assert.equal(derived.activeRoles, 2);
    assert.equal(derived.inactiveRoles, 1);
    assert.equal(derived.totalAssignedUsers, 3);
    assert.equal(derived.rolesInUse, 2);
    assert.equal(derived.totalPermissions, 18);
  });

  it('falls back to grouping flat permissions by module when grouped array is empty', () => {
    const groups = groupPermissionsByModule([], [
      { id: 'users.read', name: 'Read Users', description: 'List users', module: 'users' },
      { id: 'cdn.read', name: 'Read CDN', description: 'View CDN', module: 'cdn' },
    ]);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].module, 'users');
  });

  it('exports properly escaped CSV rows for roles', () => {
    const csv = buildRolesCsv(sampleRoles);
    const lines = csv.split('\n');
    assert.equal(lines.length, 4);
    assert.ok(lines[0].includes('"Assigned Users"'));
    assert.ok(lines[1].includes('"SUPER_ADMIN"'));
  });
});
