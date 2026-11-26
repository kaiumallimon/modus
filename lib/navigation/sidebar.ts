export type SidebarNavIconKey =
  | 'dashboard'
  | 'users'
  | 'roles'
  | 'audit-logs'
  | 'modules'
  | 'cdn'
  | 'inventory-overview'
  | 'inventory-catalog'
  | 'inventory-warehouses'
  | 'inventory-stock'
  | 'procurement-overview'
  | 'procurement-suppliers'
  | 'procurement-orders'
  | 'procurement-receipts'
  | 'sales-overview'
  | 'sales-customers'
  | 'sales-orders'
  | 'sales-fulfillments';

export interface SidebarNavItem {
  id: string;
  label: string;
  href: string;
  icon: SidebarNavIconKey;
  permission?: string;
  anyPermissions?: string[];
  exactMatch?: boolean;
  badge?: number | string;
}

export interface SidebarNavGroup {
  id: string;
  label: string;
  moduleId?: string;
  requiredDependencies?: string[];
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

export const INVENTORY_NAV_GROUP: SidebarNavGroup = {
  id: 'inventory',
  label: 'Inventory',
  moduleId: 'inventory',
  items: [
    {
      id: 'inventory-overview',
      label: 'Overview',
      href: '/inventory',
      icon: 'inventory-overview',
      exactMatch: true,
      anyPermissions: [
        'inventory.products.read',
        'inventory.categories.read',
        'inventory.units.read',
        'inventory.warehouses.read',
        'inventory.stock.read',
        'inventory.movements.read',
      ],
    },
    {
      id: 'inventory-catalog',
      label: 'Catalog',
      href: '/inventory/catalog',
      icon: 'inventory-catalog',
      anyPermissions: [
        'inventory.products.read',
        'inventory.categories.read',
        'inventory.units.read',
      ],
    },
    {
      id: 'inventory-warehouses',
      label: 'Warehouses',
      href: '/inventory/warehouses',
      icon: 'inventory-warehouses',
      permission: 'inventory.warehouses.read',
    },
    {
      id: 'inventory-stock',
      label: 'Stock & Ledger',
      href: '/inventory/stock',
      icon: 'inventory-stock',
      anyPermissions: ['inventory.stock.read', 'inventory.movements.read'],
    },
  ],
};

export const PROCUREMENT_NAV_GROUP: SidebarNavGroup = {
  id: 'procurement',
  label: 'Procurement',
  moduleId: 'procurement',
  requiredDependencies: ['inventory'],
  items: [
    {
      id: 'procurement-overview',
      label: 'Overview',
      href: '/procurement',
      icon: 'procurement-overview',
      exactMatch: true,
      anyPermissions: [
        'procurement.dashboard.read',
        'procurement.suppliers.read',
        'procurement.purchase-orders.read',
        'procurement.goods-receipts.read',
        'procurement.supplier-transactions.read',
      ],
    },
    {
      id: 'procurement-suppliers',
      label: 'Suppliers',
      href: '/procurement/suppliers',
      icon: 'procurement-suppliers',
      anyPermissions: [
        'procurement.suppliers.read',
        'procurement.supplier-transactions.read',
      ],
    },
    {
      id: 'procurement-orders',
      label: 'Purchase Orders',
      href: '/procurement/purchase-orders',
      icon: 'procurement-orders',
      permission: 'procurement.purchase-orders.read',
    },
    {
      id: 'procurement-receipts',
      label: 'Goods Receipts',
      href: '/procurement/goods-receipts',
      icon: 'procurement-receipts',
      permission: 'procurement.goods-receipts.read',
    },
  ],
};

export const SALES_NAV_GROUP: SidebarNavGroup = {
  id: 'sales',
  label: 'SALES',
  moduleId: 'sales',
  requiredDependencies: ['inventory'],
  items: [
    {
      id: 'sales-overview',
      label: 'Overview',
      href: '/sales',
      icon: 'sales-overview',
      permission: 'sales.dashboard.read',
      exactMatch: true,
    },
    {
      id: 'sales-customers',
      label: 'Customers',
      href: '/sales/customers',
      icon: 'sales-customers',
      permission: 'sales.customers.read',
    },
    {
      id: 'sales-orders',
      label: 'Sales Orders',
      href: '/sales/orders',
      icon: 'sales-orders',
      permission: 'sales.orders.read',
    },
    {
      id: 'sales-fulfillments',
      label: 'Fulfillments & Reports',
      href: '/sales/fulfillments',
      icon: 'sales-fulfillments',
      anyPermissions: ['sales.fulfillments.read', 'sales.reports.read'],
    },
  ],
};

export const ALL_SIDEBAR_NAV_GROUPS: SidebarNavGroup[] = [
  ...SIDEBAR_NAV_GROUPS,
  INVENTORY_NAV_GROUP,
  PROCUREMENT_NAV_GROUP,
  SALES_NAV_GROUP,
];

/**
 * Filters categorized navigation groups by module activation, module dependencies,
 * user permissions, and an optional search query, automatically omitting empty groups.
 */
export function filterSidebarGroups(
  groups: SidebarNavGroup[],
  hasPermission: (permission: string) => boolean,
  searchQuery: string = '',
  isModuleActive?: (moduleId: string) => boolean
): SidebarNavGroup[] {
  const query = searchQuery.toLowerCase().trim();

  return groups
    .filter((group) => {
      if (!isModuleActive) return true;
      if (group.moduleId && !isModuleActive(group.moduleId)) return false;
      if (
        group.requiredDependencies &&
        group.requiredDependencies.some((dep) => !isModuleActive(dep))
      ) {
        return false;
      }
      return true;
    })
    .map((group) => {
      const groupMatches = query.length > 0 && group.label.toLowerCase().includes(query);
      const visibleItems = group.items.filter((item) => {
        if (item.permission && !hasPermission(item.permission)) {
          return false;
        }
        if (item.anyPermissions && !item.anyPermissions.some((p) => hasPermission(p))) {
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
