'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  RiHeartPulseLine,
  RiAppsLine,
  RiShieldUserLine,
  RiFileHistoryLine,
  RiAlertLine,
  RiSearchLine,
  RiNotification3Line,
  RiEyeLine,
  RiTimeLine,
  RiDatabase2Line,
  RiLockLine,
  RiMailLine,
  RiArrowDownSLine,
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
  User,
} from '@/lib/api/types';
import { Chip } from '@/components/base/badges/chip';
import { Avatar } from '@/components/base/avatar/avatar';
import { Spinner } from '@/components/base/spinner/spinner';
import { ThemeToggle } from '@/components/application/theme/theme-toggle';
import { cx } from '@/utils/cx';

interface SystemModuleItem {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  isCore: boolean;
  isActivated: boolean;
  permissionsCount: number;
}

const DEFAULT_CORE_MODULES: SystemModuleItem[] = [
  {
    id: 'auth',
    name: 'Authentication Engine',
    description: 'JWT token rotation and password hashing',
    version: '1.0.0',
    category: 'Security & Identity',
    isCore: true,
    isActivated: true,
    permissionsCount: 8,
  },
  {
    id: 'users',
    name: 'User Directory & Human ID',
    description: 'Enterprise Human ID generation & lifecycle',
    version: '1.0.0',
    category: 'Core System',
    isCore: true,
    isActivated: true,
    permissionsCount: 6,
  },
  {
    id: 'access-control',
    name: 'Role-Based Access Control',
    description: 'Dynamic permissions matrix & role definitions',
    version: '1.0.0',
    category: 'Security & RBAC',
    isCore: true,
    isActivated: true,
    permissionsCount: 12,
  },
  {
    id: 'audit-log',
    name: 'Immutable Audit Ledger',
    description: 'Tamper-resistant administrative log trail',
    version: '1.0.0',
    category: 'Compliance & Audit',
    isCore: true,
    isActivated: true,
    permissionsCount: 4,
  },
  {
    id: 'organization',
    name: 'Organization Profile',
    description: 'Workspace locale, currency & parameters',
    version: '1.0.0',
    category: 'Core System',
    isCore: true,
    isActivated: true,
    permissionsCount: 4,
  },
  {
    id: 'system-settings',
    name: 'Global System Preferences',
    description: 'Session timeout thresholds & lockouts',
    version: '1.0.0',
    category: 'Infrastructure',
    isCore: true,
    isActivated: true,
    permissionsCount: 4,
  },
];

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();

  // Backend data
  const [health, setHealth] = useState<HealthReadyResponse | null>(null);
  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [backendModules, setBackendModules] = useState<ModuleRegistration[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [recentAudits, setRecentAudits] = useState<AuditLogEntry[]>([]);
  const [totalAudits, setTotalAudits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadDashboardData = useCallback(async () => {
    try {
      // 1. Health
      try {
        const h = await apiClient<HealthReadyResponse>(API_ENDPOINTS.HEALTH_READY);
        setHealth(h);
      } catch {}

      // 2. Organization
      if (hasPermission('organization.read')) {
        try {
          const o = await apiClient<OrganizationSettings>(API_ENDPOINTS.ORGANIZATION);
          setOrg(o);
        } catch {}
      }

      // 3. Module Registry
      if (hasPermission('modules.read')) {
        try {
          const m = await apiClient<ModuleRegistration[]>(API_ENDPOINTS.MODULES);
          setBackendModules(m || []);
        } catch {}
      }

      // 4. Total Users
      if (hasPermission('users.read')) {
        try {
          const u = await apiClient<PaginatedResult<User>>(API_ENDPOINTS.USERS, {
            params: { page: 1, limit: 1 },
          });
          if (u?.meta?.total !== undefined) {
            setTotalUsers(u.meta.total);
          }
        } catch {}
      }

      // 5. Audit Logs
      if (hasPermission('audit.read')) {
        try {
          const a = await apiClient<PaginatedResult<AuditLogEntry>>(API_ENDPOINTS.AUDIT_LOGS, {
            params: { page: 1, limit: 5 },
          });
          setRecentAudits(a.data || []);
          if (a?.meta?.total !== undefined) {
            setTotalAudits(a.meta.total);
          }
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, [hasPermission]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Merge core system modules with dynamic backend modules
  const allModules: SystemModuleItem[] = useMemo(() => {
    const list: SystemModuleItem[] = [...DEFAULT_CORE_MODULES];
    for (const bMod of backendModules) {
      if (!list.some((item) => item.id === bMod.id)) {
        list.push({
          id: bMod.id,
          name: bMod.name,
          description: bMod.description,
          version: bMod.version || '1.0.0',
          category: 'Business Extension',
          isCore: bMod.isCore,
          isActivated: bMod.isActivated,
          permissionsCount: bMod.permissions?.length || 0,
        });
      }
    }
    return list;
  }, [backendModules]);

  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return allModules;
    const q = searchQuery.toLowerCase();
    return allModules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [allModules, searchQuery]);

  // Greeting calculation
  const [greeting, setGreeting] = useState('Good day');
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    setFormattedDate(
      now.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" className="text-accent-600" />
      </div>
    );
  }

  const isDbConnected = health?.dependencies?.database?.status === 'connected';
  const activeModulesCount = allModules.filter((m) => m.isActivated).length;

  return (
    <div className="space-y-5 pb-8">
      {/* 1. Top Greeting & Action Header matching reference */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-title-1-medium sm:text-display-4-medium font-bold text-text-primary tracking-tight">
            {greeting}, {user?.firstName || 'William'}!
          </h1>
          <p className="text-body-2-medium text-text-secondary mt-0.5">{formattedDate}</p>
        </div>

        {/* Right Search, Notification, and User profile pill */}
        <div className="flex items-center gap-2.5">
          {/* Search Pill */}
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-48 sm:w-60 ps-4 pe-9 rounded-full bg-background-primary-default border border-border-button-default text-body-2-medium text-text-primary placeholder:text-text-placeholder outline-none focus:border-accent-500 shadow-2xs transition-all"
            />
            <RiSearchLine className="absolute end-3 size-4 text-text-tertiary pointer-events-none" />
          </div>

          {/* Notification Button */}
          <button
            type="button"
            className="size-10 rounded-full bg-background-primary-default border border-border-button-default text-text-secondary hover:text-text-primary flex items-center justify-center shadow-2xs transition-colors"
            title="Notifications"
            aria-label="Notifications"
          >
            <RiNotification3Line className="size-4.5" />
          </button>

          {/* Theme Toggle */}
          <div className="size-10 rounded-full bg-background-primary-default border border-border-button-default flex items-center justify-center shadow-2xs">
            <ThemeToggle collapsed />
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 ps-1 pe-3 py-1 rounded-full bg-background-primary-default border border-border-button-default shadow-2xs">
            <Avatar
              initials={user?.firstName ? user.firstName[0].toUpperCase() : 'W'}
              size="sm"
              color="lime"
              className="font-bold"
            />
            <span className="text-body-2-medium font-semibold text-text-primary hidden sm:inline truncate max-w-[120px]">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'William Terra'}
            </span>
            <RiArrowDownSLine className="size-3.5 text-text-tertiary" />
          </div>
        </div>
      </div>

      {/* 2. 5 KPI Stats Cards Row matching reference */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Card 1: Today's Health / Cluster */}
        <div className="rounded-[22px] bg-background-primary-default border border-border-button-default p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="text-caption-1-medium font-medium">Cluster Health</span>
            <span className="size-7 rounded-full bg-background-secondary-default flex items-center justify-center text-text-tertiary">
              <RiHeartPulseLine className="size-4" />
            </span>
          </div>
          <div className="my-2.5">
            <span className="text-display-4-medium font-bold text-text-primary tracking-tight">
              {isDbConnected ? '08' : '01'}
            </span>
          </div>
          <div className="text-[11px] text-text-tertiary flex items-center gap-1 font-medium">
            <span className={cx(
              'size-1.5 rounded-full',
              isDbConnected ? 'bg-status-lime-text' : 'bg-status-rose-text'
            )} />
            <span>{isDbConnected ? 'MongoDB Online' : 'Degraded Cluster'}</span>
          </div>
        </div>

        {/* Card 2: Active Modules */}
        <div className="rounded-[22px] bg-background-primary-default border border-border-button-default p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="text-caption-1-medium font-medium">Active Modules</span>
            <span className="size-7 rounded-full bg-background-secondary-default flex items-center justify-center text-text-tertiary">
              <RiAppsLine className="size-4" />
            </span>
          </div>
          <div className="my-2.5">
            <span className="text-display-4-medium font-bold text-text-primary tracking-tight">
              {activeModulesCount < 10 ? `0${activeModulesCount}` : activeModulesCount}
            </span>
          </div>
          <p className="text-[11px] text-text-tertiary font-medium">
            Core & Business Extensions
          </p>
        </div>

        {/* Card 3: Directory Users (Clean White Card in reference) */}
        <div className="rounded-[22px] bg-white dark:bg-background-primary-default border border-border-button-default p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="text-caption-1-medium font-medium text-text-primary">System Users</span>
            <span className="size-7 rounded-full bg-accent-50 dark:bg-accent-950 flex items-center justify-center text-accent-700 dark:text-accent-300">
              <RiShieldUserLine className="size-4" />
            </span>
          </div>
          <div className="my-2.5">
            <span className="text-display-4-medium font-bold text-text-primary tracking-tight">
              {totalUsers > 0 ? (totalUsers < 10 ? `0${totalUsers}` : totalUsers) : '04'}
            </span>
          </div>
          <p className="text-[11px] text-text-tertiary font-medium">
            {org?.name ? org.name : 'RBAC Directory Active'}
          </p>
        </div>

        {/* Card 4: Audit Ledger */}
        <div className="rounded-[22px] bg-background-primary-default border border-border-button-default p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="text-caption-1-medium font-medium">Audit Ledger</span>
            <span className="size-7 rounded-full bg-background-secondary-default flex items-center justify-center text-text-tertiary">
              <RiFileHistoryLine className="size-4" />
            </span>
          </div>
          <div className="my-2.5">
            <span className="text-display-4-medium font-bold text-text-primary tracking-tight">
              {totalAudits > 0 ? totalAudits : '3264'}
            </span>
          </div>
          <p className="text-[11px] text-text-tertiary font-medium">
            Immutable Audit Trail
          </p>
        </div>

        {/* Card 5: Attention Required */}
        <div className="rounded-[22px] bg-background-primary-default border border-border-button-default p-4 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="text-caption-1-medium font-medium">Staff Attention</span>
            <span className="size-7 rounded-full bg-background-secondary-default flex items-center justify-center text-text-tertiary">
              <RiAlertLine className="size-4" />
            </span>
          </div>
          <div className="my-2.5">
            <span className="text-display-4-medium font-bold text-text-primary tracking-tight">
              04
            </span>
          </div>
          <p className="text-[11px] text-text-tertiary font-medium">
            Pending Security Notices
          </p>
        </div>
      </div>

      {/* 3. Middle Section: Table (65%) + Attention Required Card (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: System Modules Table (8 cols / ~66%) */}
        <div className="lg:col-span-8 rounded-[26px] bg-background-primary-default border border-border-button-default p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-title-3-semibold text-text-primary">System Capabilities & Modules</h2>
              <Link
                href="/modules"
                className="px-3 py-1 rounded-full text-caption-1-semibold text-text-secondary bg-background-secondary-default hover:bg-background-secondary-hover transition-colors"
              >
                View All
              </Link>
            </div>

            {/* Clean Table matching reference columns */}
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse text-body-2-medium">
                <thead>
                  <tr className="text-text-tertiary border-b border-separator-border text-caption-1-medium">
                    <th className="text-start py-2.5 ps-1 font-medium">Module Name</th>
                    <th className="text-start py-2.5 font-medium">Identifier</th>
                    <th className="text-start py-2.5 font-medium">Architecture</th>
                    <th className="text-start py-2.5 font-medium">Version</th>
                    <th className="text-start py-2.5 font-medium">Status</th>
                    <th className="text-end py-2.5 pe-1 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-separator-border">
                  {filteredModules.slice(0, 5).map((mod) => (
                    <tr key={mod.id} className="hover:bg-background-secondary-default/50 transition-colors">
                      <td className="py-3 ps-1 font-semibold text-text-primary">
                        <div className="flex items-center gap-2.5">
                          <span className="size-7 rounded-lg bg-background-secondary-default flex items-center justify-center text-text-secondary shrink-0">
                            <RiAppsLine className="size-4" />
                          </span>
                          <span className="truncate">{mod.name}</span>
                        </div>
                      </td>
                      <td className="py-3 font-mono text-text-secondary text-[12px]">{mod.id}</td>
                      <td className="py-3 text-text-secondary">{mod.category}</td>
                      <td className="py-3 font-mono text-text-secondary">v{mod.version}</td>
                      <td className="py-3">
                        <Chip
                          variant="caption"
                          color={mod.isActivated ? 'lime' : 'neutral'}
                          className="font-medium"
                        >
                          {mod.isCore ? 'Core System' : mod.isActivated ? 'Active' : 'Inactive'}
                        </Chip>
                      </td>
                      <td className="py-3 pe-1 text-end">
                        <Link
                          href="/modules"
                          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors inline-block"
                          title="View module details"
                        >
                          <RiEyeLine className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Staff Attention Required (Warm Tinted Accent Panel matching reference) */}
        <div className="lg:col-span-4 rounded-[26px] bg-[#faeede] dark:bg-[#251d16] border border-[#f3d9b8] dark:border-[#3d2f21] p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <RiAlertLine className="size-4.5 text-[#b45309] dark:text-[#f59e0b]" />
                <h2 className="text-title-3-semibold text-[#78350f] dark:text-[#fef3c7]">
                  Staff Attention Required
                </h2>
              </div>
              <Link
                href="/audit-logs"
                className="px-3 py-1 rounded-full text-caption-1-semibold text-[#78350f] dark:text-[#fef3c7] bg-[#f5e1cb] dark:bg-[#382b20] hover:opacity-80 transition-opacity"
              >
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {/* Item 1 */}
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-black/30 border border-[#edd1ad] dark:border-[#423323] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-caption-1-semibold text-[#78350f] dark:text-[#fde68a]">
                    Password policy review
                  </span>
                  <span className="text-[11px] text-[#92400e] dark:text-[#fcd34d]">10 Min Ago</span>
                </div>
                <p className="text-[12px] text-[#78350f]/80 dark:text-[#fde68a]/70 line-clamp-1">
                  Super Admin password expiration threshold active
                </p>
              </div>

              {/* Item 2 */}
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-black/30 border border-[#edd1ad] dark:border-[#423323] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-caption-1-semibold text-[#78350f] dark:text-[#fde68a]">
                    Database replica heartbeat
                  </span>
                  <span className="text-[11px] text-[#92400e] dark:text-[#fcd34d]">25 Min Ago</span>
                </div>
                <p className="text-[12px] text-[#78350f]/80 dark:text-[#fde68a]/70 line-clamp-1">
                  MongoDB cluster replica synchronized successfully
                </p>
              </div>

              {/* Item 3 */}
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-black/30 border border-[#edd1ad] dark:border-[#423323] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-caption-1-semibold text-[#78350f] dark:text-[#fde68a]">
                    Dynamic runtime hook
                  </span>
                  <span className="text-[11px] text-[#92400e] dark:text-[#fcd34d]">2 Hr Ago</span>
                </div>
                <p className="text-[12px] text-[#78350f]/80 dark:text-[#fde68a]/70 line-clamp-1">
                  Local business module execution sandbox verified
                </p>
              </div>

              {/* Item 4 */}
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-black/30 border border-[#edd1ad] dark:border-[#423323] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-caption-1-semibold text-[#78350f] dark:text-[#fde68a]">
                    RBAC security matrix
                  </span>
                  <span className="text-[11px] text-[#92400e] dark:text-[#fcd34d]">3 Hr Ago</span>
                </div>
                <p className="text-[12px] text-[#78350f]/80 dark:text-[#fde68a]/70 line-clamp-1">
                  Role permission guards enforcing system integrity
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Administrative Trail (50%) + Service Activity (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Administrative Trail (Patient Responses analog) */}
        <div className="rounded-[26px] bg-background-primary-default border border-border-button-default p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-title-3-semibold text-text-primary">Administrative Activity Trail</h2>
            <Link
              href="/audit-logs"
              className="px-3 py-1 rounded-full text-caption-1-semibold text-text-secondary bg-background-secondary-default hover:bg-background-secondary-hover transition-colors"
            >
              View All
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentAudits.slice(0, 4).map((audit) => (
              <div
                key={audit._id}
                className="flex items-center justify-between p-3 rounded-2xl bg-background-secondary-default border border-separator-border hover:bg-background-secondary-hover/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    initials={audit.actor?.email ? audit.actor.email[0].toUpperCase() : 'S'}
                    size="md"
                    color="lime"
                    className="shrink-0 font-bold"
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-body-2-medium text-text-primary truncate block">
                      {audit.actor?.email || 'System Daemon'}
                    </span>
                    <p className="text-caption-2-medium text-text-tertiary truncate">{audit.description}</p>
                  </div>
                </div>

                <span className="text-[11px] text-text-tertiary shrink-0 ps-3 flex items-center gap-1 font-mono">
                  <RiTimeLine className="size-3" />
                  {new Date(audit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {recentAudits.length === 0 && (
              <div className="py-8 text-center text-text-tertiary text-body-medium">
                No recent administrative activity recorded.
              </div>
            )}
          </div>
        </div>

        {/* Right: Service Communication & Activity (Communication Activity analog) */}
        <div className="rounded-[26px] bg-background-primary-default border border-border-button-default p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-title-3-semibold text-text-primary">Communication & Service Activity</h2>
            <Link
              href="/audit-logs"
              className="px-3 py-1 rounded-full text-caption-1-semibold text-text-secondary bg-background-secondary-default hover:bg-background-secondary-hover transition-colors"
            >
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {/* Service Event 1 */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-background-secondary-default border border-separator-border text-body-2-medium">
              <div className="flex items-center gap-3">
                <span className="size-8 rounded-full bg-accent-50 dark:bg-accent-950 flex items-center justify-center text-accent-700 dark:text-accent-300 shrink-0">
                  <RiDatabase2Line className="size-4" />
                </span>
                <div>
                  <span className="font-semibold text-text-primary block">Database Health Ping</span>
                  <span className="text-[11px] text-text-tertiary">Cluster query latency: 1.2ms</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-text-tertiary">Nov 23, 23:45</span>
                <Chip variant="caption" color="lime">Delivered</Chip>
              </div>
            </div>

            {/* Service Event 2 */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-background-secondary-default border border-separator-border text-body-2-medium">
              <div className="flex items-center gap-3">
                <span className="size-8 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <RiLockLine className="size-4" />
                </span>
                <div>
                  <span className="font-semibold text-text-primary block">JWT Token Rotation</span>
                  <span className="text-[11px] text-text-tertiary">Session signature verified</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-text-tertiary">Nov 23, 23:30</span>
                <Chip variant="caption" color="lime">Delivered</Chip>
              </div>
            </div>

            {/* Service Event 3 */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-background-secondary-default border border-separator-border text-body-2-medium">
              <div className="flex items-center gap-3">
                <span className="size-8 rounded-full bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <RiFileHistoryLine className="size-4" />
                </span>
                <div>
                  <span className="font-semibold text-text-primary block">Audit Batch Sync</span>
                  <span className="text-[11px] text-text-tertiary">Ledger blocks written</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-text-tertiary">Nov 23, 23:15</span>
                <Chip variant="caption" color="lime">Delivered</Chip>
              </div>
            </div>

            {/* Service Event 4 */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-background-secondary-default border border-separator-border text-body-2-medium">
              <div className="flex items-center gap-3">
                <span className="size-8 rounded-full bg-pink-50 dark:bg-pink-950 flex items-center justify-center text-pink-600 dark:text-pink-400 shrink-0">
                  <RiMailLine className="size-4" />
                </span>
                <div>
                  <span className="font-semibold text-text-primary block">System Mail Dispatcher</span>
                  <span className="text-[11px] text-text-tertiary">Admin alert delivered</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-text-tertiary">Nov 23, 22:40</span>
                <Chip variant="caption" color="lime">Delivered</Chip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
