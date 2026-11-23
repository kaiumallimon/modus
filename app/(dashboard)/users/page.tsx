'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  RiUserAddLine,
  RiSearchLine,
  RiEditLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { User, PaginatedResult, Role, QueryUsersParams } from '@/lib/api/types';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Chip } from '@/components/base/badges/chip';
import { Pagination } from '@/components/base/pagination/pagination';
import { Modal, ModalHeader, ModalBody, ModalFooter, AlertDialog } from '@/components/base/modal/modal';
import { Spinner } from '@/components/base/spinner/spinner';
import { toast } from '@/components/base/toast/toast';

export default function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [statusDialogUser, setStatusDialogUser] = useState<User | null>(null);

  // Form states
  const [formEmail, setFormEmail] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formRole, setFormRole] = useState<Role>(Role.EMPLOYEE);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: QueryUsersParams = {
        page,
        limit,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
      };
      const res = await apiClient<PaginatedResult<User>>(API_ENDPOINTS.USERS, { params });
      setUsers(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const totalPages = Math.ceil(total / limit) || 1;

  const handleOpenCreate = () => {
    setFormEmail('');
    setFormFirstName('');
    setFormLastName('');
    setFormRole(Role.EMPLOYEE);
    setFormError('');
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setFormFirstName(user.firstName);
    setFormLastName(user.lastName);
    setFormRole(user.role as Role);
    setFormError('');
    setEditModalOpen(true);
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
      // Only Super Admin can modify roles
      if (currentUser?.role === Role.SUPER_ADMIN && formRole) {
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

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-title-2-medium text-text-primary">Users Management</h1>
          <p className="text-body-medium text-text-secondary">
            Manage organization members, credentials, and role assignments ({total} registered)
          </p>
        </div>
        {hasPermission('users.create') && (
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            leadingIcon={RiUserAddLine}
          >
            Create User
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-background-primary-default border border-border-button-default rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by name, email, or human ID..."
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            leadingIcon={RiSearchLine}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded-lg border border-border-button-default bg-background-primary-default text-body-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus-ring"
            aria-label="Filter by role"
          >
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">Super Administrator</option>
            <option value="ADMIN">Administrator</option>
            <option value="MANAGER">Manager</option>
            <option value="EMPLOYEE">Employee</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-background-primary-default border border-border-button-default rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="md" className="text-accent-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-body-medium text-text-primary font-semibold">No users found</p>
            <p className="text-caption-1-medium text-text-secondary">
              Try adjusting your search criteria or create a new user.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-body-medium">
              <thead>
                <tr className="border-b border-border-button-default bg-background-secondary-default text-text-secondary text-caption-1-semibold">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-button-default">
                {users.map((u) => {
                  const uid = u._id || u.id;
                  const isSelf = uid === currentUser?.id;
                  return (
                    <tr key={uid} className="hover:bg-background-secondary-default/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-text-primary">
                            {u.firstName} {u.lastName}
                          </span>
                          <span className="text-caption-2-medium text-text-secondary">{u.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-caption-1-medium text-text-secondary">
                        {u.humanId}
                      </td>
                      <td className="py-3.5 px-4">
                        <Chip
                          color={u.role === 'SUPER_ADMIN' ? 'lime' : u.role === 'ADMIN' ? 'blue' : 'neutral'}
                          variant="caption"
                          className="capitalize"
                        >
                          {String(u.role).replace('_', ' ')}
                        </Chip>
                      </td>
                      <td className="py-3.5 px-4">
                        <Chip color={u.isActive ? 'lime' : 'rose'} variant="caption">
                          {u.isActive ? 'Active' : 'Disabled'}
                        </Chip>
                      </td>
                      <td className="py-3.5 px-4 text-caption-1-medium text-text-secondary">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        {hasPermission('users.update') && (
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => handleOpenEdit(u)}
                            leadingIcon={RiEditLine}
                          >
                            Edit
                          </Button>
                        )}
                        {!isSelf && hasPermission('users.update') && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setStatusDialogUser(u)}
                            className={u.isActive ? 'text-red-600 hover:text-red-700' : 'text-accent-700'}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border-button-default flex items-center justify-between">
            <span className="text-caption-1-medium text-text-secondary">
              Showing page {page} of {totalPages} ({total} total)
            </span>
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Modal isOpen={createModalOpen} onOpenChange={setCreateModalOpen}>
        {({ close }) => (
          <form onSubmit={handleCreateSubmit}>
            <ModalHeader
              title="Create New User"
              description="User will be sent a strong temporary password and activation details via email."
            />
            <ModalBody className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-caption-1-medium rounded-xl">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  placeholder="Jane"
                  value={formFirstName}
                  onChange={(val) => setFormFirstName(val)}
                  isRequired
                  autoFocus
                />
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  value={formLastName}
                  onChange={(val) => setFormLastName(val)}
                  isRequired
                />
              </div>
              <Input
                label="Email Address"
                placeholder="jane.doe@company.com"
                type="email"
                value={formEmail}
                onChange={(val) => setFormEmail(val)}
                isRequired
              />
              <div className="space-y-1.5">
                <label className="text-caption-1-medium text-text-secondary font-medium">Assigned System Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as Role)}
                  className="w-full h-10 px-3 rounded-lg border border-border-button-default bg-background-primary-default text-body-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus-ring"
                >
                  <option value={Role.EMPLOYEE}>Employee (Standard staff with basic read access)</option>
                  <option value={Role.MANAGER}>Manager (Operational access to users and logs)</option>
                  <option value={Role.ADMIN}>Administrator (Management and operational admin)</option>
                  {currentUser?.role === Role.SUPER_ADMIN && (
                    <option value={Role.SUPER_ADMIN}>Super Administrator (Full platform authority)</option>
                  )}
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
              title={`Edit User: ${selectedUser?.email}`}
              description="Update user profile details and role mapping."
            />
            <ModalBody className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-caption-1-medium rounded-xl">
                  {formError}
                </div>
              )}
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

              {currentUser?.role === Role.SUPER_ADMIN && (
                <div className="space-y-1.5">
                  <label className="text-caption-1-medium text-text-secondary font-medium">System Role (Super Admin only)</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as Role)}
                    className="w-full h-10 px-3 rounded-lg border border-border-button-default bg-background-primary-default text-body-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus-ring"
                  >
                    <option value={Role.EMPLOYEE}>Employee</option>
                    <option value={Role.MANAGER}>Manager</option>
                    <option value={Role.ADMIN}>Administrator</option>
                    <option value={Role.SUPER_ADMIN}>Super Administrator</option>
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

      {/* Deactivate / Activate Confirmation Dialog */}
      <AlertDialog
        isOpen={!!statusDialogUser}
        onOpenChange={(open) => !open && setStatusDialogUser(null)}
        title={statusDialogUser?.isActive ? 'Deactivate User Account?' : 'Activate User Account?'}
        description={
          statusDialogUser?.isActive
            ? `Are you sure you want to disable ${statusDialogUser.email}? They will no longer be able to log in or refresh sessions.`
            : `Are you sure you want to activate ${statusDialogUser?.email}? They will be permitted to authenticate.`
        }
        confirmLabel={statusDialogUser?.isActive ? 'Deactivate' : 'Activate'}
        variant={statusDialogUser?.isActive ? 'danger' : 'default'}
        onConfirm={handleToggleStatus}
      />
    </div>
  );
}
