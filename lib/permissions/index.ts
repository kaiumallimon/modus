import { Role, type User, type PermissionDefinition } from '../api/types';

export const MODULE_NAMES: Record<string, { name: string; description: string }> = {
  users: {
    name: 'User Management',
    description: 'Manage users, accounts, profile information, and credentials',
  },
  'access-control': {
    name: 'Access Control (RBAC)',
    description: 'Manage system and custom roles, permissions, and authorization policies',
  },
  'system-settings': {
    name: 'System Settings',
    description: 'Application-level preferences, formatting, and defaults',
  },
  'organization-settings': {
    name: 'Organization Profile & Settings',
    description: 'Single-organization configuration, address, currency, and locale',
  },
  'module-registry': {
    name: 'Module Registry',
    description: 'Inspect and manage activation of integrated core and business modules',
  },
  'audit-log': {
    name: 'Audit Logging',
    description: 'Inspect immutable historical security and administrative events',
  },
};

export const CORE_PERMISSIONS: PermissionDefinition[] = [
  // Users
  {
    id: 'users.read',
    name: 'View Users',
    description: 'Read user list, profiles, and account details',
    module: 'users',
  },
  {
    id: 'users.create',
    name: 'Create Users',
    description: 'Create new users and dispatch welcome credentials',
    module: 'users',
  },
  {
    id: 'users.update',
    name: 'Update Users',
    description: 'Update user profiles, details, and roles',
    module: 'users',
  },
  {
    id: 'users.delete',
    name: 'Delete Users',
    description: 'Delete or deactivate user accounts',
    module: 'users',
  },
  {
    id: 'users.manage',
    name: 'Manage Users',
    description: 'Full administrative access to users and role assignments',
    module: 'users',
  },

  // Roles & Permissions
  {
    id: 'roles.read',
    name: 'View Roles',
    description: 'Read roles, permission assignments, and role user statistics',
    module: 'access-control',
  },
  {
    id: 'roles.create',
    name: 'Create Roles',
    description: 'Create new custom roles with designated permissions',
    module: 'access-control',
  },
  {
    id: 'roles.update',
    name: 'Update Roles',
    description: 'Modify role details, names, active state, and permissions',
    module: 'access-control',
  },
  {
    id: 'roles.delete',
    name: 'Delete Roles',
    description: 'Delete custom roles that have no active users assigned',
    module: 'access-control',
  },
  {
    id: 'roles.manage',
    name: 'Manage Roles',
    description: 'Full administrative access to roles and access control',
    module: 'access-control',
  },

  // Settings
  {
    id: 'settings.read',
    name: 'View System Settings',
    description: 'Read system-wide application settings and preferences',
    module: 'system-settings',
  },
  {
    id: 'settings.update',
    name: 'Update System Settings',
    description: 'Modify system-wide application settings and preferences',
    module: 'system-settings',
  },

  // Organization
  {
    id: 'organization.read',
    name: 'View Organization Profile',
    description: 'Read organization information, contact, and settings',
    module: 'organization-settings',
  },
  {
    id: 'organization.update',
    name: 'Update Organization Profile',
    description: 'Modify organization information, address, and localization',
    module: 'organization-settings',
  },

  // Modules
  {
    id: 'modules.read',
    name: 'View Module Registry',
    description: 'View registered modules, dependencies, and their statuses',
    module: 'module-registry',
  },
  {
    id: 'modules.manage',
    name: 'Manage Modules',
    description: 'Activate or deactivate system modules',
    module: 'module-registry',
  },

  // Audit Logs
  {
    id: 'audit.read',
    name: 'View Audit Logs',
    description: 'Read system audit and security event logs',
    module: 'audit-log',
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: CORE_PERMISSIONS.map((p) => p.id),
  ADMIN: [
    'users.read',
    'users.create',
    'users.update',
    'roles.read',
    'settings.read',
    'organization.read',
    'organization.update',
    'modules.read',
    'audit.read',
  ],
  MANAGER: [
    'users.read',
    'organization.read',
    'modules.read',
    'audit.read',
  ],
  EMPLOYEE: [
    'organization.read',
  ],
};

export function getRoleDisplayName(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Administrator';
    case 'ADMIN':
      return 'Administrator';
    case 'MANAGER':
      return 'Manager';
    case 'EMPLOYEE':
      return 'Employee';
    default:
      return role.replace(/_/g, ' ');
  }
}

export function hasPermission(
  user: User | null,
  userPermissions: string[],
  permission: string,
): boolean {
  if (!user) return false;
  if (!user.isActive) return false;
  // Super Admin possesses full unrestricted permissions
  if (user.role === Role.SUPER_ADMIN || user.role === 'SUPER_ADMIN') {
    return true;
  }
  return userPermissions.includes(permission);
}

export function hasAnyPermission(
  user: User | null,
  userPermissions: string[],
  permissions: string[],
): boolean {
  if (!user) return false;
  if (!user.isActive) return false;
  if (user.role === Role.SUPER_ADMIN || user.role === 'SUPER_ADMIN') {
    return true;
  }
  if (!permissions || permissions.length === 0) return true;
  return permissions.some((perm) => userPermissions.includes(perm));
}

export function hasAllPermissions(
  user: User | null,
  userPermissions: string[],
  permissions: string[],
): boolean {
  if (!user) return false;
  if (!user.isActive) return false;
  if (user.role === Role.SUPER_ADMIN || user.role === 'SUPER_ADMIN') {
    return true;
  }
  if (!permissions || permissions.length === 0) return true;
  return permissions.every((perm) => userPermissions.includes(perm));
}

/**
 * Checks if a given target user corresponds to the current logged-in user.
 */
export function isSameUser(
  currentUser: User | null | undefined,
  targetUser: User | null | undefined,
): boolean {
  if (!currentUser || !targetUser) return false;
  if (currentUser._id && (currentUser._id === targetUser._id || currentUser._id === targetUser.id)) return true;
  if (currentUser.id && (currentUser.id === targetUser._id || currentUser.id === targetUser.id)) return true;
  if (currentUser.humanId && targetUser.humanId && currentUser.humanId === targetUser.humanId) return true;
  if (currentUser.email && targetUser.email && currentUser.email.toLowerCase() === targetUser.email.toLowerCase()) return true;
  return false;
}

/**
 * Checks whether the current user is permitted to change the role of a target user.
 * A logged-in Super Administrator (or any user) cannot change their own role.
 */
export function canChangeUserRole(
  currentUser: User | null | undefined,
  targetUser: User | null | undefined,
): boolean {
  if (!currentUser || !targetUser) return false;
  if (!currentUser.isActive) return false;
  const isSuperAdmin =
    currentUser.role === Role.SUPER_ADMIN || currentUser.role === 'SUPER_ADMIN';
  if (!isSuperAdmin) return false;
  // Current logged in super user cannot change their own role
  if (isSameUser(currentUser, targetUser)) return false;
  return true;
}
