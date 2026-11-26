'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiLockLine,
  RiShieldCheckLine,
  RiShieldUserLine,
  RiUserLine,
  RiFilter3Line,
  RiArrowUpDownLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiDownloadLine,
  RiMoreFill,
  RiCloseLine,
  RiInformationLine,
  RiTableLine,
  RiGridLine,
  RiRestartLine,
  RiEyeLine,
  RiRefreshLine,
  RiToggleLine,
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
  PermissionDefinition,
  Role,
  AccessControlDashboardStats,
  ModulePermissionsGroup,
} from '@/lib/api/types';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Chip, ChipColor } from '@/components/base/badges/chip';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Switch } from '@/components/base/switch/switch';
import { Avatar } from '@/components/base/avatar/avatar';
import { Modal, ModalHeader, ModalBody, ModalFooter, AlertDialog } from '@/components/base/modal/modal';
import { Skeleton } from '@/components/base/skeleton/skeleton';
import {
  CardGridSkeleton,
  PageShellSkeleton,
  TableRowsSkeleton,
} from '@/components/application/loading/page-skeletons';
import { toast } from '@/components/base/toast/toast';
import { Select, SelectItem } from '@/components/base/select/select';
import { Pagination } from '@/components/base/pagination/pagination';
import { SearchField } from '@/components/base/search-field/search-field';
import { Tooltip, TooltipTrigger } from '@/components/base/tooltip/tooltip';
import { PermissionMatrix } from '@/components/application/roles/permission-matrix';
import {
  RoleDetailResponse,
  RoleStatusFilter,
  RoleTypeFilter,
  RoleWithStats,
  buildRolesCsv,
  canDeleteRole,
  canEditRole,
  canToggleRoleStatus,
  computeRoleSummaryStats,
  filterRoles,
  groupPermissionsByModule,
  isSuperAdminRole,
} from '@/lib/roles/utils';
import { cx } from '@/utils/cx';

function triggerCsvDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getRoleBadgeStyle(code: string): { chipColor: ChipColor; avatarColor: 'lime' | 'blue' | 'neutral' } {
  switch (code) {
    case 'SUPER_ADMIN':
      return { chipColor: 'lime', avatarColor: 'lime' };
    case 'ADMIN':
      return { chipColor: 'blue', avatarColor: 'blue' };
    case 'MANAGER':
      return { chipColor: 'yellow', avatarColor: 'neutral' };
    case 'EMPLOYEE':
      return { chipColor: 'soft', avatarColor: 'neutral' };
    default:
      return { chipColor: 'cyan', avatarColor: 'blue' };
  }
}

