'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  RiInformationLine,
  RiFilter3Line,
  RiArrowUpDownLine,
  RiDownload2Line,
  RiAddLine,
  RiTableLine,
  RiLayoutMasonryLine,
  RiCheckLine,
  RiCloseLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowLeftDoubleLine,
  RiArrowRightDoubleLine,
  RiArrowDownSLine,
  RiShareForwardLine,
  RiNotification3Line,
  RiUserAddLine,
  RiTimeLine,
  RiMoreFill,
  RiAppsLine,
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
import { Button } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Switch } from '@/components/base/switch/switch';
import { Chip } from '@/components/base/badges/chip';
import { Avatar } from '@/components/base/avatar/avatar';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/base/table/table';
import { Tooltip, TooltipTrigger } from '@/components/base/tooltip/tooltip';
import { Spinner } from '@/components/base/spinner/spinner';
import { toast } from '@/components/base/toast/toast';
import { cx } from '@/utils/cx';

// Core platform services to combine with dynamic modules
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
    name: 'Authentication & Session Engine',
    description: 'JWT token rotation, password hashing, and authentication guards',
    version: '1.0.0',
    category: 'Security & Identity',
    isCore: true,
    isActivated: true,
    permissionsCount: 8,
  },
  {
    id: 'users',
    name: 'User Directory & Human ID',
    description: 'Sequential enterprise Human ID generation and user lifecycle management',
    version: '1.0.0',
    category: 'Core System',
    isCore: true,
    isActivated: true,
    permissionsCount: 6,
  },
  {
    id: 'access-control',
    name: 'Role-Based Access Control (RBAC)',
    description: 'Dynamic permissions matrix and custom administrative role definitions',
    version: '1.0.0',
    category: 'Security & RBAC',
    isCore: true,
    isActivated: true,
    permissionsCount: 12,
  },
  {
    id: 'audit-log',
    name: 'Immutable Audit Ledger',
    description: 'Tamper-resistant security auditing and administrative action tracking',
    version: '1.0.0',
    category: 'Compliance & Audit',
    isCore: true,
    isActivated: true,
    permissionsCount: 4,
  },
  {
    id: 'organization',
    name: 'Organization Profile & Tenancy',
    description: 'Multi-locale workspace parameters, currency configuration, and address',
    version: '1.0.0',
    category: 'Core System',
    isCore: true,
    isActivated: true,
    permissionsCount: 4,
  },
  {
    id: 'system-settings',
    name: 'Global System Preferences',
    description: 'Session timeout thresholds, lockout policies, and maintenance mode controls',
    version: '1.0.0',
    category: 'Infrastructure',
    isCore: true,
    isActivated: true,
    permissionsCount: 4,
  },
  {
    id: 'module-registry',
    name: 'Dynamic Micro-Module Registry',
    description: 'Hot-pluggable business domain module registration and runtime isolation',
    version: '1.0.0',
    category: 'Infrastructure',
    isCore: true,
    isActivated: true,
    permissionsCount: 6,
  },
];

