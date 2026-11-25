import type { ChipColor } from '@/components/base/badges/chip';
import type { AuditLogEntry } from '@/lib/api/types';

export interface AuditActionMeta {
  value: string;
  label: string;
  color: ChipColor;
  category: 'auth' | 'admin' | 'security';
}

export interface AuditResourceMeta {
  value: string;
  label: string;
  color: ChipColor;
}

export const AUDIT_ACTION_META: Record<string, AuditActionMeta> = {
  AUTH_LOGIN_SUCCESS: {
    value: 'AUTH_LOGIN_SUCCESS',
    label: 'Login Success',
    color: 'lime',
    category: 'auth',
  },
  AUTH_LOGIN_FAILED: {
    value: 'AUTH_LOGIN_FAILED',
    label: 'Login Failed',
    color: 'rose',
    category: 'security',
  },
  AUTH_LOGOUT: {
    value: 'AUTH_LOGOUT',
    label: 'Logout',
    color: 'neutral',
    category: 'auth',
  },
  AUTH_PASSWORD_CHANGE: {
    value: 'AUTH_PASSWORD_CHANGE',
    label: 'Password Change',
    color: 'yellow',
    category: 'security',
  },
  AUTH_PASSWORD_RESET: {
    value: 'AUTH_PASSWORD_RESET',
    label: 'Password Reset',
    color: 'yellow',
    category: 'security',
  },
  USER_CREATE: {
    value: 'USER_CREATE',
    label: 'User Created',
    color: 'lime',
    category: 'admin',
  },
  USER_UPDATE: {
    value: 'USER_UPDATE',
    label: 'User Updated',
    color: 'blue',
    category: 'admin',
  },
  USER_ROLE_ASSIGN: {
    value: 'USER_ROLE_ASSIGN',
    label: 'Role Assigned',
    color: 'purple',
    category: 'security',
  },
  USER_STATUS_CHANGE: {
    value: 'USER_STATUS_CHANGE',
    label: 'Status Changed',
    color: 'yellow',
    category: 'security',
  },
  USER_AVATAR_UPDATE: {
    value: 'USER_AVATAR_UPDATE',
    label: 'Avatar Updated',
    color: 'blue',
    category: 'admin',
  },
  USER_AVATAR_DELETE: {
    value: 'USER_AVATAR_DELETE',
    label: 'Avatar Removed',
    color: 'orange',
    category: 'admin',
  },
  ROLE_CREATE: {
    value: 'ROLE_CREATE',
    label: 'Role Created',
    color: 'lime',
    category: 'security',
  },
  ROLE_UPDATE: {
    value: 'ROLE_UPDATE',
    label: 'Role Updated',
    color: 'blue',
    category: 'security',
  },
  ROLE_DELETE: {
    value: 'ROLE_DELETE',
    label: 'Role Deleted',
    color: 'rose',
    category: 'security',
  },
  MODULE_ACTIVATION_CHANGE: {
    value: 'MODULE_ACTIVATION_CHANGE',
    label: 'Module Toggled',
    color: 'yellow',
    category: 'admin',
  },
  CDN_ASSET_UPLOAD: {
    value: 'CDN_ASSET_UPLOAD',
    label: 'CDN Upload',
    color: 'lime',
    category: 'admin',
  },
  CDN_ASSET_DELETE: {
    value: 'CDN_ASSET_DELETE',
    label: 'CDN Delete',
    color: 'rose',
    category: 'admin',
  },
  SYSTEM_SETTINGS_UPDATE: {
    value: 'SYSTEM_SETTINGS_UPDATE',
    label: 'Settings Updated',
    color: 'blue',
    category: 'admin',
  },
  INITIAL_SETUP_COMPLETED: {
    value: 'INITIAL_SETUP_COMPLETED',
    label: 'Initial Setup',
    color: 'lime',
    category: 'admin',
  },
};

export const AUDIT_RESOURCE_META: Record<string, AuditResourceMeta> = {
  auth: { value: 'auth', label: 'Authentication', color: 'blue' },
  users: { value: 'users', label: 'Users', color: 'lime' },
  roles: { value: 'roles', label: 'Roles & Access', color: 'purple' },
  modules: { value: 'modules', label: 'Modules', color: 'yellow' },
  cdn: { value: 'cdn', label: 'CDN Storage', color: 'cyan' },
  settings: { value: 'settings', label: 'System Settings', color: 'neutral' },
  installation: { value: 'installation', label: 'Installation', color: 'orange' },
};