export default function RolesPage() {
  const { user: currentUser, isSuperAdmin, hasPermission, isLoading: authLoading } = useAuth();
  const canRead = isSuperAdmin || hasPermission('roles.read');

  // Data states
  const [roles, setRoles] = useState<RoleWithStats[]>([]);
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<ModulePermissionsGroup[]>([]);
  const [apiStats, setApiStats] = useState<AccessControlDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters, search, view, pagination
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<RoleTypeFilter>('');
  const [statusFilter, setStatusFilter] = useState<RoleStatusFilter>('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showStatistics, setShowStatistics] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // TanStack table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Inspect modal state (powered by GET /roles/:id)
  const [inspectDetail, setInspectDetail] = useState<RoleDetailResponse | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Create / Edit / Dialog states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleWithStats | null>(null);
  const [deleteRoleDialog, setDeleteRoleDialog] = useState<RoleWithStats | null>(null);
  const [statusDialogRole, setStatusDialogRole] = useState<RoleWithStats | null>(null);

  // Form states shared cleanly between Create and Edit modals
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [rolesRes, permsRes, groupedRes, statsRes] = await Promise.allSettled([
        apiClient<RoleWithStats[]>(API_ENDPOINTS.ROLES),
        apiClient<PermissionDefinition[]>(API_ENDPOINTS.PERMISSIONS),
        apiClient<ModulePermissionsGroup[]>(API_ENDPOINTS.PERMISSIONS_GROUPED),
        apiClient<AccessControlDashboardStats>(API_ENDPOINTS.ROLE_STATS),
      ]);

      if (rolesRes.status === 'fulfilled') setRoles(rolesRes.value || []);
      if (permsRes.status === 'fulfilled') setPermissions(permsRes.value || []);
      if (groupedRes.status === 'fulfilled') setGroupedPermissions(groupedRes.value || []);
      if (statsRes.status === 'fulfilled') setApiStats(statsRes.value || null);
      setRowSelection({});
    } catch (err: any) {
      toast.error(err.message || 'Failed to load roles and permissions');
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const permissionGroups = useMemo(
    () => groupPermissionsByModule(groupedPermissions, permissions),
    [groupedPermissions, permissions]
  );

  const summaryStats = useMemo(
    () => computeRoleSummaryStats(roles, apiStats, permissions.length),
    [roles, apiStats, permissions.length]
  );

  const filteredRoles = useMemo(
    () => filterRoles(roles, { search, type: typeFilter, status: statusFilter }),
    [roles, search, typeFilter, statusFilter]
  );

  // Client-side pagination slice consistent with Users / Audit Logs footer
  const total = filteredRoles.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const safePage = Math.min(page, totalPages);
  const paginatedRoles = useMemo(() => {
    const start = (safePage - 1) * limit;
    return filteredRoles.slice(start, start + limit);
  }, [filteredRoles, safePage, limit]);

  const hasActiveFilters = Boolean(typeFilter || statusFilter);
  const hasAnyFilterOrSearch = Boolean(search.trim() || hasActiveFilters);

  const handleResetFilters = useCallback(() => {
    setTypeFilter('');
    setStatusFilter('');
    setPage(1);
  }, []);

  const handleClearAll = useCallback(() => {
    setSearch('');
    handleResetFilters();
  }, [handleResetFilters]);

  // Open Inspect Role Modal & load assigned users via GET /api/v1/roles/:id
  const handleOpenInspect = useCallback(async (role: RoleWithStats) => {
    setInspectDetail({
      role,
      userCount: role.userCount ?? 0,
      users: [],
    });
    setInspectLoading(true);
    try {
      const detail = await apiClient<RoleDetailResponse>(API_ENDPOINTS.ROLE_BY_ID(role._id));
      if (detail) {
        setInspectDetail(detail);
      }
    } catch {
      // Keep summary snapshot if detail call fails
    } finally {
      setInspectLoading(false);
    }
  }, []);

  const handleOpenCreate = useCallback(() => {
    setFormCode('');
    setFormName('');
    setFormDescription('');
    setFormPermissions([]);
    setFormIsActive(true);
    setFormError('');
    setCreateModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((role: RoleWithStats) => {
    setSelectedRole(role);
    setFormCode(role.code);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormPermissions(role.permissions || []);
    setFormIsActive(role.isActive);
    setFormError('');
    setEditModalOpen(true);
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedCode = formCode.trim().toUpperCase();
    if (!cleanedCode || !formName.trim()) {
      setFormError('Role code and display name are required.');
      return;
    }
    if (!/^[A-Z0-9_]+$/.test(cleanedCode)) {
      setFormError('Role code must contain only uppercase letters, numbers, and underscores.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      await apiClient(API_ENDPOINTS.ROLES, {
        method: 'POST',
        body: JSON.stringify({
          code: cleanedCode,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          permissions: formPermissions,
          isActive: formIsActive,
        }),
      });

      toast.success(`Custom role "${formName.trim()}" created successfully`);
      setCreateModalOpen(false);
      await loadData();
    } catch (err: any) {
      const msg = err.message || 'Failed to create role';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    if (!formName.trim()) {
      setFormError('Display name is required.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const payload: Record<string, any> = {
        name: formName.trim(),
        description: formDescription.trim(),
        permissions: formPermissions,
      };
      if (!selectedRole.isSystem) {
        payload.isActive = formIsActive;
      }

      await apiClient(API_ENDPOINTS.ROLE_BY_ID(selectedRole._id), {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      toast.success(`Role "${formName.trim()}" updated successfully`);
      setEditModalOpen(false);
      await loadData();
    } catch (err: any) {
      const msg = err.message || 'Failed to update role';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusDialogRole) return;
    try {
      await apiClient(API_ENDPOINTS.ROLE_BY_ID(statusDialogRole._id), {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: !statusDialogRole.isActive,
        }),
      });
      toast.success(
        `Role "${statusDialogRole.name}" ${statusDialogRole.isActive ? 'deactivated' : 'activated'} successfully`
      );
      setStatusDialogRole(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role status');
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleDialog) return;
    try {
      await apiClient(API_ENDPOINTS.ROLE_BY_ID(deleteRoleDialog._id), {
        method: 'DELETE',
      });
      toast.success(`Role "${deleteRoleDialog.name}" deleted successfully`);
      setDeleteRoleDialog(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role');
    }
  };

  // Batch selection & CSV Export
  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);
  const selectedCount = selectedIds.length;

  const handleExportCsv = (exportList?: RoleWithStats[]) => {
    const dataToExport = exportList && exportList.length > 0 ? exportList : filteredRoles;
    if (dataToExport.length === 0) {
      toast.error('No roles available to export');
      return;
    }

    const csv = buildRolesCsv(dataToExport);
    triggerCsvDownload(csv, `modus-roles-export-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${dataToExport.length} role${dataToExport.length === 1 ? '' : 's'} to CSV`);
  };

  const handleExportSelected = () => {
    const selected = filteredRoles.filter((r) => selectedIds.includes(r._id));
    handleExportCsv(selected);
  };

  // TanStack columns definition consistent with Users & Audit Logs
  const columns = useMemo<ColumnDef<RoleWithStats>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              size="sm"
              aria-label="Select all roles on this page"
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
              aria-label={`Select role ${row.original.name}`}
              isSelected={row.getIsSelected()}
              onChange={() => row.toggleSelected()}
            />
          </div>
        ),
        enableSorting: false,
        size: 36,
      },
      {
        id: 'name',
        header: 'Role',
        accessorKey: 'name',
        cell: ({ row }) => {
          const role = row.original;
          const style = getRoleBadgeStyle(role.code);
          const isImmutable = isSuperAdminRole(role);
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cx(
                  'size-8 rounded-xl flex items-center justify-center shrink-0 border',
                  style.avatarColor === 'lime'
                    ? 'bg-accent-100 dark:bg-accent-950/60 border-accent-300 dark:border-accent-800 text-accent-700 dark:text-accent-300'
                    : style.avatarColor === 'blue'
                      ? 'bg-status-blue-background border-border-button-default text-status-blue-text'
                      : 'bg-background-secondary-default border-border-button-default text-text-secondary'
                )}
              >
                {isImmutable ? (
                  <RiLockLine className="size-4" />
                ) : (
                  <RiShieldUserLine className="size-4" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-body-2-medium font-semibold text-text-primary truncate max-w-[130px] xl:max-w-[195px]">
                    {role.name}
                  </span>
                  {currentUser?.role === role.code && (
                    <Chip color="lime" variant="caption" className="font-semibold text-[10px] py-0 px-1 shrink-0">
                      Yours
                    </Chip>
                  )}
                </div>
                <span
                  className="text-caption-1-regular text-text-secondary truncate max-w-[135px] xl:max-w-[230px]"
                  title={role.description || 'No description'}
                >
                  {role.description || 'No description provided'}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'code',
        header: 'Code',
        accessorKey: 'code',
        cell: ({ row }) => (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-mono text-[11px] text-text-tertiary bg-background-secondary-default border border-separator-border whitespace-nowrap">
            {row.original.code}
          </span>
        ),
      },
      {
        id: 'isSystem',
        header: 'Type',
        accessorFn: (row) => (row.isSystem || row.code === 'SUPER_ADMIN' ? 1 : 0),
        cell: ({ row }) => {
          const isSystem = Boolean(row.original.isSystem || row.original.code === 'SUPER_ADMIN');
          return isSystem ? (
            <Chip color="neutral" variant="caption" className="gap-1">
              <RiLockLine className="size-3" />
              <span>System</span>
            </Chip>
          ) : (
            <Chip color="blue" variant="caption">
              Custom
            </Chip>
          );
        },
      },
      {
        id: 'userCount',
        header: 'Users',
        accessorFn: (row) => row.userCount ?? 0,
        cell: ({ row }) => {
          const count = row.original.userCount ?? 0;
          return (
            <span className="inline-flex items-center gap-1.5 text-body-2-regular text-text-secondary whitespace-nowrap">
              <RiUserLine className="size-3.5 text-text-tertiary shrink-0" />
              <span className="font-mono font-medium text-text-primary">{count}</span>
              <span className="hidden 2xl:inline text-text-tertiary">
                {count === 1 ? 'user' : 'users'}
              </span>
            </span>
          );
        },
      },
      {
        id: 'permissionsCount',
        header: 'Permissions',
        accessorFn: (row) => row.permissionsCount ?? row.permissions?.length ?? 0,
        cell: ({ row }) => {
          const perms = row.original.permissions || [];
          const count = row.original.permissionsCount ?? perms.length;
          return (
            <div className="flex items-center gap-1.5 min-w-0">
              <Chip color="soft" variant="caption" className="font-mono shrink-0">
                {count} {count === 1 ? 'rule' : 'rules'}
              </Chip>
              <div className="hidden xl:flex items-center gap-1 min-w-0">
                {perms.slice(0, 2).map((p) => (
                  <span
                    key={p}
                    className="text-[10px] font-mono bg-background-secondary-default text-text-tertiary px-1.5 py-0.5 rounded border border-separator-border truncate max-w-[95px]"
                  >
                    {p}
                  </span>
                ))}
                {perms.length > 2 && (
                  <span className="text-[11px] font-medium text-text-tertiary shrink-0">
                    +{perms.length - 2}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: 'isActive',
        header: 'Status',
        accessorKey: 'isActive',
        cell: ({ row }) => {
          const isActive = row.original.isActive;
          return (
            <div className="inline-flex items-center gap-1.5">
              <span
                className={cx(
                  'size-1.5 rounded-full shrink-0',
                  isActive ? 'bg-accent-500 animate-pulse' : 'bg-neutral-400'
                )}
              />
              <Chip color={isActive ? 'lime' : 'rose'} variant="caption">
                {isActive ? 'Active' : 'Inactive'}
              </Chip>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const role = row.original;
          const editable = canEditRole(role, isSuperAdmin);
          const statusToggleable = canToggleRoleStatus(role, isSuperAdmin);
          const deletable = canDeleteRole(role, isSuperAdmin);
          const isCustom = !role.isSystem && !isSuperAdminRole(role);

          return (
            <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => handleOpenInspect(role)}
                className="size-7 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-500 cursor-pointer"
                title="Inspect role & assigned users"
                aria-label={`Inspect ${role.name}`}
              >
                <RiEyeLine className="size-4" />
              </button>

              <AriaDialogTrigger>
                <AriaButton
                  className="size-7 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-500 cursor-pointer"
                  aria-label={`Actions for ${role.name}`}
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
                            handleOpenInspect(role);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors text-start cursor-pointer"
                        >
                          <RiEyeLine className="size-4 text-text-tertiary" />
                          <span>Inspect Role &amp; Users</span>
                        </button>

                        {editable && (
                          <button
                            type="button"
                            onClick={() => {
                              close();
                              handleOpenEdit(role);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors text-start cursor-pointer"
                          >
                            <RiEditLine className="size-4 text-text-tertiary" />
                            <span>Edit Permissions</span>
                          </button>
                        )}

                        {statusToggleable && (
                          <button
                            type="button"
                            onClick={() => {
                              close();
                              setStatusDialogRole(role);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors text-start cursor-pointer"
                          >
                            <RiToggleLine className="size-4 text-text-tertiary" />
                            <span>{role.isActive ? 'Deactivate Role' : 'Activate Role'}</span>
                          </button>
                        )}

                        {isSuperAdmin && isCustom && (
                          <>
                            <div className="my-1 border-t border-separator-border" />
                            <button
                              type="button"
                              disabled={!deletable}
                              onClick={() => {
                                close();
                                if (deletable) setDeleteRoleDialog(role);
                              }}
                              title={
                                deletable
                                  ? 'Delete custom role'
                                  : `Reassign ${role.userCount} user(s) before deleting`
                              }
                              className={cx(
                                'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-body-2-medium transition-colors text-start',
                                deletable
                                  ? 'text-text-error-primary hover:bg-background-secondary-default cursor-pointer'
                                  : 'text-text-tertiary opacity-50 cursor-not-allowed'
                              )}
                            >
                              <RiDeleteBinLine className="size-4" />
                              <span>
                                {deletable ? 'Delete Role' : `In Use (${role.userCount})`}
                              </span>
                            </button>
                          </>
                        )}
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
    [currentUser?.role, isSuperAdmin, handleOpenInspect, handleOpenEdit]
  );

  // TanStack table instance
  const table = useReactTable({
    data: paginatedRoles,
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
    return <PageShellSkeleton statsCount={4} view={viewMode} />;
  }

  if (!canRead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="size-14 rounded-full bg-background-secondary-default border border-border-button-default flex items-center justify-center text-text-tertiary mb-3 shadow-2xs">
          <RiShieldCheckLine className="size-7" />
        </div>
        <h2 className="text-title-1-bold text-text-primary">Access Restricted</h2>
        <p className="text-body-2-regular text-text-secondary max-w-md mt-1 mb-5">
          Roles &amp; Access governance is restricted to Super Administrators or accounts with the &quot;roles.read&quot; permission.
        </p>
        <Link href="/dashboard">
          <Button variant="secondary">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header (Full-width border with 0 side margins matching Users & Audit Logs) */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-5 border-b border-border-button-default bg-background-primary-default">
        <div>
          <h1 className="text-title-1-medium font-bold text-text-primary tracking-tight">
            Roles &amp; Access
          </h1>
          <p className="text-body-medium text-text-secondary mt-0.5">
            Role-Based Access Control (RBAC) governance, authorization policies, and module permission mappings
          </p>
        </div>
      </div>

      {/* 2. Stats Section (Single unified 4-segment KPI container matching Users & Audit Logs) */}
      {showStatistics && (
        <div className="rounded-2xl border border-border-button-default bg-background-primary-default shadow-2xs overflow-hidden animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-separator-border">
            {/* Total Roles */}
            <div className="p-5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-caption-1-medium text-text-primary font-medium">
                <span>Total Roles</span>
                <TooltipTrigger delay={80}>
                  <AriaButton
                    className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    aria-label="Total roles info"
                  >
                    <RiInformationLine className="size-3.5" />
                  </AriaButton>
                  <Tooltip size="sm">
                    Combined built-in system and custom workspace security roles registered in RBAC.
                  </Tooltip>
                </TooltipTrigger>
              </div>
              <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight font-mono">
                {summaryStats.totalRoles}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
                <span>operational state</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold text-accent-800 dark:text-accent-300 bg-accent-100 dark:bg-accent-950/60">
                  {summaryStats.activeRoles} active
                </span>
              </div>
            </div>

            {/* Custom Roles */}
            <div className="p-5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-caption-1-medium text-text-primary font-medium">
                <span>Custom Roles</span>
                <TooltipTrigger delay={80}>
                  <AriaButton
                    className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    aria-label="Custom roles info"
                  >
                    <RiInformationLine className="size-3.5" />
                  </AriaButton>
                  <Tooltip size="sm">
                    Tailored workspace roles created by Super Administrators alongside protected system defaults.
                  </Tooltip>
                </TooltipTrigger>
              </div>
              <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight font-mono">
                {summaryStats.customRoles}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
                <span>built-in baseline</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold text-accent-800 dark:text-accent-300 bg-accent-100 dark:bg-accent-950/60">
                  {summaryStats.systemRoles} system
                </span>
              </div>
            </div>

            {/* Assigned Users */}
            <div className="p-5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-caption-1-medium text-text-primary font-medium">
                <span>Assigned Users</span>
                <TooltipTrigger delay={80}>
                  <AriaButton
                    className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    aria-label="Assigned users info"
                  >
                    <RiInformationLine className="size-3.5" />
                  </AriaButton>
                  <Tooltip size="sm">
                    Total user accounts across the directory mapped to active RBAC role definitions.
                  </Tooltip>
                </TooltipTrigger>
              </div>
              <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight font-mono">
                {summaryStats.totalAssignedUsers}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
                <span>coverage</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold text-accent-800 dark:text-accent-300 bg-accent-100 dark:bg-accent-950/60">
                  {summaryStats.rolesInUse} roles in use
                </span>
              </div>
            </div>

            {/* Permissions Registry */}
            <div className="p-5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-caption-1-medium text-text-primary font-medium">
                <span>Permissions Registry</span>
                <TooltipTrigger delay={80}>
                  <AriaButton
                    className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    aria-label="Permissions registry info"
                  >
                    <RiInformationLine className="size-3.5" />
                  </AriaButton>
                  <Tooltip size="sm">
                    Granular module capability permissions enforced across API endpoints and UI routes.
                  </Tooltip>
                </TooltipTrigger>
              </div>
              <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight font-mono">
                {summaryStats.totalPermissions}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
                <span>inactive roles</span>
                <span
                  className={cx(
                    'inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold',
                    summaryStats.inactiveRoles > 0
                      ? 'text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60'
                      : 'text-text-tertiary bg-background-secondary-default'
                  )}
                >
                  {summaryStats.inactiveRoles > 0
                    ? `${summaryStats.inactiveRoles} disabled`
                    : '0 disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Controls & Filtering Bar (Consistent with Users & Audit Logs) */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left Side: Searchbar, View Switcher, Filter, Sort, Show Statistics */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Pilled BoardUI SearchField */}
          <SearchField
            aria-label="Search roles"
            placeholder="Search roles..."
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            shape="pill"
            className="w-full sm:w-64 lg:w-72"
          />

          {/* Table / Cards View Switcher */}
          <div className="inline-flex items-center rounded-xl border border-border-button-default bg-background-primary-default p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cx(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-body-2-medium transition-colors cursor-pointer',
                viewMode === 'table'
                  ? 'bg-background-secondary-default text-text-primary font-semibold'
                  : 'text-text-tertiary hover:text-text-primary'
              )}
              aria-label="Table view"
            >
              <RiTableLine className="size-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={cx(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-body-2-medium transition-colors cursor-pointer',
                viewMode === 'cards'
                  ? 'bg-background-secondary-default text-text-primary font-semibold'
                  : 'text-text-tertiary hover:text-text-primary'
              )}
              aria-label="Card view"
            >
              <RiGridLine className="size-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
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
              className="z-50 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-2xl outline-none"
            >
              <AriaDialog className="outline-none flex flex-col gap-3.5">
                <div className="flex items-center justify-between border-b border-separator-border pb-2.5">
                  <span className="text-body-2-medium font-semibold text-text-primary">
                    Filter Roles
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

                {/* Role Type Filter */}
                <Select
                  label="Role Type"
                  aria-label="Filter by role type"
                  size="sm"
                  selectedKey={typeFilter || 'ALL'}
                  onSelectionChange={(key) => {
                    setTypeFilter(key === 'ALL' ? '' : (String(key) as RoleTypeFilter));
                    setPage(1);
                  }}
                  className="w-full"
                >
                  <SelectItem id="ALL" textValue="All Types">
                    All Types
                  </SelectItem>
                  <SelectItem id="system" textValue="System Built-in">
                    System Built-in
                  </SelectItem>
                  <SelectItem id="custom" textValue="Custom Roles">
                    Custom Roles
                  </SelectItem>
                </Select>

                {/* Status Filter */}
                <Select
                  label="Status"
                  aria-label="Filter by status"
                  size="sm"
                  selectedKey={statusFilter || 'ALL'}
                  onSelectionChange={(key) => {
                    setStatusFilter(key === 'ALL' ? '' : (String(key) as RoleStatusFilter));
                    setPage(1);
                  }}
                  className="w-full"
                >
                  <SelectItem id="ALL" textValue="All Statuses">
                    All Statuses
                  </SelectItem>
                  <SelectItem id="active" textValue="Active Only">
                    Active Only
                  </SelectItem>
                  <SelectItem id="inactive" textValue="Inactive Only">
                    Inactive Only
                  </SelectItem>
                </Select>
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
                        setSorting([{ id: 'name', desc: false }]);
                        close();
                      }}
                      className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                    >
                      Sort by Name
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSorting([{ id: 'code', desc: false }]);
                        close();
                      }}
                      className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                    >
                      Sort by Code
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSorting([{ id: 'userCount', desc: true }]);
                        close();
                      }}
                      className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                    >
                      Most Assigned Users
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSorting([{ id: 'permissionsCount', desc: true }]);
                        close();
                      }}
                      className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                    >
                      Most Permissions
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSorting([{ id: 'isSystem', desc: true }]);
                        close();
                      }}
                      className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                    >
                      System Roles First
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

        {/* Right Side: Refresh, Export, Create Role */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            variant="secondary"
            size="medium"
            onClick={loadData}
            leadingIcon={RiRefreshLine}
            className="h-10 px-4 gap-2 rounded-full text-body-medium font-medium shadow-2xs hover:shadow-xs transition-all"
          >
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="medium"
            onClick={() => handleExportCsv()}
            leadingIcon={RiDownloadLine}
            className="h-10 px-5 gap-2.5 rounded-full text-body-medium font-medium shadow-2xs hover:shadow-xs transition-all"
          >
            Export
          </Button>

          {(isSuperAdmin || hasPermission('roles.create')) && isSuperAdmin && (
            <Button
              variant="primary"
              size="medium"
              onClick={handleOpenCreate}
              leadingIcon={RiAddLine}
              className="h-10 px-5 gap-2.5 rounded-full text-body-medium font-semibold text-[#171B18] shadow-2xs hover:shadow-xs transition-all"
            >
              Create Role
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 -mt-2">
          <span className="text-caption-1-medium text-text-tertiary">Active filters:</span>
          {typeFilter && (
            <button
              type="button"
              onClick={() => {
                setTypeFilter('');
                setPage(1);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border-button-default bg-background-secondary-default text-caption-1-medium text-text-primary hover:border-accent-500 transition-colors cursor-pointer"
            >
              <span>Type: {typeFilter === 'system' ? 'System Built-in' : 'Custom Roles'}</span>
              <RiCloseLine className="size-3.5 text-text-tertiary" />
            </button>
          )}
          {statusFilter && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('');
                setPage(1);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border-button-default bg-background-secondary-default text-caption-1-medium text-text-primary hover:border-accent-500 transition-colors cursor-pointer"
            >
              <span>Status: {statusFilter === 'active' ? 'Active' : 'Inactive'}</span>
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

      {/* 4. Roles Data Container (Table View by default matching Users/Audit Logs + Optional Cards View) */}
      {viewMode === 'table' ? (
        <div className="border border-border-button-default rounded-2xl bg-background-primary-default shadow-xs overflow-hidden">
          {loading ? (
            <TableRowsSkeleton rows={6} columns={5} showCheckbox />
          ) : paginatedRoles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="size-14 rounded-2xl bg-background-secondary-default flex items-center justify-center text-text-tertiary mb-3.5 border border-separator-border">
                <RiShieldUserLine className="size-7" />
              </div>
              <h3 className="text-title-3-semibold text-text-primary">No roles found</h3>
              <p className="text-body-2-regular text-text-secondary max-w-sm mt-1">
                {hasAnyFilterOrSearch
                  ? 'No RBAC roles match your current search or filter criteria.'
                  : 'Create your first custom security role to grant granular permissions.'}
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
                            className="px-2 xl:px-3.5 py-3 text-start align-middle text-caption-1-medium uppercase tracking-wider text-text-tertiary font-semibold select-none"
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
                            className="px-2 xl:px-3.5 py-3 align-middle text-body-2-medium text-text-primary"
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
      ) : loading ? (
        <CardGridSkeleton count={6} />
      ) : paginatedRoles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border border-border-button-default bg-background-primary-default">
          <div className="size-14 rounded-2xl bg-background-secondary-default flex items-center justify-center text-text-tertiary mb-3.5 border border-separator-border">
            <RiShieldUserLine className="size-7" />
          </div>
          <h3 className="text-title-3-semibold text-text-primary">No roles found</h3>
          <p className="text-body-2-regular text-text-secondary max-w-sm mt-1">
            No RBAC roles match your current search or filter criteria.
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedRoles.map((role) => {
            const isSystemRole = Boolean(role.isSystem || isSuperAdminRole(role));
            const editable = canEditRole(role, isSuperAdmin);
            const deletable = canDeleteRole(role, isSuperAdmin);

            return (
              <div
                key={role._id}
                className="bg-background-primary-default border border-border-button-default rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-border-focus-ring/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-caption-1-semibold text-accent-800 dark:text-accent-300 bg-accent-50 dark:bg-accent-950/40 px-2 py-0.5 rounded-md border border-accent-200 dark:border-accent-800">
                      {role.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isSystemRole ? (
                        <Chip color="neutral" variant="caption" className="flex items-center gap-1">
                          <RiLockLine className="size-3" /> System
                        </Chip>
                      ) : (
                        <Chip color="blue" variant="caption">
                          Custom
                        </Chip>
                      )}
                      <Chip color={role.isActive ? 'lime' : 'rose'} variant="caption">
                        {role.isActive ? 'Active' : 'Inactive'}
                      </Chip>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-title-3-semibold text-text-primary">{role.name}</h2>
                    <p className="text-caption-1-medium text-text-secondary line-clamp-2 mt-0.5">
                      {role.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-caption-2-medium text-text-secondary">
                    <RiUserLine className="size-3.5 text-text-tertiary" />
                    <span>
                      {role.userCount ?? 0} assigned {(role.userCount ?? 0) === 1 ? 'user' : 'users'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-separator-border">
                    <p className="text-caption-2-medium text-text-tertiary uppercase mb-1.5">
                      Permissions ({role.permissions?.length || 0})
                    </p>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {role.permissions?.slice(0, 6).map((p) => (
                        <span
                          key={p}
                          className="text-[11px] font-mono bg-background-secondary-default text-text-secondary px-1.5 py-0.5 rounded border border-separator-border"
                        >
                          {p}
                        </span>
                      ))}
                      {(role.permissions?.length || 0) > 6 && (
                        <span className="text-[11px] text-text-tertiary font-semibold self-center px-1">
                          +{role.permissions.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-separator-border flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleOpenInspect(role)}
                    leadingIcon={RiEyeLine}
                  >
                    Inspect
                  </Button>
                  <div className="flex items-center gap-1.5">
                    {editable && (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => handleOpenEdit(role)}
                        leadingIcon={RiEditLine}
                      >
                        Edit
                      </Button>
                    )}
                    {isSuperAdmin && !isSystemRole && (
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={!deletable}
                        onClick={() => deletable && setDeleteRoleDialog(role)}
                        className="text-text-error-primary hover:text-text-error-hover"
                        leadingIcon={RiDeleteBinLine}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Floating Selection Action Bar (Consistent with Users & Audit Logs) */}
      {selectedCount > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center justify-center gap-2 max-w-[calc(100vw-2rem)] rounded-2xl sm:rounded-full border border-border-button-default bg-background-primary-default/95 backdrop-blur-md px-3 sm:px-4 py-2 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-caption-1-semibold bg-accent-500 text-neutral-950 font-bold">
            {selectedCount} Selected
          </span>
          <span className="h-4 w-px bg-separator-border" />
          <Button
            variant="secondary"
            size="small"
            onClick={handleExportSelected}
            leadingIcon={RiDownloadLine}
            className="rounded-full font-medium"
          >
            Export CSV
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

      {/* 6. Pagination Footer (BoardUI Select & Pagination matching Users & Audit Logs) */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 py-2 px-1">
        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3 text-body-2-medium text-text-secondary">
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
              ? `${(safePage - 1) * limit + 1}–${Math.min(safePage * limit, total)} of ${total} role${total === 1 ? '' : 's'}`
              : '0 roles'}
          </span>
        </div>

        <div className="w-full lg:w-auto min-w-0 max-w-full flex items-center justify-center">
          <Pagination page={safePage} totalPages={totalPages} onChange={(p) => setPage(p)} />
        </div>
      </div>

      {/* 7. Inspect Role & Assigned Users Modal (GET /api/v1/roles/:id) */}
      <Modal
        size="lg"
        isOpen={!!inspectDetail}
        onOpenChange={(open) => {
          if (!open) setInspectDetail(null);
        }}
      >
        {({ close }) => {
          const role = inspectDetail?.role;
          const isSystem = Boolean(role?.isSystem || isSuperAdminRole(role));
          const editable = canEditRole(role, isSuperAdmin);

          return (
            <div>
              <ModalHeader
                title={role ? `Role: ${role.name}` : 'Role Details'}
                description={
                  role
                    ? `${role.code} · ${isSystem ? 'System Protected Role' : 'Custom Workspace Role'}`
                    : ''
                }
              />
              <ModalBody className="space-y-4 max-h-[65vh] overflow-y-auto">
                {role && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-caption-1-semibold px-2.5 py-0.5 rounded-md border border-separator-border bg-background-secondary-default text-text-primary">
                          {role.code}
                        </span>
                        <Chip color={isSystem ? 'neutral' : 'blue'} variant="caption">
                          {isSystem ? 'System' : 'Custom'}
                        </Chip>
                        <Chip color={role.isActive ? 'lime' : 'rose'} variant="caption">
                          {role.isActive ? 'Active' : 'Inactive'}
                        </Chip>
                      </div>
                      {inspectLoading && (
                        <span className="inline-flex items-center gap-1.5 text-caption-1-medium text-text-tertiary">
                          <Skeleton className="size-3.5 rounded-full" />
                          <span>Loading assigned users...</span>
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl border border-separator-border bg-background-secondary-default/70">
                      <p className="text-caption-2-medium text-text-tertiary uppercase font-semibold">
                        Description
                      </p>
                      <p className="text-body-2-medium text-text-primary mt-1">
                        {role.description || 'No description provided for this role.'}
                      </p>
                    </div>

                    {/* Assigned Users Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-caption-1-semibold text-text-primary">
                          Assigned Users ({inspectDetail?.userCount ?? 0})
                        </p>
                      </div>
                      {inspectLoading ? (
                        <div className="space-y-2.5 rounded-xl border border-separator-border p-3" aria-busy="true">
                          {Array.from({ length: 3 }).map((_, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 flex-1">
                                <Skeleton shape="circle" className="size-8 shrink-0" />
                                <div className="space-y-1 flex-1">
                                  <Skeleton shape="text" className="w-28 h-3.5" />
                                  <Skeleton shape="text" className="w-36 h-3" />
                                </div>
                              </div>
                              <Skeleton className="w-14 h-5 rounded-full" />
                            </div>
                          ))}
                        </div>
                      ) : (inspectDetail?.users?.length || 0) === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-separator-border text-center text-caption-1-medium text-text-tertiary">
                          No user accounts are currently assigned to this role.
                        </div>
                      ) : (
                        <div className="divide-y divide-separator-border rounded-xl border border-separator-border overflow-hidden">
                          {inspectDetail?.users.map((u) => (
                            <div
                              key={u.id}
                              className="flex items-center justify-between gap-3 p-3 bg-background-primary-default"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar
                                  initials={u.firstName?.[0]?.toUpperCase() || 'U'}
                                  size="sm"
                                  color={role.code === 'SUPER_ADMIN' ? 'lime' : 'blue'}
                                />
                                <div className="min-w-0">
                                  <p className="text-body-2-medium font-semibold text-text-primary truncate">
                                    {u.firstName} {u.lastName}
                                  </p>
                                  <p className="text-caption-1-regular text-text-secondary truncate">
                                    {u.email}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {u.humanId && (
                                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-background-secondary-default border border-separator-border text-text-tertiary">
                                    {u.humanId}
                                  </span>
                                )}
                                <Chip color={u.isActive ? 'lime' : 'rose'} variant="caption">
                                  {u.isActive ? 'Active' : 'Inactive'}
                                </Chip>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Granted Permissions Breakdown */}
                    <div className="space-y-2">
                      <p className="text-caption-1-semibold text-text-primary">
                        Granted Permissions ({role.permissions?.length || 0})
                      </p>
                      {(role.permissions?.length || 0) === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-separator-border text-center text-caption-1-medium text-text-tertiary">
                          No explicit permissions assigned to this role.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-separator-border bg-background-secondary-default/40">
                          {role.permissions.map((perm) => (
                            <span
                              key={perm}
                              className="text-[11px] font-mono bg-background-primary-default text-text-primary px-2 py-0.5 rounded-md border border-border-button-default"
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </ModalBody>
              <ModalFooter className="flex items-center justify-between gap-2">
                <div>
                  {editable && role && (
                    <Button
                      variant="secondary"
                      leadingIcon={RiEditLine}
                      onClick={() => {
                        close();
                        handleOpenEdit(role);
                      }}
                    >
                      Edit Role &amp; Permissions
                    </Button>
                  )}
                </div>
                <Button variant="primary" className="text-[#171B18]" onClick={close}>
                  Close
                </Button>
              </ModalFooter>
            </div>
          );
        }}
      </Modal>

      {/* 8. Create Custom Role Modal */}
      <Modal size="lg" isOpen={createModalOpen} onOpenChange={setCreateModalOpen}>
        {({ close }) => (
          <form onSubmit={handleCreateSubmit}>
            <ModalHeader
              title="Create Custom Role"
              description="Define a new RBAC role and assign module-level capabilities."
            />
            <ModalBody className="space-y-4 max-h-[65vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-caption-1-medium rounded-xl">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Role Code (Uppercase)"
                  placeholder="FINANCE_LEAD"
                  value={formCode}
                  onChange={(val) => setFormCode(val.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  isRequired
                />
                <Input
                  label="Display Name"
                  placeholder="Finance Lead"
                  value={formName}
                  onChange={(val) => setFormName(val)}
                  isRequired
                />
              </div>
              <Input
                label="Description"
                placeholder="Operational oversight for financial and audit modules"
                value={formDescription}
                onChange={(val) => setFormDescription(val)}
              />

              <div className="flex items-center justify-between p-3 rounded-xl border border-separator-border bg-background-secondary-default/50">
                <div>
                  <p className="text-body-2-medium font-semibold text-text-primary">Active Role</p>
                  <p className="text-caption-1-regular text-text-secondary">
                    Allow users assigned to this role to authenticate with these permissions.
                  </p>
                </div>
                <Switch
                  aria-label="Role active status"
                  isSelected={formIsActive}
                  onChange={setFormIsActive}
                />
              </div>

              <PermissionMatrix
                groups={permissionGroups}
                selectedPermissions={formPermissions}
                onChange={setFormPermissions}
                title="Assign Permissions"
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={close} type="button">
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting}
                className="text-[#171B18]"
              >
                {submitting ? 'Creating...' : 'Create Role'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* 9. Edit Role Modal */}
      <Modal size="lg" isOpen={editModalOpen} onOpenChange={setEditModalOpen}>
        {({ close }) => (
          <form onSubmit={handleEditSubmit}>
            <ModalHeader
              title={`Edit Role: ${selectedRole?.name}`}
              description="Update display metadata and granted RBAC permissions."
            />
            <ModalBody className="space-y-4 max-h-[65vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-caption-1-medium rounded-xl">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Role Code (Immutable)" value={formCode} isDisabled />
                <Input
                  label="Display Name"
                  value={formName}
                  onChange={(val) => setFormName(val)}
                  isRequired
                />
              </div>
              <Input
                label="Description"
                value={formDescription}
                onChange={(val) => setFormDescription(val)}
              />

              {!selectedRole?.isSystem && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-separator-border bg-background-secondary-default/50">
                  <div>
                    <p className="text-body-2-medium font-semibold text-text-primary">Active Role</p>
                    <p className="text-caption-1-regular text-text-secondary">
                      Inactive custom roles block users from exercising granted permissions.
                    </p>
                  </div>
                  <Switch
                    aria-label="Role active status"
                    isSelected={formIsActive}
                    onChange={setFormIsActive}
                  />
                </div>
              )}

              <PermissionMatrix
                groups={permissionGroups}
                selectedPermissions={formPermissions}
                onChange={setFormPermissions}
                title="Permissions Assignment"
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={close} type="button">
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting}
                className="text-[#171B18]"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* 10. Toggle Role Active Status Confirmation */}
      <AlertDialog
        isOpen={!!statusDialogRole}
        onOpenChange={(open) => !open && setStatusDialogRole(null)}
        title={statusDialogRole?.isActive ? 'Deactivate Custom Role?' : 'Activate Custom Role?'}
        description={`Are you sure you want to ${
          statusDialogRole?.isActive ? 'deactivate' : 'activate'
        } "${statusDialogRole?.name}" (${statusDialogRole?.code})? ${
          statusDialogRole?.isActive
            ? 'Assigned users will lose these role permissions until reactivated.'
            : 'Assigned users will regain access to these role permissions.'
        }`}
        confirmLabel={statusDialogRole?.isActive ? 'Deactivate' : 'Activate'}
        variant={statusDialogRole?.isActive ? 'danger' : 'default'}
        onConfirm={handleToggleStatus}
      />

      {/* 11. Delete Confirmation */}
      <AlertDialog
        isOpen={!!deleteRoleDialog}
        onOpenChange={(open) => !open && setDeleteRoleDialog(null)}
        title="Delete Custom Role?"
        description={`Are you sure you want to permanently delete "${deleteRoleDialog?.name}" (${deleteRoleDialog?.code})? This action is irreversible.`}
        confirmLabel="Delete Role"
        variant="danger"
        onConfirm={handleDeleteRole}
      />
    </div>
  );
}
