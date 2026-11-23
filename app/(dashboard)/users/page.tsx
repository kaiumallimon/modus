'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  RiUserAddLine,
  RiSearchLine,
  RiEditLine,
  RiFilter3Line,
  RiArrowUpDownLine,
  RiDownloadLine,
  RiMoreFill,
  RiShieldUserLine,
  RiCloseLine,
  RiInformationLine,
  RiArrowLeftDoubleLine,
  RiArrowRightDoubleLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiTableLine,
  RiUserLine,
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
import { User, PaginatedResult, Role, QueryUsersParams, RoleDocument } from '@/lib/api/types';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Chip, ChipColor } from '@/components/base/badges/chip';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Switch } from '@/components/base/switch/switch';
import { Avatar } from '@/components/base/avatar/avatar';
import { Modal, ModalHeader, ModalBody, ModalFooter, AlertDialog } from '@/components/base/modal/modal';
import { Spinner } from '@/components/base/spinner/spinner';
import { toast } from '@/components/base/toast/toast';
import { getRoleDisplayName } from '@/lib/permissions';
import { cx } from '@/utils/cx';

export default function UsersPage() {
  const { user: currentUser, hasPermission, isSuperAdmin } = useAuth();

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(''); // '' | 'active' | 'inactive'
  const [loading, setLoading] = useState(true);

  // TanStack table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // UI display preferences
  const [showStatistics, setShowStatistics] = useState(true);
  const [jumpPage, setJumpPage] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [statusDialogUser, setStatusDialogUser] = useState<User | null>(null);
  const [batchRoleModalOpen, setBatchRoleModalOpen] = useState(false);
  const [batchTargetRole, setBatchTargetRole] = useState<string>('EMPLOYEE');

  // Form states
  const [formEmail, setFormEmail] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formRole, setFormRole] = useState<string>('EMPLOYEE');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Load available roles for filters and creation
  useEffect(() => {
    async function loadRoles() {
      try {
        const res = await apiClient<RoleDocument[]>(API_ENDPOINTS.ROLES);
        if (res) setRoles(res);
      } catch {
        // Non-critical
      }
    }
    loadRoles();
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: QueryUsersParams = {
        page,
        limit,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
      };
      const res = await apiClient<PaginatedResult<User>>(API_ENDPOINTS.USERS, { params });
      setUsers(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const totalPages = Math.ceil(total / limit) || 1;

  // Stats calculation
  const activeCount = useMemo(() => users.filter((u) => u.isActive).length, [users]);
  const adminCount = useMemo(
    () => users.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN').length,
    [users]
  );
  const inactiveCount = useMemo(() => users.filter((u) => !u.isActive).length, [users]);

  // Handle User creation
  const handleOpenCreate = () => {
    setFormEmail('');
    setFormFirstName('');
    setFormLastName('');
    setFormRole('EMPLOYEE');
    setFormError('');
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formFirstName.trim() || !formLastName.trim()) {
      setFormError('All fields are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      await apiClient(API_ENDPOINTS.USERS, {
        method: 'POST',
        body: JSON.stringify({
          email: formEmail.trim().toLowerCase(),
          firstName: formFirstName.trim(),
          lastName: formLastName.trim(),
          role: formRole,
        }),
      });
      toast.success('User created and credentials dispatched via email');
      setCreateModalOpen(false);
      loadUsers();
    } catch (err: any) {
      const msg = err.message || 'Failed to create user';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle User editing
  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setFormFirstName(user.firstName);
    setFormLastName(user.lastName);
    setFormRole(String(user.role));
    setFormError('');
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    setFormError('');

    try {
      const payload: any = {
        firstName: formFirstName.trim(),
        lastName: formLastName.trim(),
      };
      if (isSuperAdmin && formRole) {
        payload.role = formRole;
      }

      const id = selectedUser._id || selectedUser.id;
      await apiClient(API_ENDPOINTS.USER_BY_ID(id!), {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      toast.success('User details updated successfully');
      setEditModalOpen(false);
      loadUsers();
    } catch (err: any) {
      const msg = err.message || 'Failed to update user';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle single user status toggle
  const handleToggleStatus = async () => {
    if (!statusDialogUser) return;
    const id = statusDialogUser._id || statusDialogUser.id;
    try {
      await apiClient(API_ENDPOINTS.USER_STATUS(id!), {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: !statusDialogUser.isActive,
        }),
      });
      toast.success(
        `User ${statusDialogUser.isActive ? 'deactivated' : 'activated'} successfully`
      );
      setStatusDialogUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user status');
    }
  };

  // Batch actions
  const selectedUserIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);
  const selectedCount = selectedUserIds.length;

  const handleBatchToggleStatus = async () => {
    if (selectedCount === 0) return;
    try {
      await Promise.all(
        selectedUserIds.map((id) => {
          const u = users.find((item) => (item._id || item.id || item.humanId) === id);
          if (!u) return Promise.resolve();
          const targetId = u._id || u.id;
          return apiClient(API_ENDPOINTS.USER_STATUS(targetId!), {
            method: 'PATCH',
            body: JSON.stringify({ isActive: !u.isActive }),
          });
        })
      );
      toast.success(`Updated status for ${selectedCount} selected user${selectedCount === 1 ? '' : 's'}`);
      setRowSelection({});
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update some user statuses');
    }
  };

  const handleBatchRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCount === 0 || !isSuperAdmin) return;

    try {
      await Promise.all(
        selectedUserIds.map((id) => {
          const u = users.find((item) => (item._id || item.id || item.humanId) === id);
          if (!u) return Promise.resolve();
          const targetId = u._id || u.id;
          return apiClient(API_ENDPOINTS.USER_BY_ID(targetId!), {
            method: 'PATCH',
            body: JSON.stringify({ role: batchTargetRole }),
          });
        })
      );
      toast.success(`Role updated for ${selectedCount} user${selectedCount === 1 ? '' : 's'}`);
      setBatchRoleModalOpen(false);
      setRowSelection({});
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update roles');
    }
  };

  // CSV Export
  const handleExport = (exportList?: User[]) => {
    const dataToExport = exportList && exportList.length > 0 ? exportList : users;
    if (dataToExport.length === 0) {
      toast.error('No users available to export');
      return;
    }

    const headers = ['User ID', 'First Name', 'Last Name', 'Email', 'Role', 'Status', 'Created At'];
    const rows = dataToExport.map((u) => [
      u.humanId,
      u.firstName,
      u.lastName,
      u.email,
      u.role,
      u.isActive ? 'Active' : 'Inactive',
      u.createdAt ? new Date(u.createdAt).toISOString() : '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `modus-users-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${dataToExport.length} users to CSV`);
  };

  const handleExportSelected = () => {
    const selected = users.filter((u) => selectedUserIds.includes(u._id || u.id || u.humanId));
    handleExport(selected);
  };

  // Jump page handler
  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPage, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setPage(p);
      setJumpPage('');
    } else {
      toast.error(`Please enter a page between 1 and ${totalPages}`);
    }
  };

  const getRoleChipColor = (roleStr: string): ChipColor => {
    switch (roleStr) {
      case 'SUPER_ADMIN':
        return 'lime';
      case 'ADMIN':
        return 'blue';
      case 'MANAGER':
        return 'yellow';
      case 'EMPLOYEE':
        return 'soft';
      default:
        return 'cyan';
    }
  };

  // TanStack columns definition
  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              size="sm"
              aria-label="Select all users on this page"
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
              aria-label={`Select ${row.original.firstName} ${row.original.lastName}`}
              isSelected={row.getIsSelected()}
              onChange={() => row.toggleSelected()}
            />
          </div>
        ),
        enableSorting: false,
        size: 44,
      },
      {
        id: 'user',
        header: 'User',
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        cell: ({ row }) => {
          const u = row.original;
          const initials = u.firstName ? `${u.firstName[0]}${u.lastName?.[0] || ''}`.toUpperCase() : 'U';
          return (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                initials={initials}
                size="md"
                color={u.role === 'SUPER_ADMIN' ? 'lime' : 'blue'}
                className="shrink-0 font-semibold"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-body-medium font-semibold text-text-primary truncate">
                  {u.firstName} {u.lastName}
                </span>
                <span className="text-caption-1-regular text-text-secondary truncate">
                  {u.email}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'humanId',
        header: 'User ID',
        accessorKey: 'humanId',
        cell: ({ row }) => (
          <span className="font-mono text-caption-1-medium text-text-tertiary">
            {row.original.humanId || '—'}
          </span>
        ),
      },
      {
        id: 'role',
        header: 'Role',
        accessorKey: 'role',
        cell: ({ row }) => {
          const roleStr = String(row.original.role);
          return (
            <Chip color={getRoleChipColor(roleStr)} variant="caption" className="font-mono">
              {getRoleDisplayName(roleStr)}
            </Chip>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'isActive',
        cell: ({ row }) => {
          const isActive = row.original.isActive;
          return (
            <Chip color={isActive ? 'lime' : 'rose'} variant="caption">
              {isActive ? 'Active' : 'Inactive'}
            </Chip>
          );
        },
      },
      {
        id: 'createdAt',
        header: 'Joined Date',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          const dateStr = row.original.createdAt;
          if (!dateStr) return <span className="text-text-tertiary">—</span>;
          const formatted = new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          return <span className="text-body-2-regular text-text-secondary">{formatted}</span>;
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const u = row.original;
          const isSelf = currentUser?._id === u._id || currentUser?.id === u.id;
          return (
            <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
              <AriaDialogTrigger>
                <AriaButton
                  className="size-8 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-500 cursor-pointer"
                  aria-label="User actions"
                >
                  <RiMoreFill className="size-4.5" />
                </AriaButton>
                <AriaPopover
                  placement="bottom end"
                  offset={6}
                  className="z-50 w-44 rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-xl outline-none"
                >
                  <AriaDialog className="outline-none flex flex-col gap-0.5">
                    {({ close }) => (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            close();
                            handleOpenEdit(u);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors text-start cursor-pointer"
                        >
                          <RiEditLine className="size-4 text-text-tertiary" />
                          <span>Edit Details</span>
                        </button>

                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => {
                              close();
                              setStatusDialogUser(u);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors text-start cursor-pointer"
                          >
                            <RiToggleLine className="size-4 text-text-tertiary" />
                            <span>{u.isActive ? 'Deactivate' : 'Activate'}</span>
                          </button>
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
        size: 50,
      },
    ],
    [currentUser]
  );

  // TanStack table instance
  const table = useReactTable({
    data: users,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row._id || row.id || row.humanId,
  });

  return (
    <div className="space-y-6">
      {/* 1. Page Header (No pinned header, clean page-based title) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-title-1-medium font-bold text-text-primary tracking-tight">Users</h1>
          <p className="text-body-medium text-text-secondary mt-0.5">
            Directory of team members, roles, credentials, and access statuses
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {hasPermission('users.create') && (
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              leadingIcon={RiUserAddLine}
              className="font-semibold"
            >
              Add New User
            </Button>
          )}
        </div>
      </div>

      {/* 2. Stats Section (Single unified segmented card container) */}
      {showStatistics && (
        <div className="rounded-2xl border border-border-button-default bg-background-primary-default shadow-2xs overflow-hidden animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-separator-border">
            {/* Total Users */}
            <div className="p-5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-caption-1-medium text-text-primary font-medium">
                <span>Total Users</span>
                <RiInformationLine className="size-3.5 text-text-tertiary" />
              </div>
              <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight">
                {total}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
                <span>vs last month</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold text-accent-800 dark:text-accent-300 bg-accent-100 dark:bg-accent-950/60">
                  + {users.length > 0 ? users.length : 1} users
                </span>
              </div>
            </div>

            {/* Active Accounts */}
            <div className="p-5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-caption-1-medium text-text-primary font-medium">
                <span>Active Accounts</span>
                <RiInformationLine className="size-3.5 text-text-tertiary" />
              </div>
              <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight">
                {activeCount}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
                <span>vs last month</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold text-accent-800 dark:text-accent-300 bg-accent-100 dark:bg-accent-950/60">
                  ↑ {users.length > 0 ? Math.round((activeCount / users.length) * 100) : 100}%
                </span>
              </div>
            </div>

            {/* Administrators */}
            <div className="p-5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-caption-1-medium text-text-primary font-medium">
                <span>Administrators</span>
                <RiInformationLine className="size-3.5 text-text-tertiary" />
              </div>
              <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight">
                {adminCount}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
                <span>vs last month</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold text-accent-800 dark:text-accent-300 bg-accent-100 dark:bg-accent-950/60">
                  ↑ {adminCount > 0 ? `${adminCount} active` : '0 active'}
                </span>
              </div>
            </div>

            {/* Inactive / Suspended */}
            <div className="p-5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-caption-1-medium text-text-primary font-medium">
                <span>Inactive Accounts</span>
                <RiInformationLine className="size-3.5 text-text-tertiary" />
              </div>
              <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight">
                {inactiveCount}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
                <span>vs last month</span>
                <span className={cx(
                  "inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold",
                  inactiveCount > 0
                    ? "text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60"
                    : "text-text-tertiary bg-background-secondary-default"
                )}>
                  {inactiveCount > 0 ? `+${inactiveCount} flagged` : '0 suspended'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Controls & Filtering Bar (Table View, Filter, Sort, Show Statistics toggle, Search, Export) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left Side Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* View Switch */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-button-default bg-background-primary-default text-body-2-medium text-text-primary shadow-2xs">
            <RiTableLine className="size-4 text-text-tertiary" />
            <span>Table View</span>
          </div>

          {/* Filter Popover */}
          <AriaDialogTrigger>
            <AriaButton
              className={cx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-button-default bg-background-primary-default text-body-2-medium hover:bg-background-secondary-default transition-colors shadow-2xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-500",
                (roleFilter || statusFilter) ? "border-accent-500 text-accent-700 dark:text-accent-300 font-semibold" : "text-text-secondary"
              )}
            >
              <RiFilter3Line className="size-4" />
              <span>Filter</span>
              {(roleFilter || statusFilter) && (
                <span className="size-2 rounded-full bg-accent-500 ms-0.5" />
              )}
            </AriaButton>
            <AriaPopover
              placement="bottom start"
              offset={8}
              className="z-50 w-64 rounded-2xl border border-border-button-default bg-background-primary-default p-3.5 shadow-2xl outline-none"
            >
              <AriaDialog className="outline-none flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-separator-border pb-2">
                  <span className="text-body-2-medium font-semibold text-text-primary">Filter Users</span>
                  {(roleFilter || statusFilter) && (
                    <button
                      type="button"
                      onClick={() => {
                        setRoleFilter('');
                        setStatusFilter('');
                        setPage(1);
                      }}
                      className="text-caption-1-medium text-accent-700 dark:text-accent-300 hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Filter by Role */}
                <div className="space-y-1.5">
                  <label className="text-caption-1-medium text-text-secondary">Role</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-8.5 px-2.5 rounded-lg border border-border-button-default bg-background-primary-default text-body-2-medium text-text-primary outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
                  >
                    <option value="">All Roles</option>
                    <option value="SUPER_ADMIN">Super Administrator</option>
                    <option value="ADMIN">Administrator</option>
                    <option value="MANAGER">Manager</option>
                    <option value="EMPLOYEE">Employee</option>
                    {roles
                      .filter((r) => !r.isSystem)
                      .map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Filter by Status */}
                <div className="space-y-1.5">
                  <label className="text-caption-1-medium text-text-secondary">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-8.5 px-2.5 rounded-lg border border-border-button-default bg-background-primary-default text-body-2-medium text-text-primary outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>
              </AriaDialog>
            </AriaPopover>
          </AriaDialogTrigger>

          {/* Sort Button */}
          <AriaDialogTrigger>
            <AriaButton
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-button-default bg-background-primary-default text-body-2-medium text-text-secondary hover:bg-background-secondary-default transition-colors shadow-2xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              <RiArrowUpDownLine className="size-4 text-text-tertiary" />
              <span>Sort</span>
            </AriaButton>
            <AriaPopover
              placement="bottom start"
              offset={8}
              className="z-50 w-44 rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-xl outline-none"
            >
              <AriaDialog className="outline-none flex flex-col gap-0.5">
                {({ close }) => (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSorting([{ id: 'user', desc: false }]);
                        close();
                      }}
                      className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                    >
                      Sort by Name
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSorting([{ id: 'role', desc: false }]);
                        close();
                      }}
                      className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                    >
                      Sort by Role
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSorting([{ id: 'status', desc: true }]);
                        close();
                      }}
                      className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                    >
                      Sort by Status
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSorting([{ id: 'createdAt', desc: true }]);
                        close();
                      }}
                      className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                    >
                      Sort by Newest
                    </button>
                  </>
                )}
              </AriaDialog>
            </AriaPopover>
          </AriaDialogTrigger>

          {/* Show Statistics Switch */}
          <div className="flex items-center gap-2 ps-2">
            <span className="text-body-2-medium text-text-secondary select-none">Show Statistics</span>
            <Switch
              aria-label="Show statistics row"
              isSelected={showStatistics}
              onChange={setShowStatistics}
            />
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Pilled Search Input */}
          <div className="relative min-w-[220px] sm:min-w-[260px]">
            <RiSearchLine className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-8.5 ps-9 pe-3 rounded-full border border-border-button-default bg-background-primary-default text-body-2-medium text-text-primary placeholder:text-text-placeholder outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 shadow-2xs transition-all"
            />
          </div>

          {/* Export Button */}
          <Button
            variant="secondary"
            size="small"
            onClick={() => handleExport()}
            leadingIcon={RiDownloadLine}
            className="rounded-xl font-medium"
          >
            Export
          </Button>
        </div>
      </div>

      {/* 4. TanStack Table Container */}
      <div className="relative border border-border-button-default rounded-2xl bg-background-primary-default shadow-2xs overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="md" className="text-accent-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="size-12 rounded-full bg-background-secondary-default flex items-center justify-center text-text-tertiary mb-3">
              <RiUserLine className="size-6" />
            </div>
            <h3 className="text-title-3-semibold text-text-primary">No users found</h3>
            <p className="text-body-2-regular text-text-secondary max-w-sm mt-1">
              {search || roleFilter || statusFilter
                ? 'Try adjusting your filters or search keywords.'
                : 'Start by creating your first team member.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-start text-body-medium">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-separator-border bg-background-secondary-default/70"
                  >
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        style={{ width: header.column.getSize() }}
                        className="px-3.5 py-3 text-start align-middle text-caption-1-semibold uppercase tracking-wider text-text-tertiary font-semibold select-none"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-separator-border/60">
                {table.getRowModel().rows.map((row) => {
                  const isSelected = row.getIsSelected();
                  return (
                    <tr
                      key={row.id}
                      onClick={() => row.toggleSelected()}
                      className={cx(
                        "transition-colors duration-150 cursor-pointer select-none",
                        isSelected
                          ? "bg-accent-50/70 dark:bg-accent-950/30"
                          : "hover:bg-background-secondary-default/50"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-3.5 py-3 align-middle text-body-2-medium text-text-primary"
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

        {/* 5. Floating Selection Action Bar (Matches Reference Image) */}
        {selectedCount > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-border-button-default bg-background-primary-default/95 backdrop-blur-md px-3.5 py-1.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <span className="text-body-2-medium font-semibold text-text-primary px-1">
              {selectedCount} Selected
            </span>
            <span className="h-4 w-px bg-separator-border" />
            <Button
              variant="secondary"
              size="xs"
              onClick={handleBatchToggleStatus}
              leadingIcon={RiShieldUserLine}
              className="rounded-full"
            >
              Toggle Status
            </Button>
            {isSuperAdmin && (
              <Button
                variant="secondary"
                size="xs"
                onClick={() => setBatchRoleModalOpen(true)}
                leadingIcon={RiEditLine}
                className="rounded-full"
              >
                Change Role
              </Button>
            )}
            <Button
              variant="ghost"
              size="xs"
              onClick={handleExportSelected}
              leadingIcon={RiDownloadLine}
              className="rounded-full"
            >
              Export
            </Button>
            <span className="h-4 w-px bg-separator-border" />
            <button
              type="button"
              onClick={() => setRowSelection({})}
              className="size-6 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
              title="Clear selection"
            >
              <RiCloseLine className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* 6. Pagination Footer (Matching Reference Layout) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-1">
        {/* Left: Per Page Selector */}
        <div className="flex items-center gap-2 text-body-2-medium text-text-secondary">
          <span>Showing per page</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="h-8 px-2 rounded-lg border border-border-button-default bg-background-primary-default text-body-2-medium text-text-primary outline-none focus:border-accent-500 shadow-2xs cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Center: Pagination Controls */}
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="size-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            title="First page"
          >
            <RiArrowLeftDoubleLine className="size-4" />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="size-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Previous page"
          >
            <RiArrowLeftSLine className="size-4" />
          </button>

          {/* Page Number Chips */}
          <div className="flex items-center gap-1 mx-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
              let pageNum = page;
              if (totalPages <= 5) {
                pageNum = idx + 1;
              } else if (page <= 3) {
                pageNum = idx + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + idx;
              } else {
                pageNum = page - 2 + idx;
              }

              const isActivePage = page === pageNum;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  className={cx(
                    "size-8 rounded-lg text-body-2-medium transition-colors font-medium flex items-center justify-center cursor-pointer",
                    isActivePage
                      ? "bg-accent-600 text-white shadow-2xs font-bold"
                      : "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="size-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Next page"
          >
            <RiArrowRightSLine className="size-4" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages || totalPages === 0}
            className="size-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Last page"
          >
            <RiArrowRightDoubleLine className="size-4" />
          </button>
        </div>

        {/* Right: Go to page */}
        <form onSubmit={handleJumpPage} className="flex items-center gap-2 text-body-2-medium text-text-secondary">
          <span>Go to page</span>
          <input
            type="text"
            placeholder={String(page)}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            className="w-12 h-8 px-2 text-center rounded-lg border border-border-button-default bg-background-primary-default text-body-2-medium text-text-primary outline-none focus:border-accent-500 shadow-2xs"
          />
          <Button type="submit" variant="secondary" size="xs" className="h-8 rounded-lg">
            Go &gt;
          </Button>
        </form>
      </div>

      {/* Modals & Dialogs */}

      {/* Create User Modal */}
      <Modal isOpen={createModalOpen} onOpenChange={setCreateModalOpen}>
        {({ close }) => (
          <form onSubmit={handleCreateSubmit}>
            <ModalHeader
              title="Add New User"
              description="Create a team member account with credentials dispatched via secure email."
            />
            <ModalBody className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-caption-1-medium rounded-xl">
                  {formError}
                </div>
              )}
              <Input
                label="Email Address"
                type="email"
                placeholder="colleague@modus.local"
                value={formEmail}
                onChange={(val) => setFormEmail(val)}
                isRequired
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  placeholder="Jane"
                  value={formFirstName}
                  onChange={(val) => setFormFirstName(val)}
                  isRequired
                />
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  value={formLastName}
                  onChange={(val) => setFormLastName(val)}
                  isRequired
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-body-2-medium text-text-secondary">Assigned Security Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border-button-default bg-background-primary-default text-body-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  <option value={Role.EMPLOYEE}>Employee</option>
                  <option value={Role.MANAGER}>Manager</option>
                  {isSuperAdmin && <option value={Role.ADMIN}>Administrator</option>}
                  {roles
                    .filter((r) => !r.isSystem)
                    .map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={close} type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create User'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={editModalOpen} onOpenChange={setEditModalOpen}>
        {({ close }) => (
          <form onSubmit={handleEditSubmit}>
            <ModalHeader
              title={`Edit User: ${selectedUser?.firstName} ${selectedUser?.lastName}`}
              description="Update personal information or modify role permissions."
            />
            <ModalBody className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-caption-1-medium rounded-xl">
                  {formError}
                </div>
              )}
              <Input
                label="Registered Email (Immutable)"
                value={selectedUser?.email || ''}
                isDisabled
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  value={formFirstName}
                  onChange={(val) => setFormFirstName(val)}
                  isRequired
                />
                <Input
                  label="Last Name"
                  value={formLastName}
                  onChange={(val) => setFormLastName(val)}
                  isRequired
                />
              </div>

              {isSuperAdmin && (
                <div className="space-y-1.5">
                  <label className="text-body-2-medium text-text-secondary">Role Assignment</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border-button-default bg-background-primary-default text-body-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
                  >
                    <option value={Role.SUPER_ADMIN}>Super Administrator</option>
                    <option value={Role.ADMIN}>Administrator</option>
                    <option value={Role.MANAGER}>Manager</option>
                    <option value={Role.EMPLOYEE}>Employee</option>
                    {roles
                      .filter((r) => !r.isSystem)
                      .map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={close} type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* Batch Role Change Modal */}
      <Modal isOpen={batchRoleModalOpen} onOpenChange={setBatchRoleModalOpen}>
        {({ close }) => (
          <form onSubmit={handleBatchRoleSubmit}>
            <ModalHeader
              title={`Change Role for ${selectedCount} User${selectedCount === 1 ? '' : 's'}`}
              description="Batch update the security role and access permissions for selected users."
            />
            <ModalBody className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-body-2-medium text-text-secondary">Target Role</label>
                <select
                  value={batchTargetRole}
                  onChange={(e) => setBatchTargetRole(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border-button-default bg-background-primary-default text-body-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  <option value={Role.EMPLOYEE}>Employee</option>
                  <option value={Role.MANAGER}>Manager</option>
                  <option value={Role.ADMIN}>Administrator</option>
                  {roles
                    .filter((r) => !r.isSystem)
                    .map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={close} type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Apply Role Change
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* Toggle Status Confirmation Dialog */}
      <AlertDialog
        isOpen={!!statusDialogUser}
        onOpenChange={(open) => !open && setStatusDialogUser(null)}
        title={statusDialogUser?.isActive ? 'Deactivate User?' : 'Activate User?'}
        description={`Are you sure you want to ${
          statusDialogUser?.isActive ? 'deactivate' : 'activate'
        } ${statusDialogUser?.firstName} ${statusDialogUser?.lastName}? ${
          statusDialogUser?.isActive
            ? 'This will immediately revoke their access to the system.'
            : 'They will regain access to their assigned modules.'
        }`}
        confirmLabel={statusDialogUser?.isActive ? 'Deactivate' : 'Activate'}
        variant={statusDialogUser?.isActive ? 'danger' : 'default'}
        onConfirm={handleToggleStatus}
      />
    </div>
  );
}
