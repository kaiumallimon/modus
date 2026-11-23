'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  RiUserLine,
  RiBuildingLine,
  RiShieldUserLine,
  RiAppsLine,
  RiSettings4Line,
  RiCheckDoubleLine,
  RiTimeLine,
  RiArrowRightLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  HealthReadyResponse,
  OrganizationSettings,
  ModuleRegistration,
  AuditLogEntry,
  PaginatedResult,
} from '@/lib/api/types';
import { Chip } from '@/components/base/badges/chip';
import { Button } from '@/components/base/buttons/button';
import { Spinner } from '@/components/base/spinner/spinner';

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();

  const [health, setHealth] = useState<HealthReadyResponse | null>(null);
  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [modules, setModules] = useState<ModuleRegistration[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // Fetch health
        try {
          const h = await apiClient<HealthReadyResponse>(API_ENDPOINTS.HEALTH_READY);
          setHealth(h);
        } catch {}

        // Fetch org if permitted
        if (hasPermission('organization.read')) {
          try {
            const o = await apiClient<OrganizationSettings>(API_ENDPOINTS.ORGANIZATION);
            setOrg(o);
          } catch {}
        }

        // Fetch modules if permitted
        if (hasPermission('modules.read')) {
          try {
            const m = await apiClient<ModuleRegistration[]>(API_ENDPOINTS.MODULES);
            setModules(m);
          } catch {}
        }

        // Fetch recent audits if permitted
        if (hasPermission('audit.read')) {
          try {
            const a = await apiClient<PaginatedResult<AuditLogEntry>>(
              API_ENDPOINTS.AUDIT_LOGS,
              { params: { page: 1, limit: 5 } }
            );
            setRecentAudits(a.data || []);
          } catch {}
        }
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [hasPermission]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" className="text-accent-600" />
      </div>
    );
  }

  const activeModulesCount = modules.filter((m) => m.isActivated).length;
  const isDbConnected = health?.dependencies?.database?.status === 'connected';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-background-primary-default border border-border-button-default rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-title-2-medium text-text-primary">
              Welcome back, {user?.firstName} {user?.lastName}
            </h1>
            <Chip color="lime" variant="caption" className="capitalize">
              {String(user?.role).replace('_', ' ')}
            </Chip>
          </div>
          <p className="text-body-medium text-text-secondary">
            Modus system status is currently operational. All core infrastructure services are healthy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission('users.create') && (
            <Link href="/users">
              <Button variant="primary" size="small" leadingIcon={RiUserLine}>
                Manage Users
              </Button>
            </Link>
          )}
          {hasPermission('settings.read') && (
            <Link href="/settings">
              <Button variant="secondary" size="small" leadingIcon={RiSettings4Line}>
                System Settings
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* System Health */}
        <div className="bg-background-primary-default border border-border-button-default rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption-1-medium text-text-secondary">System Health</span>
            <Chip color={isDbConnected ? 'lime' : 'rose'} variant="caption">
              {isDbConnected ? 'Online' : 'Degraded'}
            </Chip>
          </div>
          <div className="text-title-2-medium text-text-primary">
            {health?.application || 'Modus'}
          </div>
          <p className="text-caption-2-medium text-text-tertiary flex items-center gap-1">
            <RiCheckDoubleLine className="size-3.5 text-accent-600" />
            MongoDB: {health?.dependencies?.database?.status || 'Unknown'}
          </p>
        </div>

        {/* Organization */}
        <div className="bg-background-primary-default border border-border-button-default rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption-1-medium text-text-secondary">Organization</span>
            <RiBuildingLine className="size-4 text-text-tertiary" />
          </div>
          <div className="text-title-2-medium text-text-primary truncate">
            {org?.name || 'Modus Org'}
          </div>
          <p className="text-caption-2-medium text-text-tertiary truncate">
            Currency: {org?.currency || 'USD'} · {org?.timezone || 'UTC'}
          </p>
        </div>

        {/* Modules Registry */}
        <div className="bg-background-primary-default border border-border-button-default rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption-1-medium text-text-secondary">Active Modules</span>
            <RiAppsLine className="size-4 text-accent-600" />
          </div>
          <div className="text-title-2-medium text-text-primary">
            {activeModulesCount} <span className="text-body-medium text-text-tertiary">/ {modules.length}</span>
          </div>
          <p className="text-caption-2-medium text-text-tertiary">
            Core & local module extensions
          </p>
        </div>

        {/* Security / RBAC */}
        <div className="bg-background-primary-default border border-border-button-default rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption-1-medium text-text-secondary">Access Control</span>
            <RiShieldUserLine className="size-4 text-text-tertiary" />
          </div>
          <div className="text-title-2-medium text-text-primary">RBAC Active</div>
          <p className="text-caption-2-medium text-text-tertiary">
            Platform-wide role enforcement
          </p>
        </div>
      </div>

      {/* Grid: Active Modules Overview & Recent Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module Registry Snapshot */}
        <div className="bg-background-primary-default border border-border-button-default rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-title-3-semibold text-text-primary">Module Registry</h2>
              <p className="text-caption-1-medium text-text-secondary">Locally integrated system capabilities</p>
            </div>
            {hasPermission('modules.read') && (
              <Link href="/modules" className="text-caption-1-semibold text-accent-700 hover:underline flex items-center gap-1">
                View all <RiArrowRightLine className="size-3.5" />
              </Link>
            )}
          </div>

          <div className="space-y-2.5">
            {modules.slice(0, 4).map((mod) => (
              <div
                key={mod.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background-secondary-default border border-separator-border"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-body-medium text-text-primary">{mod.name}</span>
                    {mod.isCore && (
                      <Chip color="neutral" variant="caption">
                        Core
                      </Chip>
                    )}
                  </div>
                  <p className="text-caption-2-medium text-text-tertiary line-clamp-1">{mod.description}</p>
                </div>
                <Chip color={mod.isActivated ? 'lime' : 'neutral'} variant="caption">
                  {mod.isActivated ? 'Active' : 'Inactive'}
                </Chip>
              </div>
            ))}
            {modules.length === 0 && (
              <p className="text-body-medium text-text-tertiary py-4 text-center">No modules found.</p>
            )}
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="bg-background-primary-default border border-border-button-default rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-title-3-semibold text-text-primary">Recent Audit Events</h2>
              <p className="text-caption-1-medium text-text-secondary">Immutable administrative activity log</p>
            </div>
            {hasPermission('audit.read') && (
              <Link href="/audit-logs" className="text-caption-1-semibold text-accent-700 hover:underline flex items-center gap-1">
                View all <RiArrowRightLine className="size-3.5" />
              </Link>
            )}
          </div>

          <div className="space-y-2.5">
            {recentAudits.map((item) => (
              <div
                key={item._id}
                className="flex items-start justify-between p-3 rounded-lg bg-background-secondary-default border border-separator-border text-body-medium"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary text-caption-1-semibold font-mono">
                      {item.action}
                    </span>
                    <span className="text-caption-2-medium text-text-tertiary">
                      by {item.actor?.email || 'System'}
                    </span>
                  </div>
                  <p className="text-caption-2-medium text-text-secondary">{item.description}</p>
                </div>
                <span className="text-[11px] text-text-tertiary shrink-0 flex items-center gap-1">
                  <RiTimeLine className="size-3" />
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {recentAudits.length === 0 && (
              <p className="text-body-medium text-text-tertiary py-4 text-center">No recent audit logs.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
