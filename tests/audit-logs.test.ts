import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getActionMeta,
  getResourceMeta,
  formatUserAgentSummary,
  formatCsvCell,
  buildAuditLogsCsv,
  computeAuditSummaryStats,
} from '../lib/audit-logs/utils';
import { API_ENDPOINTS } from '../lib/api/endpoints';
import type { AuditLogEntry } from '../lib/api/types';

describe('Audit Logs Utilities & Formatting Tests', () => {
  it('resolves known backend action metadata cleanly', () => {
    const failed = getActionMeta('AUTH_LOGIN_FAILED');
    assert.equal(failed.label, 'Login Failed');
    assert.equal(failed.color, 'rose');

    const created = getActionMeta('USER_CREATE');
    assert.equal(created.label, 'User Created');
    assert.equal(created.color, 'lime');

    const roleAssign = getActionMeta('USER_ROLE_ASSIGN');
    assert.equal(roleAssign.label, 'Role Assigned');
    assert.equal(roleAssign.color, 'purple');
  });

  it('provides safe fallback metadata for unknown future actions and resources', () => {
    const customAction = getActionMeta('INVOICE_EXPORT_FAILED');
    assert.equal(customAction.label, 'Invoice Export Failed');
    assert.equal(customAction.color, 'rose');

    const customRes = getResourceMeta('billing');
    assert.equal(customRes.label, 'Billing');
    assert.equal(customRes.color, 'soft');
  });

  it('summarizes user-agent strings cleanly for display', () => {
    assert.equal(
      formatUserAgentSummary(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152.0.0.0 Safari/537.36'
      ),
      'Chrome · Windows'
    );
    assert.equal(
      formatUserAgentSummary('Mozilla/5.0 (Windows; Windows NT 10.0; en-US) WindowsPowerShell/5.1'),
      'PowerShell · Windows'
    );
    assert.equal(formatUserAgentSummary(undefined), 'System / Internal');
  });

  it('escapes CSV cells and builds valid CSV output with metadata', () => {
    assert.equal(formatCsvCell('Role "Admin", Updated'), '"Role ""Admin"", Updated"');

    const sampleLogs: AuditLogEntry[] = [
      {
        _id: '6b074a5c14ae420a4ed3a930',
        actor: {
          id: 'u1',
          email: 'admin@modus.local',
          humanId: 'MOD-10001',
          role: 'SUPER_ADMIN',
        },
        action: 'ROLE_UPDATE',
        resource: 'roles',
        resourceId: 'r1',
        description: 'Updated role "Finance", permissions added',
        metadata: { permissionsCount: 5 },
        ipAddress: '127.0.0.1',
        userAgent: 'Chrome/152.0',
        createdAt: '2026-11-25T20:00:00.000Z',
      },
    ];

    const csv = buildAuditLogsCsv(sampleLogs);
    const lines = csv.split('\n');
    assert.equal(lines.length, 2);
    assert.ok(lines[0].includes('"Event ID"'));
    assert.ok(lines[1].includes('"Updated role ""Finance"", permissions added"'));
    assert.ok(lines[1].includes('"{""permissionsCount"":5}"'));
  });

  it('computes accurate audit summary KPI stats across batch and backend totals', () => {
    const now = new Date('2026-11-26T02:00:00.000Z').getTime();
    const recentBatch: AuditLogEntry[] = [
      {
        _id: '1',
        actor: { id: 'u1', email: 'a@modus.local' },
        action: 'AUTH_LOGIN_SUCCESS',
        resource: 'auth',
        description: 'Login ok',
        createdAt: '2026-11-26T01:00:00.000Z', // 1h ago
      },
      {
        _id: '2',
        actor: { id: 'u2', email: 'b@modus.local' },
        action: 'USER_CREATE',
        resource: 'users',
        description: 'Created user',
        createdAt: '2026-11-25T10:00:00.000Z', // 16h ago
      },
      {
        _id: '3',
        actor: { id: 'u1', email: 'a@modus.local' },
        action: 'AUTH_LOGIN_FAILED',
        resource: 'auth',
        description: 'Bad password',
        createdAt: '2026-11-20T00:00:00.000Z', // 6 days ago
      },
    ];

    const stats = computeAuditSummaryStats(
      recentBatch,
      { all: 68, auth: 50, failed: 12 },
      now
    );

    assert.equal(stats.totalEvents, 68);
    assert.equal(stats.authEvents, 50);
    assert.equal(stats.adminEvents, 18);
    assert.equal(stats.failedLogins, 12);
    assert.equal(stats.recent24hCount, 2);
    assert.equal(stats.uniqueActorsCount, 2);
    assert.equal(stats.authSharePercent, 74);
  });

  it('verifies audit log API endpoints match backend controller paths', () => {
    assert.equal(API_ENDPOINTS.AUDIT_LOGS, '/audit-logs');
    assert.equal(API_ENDPOINTS.AUDIT_LOG_BY_ID('6b074a5c14ae420a4ed3a930'), '/audit-logs/6b074a5c14ae420a4ed3a930');
  });
});
