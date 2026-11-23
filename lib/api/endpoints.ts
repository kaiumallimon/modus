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
  AUTH_CHANGE_PASSWORD: '/auth/change-password',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/auth/reset-password',

  // Users
  USERS: '/users',
  USER_BY_ID: (id: string) => `/users/${id}`,
  USER_STATUS: (id: string) => `/users/${id}/status`,

  // Roles & Permissions
  ROLES: '/roles',
  ROLE_BY_ID: (id: string) => `/roles/${id}`,
  PERMISSIONS: '/permissions',

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