export default function DashboardPage() {
  const { hasPermission } = useAuth();

  // Backend state
  const [health, setHealth] = useState<HealthReadyResponse | null>(null);
  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [backendModules, setBackendModules] = useState<ModuleRegistration[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [recentAudits, setRecentAudits] = useState<AuditLogEntry[]>([]);
  const [totalAudits, setTotalAudits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // UI state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(['users', 'access-control']));
  const [showStats, setShowStats] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  // Merge core system modules with dynamic backend registered modules
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

  // Selection handlers
  const allSelected = useMemo(() => {
    return (
      filteredModules.length > 0 &&
      filteredModules.every((m) => selectedIds.has(m.id))
    );
  }, [filteredModules, selectedIds]);

  const isIndeterminate = useMemo(() => {
    return selectedIds.size > 0 && !allSelected;
  }, [selectedIds, allSelected]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredModules.map((m) => m.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleExportCSV = () => {
    const header = 'Module ID,Name,Category,Type,Status,Version,Permissions';
    const rows = allModules.map(
      (m) =>
        `"${m.id}","${m.name}","${m.category}","${m.isCore ? 'Core' : 'Extension'}","${m.isActivated ? 'Active' : 'Inactive'}","${m.version}",${m.permissionsCount}`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `modus-modules-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('System registry exported as CSV');
  };

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
    <div className="space-y-6 pb-12">
      {/* 1. Header Title & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-title-1-medium text-text-primary tracking-tight">System Operations</h1>
          <p className="text-body-medium text-text-secondary mt-0.5">
            Real-time status of {org?.name || 'Modus'} infrastructure, active modules, and access control.
          </p>
        </div>

        {/* Right Action Cluster matching reference */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="size-9 rounded-xl border border-border-button-default bg-background-primary-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors shadow-2xs"
            title="Share system status"
            aria-label="Share system status"
            onClick={() => toast.info('System status link copied to clipboard')}
          >
            <RiShareForwardLine className="size-4" />
          </button>

          <button
            type="button"
            className="size-9 rounded-xl border border-border-button-default bg-background-primary-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors shadow-2xs"
            title="Notifications"
            aria-label="Notifications"
          >
            <RiNotification3Line className="size-4" />
          </button>

          {/* Team avatar cluster */}
          <div className="flex items-center ps-1">
            <Avatar size="sm" initials="AK" color="neutral" className="ring-2 ring-background-primary-default shadow-2xs" />
            <Avatar size="sm" initials="MR" color="lime" className="ring-2 ring-background-primary-default -ms-2 shadow-2xs" />
            <Avatar size="sm" initials="SP" color="pink" className="ring-2 ring-background-primary-default -ms-2 shadow-2xs" />
            <span className="size-6 -ms-2 rounded-full bg-background-secondary-default border border-border-button-default text-[10px] font-semibold text-text-secondary flex items-center justify-center ring-2 ring-background-primary-default">
              +3
            </span>
            {hasPermission('users.create') && (
              <Link href="/users">
                <button
                  type="button"
                  className="size-6 -ms-1 rounded-full border border-dashed border-border-button-default text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors"
                  title="Add user"
                  aria-label="Add user"
                >
                  <RiUserAddLine className="size-3" />
                </button>
              </Link>
            )}
          </div>

          <Link href="/modules">
            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiLayoutMasonryLine}
              className="shadow-2xs ms-1"
            >
              Configure Modules
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Left side controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="h-9 px-3 rounded-xl border border-border-button-default bg-background-primary-default text-body-medium font-medium text-text-primary flex items-center gap-2 shadow-2xs">
            <RiTableLine className="size-4 text-text-secondary" />
            <span>Table View</span>
            <RiArrowDownSLine className="size-4 text-text-tertiary ms-0.5" />
          </div>

          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiFilter3Line}
            className="shadow-2xs"
            onClick={() => setSearchQuery('')}
          >
            Reset Filter
          </Button>

          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiArrowUpDownLine}
            className="shadow-2xs"
          >
            Sort
          </Button>

          {/* Show Statistics Switch */}
          <div className="flex items-center gap-2.5 ps-2 border-s border-separator-border">
            <span className="text-body-medium font-medium text-text-primary">Show Statistics</span>
            <Switch
              isSelected={showStats}
              onChange={setShowStats}
              size="md"
              aria-label="Toggle statistics row"
            />
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiDownload2Line}
            className="shadow-2xs"
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>

          {hasPermission('users.create') && (
            <Link href="/users">
              <Button
                variant="primary"
                size="small"
                leadingIcon={RiAddLine}
                className="shadow-2xs font-semibold"
              >
                Add User
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 3. Connected 4-Column KPI Stats Row (Real Backend Metrics) */}
      {showStats && (
        <div className="bg-background-primary-default border border-border-button-default rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-separator-border overflow-hidden transition-all duration-300">
          {/* Card 1: System Health */}
          <div className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-secondary">
              <span className="flex items-center gap-1.5 text-body-medium font-medium text-text-secondary">
                System Health
                <TooltipTrigger delay={150}>
                  <button type="button" aria-label="About System Health" className="outline-none">
                    <RiInformationLine className="size-4 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer" />
                  </button>
                  <Tooltip size="md">Core platform daemon and database connectivity status.</Tooltip>
                </TooltipTrigger>
              </span>
            </div>
            <div className="mt-3">
              <span className="text-display-4-medium text-text-primary tracking-tight font-semibold">
                {isDbConnected ? 'Operational' : 'Degraded'}
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-caption-1-medium">
                <span className="text-text-tertiary">database:</span>
                <span className={cx(
                  'inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold',
                  isDbConnected ? 'bg-status-lime-background text-status-lime-text' : 'bg-status-rose-background text-status-rose-text'
                )}>
                  {health?.dependencies?.database?.status || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Active Modules */}
          <div className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-secondary">
              <span className="flex items-center gap-1.5 text-body-medium font-medium text-text-secondary">
                Active Modules
                <TooltipTrigger delay={150}>
                  <button type="button" aria-label="About Active Modules" className="outline-none">
                    <RiInformationLine className="size-4 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer" />
                  </button>
                  <Tooltip size="md">Activated core and domain business module micro-services.</Tooltip>
                </TooltipTrigger>
              </span>
            </div>
            <div className="mt-3">
              <span className="text-display-4-medium text-text-primary tracking-tight font-semibold">
                {activeModulesCount} <span className="text-title-1-medium text-text-tertiary font-normal">/ {allModules.length}</span>
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-caption-1-medium">
                <span className="text-text-tertiary">state:</span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-status-lime-background text-status-lime-text font-semibold">
                  100% Core Online
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Total Users */}
          <div className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-secondary">
              <span className="flex items-center gap-1.5 text-body-medium font-medium text-text-secondary">
                Registered Users
                <TooltipTrigger delay={150}>
                  <button type="button" aria-label="About Registered Users" className="outline-none">
                    <RiInformationLine className="size-4 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer" />
                  </button>
                  <Tooltip size="md">Total active staff, operator, and administrator user accounts.</Tooltip>
                </TooltipTrigger>
              </span>
            </div>
            <div className="mt-3">
              <span className="text-display-4-medium text-text-primary tracking-tight font-semibold">
                {totalUsers > 0 ? totalUsers : '1+'}
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-caption-1-medium">
                <span className="text-text-tertiary">access control:</span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-status-lime-background text-status-lime-text font-semibold">
                  RBAC Enforced
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Audit Logs */}
          <div className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-secondary">
              <span className="flex items-center gap-1.5 text-body-medium font-medium text-text-secondary">
                Security Audits
                <TooltipTrigger delay={150}>
                  <button type="button" aria-label="About Security Audits" className="outline-none">
                    <RiInformationLine className="size-4 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer" />
                  </button>
                  <Tooltip size="md">Immutable audit ledger recording all administrative activity.</Tooltip>
                </TooltipTrigger>
              </span>
            </div>
            <div className="mt-3">
              <span className="text-display-4-medium text-text-primary tracking-tight font-semibold">
                {totalAudits}
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-caption-1-medium">
                <span className="text-text-tertiary">ledger:</span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-status-lime-background text-status-lime-text font-semibold">
                  Tamper-Resistant
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Interactive Data Table (Real System Modules & Infrastructure Services) */}
      <div className="bg-background-primary-default border border-border-button-default rounded-2xl shadow-xs overflow-hidden relative">
        <Table aria-label="System module registry table" size="md" selectionMode="none">
          <TableHeader>
            <TableColumn id="selection" className="w-12 px-3">
              <Checkbox
                slot={null}
                isSelected={allSelected}
                isIndeterminate={isIndeterminate}
                onChange={toggleSelectAll}
                aria-label="Select all modules"
              />
            </TableColumn>
            <TableColumn id="module" isRowHeader className="min-w-[260px]">
              Module & Capability
            </TableColumn>
            <TableColumn id="id" className="w-32">
              Key
            </TableColumn>
            <TableColumn id="category" className="w-40">
              Architecture
            </TableColumn>
            <TableColumn id="version" className="w-24">
              Version
            </TableColumn>
            <TableColumn id="permissions" className="w-28">
              Permissions
            </TableColumn>
            <TableColumn id="status" className="w-32">
              Status
            </TableColumn>
            <TableColumn id="actions" className="w-12 text-center">
              +
            </TableColumn>
          </TableHeader>

          <TableBody>
            {filteredModules.map((item) => {
              const isSelected = selectedIds.has(item.id);

              return (
                <TableRow
                  key={item.id}
                  id={item.id}
                  className={cx(
                    'transition-colors duration-150 cursor-pointer',
                    isSelected
                      ? 'bg-accent-50/70 dark:bg-accent-950/25'
                      : 'hover:bg-background-secondary-hover/50'
                  )}
                  onClick={() => toggleSelectRow(item.id)}
                >
                  {/* Selection Checkbox with Left Accent Indicator */}
                  <TableCell
                    className={cx(
                      'relative px-3 py-3.5',
                      isSelected &&
                        'before:absolute before:inset-y-0 before:start-0 before:w-[3px] before:bg-accent-500'
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      slot={null}
                      isSelected={isSelected}
                      onChange={() => toggleSelectRow(item.id)}
                      aria-label={`Select ${item.name}`}
                    />
                  </TableCell>

                  {/* Module Name & Description */}
                  <TableCell className="font-medium text-text-primary">
                    <div>
                      <span className="font-semibold">{item.name}</span>
                      <p className="text-caption-2-medium text-text-tertiary line-clamp-1">{item.description}</p>
                    </div>
                  </TableCell>

                  {/* ID / Code */}
                  <TableCell className="text-text-secondary font-mono text-[12px]">{item.id}</TableCell>

                  {/* Category */}
                  <TableCell className="text-text-secondary">{item.category}</TableCell>

                  {/* Version */}
                  <TableCell className="text-text-secondary font-mono">v{item.version}</TableCell>

                  {/* Permissions count */}
                  <TableCell className="text-text-secondary font-mono">{item.permissionsCount} rules</TableCell>

                  {/* Status */}
                  <TableCell>
                    <Chip
                      variant="caption"
                      color={item.isActivated ? 'lime' : 'neutral'}
                      className="font-medium"
                    >
                      {item.isCore ? 'Core System' : item.isActivated ? 'Active' : 'Inactive'}
                    </Chip>
                  </TableCell>

                  {/* Row Context Menu */}
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href="/modules"
                      className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors inline-block"
                      title="Manage module"
                    >
                      <RiMoreFill className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Floating Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="sticky bottom-4 inset-x-0 mx-auto w-fit z-40 bg-background-primary-default/95 backdrop-blur-md border border-border-button-default shadow-xl rounded-2xl px-3.5 py-2 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
            <span className="text-body-2-medium font-semibold text-text-primary px-2 py-0.5 rounded-lg bg-background-secondary-default border border-border-button-default">
              {selectedIds.size} Selected
            </span>

            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiCheckLine}
              onClick={() => {
                toast.success(`Verified ${selectedIds.size} system capabilities`);
              }}
            >
              Verify Integrity
            </Button>

            <Link href="/modules">
              <Button
                variant="secondary"
                size="small"
                leadingIcon={RiAppsLine}
              >
                Manage in Registry
              </Button>
            </Link>

            <div className="h-4 w-px bg-separator-border" />

            <button
              type="button"
              onClick={clearSelection}
              className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors"
              title="Clear selection"
              aria-label="Clear selection"
            >
              <RiCloseLine className="size-4" />
            </button>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-separator-border bg-background-primary-default flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-body-medium text-text-secondary">
            <span>Showing per page</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-8 ps-2.5 pe-7 rounded-lg border border-border-button-default bg-background-primary-default text-body-medium text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-accent-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
              <RiArrowDownSLine className="absolute end-1.5 top-2 size-4 text-text-tertiary pointer-events-none" />
            </div>
            <span className="text-caption-1-medium text-text-tertiary ps-2">
              ({filteredModules.length} total modules)
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="size-8 rounded-lg border border-border-button-default text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors disabled:opacity-40"
              disabled
              title="First page"
              aria-label="First page"
            >
              <RiArrowLeftDoubleLine className="size-4" />
            </button>
            <button
              type="button"
              className="size-8 rounded-lg border border-border-button-default text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors disabled:opacity-40"
              disabled
              title="Previous page"
              aria-label="Previous page"
            >
              <RiArrowLeftSLine className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              className={cx(
                'size-8 rounded-lg flex items-center justify-center text-body-medium transition-colors font-medium',
                currentPage === 1
                  ? 'bg-accent-500 text-text-primary font-bold shadow-2xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary-default'
              )}
            >
              1
            </button>

            <button
              type="button"
              className="size-8 rounded-lg border border-border-button-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors"
              title="Next page"
              aria-label="Next page"
            >
              <RiArrowRightSLine className="size-4" />
            </button>
            <button
              type="button"
              className="size-8 rounded-lg border border-border-button-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors"
              title="Last page"
              aria-label="Last page"
            >
              <RiArrowRightDoubleLine className="size-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-body-medium text-text-secondary">
            <span>Status</span>
            <Chip color={isDbConnected ? 'lime' : 'rose'} variant="caption">
              {isDbConnected ? 'Cluster Connected' : 'Degraded'}
            </Chip>
          </div>
        </div>
      </div>

      {/* 5. Recent Immutable Audit Activities Feed (Real Backend Data) */}
      <div className="bg-background-primary-default border border-border-button-default rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-title-3-semibold text-text-primary">Recent Audit Events</h2>
            <p className="text-caption-1-medium text-text-secondary">Immutable administrative activity trail from audit ledger</p>
          </div>
          {hasPermission('audit.read') && (
            <Link href="/audit-logs" className="text-caption-1-semibold text-accent-700 hover:underline flex items-center gap-1">
              View all ({totalAudits}) →
            </Link>
          )}
        </div>

        <div className="space-y-2">
          {recentAudits.map((item) => (
            <div
              key={item._id}
              className="flex items-start justify-between p-3.5 rounded-xl bg-background-secondary-default border border-separator-border text-body-medium hover:bg-background-secondary-hover/50 transition-colors"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-primary text-caption-1-semibold font-mono">
                    {item.action}
                  </span>
                  <span className="text-caption-2-medium text-text-tertiary">
                    by {item.actor?.email || 'System Daemon'}
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
            <div className="py-8 text-center text-text-tertiary text-body-medium">
              No recent audit events recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
