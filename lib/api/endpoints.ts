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

  // Organization
  ORGANIZATION: '/organization',

  // Settings
  SETTINGS: '/settings',

  // Modules
  MODULES: '/modules',
  MODULE_BY_ID: (id: string) => `/modules/${id}`,
  MODULE_ACTIVATION: (id: string) => `/modules/${id}/activation`,

  // Audit Logs
  AUDIT_LOGS: '/audit-logs',
  AUDIT_LOG_BY_ID: (id: string) => `/audit-logs/${id}`,
} as const;
