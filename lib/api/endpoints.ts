export const API_ENDPOINTS = {
  // Health
  HEALTH: '/health',
  HEALTH_READY: '/health/ready',

  // Installation
  INSTALLATION_STATUS: '/installation/status',
  INSTALLATION_SETUP: '/installation/setup',

  // Authentication
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_ME: '/auth/me',
  AUTH_AVATAR: '/auth/me/avatar',
  AUTH_CHANGE_PASSWORD: '/auth/change-password',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/auth/reset-password',

  // Users
  USERS: '/users',
  USER_BY_ID: (id: string) => `/users/${id}`,
  USER_STATUS: (id: string) => `/users/${id}/status`,
  USER_ROLE: (id: string) => `/users/${id}/role`,

  // Roles & Permissions
  ROLES: '/roles',
  ROLE_BY_ID: (id: string) => `/roles/${id}`,
  ROLE_STATS: '/roles/stats',
  PERMISSIONS: '/permissions',
  PERMISSIONS_GROUPED: '/permissions/grouped',
  USER_PERMISSIONS: (id: string) => `/users/${id}/permissions`,

  // Settings
  SETTINGS: '/settings',

  // Modules
  MODULES: '/modules',
  MODULES_ACTIVE: '/modules/active',
  MODULE_BY_ID: (id: string) => `/modules/${id}`,
  MODULE_ACTIVATION: (id: string) => `/modules/${id}/activation`,

  // Inventory
  INVENTORY_DASHBOARD: '/inventory/dashboard',
  INVENTORY_PRODUCTS: '/inventory/products',
  INVENTORY_PRODUCT_BY_ID: (id: string) => `/inventory/products/${id}`,
  INVENTORY_PRODUCT_ARCHIVE: (id: string) => `/inventory/products/${id}/archive`,
  INVENTORY_PRODUCT_IMAGE: (id: string) => `/inventory/products/${id}/image`,
  INVENTORY_CATEGORIES: '/inventory/categories',
  INVENTORY_CATEGORY_BY_ID: (id: string) => `/inventory/categories/${id}`,
  INVENTORY_CATEGORY_ARCHIVE: (id: string) => `/inventory/categories/${id}/archive`,
  INVENTORY_UNITS: '/inventory/units',
  INVENTORY_UNIT_BY_ID: (id: string) => `/inventory/units/${id}`,
  INVENTORY_UNIT_ARCHIVE: (id: string) => `/inventory/units/${id}/archive`,
  INVENTORY_WAREHOUSES: '/inventory/warehouses',
  INVENTORY_WAREHOUSE_BY_ID: (id: string) => `/inventory/warehouses/${id}`,
  INVENTORY_WAREHOUSE_DEACTIVATE: (id: string) => `/inventory/warehouses/${id}/deactivate`,
  INVENTORY_STOCK: '/inventory/stock',
  INVENTORY_ADJUSTMENTS: '/inventory/adjustments',
  INVENTORY_ADJUSTMENT_BY_ID: (id: string) => `/inventory/adjustments/${id}`,
  INVENTORY_TRANSFERS: '/inventory/transfers',
  INVENTORY_TRANSFER_BY_ID: (id: string) => `/inventory/transfers/${id}`,
  INVENTORY_TRANSFER_CONFIRM: (id: string) => `/inventory/transfers/${id}/confirm`,
  INVENTORY_MOVEMENTS: '/inventory/movements',
  INVENTORY_MOVEMENT_BY_ID: (id: string) => `/inventory/movements/${id}`,

  // Procurement
  PROCUREMENT_DASHBOARD: '/procurement/dashboard',
  PROCUREMENT_SUPPLIERS: '/procurement/suppliers',
  PROCUREMENT_SUPPLIER_BY_ID: (id: string) => `/procurement/suppliers/${id}`,
  PROCUREMENT_SUPPLIER_DEACTIVATE: (id: string) =>
    `/procurement/suppliers/${id}/deactivate`,
  PROCUREMENT_SUPPLIER_STATEMENT: (id: string) =>
    `/procurement/suppliers/${id}/statement`,
  PROCUREMENT_PURCHASE_ORDERS: '/procurement/purchase-orders',
  PROCUREMENT_PURCHASE_ORDER_BY_ID: (id: string) =>
    `/procurement/purchase-orders/${id}`,
  PROCUREMENT_PURCHASE_ORDER_SUBMIT: (id: string) =>
    `/procurement/purchase-orders/${id}/submit`,
  PROCUREMENT_PURCHASE_ORDER_CANCEL: (id: string) =>
    `/procurement/purchase-orders/${id}/cancel`,
  PROCUREMENT_GOODS_RECEIPTS: '/procurement/goods-receipts',
  PROCUREMENT_GOODS_RECEIPT_BY_ID: (id: string) =>
    `/procurement/goods-receipts/${id}`,
  PROCUREMENT_GOODS_RECEIPT_CONFIRM: (id: string) =>
    `/procurement/goods-receipts/${id}/confirm`,
  PROCUREMENT_SUPPLIER_TRANSACTIONS: '/procurement/supplier-transactions',

  // Audit Logs
  AUDIT_LOGS: '/audit-logs',
  AUDIT_LOG_BY_ID: (id: string) => `/audit-logs/${id}`,

  // CDN & Storage Explorer
  STORAGE_STATS: '/storage/stats',
  STORAGE_OBJECTS: '/storage/objects',
  STORAGE_UPLOAD: '/storage/upload',
  STORAGE_DELETE: '/storage/objects',
} as const;
