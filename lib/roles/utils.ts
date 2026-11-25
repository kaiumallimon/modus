import type {
  AccessControlDashboardStats,
  ModulePermissionsGroup,
  PermissionDefinition,
  RoleDocument,
} from '@/lib/api/types';
import { formatCsvCell } from '@/lib/audit-logs/utils';

export interface RoleWithStats extends RoleDocument {
  userCount?: number;
  permissionsCount?: number;
}

export interface RoleAssignedUser {
  id: string;
  humanId?: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt?: string;
}

export interface RoleDetailResponse {
  role: RoleWithStats;
  userCount: number;
  users: RoleAssignedUser[];
}

export type RoleTypeFilter = '' | 'system' | 'custom';
export type RoleStatusFilter = '' | 'active' | 'inactive';

export interface RoleSummaryStats {
  totalRoles: number;
  systemRoles: number;
  customRoles: number;
  activeRoles: number;
  inactiveRoles: number;
  totalPermissions: number;
  totalAssignedUsers: number;
  rolesInUse: number;
}

export function isSuperAdminRole(role?: Pick<RoleDocument, 'code'> | null): boolean {
  return role?.code === 'SUPER_ADMIN';
}

export function canEditRole(role: RoleWithStats | null | undefined, isSuperAdmin: boolean): boolean {
  if (!role || !isSuperAdmin) return false;
  return !isSuperAdminRole(role);
}

export function canToggleRoleStatus(
  role: RoleWithStats | null | undefined,
  isSuperAdmin: boolean
): boolean {
  if (!role || !isSuperAdmin) return false;
  return !role.isSystem && !isSuperAdminRole(role);
}

export function canDeleteRole(
  role: RoleWithStats | null | undefined,
  isSuperAdmin: boolean
): boolean {
  if (!role || !isSuperAdmin) return false;
  if (role.isSystem || isSuperAdminRole(role)) return false;
  return (role.userCount ?? 0) === 0;
}

export function filterRoles(
  roles: RoleWithStats[],
  filters: {
    search?: string;
    type?: RoleTypeFilter;
    status?: RoleStatusFilter;
  }
): RoleWithStats[] {
  const query = (filters.search || '').toLowerCase().trim();

  return roles.filter((role) => {
    const isSystem = Boolean(role.isSystem || role.code === 'SUPER_ADMIN');
    if (filters.type === 'system' && !isSystem) return false;
    if (filters.type === 'custom' && isSystem) return false;

    if (filters.status === 'active' && !role.isActive) return false;
    if (filters.status === 'inactive' && role.isActive) return false;

    if (!query) return true;

    const matchesText =
      role.name.toLowerCase().includes(query) ||
      role.code.toLowerCase().includes(query) ||
      (role.description || '').toLowerCase().includes(query);

    const matchesPerm = (role.permissions || []).some((perm) =>
      perm.toLowerCase().includes(query)
    );

    return matchesText || matchesPerm;
  });
}

export function computeRoleSummaryStats(
  roles: RoleWithStats[],
  apiStats: AccessControlDashboardStats | null,
  fallbackPermissionsCount: number = 0
): RoleSummaryStats {
  const totalAssignedUsers = roles.reduce((sum, r) => sum + (r.userCount ?? 0), 0);
  const rolesInUse = roles.filter((r) => (r.userCount ?? 0) > 0).length;

  if (apiStats) {
    return {
      totalRoles: apiStats.totalRoles,
      systemRoles: apiStats.systemRoles,
      customRoles: apiStats.customRoles,
      activeRoles: apiStats.activeRoles,
      inactiveRoles: apiStats.inactiveRoles,
      totalPermissions: apiStats.totalPermissions || fallbackPermissionsCount,
      totalAssignedUsers,
      rolesInUse,
    };
  }

  let systemRoles = 0;
  let customRoles = 0;
  let activeRoles = 0;
  let inactiveRoles = 0;

  for (const r of roles) {
    if (r.isSystem || r.code === 'SUPER_ADMIN') systemRoles++;
    else customRoles++;

    if (r.isActive) activeRoles++;
    else inactiveRoles++;
  }

  return {
    totalRoles: roles.length,
    systemRoles,
    customRoles,
    activeRoles,
    inactiveRoles,
    totalPermissions: fallbackPermissionsCount,
    totalAssignedUsers,
    rolesInUse,
  };
}

export function groupPermissionsByModule(
  grouped: ModulePermissionsGroup[],
  flatPermissions: PermissionDefinition[]
): Array<{ module: string; moduleName: string; description: string; permissions: PermissionDefinition[] }> {
  if (grouped && grouped.length > 0) {
    return grouped;
  }

  const map = new Map<string, PermissionDefinition[]>();
  for (const perm of flatPermissions) {
    const mod = perm.module || 'general';
    const existing = map.get(mod);
    if (existing) existing.push(perm);
    else map.set(mod, [perm]);
  }

  return Array.from(map.entries()).map(([module, permissions]) => ({
    module,
    moduleName: module.charAt(0).toUpperCase() + module.slice(1).replace(/-/g, ' '),
    description: `Capabilities registered for ${module}`,
    permissions,
  }));
}

export function buildRolesCsv(roles: RoleWithStats[]): string {
  const headers = [
    'Role ID',
    'Code',
    'Name',
    'Type',
    'Status',
    'Assigned Users',
    'Permissions Count',
    'Permissions',
    'Description',
    'Updated At',
  ];

  const rows = roles.map((role) =>
    [
      role._id,
      role.code,
      role.name,
      role.isSystem || role.code === 'SUPER_ADMIN' ? 'System' : 'Custom',
      role.isActive ? 'Active' : 'Inactive',
      role.userCount ?? 0,
      role.permissionsCount ?? role.permissions?.length ?? 0,
      (role.permissions || []).join('; '),
      role.description || '',
      role.updatedAt ? new Date(role.updatedAt).toISOString() : '',
    ]
      .map(formatCsvCell)
      .join(',')
  );

  return [headers.map(formatCsvCell).join(','), ...rows].join('\n');
}
