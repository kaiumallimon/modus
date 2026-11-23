'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  RiUserAddLine,
  RiEditLine,
  RiFilter3Line,
  RiArrowUpDownLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiDownloadLine,
  RiMoreFill,
  RiShieldUserLine,
  RiCloseLine,
  RiInformationLine,
  RiTableLine,
  RiUserLine,
  RiToggleLine,
  RiCalendarLine,
  RiRestartLine,
  RiUpload2Line,
  RiDeleteBinLine,
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
import { Select, SelectItem } from '@/components/base/select/select';
import { Pagination } from '@/components/base/pagination/pagination';
import { SearchField } from '@/components/base/search-field/search-field';
import { Tooltip, TooltipTrigger } from '@/components/base/tooltip/tooltip';
import { getRoleDisplayName, isSameUser } from '@/lib/permissions';
import { cx } from '@/utils/cx';

export default function UsersPage() {
  const { user: currentUser, hasPermission, isSuperAdmin, refreshProfile } = useAuth();

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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (file: File) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.type)) {
      toast.error('Invalid image type. Please select a JPG, PNG, WEBP, or GIF.');
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar file size cannot exceed 5MB');
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient<{ avatarUrl: string; user: User }>(API_ENDPOINTS.AUTH_AVATAR, {
        method: 'POST',
        body: formData,
      });

      if (res?.avatarUrl) {
        setSelectedUser((prev) => (prev ? { ...prev, avatarUrl: res.avatarUrl } : null));
      }
      await refreshProfile();
      await loadUsers();
      toast.success('Avatar uploaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleAvatarRemove = async () => {
    setUploadingAvatar(true);
    try {
      await apiClient(API_ENDPOINTS.AUTH_AVATAR, {
        method: 'DELETE',
      });
      setSelectedUser((prev) => (prev ? { ...prev, avatarUrl: null, avatar: null } : null));
      await refreshProfile();
      await loadUsers();
      toast.success('Avatar removed successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

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
      const isSelf = isSameUser(currentUser, selectedUser);
      const payload: any = {
        firstName: formFirstName.trim(),
        lastName: formLastName.trim(),
      };
      // Prevent current super user from changing their own role
      if (isSuperAdmin && formRole && !isSelf) {
        payload.role = formRole;
      }

      const id = selectedUser._id || selectedUser.id;
      await apiClient(API_ENDPOINTS.USER_BY_ID(id!), {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      toast.success('User details updated successfully');
      setEditModalOpen(false);
      if (isSelf) {
        refreshProfile();
      }
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

    // Filter out current user from batch role updates (super user cannot change own role)
    const usersToUpdate = selectedUserIds
      .map((id) => users.find((item) => (item._id || item.id || item.humanId) === id))
      .filter((u): u is User => !!u && !isSameUser(currentUser, u));

    if (usersToUpdate.length === 0) {
      toast.error('Current logged in super user cannot change their own role');
      setBatchRoleModalOpen(false);
      return;
    }

    try {
      await Promise.all(
        usersToUpdate.map((u) => {
          const targetId = u._id || u.id;
          return apiClient(API_ENDPOINTS.USER_BY_ID(targetId!), {
            method: 'PATCH',
            body: JSON.stringify({ role: batchTargetRole }),
          });
        })
      );
      const updatedCount = usersToUpdate.length;
      const skippedSelf = selectedUserIds.length > updatedCount;
      if (skippedSelf) {
        toast.success(
          `Role updated for ${updatedCount} user${updatedCount === 1 ? '' : 's'} (your own role was preserved)`
        );
      } else {
        toast.success(`Role updated for ${updatedCount} user${updatedCount === 1 ? '' : 's'}`);
      }
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
          const initials = u.firstName ? u.firstName[0].toUpperCase() : 'U';
          const isCurrent = currentUser?._id === u._id || currentUser?.id === u.id;
          return (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                src={u.avatarUrl || u.avatar || undefined}
                initials={initials}
                size="md"
                color={u.role === 'SUPER_ADMIN' ? 'lime' : 'blue'}
                className="shrink-0 font-semibold ring-1 ring-border-button-default"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-body-2-medium font-semibold text-text-primary truncate">
                    {u.firstName} {u.lastName}
                  </span>
                  {isCurrent && (
                    <Chip color="lime" variant="caption" className="font-semibold text-[10px] py-0 px-1.5">
                      You
                    </Chip>
                  )}
                </div>
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
          <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-caption-2-medium text-text-tertiary bg-background-secondary-default border border-separator-border">
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
            <div className="inline-flex items-center gap-1.5">
              <span className={cx(
                "size-1.5 rounded-full shrink-0",
                isActive ? "bg-accent-500 animate-pulse" : "bg-neutral-400"
              )} />
              <Chip color={isActive ? 'lime' : 'rose'} variant="caption">
                {isActive ? 'Active' : 'Inactive'}
              </Chip>
            </div>
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
          return (
            <span className="text-body-2-regular text-text-secondary flex items-center gap-1.5">
              <RiCalendarLine className="size-3.5 text-text-tertiary shrink-0" />
              <span>{formatted}</span>
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const u = row.original;
          const isSelf = isSameUser(currentUser, u);
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
      {/* 1. Page Header (Full-width border with 0 side margins) */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-5 border-b border-border-button-default bg-background-primary-default">
        <div>
          <h1 className="text-title-1-medium font-bold text-text-primary tracking-tight">Users</h1>
          <p className="text-body-medium text-text-secondary mt-0.5">
            Directory of team members, roles, credentials, and access statuses
          </p>
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
                <TooltipTrigger delay={80}>
                  <AriaButton
                    className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    aria-label="Total users info"
                  >
                    <RiInformationLine className="size-3.5" />
                  </AriaButton>
                  <Tooltip size="sm">
                    Total registered employee and administrator accounts across the organization.
                  </Tooltip>
                </TooltipTrigger>
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
                <TooltipTrigger delay={80}>
                  <AriaButton
                    className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    aria-label="Active accounts info"
                  >
                    <RiInformationLine className="size-3.5" />
                  </AriaButton>
                  <Tooltip size="sm">
                    Accounts in active status with authorized login and operational permissions.
                  </Tooltip>
                </TooltipTrigger>
              </div>
              <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight">
                {activeCount}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
                <span>vs last month</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold text-accent-800 dark:text-accent-300 bg-accent-100 dark:bg-accent-950/60">
                  + {users.length > 0 ? Math.round((activeCount / users.length) * 100) : 100}%
                </span>
              </div>
            </div>

            {/* Administrators */}
            <div className="p-5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-caption-1-medium text-text-primary font-medium">
                <span>Administrators</span>
                <TooltipTrigger delay={80}>
                  <AriaButton
                    className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    aria-label="Administrators info"
                  >
                    <RiInformationLine className="size-3.5" />
                  </AriaButton>
                  <Tooltip size="sm">
                    Members holding elevated Super Admin or Administrator governance privileges.
                  </Tooltip>
                </TooltipTrigger>
              </div>
              <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight">
                {adminCount}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
                <span>vs last month</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold text-accent-800 dark:text-accent-300 bg-accent-100 dark:bg-accent-950/60">
                  + {adminCount > 0 ? `${adminCount} active` : '0 active'}
                </span>
              </div>
            </div>

            {/* Inactive / Suspended */}
            <div className="p-5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-caption-1-medium text-text-primary font-medium">
                <span>Inactive Accounts</span>
                <TooltipTrigger delay={80}>
                  <AriaButton
                    className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    aria-label="Inactive accounts info"
                  >
                    <RiInformationLine className="size-3.5" />
                  </AriaButton>
                  <Tooltip size="sm">
                    Suspended or revoked accounts currently prohibited from authenticating.
                  </Tooltip>
                </TooltipTrigger>
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

      {/* 3. Controls & Filtering Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left Side: Searchbar, Table View indicator, Filter, Sort, Statistics Toggle */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Pilled BoardUI SearchField on the left side */}
          <SearchField
            aria-label="Search users"
            placeholder="Search users..."
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            shape="pill"
            className="w-full sm:w-72"
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
              className="z-50 w-72 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-2xl outline-none"
            >
              <AriaDialog className="outline-none flex flex-col gap-3.5">
                <div className="flex items-center justify-between border-b border-separator-border pb-2.5">
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

                {/* Filter by Role using BoardUI Select */}
                <Select
                  label="Role"
                  aria-label="Filter by role"
                  size="sm"
                  selectedKey={roleFilter || "ALL"}
                  onSelectionChange={(key) => {
                    setRoleFilter(key === "ALL" ? "" : String(key));
                    setPage(1);
                  }}
                  className="w-full"
                >
                  <SelectItem id="ALL" textValue="All Roles">All Roles</SelectItem>
                  <SelectItem id="SUPER_ADMIN" textValue="Super Administrator">Super Administrator</SelectItem>
                  <SelectItem id="ADMIN" textValue="Administrator">Administrator</SelectItem>
                  <SelectItem id="MANAGER" textValue="Manager">Manager</SelectItem>
                  <SelectItem id="EMPLOYEE" textValue="Employee">Employee</SelectItem>
                  {roles
                    .filter((r) => !r.isSystem)
                    .map((r) => (
                      <SelectItem key={r.code} id={r.code} textValue={r.name}>
                        {r.name}
                      </SelectItem>
                    ))}
                </Select>

                {/* Filter by Status using BoardUI Select */}
                <Select
                  label="Status"
                  aria-label="Filter by status"
                  size="sm"
                  selectedKey={statusFilter || "ALL"}
                  onSelectionChange={(key) => {
                    setStatusFilter(key === "ALL" ? "" : String(key));
                    setPage(1);
                  }}
                  className="w-full"
                >
                  <SelectItem id="ALL" textValue="All Statuses">All Statuses</SelectItem>
                  <SelectItem id="active" textValue="Active Only">Active Only</SelectItem>
                  <SelectItem id="inactive" textValue="Inactive Only">Inactive Only</SelectItem>
                </Select>
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
              className="z-50 w-48 rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-xl outline-none"
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
          <div className="flex items-center gap-2 ps-1">
            <span className="text-body-2-medium text-text-secondary select-none">Show Statistics</span>
            <Switch
              aria-label="Show statistics row"
              isSelected={showStatistics}
              onChange={setShowStatistics}
            />
          </div>
        </div>

        {/* Right Side: Export + Add New User button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="medium"
            onClick={() => handleExport()}
            leadingIcon={RiDownloadLine}
            className="h-10 px-5 gap-2.5 rounded-full text-body-medium font-medium shadow-2xs hover:shadow-xs transition-all"
          >
            Export
          </Button>

          {hasPermission('users.create') && (
            <Button
              variant="primary"
              size="medium"
              onClick={handleOpenCreate}
              leadingIcon={RiUserAddLine}
              className="h-10 px-5 gap-2.5 rounded-full text-body-medium font-semibold text-[#171B18] shadow-2xs hover:shadow-xs transition-all"
            >
              Add New User
            </Button>
          )}
        </div>
      </div>

      {/* 4. TanStack Table Container */}
      <div className="border border-border-button-default rounded-2xl bg-background-primary-default shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="md" className="text-accent-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="size-14 rounded-2xl bg-background-secondary-default flex items-center justify-center text-text-tertiary mb-3.5 border border-separator-border">
              <RiUserLine className="size-7" />
            </div>
            <h3 className="text-title-3-semibold text-text-primary">No users found</h3>
            <p className="text-body-2-regular text-text-secondary max-w-sm mt-1">
              {search || roleFilter || statusFilter
                ? 'Try adjusting your filters or search keywords.'
                : 'Start by creating your first team member.'}
            </p>
            {(search || roleFilter || statusFilter) && (
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  setSearch('');
                  setRoleFilter('');
                  setStatusFilter('');
                  setPage(1);
                }}
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
                          className="px-4 py-3.5 text-start align-middle text-caption-1-medium uppercase tracking-wider text-text-tertiary font-semibold select-none"
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={cx(
                                "flex items-center gap-1.5",
                                canSort && "cursor-pointer group/th hover:text-text-primary transition-colors"
                              )}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <span>
                                {flexRender(header.column.columnDef.header, header.getContext())}
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
                        "transition-colors duration-150 cursor-pointer select-none",
                        isSelected
                          ? "bg-accent-100/50 dark:bg-accent-950/25"
                          : "hover:bg-background-secondary-default/60"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-4 py-3.5 align-middle text-body-2-medium text-text-primary"
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

      {/* 5. Floating Selection Action Bar (Floating & pinned at the bottom of the screen) */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full border border-border-button-default bg-background-primary-default/95 backdrop-blur-md px-4 py-2 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-caption-1-semibold bg-accent-500 text-neutral-950 font-bold">
            {selectedCount} Selected
          </span>
          <span className="h-4 w-px bg-separator-border" />
          <Button
            variant="secondary"
            size="small"
            onClick={handleBatchToggleStatus}
            leadingIcon={RiShieldUserLine}
            className="rounded-full font-medium"
          >
            Toggle Status
          </Button>
          {isSuperAdmin && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => setBatchRoleModalOpen(true)}
              leadingIcon={RiEditLine}
              className="rounded-full font-medium"
            >
              Change Role
            </Button>
          )}
          <Button
            variant="ghost"
            size="small"
            onClick={handleExportSelected}
            leadingIcon={RiDownloadLine}
            className="rounded-full font-medium"
          >
            Export
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

      {/* 6. Pagination Footer (BoardUI Components) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 px-1">
        {/* Left: Per Page Selector & Summary */}
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
            <SelectItem id="10" textValue="10">10</SelectItem>
            <SelectItem id="20" textValue="20">20</SelectItem>
            <SelectItem id="50" textValue="50">50</SelectItem>
            <SelectItem id="100" textValue="100">100</SelectItem>
          </Select>
          <span className="text-text-tertiary">
            {total > 0
              ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total} users`
              : '0 users'}
          </span>
        </div>

        {/* Right: BoardUI Pagination Component */}
        <div className="flex items-center">
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={(p) => setPage(p)}
          />
        </div>
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
              <Select
                label="Assigned Security Role"
                aria-label="Assigned Security Role"
                selectedKey={formRole}
                onSelectionChange={(key) => setFormRole(String(key))}
                className="w-full"
              >
                <SelectItem id={Role.EMPLOYEE} textValue="Employee">Employee</SelectItem>
                <SelectItem id={Role.MANAGER} textValue="Manager">Manager</SelectItem>
                {isSuperAdmin && <SelectItem id={Role.ADMIN} textValue="Administrator">Administrator</SelectItem>}
                {roles
                  .filter((r) => !r.isSystem)
                  .map((r) => (
                    <SelectItem key={r.code} id={r.code} textValue={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
              </Select>
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

              {/* Avatar Section */}
              <div className="flex items-center gap-4 p-3.5 rounded-xl border border-border-button-default bg-background-secondary-default">
                <Avatar
                  src={selectedUser?.avatarUrl || selectedUser?.avatar || undefined}
                  initials={selectedUser?.firstName ? selectedUser.firstName[0].toUpperCase() : 'U'}
                  size="xl"
                  color="lime"
                  className="shrink-0"
                />
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div>
                    <p className="text-body-2-medium font-semibold text-text-primary">Profile Photo</p>
                    <p className="text-caption-1-regular text-text-tertiary">
                      {isSameUser(currentUser, selectedUser)
                        ? 'JPG, PNG, WEBP, or GIF up to 5MB. Hosted securely on Cloudflare CDN.'
                        : 'Avatars can only be modified by the account owner from their profile.'}
                    </p>
                  </div>
                  {isSameUser(currentUser, selectedUser) && (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="file"
                        ref={avatarInputRef}
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAvatarUpload(file);
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        leadingIcon={RiUpload2Line}
                        disabled={uploadingAvatar}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                      </Button>
                      {(selectedUser?.avatarUrl || selectedUser?.avatar) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="small"
                          leadingIcon={RiDeleteBinLine}
                          disabled={uploadingAvatar}
                          onClick={handleAvatarRemove}
                          className="text-text-error-primary hover:text-text-error-hover"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

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
                isSameUser(currentUser, selectedUser) ? (
                  <div className="space-y-1.5">
                    <label className="text-body-2-medium text-text-primary">Role Assignment</label>
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-border-button-default bg-background-secondary-default">
                      <div className="flex items-center gap-2">
                        <Chip color={getRoleChipColor(String(selectedUser?.role))} variant="caption" className="font-mono">
                          {getRoleDisplayName(String(selectedUser?.role))}
                        </Chip>
                        <span className="text-caption-1-regular text-text-tertiary">
                          (Current Account)
                        </span>
                      </div>
                    </div>
                    <p className="text-caption-1-regular text-text-tertiary">
                      Current logged in super user cannot change their own role.
                    </p>
                  </div>
                ) : (
                  <Select
                    label="Role Assignment"
                    aria-label="Role Assignment"
                    selectedKey={formRole}
                    onSelectionChange={(key) => setFormRole(String(key))}
                    className="w-full"
                  >
                    <SelectItem id={Role.SUPER_ADMIN} textValue="Super Administrator">Super Administrator</SelectItem>
                    <SelectItem id={Role.ADMIN} textValue="Administrator">Administrator</SelectItem>
                    <SelectItem id={Role.MANAGER} textValue="Manager">Manager</SelectItem>
                    <SelectItem id={Role.EMPLOYEE} textValue="Employee">Employee</SelectItem>
                    {roles
                      .filter((r) => !r.isSystem)
                      .map((r) => (
                        <SelectItem key={r.code} id={r.code} textValue={r.name}>
                          {r.name}
                        </SelectItem>
                      ))}
                  </Select>
                )
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
        {({ close }) => {
          const hasSelfInSelection = selectedUserIds.some((id) => {
            const u = users.find((item) => (item._id || item.id || item.humanId) === id);
            return isSameUser(currentUser, u);
          });
          const nonSelfSelectedCount = selectedUserIds.filter((id) => {
            const u = users.find((item) => (item._id || item.id || item.humanId) === id);
            return !isSameUser(currentUser, u);
          }).length;

          return (
            <form onSubmit={handleBatchRoleSubmit}>
              <ModalHeader
                title={`Change Role for ${selectedCount} User${selectedCount === 1 ? '' : 's'}`}
                description="Batch update the security role and access permissions for selected users."
              />
              <ModalBody className="space-y-4">
                {hasSelfInSelection && (
                  <div className="p-3 rounded-xl border border-separator-border bg-background-secondary-default text-caption-1-regular text-text-tertiary">
                    Your own account is included in this selection and will be excluded from role changes. Current logged in super user cannot change their own role.
                  </div>
                )}
                {nonSelfSelectedCount === 0 ? (
                  <p className="text-body-2-regular text-text-error-primary">
                    Only your own account is selected. Current logged in super user cannot change their own role.
                  </p>
                ) : (
                  <Select
                    label="Target Role"
                    aria-label="Target Role"
                    selectedKey={batchTargetRole}
                    onSelectionChange={(key) => setBatchTargetRole(String(key))}
                    className="w-full"
                  >
                    <SelectItem id={Role.EMPLOYEE} textValue="Employee">Employee</SelectItem>
                    <SelectItem id={Role.MANAGER} textValue="Manager">Manager</SelectItem>
                    <SelectItem id={Role.ADMIN} textValue="Administrator">Administrator</SelectItem>
                    {roles
                      .filter((r) => !r.isSystem)
                      .map((r) => (
                        <SelectItem key={r.code} id={r.code} textValue={r.name}>
                          {r.name}
                        </SelectItem>
                      ))}
                  </Select>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="secondary" onClick={close} type="button">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={nonSelfSelectedCount === 0}
                >
                  Apply Role Change
                </Button>
              </ModalFooter>
            </form>
          );
        }}
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