export const AUDIT_ACTION_OPTIONS: AuditActionMeta[] = Object.values(AUDIT_ACTION_META);
export const AUDIT_RESOURCE_OPTIONS: AuditResourceMeta[] = Object.values(AUDIT_RESOURCE_META);

export function getActionMeta(action?: string): AuditActionMeta {
  if (!action) {
    return { value: 'UNKNOWN', label: 'Unknown Event', color: 'neutral', category: 'admin' };
  }
  const existing = AUDIT_ACTION_META[action];
  if (existing) return existing;

  const formatted = action
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

  return {
    value: action,
    label: formatted || action,
    color: action.includes('FAILED') || action.includes('DELETE') ? 'rose' : 'cyan',
    category: action.startsWith('AUTH_') ? 'auth' : 'admin',
  };
}

export function getResourceMeta(resource?: string): AuditResourceMeta {
  if (!resource) {
    return { value: 'unknown', label: 'System', color: 'neutral' };
  }
  const normalized = resource.toLowerCase();
  const existing = AUDIT_RESOURCE_META[normalized];
  if (existing) return existing;

  return {
    value: normalized,
    label: normalized.charAt(0).toUpperCase() + normalized.slice(1),
    color: 'soft',
  };
}

export function formatUserAgentSummary(userAgent?: string): string {
  if (!userAgent) return 'System / Internal';

  let client = 'Unknown Client';
  if (/WindowsPowerShell/i.test(userAgent)) client = 'PowerShell';
  else if (/curl/i.test(userAgent)) client = 'cURL';
  else if (/Edg\//i.test(userAgent)) client = 'Edge';
  else if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) client = 'Chrome';
  else if (/Firefox\//i.test(userAgent)) client = 'Firefox';
  else if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) client = 'Safari';

  let os = '';
  if (/Windows/i.test(userAgent)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(userAgent)) os = 'macOS';
  else if (/Linux/i.test(userAgent)) os = 'Linux';
  else if (/Android/i.test(userAgent)) os = 'Android';
  else if (/iPhone|iPad/i.test(userAgent)) os = 'iOS';

  return os ? `${client} · ${os}` : client;
}

export function formatCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export function buildAuditLogsCsv(logs: AuditLogEntry[]): string {
  const headers = [
    'Event ID',
    'Timestamp (ISO)',
    'Actor Email',
    'Actor Human ID',
    'Actor Role',
    'Action',
    'Resource',
    'Resource ID',
    'Description',
    'IP Address',
    'User Agent',
    'Metadata',
  ];

  const rows = logs.map((log) =>
    [
      log._id,
      log.createdAt ? new Date(log.createdAt).toISOString() : '',
      log.actor?.email || 'System',
      log.actor?.humanId || '',
      log.actor?.role || '',
      log.action,
      log.resource,
      log.resourceId || '',
      log.description,
      log.ipAddress || '',
      log.userAgent || '',
      JSON.stringify(log.metadata || {}),
    ]
      .map(formatCsvCell)
      .join(',')
  );

  return [headers.map(formatCsvCell).join(','), ...rows].join('\n');
}

export interface AuditSummaryStats {
  totalEvents: number;
  authEvents: number;
  adminEvents: number;
  failedLogins: number;
  recent24hCount: number;
  uniqueActorsCount: number;
  authSharePercent: number;
}

export function computeAuditSummaryStats(
  recentBatch: AuditLogEntry[],
  totals: { all: number; auth: number; failed: number },
  nowMs: number = Date.now()
): AuditSummaryStats {
  const oneDayAgoMs = nowMs - 24 * 60 * 60 * 1000;
  const uniqueActors = new Set<string>();
  let recent24hCount = 0;

  for (const log of recentBatch) {
    if (log.actor?.id) uniqueActors.add(log.actor.id);
    else if (log.actor?.email) uniqueActors.add(log.actor.email);

    if (log.createdAt) {
      const ts = new Date(log.createdAt).getTime();
      if (!Number.isNaN(ts) && ts >= oneDayAgoMs) {
        recent24hCount += 1;
      }
    }
  }

  const totalEvents = Math.max(0, totals.all);
  const authEvents = Math.max(0, totals.auth);
  const adminEvents = Math.max(0, totalEvents - authEvents);
  const failedLogins = Math.max(0, totals.failed);
  const authSharePercent = totalEvents > 0 ? Math.round((authEvents / totalEvents) * 100) : 0;

  return {
    totalEvents,
    authEvents,
    adminEvents,
    failedLogins,
    recent24hCount,
    uniqueActorsCount: uniqueActors.size,
    authSharePercent,
  };
}
