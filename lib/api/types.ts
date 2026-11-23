export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
} as const;

export type Role = typeof Role[keyof typeof Role];

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  _id?: string;
  id?: string;
  humanId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role | string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginPayload {
  identifier?: string;
  email?: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface InstallationStatus {
  initialized: boolean;
  setupRequired: boolean;
  isInitialized: boolean;
  initializedAt: string | null;
  version: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface InstallationSetupPayload {
  administrator: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };
  organization: {
    name: string;
    legalName?: string;
    email: string;
    phone?: string;
    website?: string;
    address?: Address;
    currency?: string;
    timezone?: string;
    locale?: string;
  };
}

export interface InstallationSetupResponse {
  success: boolean;
  message: string;
  administrator: User;
  organization: {
    name: string;
    email: string;
    currency?: string;
  };
  tokens: AuthTokens;
}

export interface RoleDocument {
  _id: string;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  permissions: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionDefinition {
  id: string;
  name: string;
  description: string;
  module: string;
}

export interface CreateRolePayload {
  code: string;
  name: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
}

export interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  role: Role | string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  role?: Role | string;
}

export interface QueryUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

export interface OrganizationSettings {
  _id: string;
  key: string;
  name: string;
  legalName?: string;
  logo?: string | null;
  email: string;
  phone?: string;
  website?: string;
  address?: Address;
  currency: string;
  timezone: string;
  locale: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateOrganizationPayload {
  name?: string;
  legalName?: string;
  logo?: string | null;
  email?: string;
  phone?: string;
  website?: string;
  address?: Address;
  currency?: string;
  timezone?: string;
  locale?: string;
}

export interface SystemSettings {
  _id: string;
  key: string;
  defaultTimezone: string;
  defaultLocale: string;
  defaultCurrency: string;
  dateFormat: string;
  timeFormat: string;
  defaultPaginationLimit: number;
  allowPasswordReset: boolean;
  sessionTimeoutMinutes: number;
  customPreferences?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateSystemSettingsPayload {
  defaultTimezone?: string;
  defaultLocale?: string;
  defaultCurrency?: string;
  dateFormat?: string;
  timeFormat?: string;
  defaultPaginationLimit?: number;
  allowPasswordReset?: boolean;
  sessionTimeoutMinutes?: number;
  customPreferences?: Record<string, any>;
}

export interface ModuleRegistration {
  _id: string;
  id: string;
  name: string;
  description: string;
  version: string;
  isCore: boolean;
  isActivated: boolean;
  dependencies: string[];
  permissions?: Array<{ id: string; name: string; description: string }>;
  activatedAt?: string | null;
}

export interface AuditLogEntry {
  _id: string;
  actor: {
    id: string;
    email: string;
    humanId?: string;
    role?: string;
  };
  action: string;
  resource: string;
  resourceId?: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface QueryAuditLogsParams {
  page?: number;
  limit?: number;
  action?: string;
  resource?: string;
  actorId?: string;
  search?: string;
}

export interface HealthCheckResponse {
  status: string;
  application: string;
}

export interface HealthReadyResponse {
  status: string;
  statusCode: number;
  application: string;
  timestamp: string;
  uptime: number;
  dependencies: {
    database: {
      status: string;
    };
  };
}
