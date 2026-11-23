import { Role, type User } from '../api/types';

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
