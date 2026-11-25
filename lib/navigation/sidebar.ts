export type SidebarNavIconKey =
  | 'dashboard'
  | 'users'
  | 'roles'
  | 'audit-logs'
  | 'modules'
  | 'cdn';

export interface SidebarNavItem {
  id: string;
  label: string;
  href: string;
  icon: SidebarNavIconKey;
  permission?: string;
  badge?: number | string;
}

export interface SidebarNavGroup {
  id: string;
  label: string;
  items: SidebarNavItem[];
}

export const SIDEBAR_NAV_GROUPS: SidebarNavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        icon: 'dashboard',
      },
    ],
  },
  {
    id: 'identity-security',
    label: 'Identity & Security',
    items: [
      {
        id: 'users',
        label: 'Users',
        href: '/users',
        icon: 'users',
        permission: 'users.read',
      },
      {
        id: 'roles',
        label: 'Roles & Access',
        href: '/roles',
        icon: 'roles',
        permission: 'roles.read',
      },
      {
        id: 'audit-logs',
        label: 'Audit Logs',
        href: '/audit-logs',
        icon: 'audit-logs',
        permission: 'audit.read',
      },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    items: [
      {
        id: 'modules',
        label: 'Module Registry',
        href: '/modules',
        icon: 'modules',
        permission: 'modules.read',
      },
      {
        id: 'cdn',
        label: 'CDN Explorer',
        href: '/cdn',
        icon: 'cdn',
        permission: 'cdn.read',
      },
    ],
  },
];

/**
 * Filters categorized navigation groups by user permissions and an optional search query,
 * automatically omitting categories that end up with zero visible items.
 */
export function filterSidebarGroups(
  groups: SidebarNavGroup[],
  hasPermission: (permission: string) => boolean,
  searchQuery: string = ''
): SidebarNavGroup[] {
  const query = searchQuery.toLowerCase().trim();

  return groups
    .map((group) => {
      const groupMatches = query.length > 0 && group.label.toLowerCase().includes(query);
      const visibleItems = group.items.filter((item) => {
        if (item.permission && !hasPermission(item.permission)) {
          return false;
        }
        if (!query) return true;
        return groupMatches || item.label.toLowerCase().includes(query);
      });

      return {
        ...group,
        items: visibleItems,
      };
    })
    .filter((group) => group.items.length > 0);
}
