'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  RiFilter3Line,
  RiArrowUpDownLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiDownloadLine,
  RiMoreFill,
  RiCloseLine,
  RiInformationLine,
  RiTableLine,
  RiCalendarLine,
  RiRestartLine,
  RiEyeLine,
  RiFileHistoryLine,
  RiRefreshLine,
  RiFileCopyLine,
  RiCheckLine,
  RiUserSearchLine,
  RiCodeSSlashLine,
  RiShieldCheckLine,
  RiTerminalBoxLine,
} from '@remixicon/react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  RowSelectionState,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from 'react-aria-components';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  AuditLogEntry,
  PaginatedResult,
  QueryAuditLogsParams,
} from '@/lib/api/types';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Chip } from '@/components/base/badges/chip';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Switch } from '@/components/base/switch/switch';
import { Avatar } from '@/components/base/avatar/avatar';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/base/modal/modal';
import { Spinner } from '@/components/base/spinner/spinner';
import { toast } from '@/components/base/toast/toast';
import { Select, SelectItem } from '@/components/base/select/select';
import { Pagination } from '@/components/base/pagination/pagination';
import { SearchField } from '@/components/base/search-field/search-field';
import { Tooltip, TooltipTrigger } from '@/components/base/tooltip/tooltip';
import { getRoleDisplayName } from '@/lib/permissions';
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_RESOURCE_OPTIONS,
  AuditSummaryStats,
  buildAuditLogsCsv,
  computeAuditSummaryStats,
  formatUserAgentSummary,
  getActionMeta,
  getResourceMeta,
} from '@/lib/audit-logs/utils';
import { cx } from '@/utils/cx';

const DEFAULT_STATS: AuditSummaryStats = {
  totalEvents: 0,
  authEvents: 0,
  adminEvents: 0,
  failedLogins: 0,
  recent24hCount: 0,
  uniqueActorsCount: 0,
  authSharePercent: 0,
};

function triggerBlobDownload(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AuditLogsPage() {
  const { user: currentUser, isSuperAdmin, isAdmin, hasPermission, isLoading: authLoading } = useAuth();
  const canRead = isSuperAdmin || isAdmin || hasPermission('audit.read');

  // Data states
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [actorIdFilter, setActorIdFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AuditSummaryStats>(DEFAULT_STATS);

  // TanStack table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // UI display preferences
  const [showStatistics, setShowStatistics] = useState(true);

  // Inspect modal state
  const [inspectLog, setInspectLog] = useState<AuditLogEntry | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Debounce search query so rapid typing does not flood the API
  useEffect(() => {
    if (!search.trim()) {
      setDebouncedSearch('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Load KPI stats across the audit ledger using existing /audit-logs query filters
  const loadStats = useCallback(async () => {
    if (!canRead) return;
    try {
      const [recentRes, authRes, failedRes] = await Promise.allSettled([
        apiClient<PaginatedResult<AuditLogEntry>>(API_ENDPOINTS.AUDIT_LOGS, {
          params: { page: 1, limit: 100 },
        }),
        apiClient<PaginatedResult<AuditLogEntry>>(API_ENDPOINTS.AUDIT_LOGS, {
          params: { page: 1, limit: 1, resource: 'auth' },
        }),
        apiClient<PaginatedResult<AuditLogEntry>>(API_ENDPOINTS.AUDIT_LOGS, {
          params: { page: 1, limit: 1, action: 'AUTH_LOGIN_FAILED' },
        }),
      ]);

      const recentBatch = recentRes.status === 'fulfilled' ? recentRes.value?.data || [] : [];
      const allTotal = recentRes.status === 'fulfilled' ? recentRes.value?.meta?.total || 0 : 0;
      const authTotal = authRes.status === 'fulfilled' ? authRes.value?.meta?.total || 0 : 0;
      const failedTotal = failedRes.status === 'fulfilled' ? failedRes.value?.meta?.total || 0 : 0;

      setStats(
        computeAuditSummaryStats(recentBatch, {
          all: allTotal,
          auth: authTotal,
          failed: failedTotal,
        })
      );
    } catch {
      // Non-critical fallback
    }
  }, [canRead]);

  // Load paginated audit logs matching current search & filters
  const loadLogs = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: QueryAuditLogsParams = {
        page,
        limit,
        search: debouncedSearch || undefined,
        action: actionFilter || undefined,
        resource: resourceFilter || undefined,
        actorId: actorIdFilter.trim() || undefined,
      };
      const res = await apiClient<PaginatedResult<AuditLogEntry>>(API_ENDPOINTS.AUDIT_LOGS, { params });
      setLogs(res.data || []);
      setTotal(res.meta?.total || 0);
      setRowSelection({});
    } catch (err: any) {
      toast.error(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [canRead, page, limit, debouncedSearch, actionFilter, resourceFilter, actorIdFilter]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.ceil(total / limit) || 1;
  const hasActiveFilters = Boolean(actionFilter || resourceFilter || actorIdFilter.trim());
  const hasAnyFilterOrSearch = Boolean(search.trim() || hasActiveFilters);

  const handleResetFilters = useCallback(() => {
    setActionFilter('');
    setResourceFilter('');
    setActorIdFilter('');
    setPage(1);
  }, []);

  const handleClearAll = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    handleResetFilters();
  }, [handleResetFilters]);

  const handleCopyText = async (text: string, label: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedKey((prev) => (prev === keyId ? null : prev)), 1800);
    } catch {
      toast.error('Unable to access clipboard');
    }
  };

  // Open Inspect modal and fetch authoritative single entry via GET /audit-logs/:id
  const handleOpenInspect = useCallback(async (log: AuditLogEntry) => {
    setInspectLog(log);
    setInspectLoading(true);
    try {
      const fresh = await apiClient<AuditLogEntry>(API_ENDPOINTS.AUDIT_LOG_BY_ID(log._id));
      if (fresh) {
        setInspectLog(fresh);
      }
    } catch {
      // Retain row snapshot if background refresh fails
    } finally {
      setInspectLoading(false);
    }
  }, []);

  // Selected rows
  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);
  const selectedCount = selectedIds.length;
  const selectedLogs = useMemo(
    () => logs.filter((item) => selectedIds.includes(item._id)),
    [logs, selectedIds]
  );

  // CSV & JSON Exports
  const handleExportCsv = (exportList?: AuditLogEntry[]) => {
    const dataToExport = exportList && exportList.length > 0 ? exportList : logs;
    if (dataToExport.length === 0) {
      toast.error('No audit events available to export');
      return;
    }

    const csv = buildAuditLogsCsv(dataToExport);
    const filename = `modus-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    triggerBlobDownload(csv, 'text/csv;charset=utf-8;', filename);
    toast.success(`Exported ${dataToExport.length} audit event${dataToExport.length === 1 ? '' : 's'} to CSV`);
  };

  const handleExportJson = (exportList?: AuditLogEntry[]) => {
    const dataToExport = exportList && exportList.length > 0 ? exportList : logs;
    if (dataToExport.length === 0) {
      toast.error('No audit events available to export');
      return;
    }

    const json = JSON.stringify(dataToExport, null, 2);
    const filename = `modus-audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    triggerBlobDownload(json, 'application/json;charset=utf-8;', filename);
    toast.success(`Exported ${dataToExport.length} audit event${dataToExport.length === 1 ? '' : 's'} to JSON`);
  };

  // TanStack columns definition consistent with Users page
  const columns = useMemo<ColumnDef<AuditLogEntry>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              size="sm"
              aria-label="Select all audit logs on this page"
              isSelected={table.getIsAllPageRowsSelected()}
              isIndeterminate={table.getIsSomePageRowsSelected()}
              onChange={() => table.toggleAllPageRowsSelected()}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              size="sm"
              aria-label={`Select audit event ${row.original.action}`}
              isSelected={row.getIsSelected()}
              onChange={() => row.toggleSelected()}
            />
          </div>
        ),
        enableSorting: false,
        size: 36,
      },
      {
        id: 'actor',
        header: 'Actor',
        accessorFn: (row) => `${row.actor?.email || 'System'} ${row.actor?.humanId || ''}`,
        cell: ({ row }) => {
          const log = row.original;
          const email = log.actor?.email || 'System';
          const initial = email[0]?.toUpperCase() || 'S';
          const roleStr = log.actor?.role;
          const isCurrent = Boolean(
            currentUser &&
              ((log.actor?.id && (currentUser.id === log.actor.id || currentUser._id === log.actor.id)) ||
                currentUser.email === email)
          );

          return (
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                initials={initial}
                size="sm"
                color={roleStr === 'SUPER_ADMIN' ? 'lime' : roleStr === 'ADMIN' ? 'blue' : 'neutral'}
                className="shrink-0 font-semibold ring-1 ring-border-button-default"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span
                    className="text-body-2-medium font-semibold text-text-primary truncate max-w-[110px] xl:max-w-[175px]"
                    title={email}
                  >
                    {email}
                  </span>
                  {isCurrent && (
                    <Chip color="lime" variant="caption" className="font-semibold text-[10px] py-0 px-1 shrink-0">
                      You
                    </Chip>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-text-secondary truncate max-w-[140px] xl:max-w-[200px]">
                  {log.actor?.humanId && (
                    <span className="font-mono text-text-tertiary shrink-0">{log.actor.humanId}</span>
                  )}
                  {log.actor?.humanId && roleStr && <span className="text-text-tertiary">·</span>}
                  {roleStr && <span className="truncate">{getRoleDisplayName(roleStr)}</span>}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'action',
        header: 'Action',
        accessorKey: 'action',
        cell: ({ row }) => {
          const meta = getActionMeta(row.original.action);
          return (
            <div className="flex flex-col items-start gap-0.5">
              <Chip color={meta.color} variant="caption" title={row.original.action}>
                {meta.label}
              </Chip>
              <span
                className="font-mono text-[10px] text-text-tertiary truncate max-w-[100px] xl:max-w-[145px]"
                title={row.original.action}
              >
                {row.original.action}
              </span>
            </div>
          );
        },
      },
      {
        id: 'resource',
        header: 'Resource',
        accessorKey: 'resource',
        cell: ({ row }) => {
          const resMeta = getResourceMeta(row.original.resource);
          return (
            <div className="flex flex-col items-start gap-0.5">
              <Chip color={resMeta.color} variant="caption">
                {resMeta.label}
              </Chip>
              {row.original.resourceId && (
                <span
                  className="hidden 2xl:inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10px] text-text-tertiary bg-background-secondary-default border border-separator-border max-w-[115px] truncate"
                  title={row.original.resourceId}
                >
                  {row.original.resourceId}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'description',
        header: 'Description',
        accessorKey: 'description',
        cell: ({ row }) => (
          <p
            className="text-body-2-regular text-text-primary max-w-[125px] lg:max-w-[155px] xl:max-w-[235px] truncate"
            title={row.original.description}
          >
            {row.original.description}
          </p>
        ),
      },
      {
        id: 'ipAddress',
        header: () => <span className="hidden xl:inline">Source IP</span>,
        accessorKey: 'ipAddress',
        cell: ({ row }) => (
          <div className="hidden xl:flex flex-col items-start gap-0.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-caption-2-medium text-text-tertiary bg-background-secondary-default border border-separator-border">
              {row.original.ipAddress || 'Internal'}
            </span>
            <span className="text-[11px] text-text-tertiary truncate max-w-[115px]">
              {formatUserAgentSummary(row.original.userAgent)}
            </span>
          </div>
        ),
      },
      {
        id: 'createdAt',
        header: 'Timestamp',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          const dateStr = row.original.createdAt;
          if (!dateStr) return <span className="text-text-tertiary">—</span>;
          const dateObj = new Date(dateStr);
          const datePart = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          const timePart = dateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div className="flex flex-col whitespace-nowrap">
              <span className="text-body-2-regular text-text-secondary flex items-center gap-1">
                <RiCalendarLine className="size-3.5 text-text-tertiary shrink-0" />
                <span>{datePart}</span>
              </span>
              <span className="font-mono text-[11px] text-text-tertiary ps-4.5">
                {timePart}
              </span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const log = row.original;
          return (
            <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => handleOpenInspect(log)}
                className="size-7 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-500 cursor-pointer"
                title="Inspect audit event"
                aria-label="Inspect audit event"
              >
                <RiEyeLine className="size-4" />
              </button>

              <AriaDialogTrigger>
                <AriaButton
                  className="size-7 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-500 cursor-pointer"
                  aria-label="Audit log actions"
                >
                  <RiMoreFill className="size-4" />
                </AriaButton>
                <AriaPopover
                  placement="bottom end"
                  offset={6}
                  className="z-50 w-52 rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-xl outline-none"
                >
                  <AriaDialog className="outline-none flex flex-col gap-0.5">
                    {({ close }) => (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            close();
                            handleOpenInspect(log);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors text-start cursor-pointer"
                        >
                          <RiEyeLine className="size-4 text-text-tertiary" />
                          <span>Inspect Full Record</span>
                        </button>

                        {log.actor?.id && (
                          <button
                            type="button"
                            onClick={() => {
                              close();
                              setActorIdFilter(log.actor.id);
                              setPage(1);
                              toast(`Filtering by actor ${log.actor.email}`, { status: 'information' });
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors text-start cursor-pointer"
                          >
                            <RiUserSearchLine className="size-4 text-text-tertiary" />
                            <span>Filter by Actor</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            close();
                            setActionFilter(log.action);
                            setPage(1);
                            toast(`Filtering by action ${log.action}`, { status: 'information' });
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors text-start cursor-pointer"
                        >
                          <RiFilter3Line className="size-4 text-text-tertiary" />
                          <span>Filter by Action</span>
                        </button>

                        <div className="my-1 border-t border-separator-border" />

                        <button
                          type="button"
                          onClick={() => {
                            close();
                            handleCopyText(log._id, 'Event ID', `id-${log._id}`);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors text-start cursor-pointer"
                        >
                          <RiFileCopyLine className="size-4 text-text-tertiary" />
                          <span>Copy Event ID</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            close();
                            handleCopyText(JSON.stringify(log, null, 2), 'Event JSON', `json-${log._id}`);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors text-start cursor-pointer"
                        >
                          <RiCodeSSlashLine className="size-4 text-text-tertiary" />
                          <span>Copy Event JSON</span>
                        </button>
                      </>
                    )}
                  </AriaDialog>
                </AriaPopover>
              </AriaDialogTrigger>
            </div>
          );
        },
        enableSorting: false,
        size: 72,
      },
    ],
    [currentUser, handleOpenInspect]
  );

  // TanStack table instance
  const table = useReactTable({
    data: logs,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row._id,
  });

  if (authLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="size-14 rounded-full bg-background-secondary-default border border-border-button-default flex items-center justify-center text-text-tertiary mb-3 shadow-2xs">
          <RiShieldCheckLine className="size-7" />
        </div>
        <h2 className="text-title-1-bold text-text-primary">Access Restricted</h2>
        <p className="text-body-2-regular text-text-secondary max-w-md mt-1 mb-5">
          Audit Logs are restricted to Super Administrators or Administrators with the &quot;audit.read&quot; permission.
        </p>
        <Link href="/dashboard">
          <Button variant="secondary">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header (Full-width border with 0 side margins matching Users page) */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-5 border-b border-border-button-default bg-background-primary-default">
        <div>
          <h1 className="text-title-1-medium font-bold text-text-primary tracking-tight">Audit Logs</h1>
          <p className="text-body-medium text-text-secondary mt-0.5">
            Immutable historical record of security, administrative, and operational events across Modus
          </p>
        </div>
      </div>

      {/* 2. Stats Section (Single unified segmented card container matching Users page) */}
      {showStatistics && (
        <div className="rounded-2xl border border-border-button-default bg-background-primary-default shadow-2xs overflow-hidden animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-separator-border">
            {/* Total Events */}
            <div className="p-5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-caption-1-medium text-text-primary font-medium">
                <span>Total Events</span>
                <TooltipTrigger delay={80}>
                  <AriaButton
                    className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    aria-label="Total events info"
                  >
                    <RiInformationLine className="size-3.5" />
                  </AriaButton>
                  <Tooltip size="sm">
                    Total immutable append-only audit entries persisted in the system ledger.
                  </Tooltip>
                </TooltipTrigger>
              </div>
              <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight font-mono">
                {stats.totalEvents || total}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
                <span>last 24 hours</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold text-accent-800 dark:text-accent-300 bg-accent-100 dark:bg-accent-950/60">
                  + {stats.recent24hCount} events
                </span>
              </div>
            </div>

            {/* Auth & Access */}
            <div className="p-5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-caption-1-medium text-text-primary font-medium">
                <span>Auth &amp; Access</span>
                <TooltipTrigger delay={80}>
                  <AriaButton
                    className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    aria-label="Authentication events info"
                  >
                    <RiInformationLine className="size-3.5" />
                  </AriaButton>
                  <Tooltip size="sm">
                    Security events covering sign-ins, logouts, password changes, and recovery resets.
                  </Tooltip>
                </TooltipTrigger>
              </div>
              <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight font-mono">
                {stats.authEvents}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
                <span>share of ledger</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold text-accent-800 dark:text-accent-300 bg-accent-100 dark:bg-accent-950/60">
                  {stats.authSharePercent}% auth
                </span>
              </div>
            </div>

            {/* Admin & System Mutations */}
            <div className="p-5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-caption-1-medium text-text-primary font-medium">
                <span>Admin Changes</span>
                <TooltipTrigger delay={80}>
                  <AriaButton
                    className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    aria-label="Administrative changes info"
                  >
                    <RiInformationLine className="size-3.5" />
                  </AriaButton>
                  <Tooltip size="sm">
                    Governance actions across users, RBAC roles, CDN storage, organization, and settings.
                  </Tooltip>
                </TooltipTrigger>
              </div>
              <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight font-mono">
                {stats.adminEvents}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
                <span>unique actors</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold text-accent-800 dark:text-accent-300 bg-accent-100 dark:bg-accent-950/60">
                  {stats.uniqueActorsCount} active
                </span>
              </div>
            </div>

            {/* Failed Login Alerts */}
            <div className="p-5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-caption-1-medium text-text-primary font-medium">
                <span>Failed Logins</span>
                <TooltipTrigger delay={80}>
                  <AriaButton
                    className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    aria-label="Failed login alerts info"
                  >
                    <RiInformationLine className="size-3.5" />
                  </AriaButton>
                  <Tooltip size="sm">
                    Rejected sign-in attempts and invalid credential events flagged across authentication.
                  </Tooltip>
                </TooltipTrigger>
              </div>
              <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight font-mono">
                {stats.failedLogins}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
                <span>security posture</span>
                <span
                  className={cx(
                    'inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold',
                    stats.failedLogins > 0
                      ? 'text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60'
                      : 'text-text-tertiary bg-background-secondary-default'
                  )}
                >
                  {stats.failedLogins > 0 ? `${stats.failedLogins} flagged` : '0 alerts'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Controls & Filtering Bar (Matching Users page toolbar) */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left Side: Searchbar, Table View indicator, Filter, Sort, Show Statistics */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Pilled BoardUI SearchField */}
          <SearchField
            aria-label="Search audit logs"
            placeholder="Search audit logs..."
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            shape="pill"
            className="w-full sm:w-64 lg:w-72"
          />

          {/* View Indicator */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-button-default bg-background-primary-default text-body-2-medium text-text-primary shadow-2xs">
            <RiTableLine className="size-4 text-text-tertiary" />
            <span>Table View</span>
          </div>

          {/* Filter Popover */}
          <AriaDialogTrigger>
            <AriaButton
              className={cx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-button-default bg-background-primary-default text-body-2-medium hover:bg-background-secondary-default transition-colors shadow-2xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
                hasActiveFilters
                  ? 'border-accent-500 text-accent-700 dark:text-accent-300 font-semibold'
                  : 'text-text-secondary'
              )}
            >
              <RiFilter3Line className="size-4" />
              <span>Filter</span>
              {hasActiveFilters && <span className="size-2 rounded-full bg-accent-500 ms-0.5" />}
            </AriaButton>
            <AriaPopover
              placement="bottom start"
              offset={8}
              className="z-50 w-80 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-2xl outline-none"
            >
              <AriaDialog className="outline-none flex flex-col gap-3.5">
                <div className="flex items-center justify-between border-b border-separator-border pb-2.5">
                  <span className="text-body-2-medium font-semibold text-text-primary">
                    Filter Audit Logs
                  </span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-caption-1-medium text-accent-700 dark:text-accent-300 hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Filter by Resource using BoardUI Select */}
                <Select
                  label="Resource"
                  aria-label="Filter by resource"
                  size="sm"
                  selectedKey={resourceFilter || 'ALL'}
                  onSelectionChange={(key) => {
                    setResourceFilter(key === 'ALL' ? '' : String(key));
                    setPage(1);
                  }}
                  className="w-full"
                >
                  <SelectItem id="ALL" textValue="All Resources">
                    All Resources
                  </SelectItem>
                  {AUDIT_RESOURCE_OPTIONS.map((res) => (
                    <SelectItem key={res.value} id={res.value} textValue={res.label}>
                      {res.label}
                    </SelectItem>
                  ))}
                </Select>

                {/* Filter by Action using BoardUI Select */}
                <Select
                  label="Action"
                  aria-label="Filter by action"
                  size="sm"
                  selectedKey={actionFilter || 'ALL'}
                  onSelectionChange={(key) => {
                    setActionFilter(key === 'ALL' ? '' : String(key));
                    setPage(1);
                  }}
                  className="w-full"
                >
                  <SelectItem id="ALL" textValue="All Actions">
                    All Actions
                  </SelectItem>
                  {AUDIT_ACTION_OPTIONS.map((act) => (
                    <SelectItem key={act.value} id={act.value} textValue={act.label}>
                      {act.label} ({act.value})
                    </SelectItem>
                  ))}
                </Select>

                {/* Filter by Actor ID (QueryAuditLogDto.actorId) */}
                <Input
                  label="Actor User ID"
                  placeholder="Filter by exact user ID..."
                  value={actorIdFilter}
                  onChange={(val) => {
                    setActorIdFilter(val);
                    setPage(1);
                  }}
                  size="small"
                />
              </AriaDialog>
            </AriaPopover>
          </AriaDialogTrigger>

          {/* Sort Popover */}
          <AriaDialogTrigger>
            <AriaButton className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-button-default bg-background-primary-default text-body-2-medium text-text-secondary hover:bg-background-secondary-default transition-colors shadow-2xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-500">
              <RiArrowUpDownLine className="size-4 text-text-tertiary" />
              <span>Sort</span>
            </AriaButton>
            <AriaPopover
              placement="bottom start"
              offset={8}
              className="z-50 w-48 rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-xl outline-none"
            >
              <AriaDialog className="outline-none flex flex-col gap-0.5">
                {({ close }) => (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSorting([{ id: 'createdAt', desc: true }]);
                        close();
                      }}
                      className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                    >
                      Newest First
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSorting([{ id: 'createdAt', desc: false }]);
                        close();
                      }}
                      className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                    >
                      Oldest First
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSorting([{ id: 'actor', desc: false }]);
                        close();
                      }}
                      className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                    >
                      Sort by Actor
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSorting([{ id: 'action', desc: false }]);
                        close();
                      }}
                      className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                    >
                      Sort by Action
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSorting([{ id: 'resource', desc: false }]);
                        close();
                      }}
                      className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                    >
                      Sort by Resource
                    </button>
                  </>
                )}
              </AriaDialog>
            </AriaPopover>
          </AriaDialogTrigger>

          {/* Show Statistics Switch */}
          <div className="flex items-center gap-2 ps-1">
            <span
              onClick={() => setShowStatistics((v) => !v)}
              className="text-body-2-medium text-text-secondary select-none cursor-pointer hover:text-text-primary transition-colors"
            >
              Show Statistics
            </span>
            <Switch
              aria-label="Show statistics row"
              isSelected={showStatistics}
              onChange={setShowStatistics}
            />
          </div>
        </div>

        {/* Right Side: Refresh & Export buttons (Consistent pill buttons) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="medium"
            onClick={() => {
              loadStats();
              loadLogs();
            }}
            leadingIcon={RiRefreshLine}
            className="h-10 px-5 gap-2.5 rounded-full text-body-medium font-medium shadow-2xs hover:shadow-xs transition-all"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="medium"
            onClick={() => handleExportCsv()}
            leadingIcon={RiDownloadLine}
            className="h-10 px-5 gap-2.5 rounded-full text-body-medium font-semibold text-[#171B18] shadow-2xs hover:shadow-xs transition-all"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Active Filter Chips Row */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 -mt-2">
          <span className="text-caption-1-medium text-text-tertiary">Active filters:</span>
          {resourceFilter && (
            <button
              type="button"
              onClick={() => {
                setResourceFilter('');
                setPage(1);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border-button-default bg-background-secondary-default text-caption-1-medium text-text-primary hover:border-accent-500 transition-colors cursor-pointer"
            >
              <span>Resource: {getResourceMeta(resourceFilter).label}</span>
              <RiCloseLine className="size-3.5 text-text-tertiary" />
            </button>
          )}
          {actionFilter && (
            <button
              type="button"
              onClick={() => {
                setActionFilter('');
                setPage(1);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border-button-default bg-background-secondary-default text-caption-1-medium text-text-primary hover:border-accent-500 transition-colors cursor-pointer"
            >
              <span>Action: {actionFilter}</span>
              <RiCloseLine className="size-3.5 text-text-tertiary" />
            </button>
          )}
          {actorIdFilter.trim() && (
            <button
              type="button"
              onClick={() => {
                setActorIdFilter('');
                setPage(1);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border-button-default bg-background-secondary-default text-caption-1-medium text-text-primary hover:border-accent-500 transition-colors cursor-pointer font-mono"
            >
              <span>Actor ID: {actorIdFilter.trim()}</span>
              <RiCloseLine className="size-3.5 text-text-tertiary" />
            </button>
          )}
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-caption-1-medium text-accent-700 dark:text-accent-300 hover:underline px-1.5 cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* 4. TanStack Table Container */}
      <div className="border border-border-button-default rounded-2xl bg-background-primary-default shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="md" className="text-accent-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="size-14 rounded-2xl bg-background-secondary-default flex items-center justify-center text-text-tertiary mb-3.5 border border-separator-border">
              <RiFileHistoryLine className="size-7" />
            </div>
            <h3 className="text-title-3-semibold text-text-primary">No audit logs found</h3>
            <p className="text-body-2-regular text-text-secondary max-w-sm mt-1">
              {hasAnyFilterOrSearch
                ? 'No recorded security or administrative events match your current search or filter criteria.'
                : 'Security and administrative events will appear here automatically as actions occur.'}
            </p>
            {hasAnyFilterOrSearch && (
              <Button
                variant="secondary"
                size="small"
                onClick={handleClearAll}
                className="mt-4"
                leadingIcon={RiRestartLine}
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-start text-body-medium">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-separator-border bg-background-secondary-default/50"
                  >
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      const isSorted = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          style={{ width: header.column.getSize() }}
                          className={cx(
                            'px-2.5 xl:px-3.5 py-3 text-start align-middle text-caption-1-medium uppercase tracking-wider text-text-tertiary font-semibold select-none',
                            header.column.id === 'ipAddress' && 'hidden xl:table-cell'
                          )}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={cx(
                                'flex items-center gap-1.5',
                                canSort &&
                                  'cursor-pointer group/th hover:text-text-primary transition-colors'
                              )}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <span>
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                              </span>
                              {canSort && (
                                <span className="text-text-tertiary">
                                  {isSorted === 'asc' ? (
                                    <RiArrowUpLine className="size-3.5 text-accent-700 dark:text-accent-400" />
                                  ) : isSorted === 'desc' ? (
                                    <RiArrowDownLine className="size-3.5 text-accent-700 dark:text-accent-400" />
                                  ) : (
                                    <RiArrowUpDownLine className="size-3.5 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-separator-border/70">
                {table.getRowModel().rows.map((row) => {
                  const isSelected = row.getIsSelected();
                  return (
                    <tr
                      key={row.id}
                      onClick={() => row.toggleSelected()}
                      className={cx(
                        'transition-colors duration-150 cursor-pointer select-none',
                        isSelected
                          ? 'bg-accent-100/50 dark:bg-accent-950/25'
                          : 'hover:bg-background-secondary-default/60'
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cx(
                            'px-2.5 xl:px-3.5 py-3 align-middle text-body-2-medium text-text-primary',
                            cell.column.id === 'ipAddress' && 'hidden xl:table-cell'
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Floating Selection Action Bar (Consistent with Users page) */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full border border-border-button-default bg-background-primary-default/95 backdrop-blur-md px-4 py-2 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-caption-1-semibold bg-accent-500 text-neutral-950 font-bold">
            {selectedCount} Selected
          </span>
          <span className="h-4 w-px bg-separator-border" />
          <Button
            variant="secondary"
            size="small"
            onClick={() => handleExportCsv(selectedLogs)}
            leadingIcon={RiDownloadLine}
            className="rounded-full font-medium"
          >
            Export CSV
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={() => handleExportJson(selectedLogs)}
            leadingIcon={RiCodeSSlashLine}
            className="rounded-full font-medium"
          >
            Export JSON
          </Button>
          <span className="h-4 w-px bg-separator-border" />
          <button
            type="button"
            onClick={() => setRowSelection({})}
            className="size-7 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
            title="Clear selection"
            aria-label="Clear selection"
          >
            <RiCloseLine className="size-4" />
          </button>
        </div>
      )}

      {/* 6. Pagination Footer (BoardUI Select & Pagination matching Users page) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 px-1">
        <div className="flex items-center gap-3 text-body-2-medium text-text-secondary">
          <span>Rows per page</span>
          <Select
            aria-label="Rows per page"
            size="sm"
            selectedKey={String(limit)}
            onSelectionChange={(key) => {
              setLimit(Number(key));
              setPage(1);
            }}
            className="w-20"
          >
            <SelectItem id="10" textValue="10">
              10
            </SelectItem>
            <SelectItem id="20" textValue="20">
              20
            </SelectItem>
            <SelectItem id="50" textValue="50">
              50
            </SelectItem>
            <SelectItem id="100" textValue="100">
              100
            </SelectItem>
          </Select>
          <span className="text-text-tertiary">
            {total > 0
              ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total} events`
              : '0 events'}
          </span>
        </div>

        <div className="flex items-center">
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={(p) => setPage(p)}
          />
        </div>
      </div>

      {/* 7. Detailed Audit Event Inspection Modal */}
      <Modal
        size="lg"
        isOpen={!!inspectLog}
        onOpenChange={(open) => {
          if (!open) setInspectLog(null);
        }}
      >
        {({ close }) => {
          const actionMeta = getActionMeta(inspectLog?.action);
          const resourceMeta = getResourceMeta(inspectLog?.resource);
          return (
            <div>
              <ModalHeader
                title={`Audit Event: ${actionMeta.label}`}
                description={
                  inspectLog
                    ? `Recorded ${new Date(inspectLog.createdAt).toLocaleString()} · Event ID ${inspectLog._id}`
                    : ''
                }
              />
              <ModalBody className="space-y-4 max-h-[65vh] overflow-y-auto">
                {/* Badges & Live Verification Indicator */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip color={actionMeta.color} variant="caption" className="font-mono">
                      {inspectLog?.action}
                    </Chip>
                    <Chip color={resourceMeta.color} variant="caption">
                      {resourceMeta.label}
                    </Chip>
                  </div>
                  {inspectLoading ? (
                    <span className="inline-flex items-center gap-1.5 text-caption-1-medium text-text-tertiary">
                      <Spinner size="xs" />
                      <span>Verifying ledger record...</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-caption-1-medium text-accent-700 dark:text-accent-300">
                      <RiShieldCheckLine className="size-4" />
                      <span>Immutable Record</span>
                    </span>
                  )}
                </div>

                {/* Summary Description Card */}
                <div className="bg-background-secondary-default border border-separator-border p-4 rounded-xl space-y-3 text-caption-1-medium">
                  <div>
                    <span className="text-text-tertiary uppercase tracking-wider text-[11px] font-semibold">
                      Event Description
                    </span>
                    <p className="font-semibold text-text-primary text-body-medium mt-1">
                      {inspectLog?.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-separator-border">
                    <div>
                      <span className="text-text-tertiary uppercase tracking-wider text-[11px] font-semibold">
                        Actor
                      </span>
                      <p className="text-text-primary font-semibold mt-0.5 break-all">
                        {inspectLog?.actor?.email || 'System'}
                      </p>
                      <p className="text-text-tertiary text-[11px] font-mono mt-0.5">
                        {inspectLog?.actor?.humanId ? `${inspectLog.actor.humanId} · ` : ''}
                        {inspectLog?.actor?.role ? getRoleDisplayName(inspectLog.actor.role) : 'System'}
                      </p>
                    </div>

                    <div>
                      <span className="text-text-tertiary uppercase tracking-wider text-[11px] font-semibold">
                        Resource &amp; Target ID
                      </span>
                      <p className="text-text-primary font-semibold mt-0.5 capitalize">
                        {inspectLog?.resource || '—'}
                      </p>
                      <p className="text-text-tertiary font-mono text-[11px] mt-0.5 break-all">
                        {inspectLog?.resourceId || 'No resource ID attached'}
                      </p>
                    </div>

                    <div>
                      <span className="text-text-tertiary uppercase tracking-wider text-[11px] font-semibold">
                        Source IP Address
                      </span>
                      <p className="font-mono text-text-primary mt-0.5">
                        {inspectLog?.ipAddress || 'Internal'}
                      </p>
                    </div>

                    <div>
                      <span className="text-text-tertiary uppercase tracking-wider text-[11px] font-semibold">
                        Client Environment
                      </span>
                      <p className="text-text-primary mt-0.5">
                        {formatUserAgentSummary(inspectLog?.userAgent)}
                      </p>
                      {inspectLog?.userAgent && (
                        <p
                          className="font-mono text-[11px] text-text-tertiary truncate mt-0.5"
                          title={inspectLog.userAgent}
                        >
                          {inspectLog.userAgent}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sanitized Metadata Payload */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-caption-1-semibold text-text-primary">
                      <RiTerminalBoxLine className="size-4 text-text-tertiary" />
                      <span>Sanitized Metadata Payload</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          JSON.stringify(inspectLog?.metadata || {}, null, 2),
                          'Metadata JSON',
                          `meta-${inspectLog?._id}`
                        )
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-caption-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                    >
                      {copiedKey === `meta-${inspectLog?._id}` ? (
                        <>
                          <RiCheckLine className="size-3.5 text-accent-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <RiFileCopyLine className="size-3.5" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3.5 bg-neutral-950 text-neutral-100 border border-neutral-800 rounded-xl text-caption-2-medium font-mono overflow-x-auto max-h-52">
                    {JSON.stringify(inspectLog?.metadata || {}, null, 2)}
                  </pre>
                </div>
              </ModalBody>
              <ModalFooter className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {inspectLog?.actor?.id && (
                    <Button
                      variant="ghost"
                      size="small"
                      leadingIcon={RiUserSearchLine}
                      onClick={() => {
                        setActorIdFilter(inspectLog.actor.id);
                        setPage(1);
                        close();
                        toast(`Filtering ledger by ${inspectLog.actor.email}`, { status: 'information' });
                      }}
                    >
                      Filter by Actor
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    leadingIcon={RiCodeSSlashLine}
                    onClick={() =>
                      inspectLog &&
                      handleCopyText(
                        JSON.stringify(inspectLog, null, 2),
                        'Full event JSON',
                        `full-${inspectLog._id}`
                      )
                    }
                  >
                    Copy Full JSON
                  </Button>
                  <Button variant="primary" className="text-[#171B18]" onClick={close}>
                    Close
                  </Button>
                </div>
              </ModalFooter>
            </div>
          );
        }}
      </Modal>
    </div>
  );
}
