'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiLockLine,
  RiShieldCheckLine,
  RiShieldUserLine,
  RiUserLine,
  RiKeyLine,
  RiCheckboxLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  RoleDocument,
  PermissionDefinition,
  Role,
  AccessControlDashboardStats,
  ModulePermissionsGroup,
} from '@/lib/api/types';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Chip } from '@/components/base/badges/chip';
import { Modal, ModalHeader, ModalBody, ModalFooter, AlertDialog } from '@/components/base/modal/modal';
import { Spinner } from '@/components/base/spinner/spinner';
import { toast } from '@/components/base/toast/toast';

interface RoleWithUserCount extends RoleDocument {
  userCount?: number;
  permissionsCount?: number;
}

export default function RolesPage() {
  const { user: currentUser } = useAuth();

  const [roles, setRoles] = useState<RoleWithUserCount[]>([]);
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<ModulePermissionsGroup[]>([]);
  const [stats, setStats] = useState<AccessControlDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleWithUserCount | null>(null);
  const [deleteRoleDialog, setDeleteRoleDialog] = useState<RoleWithUserCount | null>(null);

  // Form states
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes, groupedRes, statsRes] = await Promise.allSettled([
        apiClient<RoleWithUserCount[]>(API_ENDPOINTS.ROLES),
        apiClient<PermissionDefinition[]>(API_ENDPOINTS.PERMISSIONS),
        apiClient<ModulePermissionsGroup[]>(API_ENDPOINTS.PERMISSIONS_GROUPED),
        apiClient<AccessControlDashboardStats>(API_ENDPOINTS.ROLE_STATS),
      ]);

      if (rolesRes.status === 'fulfilled') setRoles(rolesRes.value || []);
      if (permsRes.status === 'fulfilled') setPermissions(permsRes.value || []);
      if (groupedRes.status === 'fulfilled') setGroupedPermissions(groupedRes.value || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value || null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load roles and permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fallback group permissions by module if grouped endpoint is not yet loaded
  const permsByModule: Record<string, PermissionDefinition[]> = groupedPermissions.length > 0
    ? groupedPermissions.reduce<Record<string, PermissionDefinition[]>>((acc, grp) => {
        acc[grp.module] = grp.permissions;
        return acc;
      }, {})
    : permissions.reduce<Record<string, PermissionDefinition[]>>((acc, perm) => {
        const mod = perm.module || 'general';
        if (!acc[mod]) acc[mod] = [];
        acc[mod].push(perm);
        return acc;
      }, {});

  const handleOpenCreate = () => {
    setFormCode('');
    setFormName('');
    setFormDescription('');
    setFormPermissions([]);
    setFormError('');
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (role: RoleWithUserCount) => {
    setSelectedRole(role);
    setFormCode(role.code);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormPermissions(role.permissions || []);
    setFormError('');
    setEditModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    setFormPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const toggleModulePermissions = (modulePerms: PermissionDefinition[]) => {
    const moduleIds = modulePerms.map((p) => p.id);
    const allSelected = moduleIds.every((id) => formPermissions.includes(id));
    if (allSelected) {
      setFormPermissions((prev) => prev.filter((id) => !moduleIds.includes(id)));
    } else {
      setFormPermissions((prev) => Array.from(new Set([...prev, ...moduleIds])));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) {
      setFormError('Role code and display name are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      await apiClient(API_ENDPOINTS.ROLES, {
        method: 'POST',
        body: JSON.stringify({
          code: formCode.trim().toUpperCase(),
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          permissions: formPermissions,
          isActive: true,
        }),
      });

      toast.success('Custom role created successfully');
      setCreateModalOpen(false);
      loadData();
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

    setSubmitting(true);
    setFormError('');

    try {
      await apiClient(API_ENDPOINTS.ROLE_BY_ID(selectedRole._id), {
        method: 'PATCH',
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          permissions: formPermissions,
        }),
      });

      toast.success('Role updated successfully');
      setEditModalOpen(false);
      loadData();
    } catch (err: any) {
      const msg = err.message || 'Failed to update role';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleDialog) return;
    try {
      await apiClient(API_ENDPOINTS.ROLE_BY_ID(deleteRoleDialog._id), {
        method: 'DELETE',
      });
      toast.success('Role deleted successfully');
      setDeleteRoleDialog(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role');
    }
  };

  const isSuperAdmin = currentUser?.role === Role.SUPER_ADMIN;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-title-2-medium text-text-primary">Roles & Permissions</h1>
          <p className="text-body-medium text-text-secondary">
            Role-Based Access Control (RBAC) governance, authorization policies, and module permission mappings
          </p>
        </div>
        {isSuperAdmin && (
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            leadingIcon={RiAddLine}
            className="h-10 px-5 gap-2.5 rounded-full text-body-medium font-semibold text-[#171B18] shadow-2xs hover:shadow-xs transition-all"
          >
            Create Role
          </Button>
        )}
      </div>

      {/* RBAC Metric Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-background-primary-default border border-border-button-default rounded-xl p-3.5 shadow-2xs">
            <span className="text-caption-2-medium uppercase text-text-tertiary">Total Roles</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-headline-medium text-text-primary">{stats.totalRoles}</span>
              <RiShieldUserLine className="size-5 text-accent-600" />
            </div>
          </div>

          <div className="bg-background-primary-default border border-border-button-default rounded-xl p-3.5 shadow-2xs">
            <span className="text-caption-2-medium uppercase text-text-tertiary">System Roles</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-headline-medium text-text-primary">{stats.systemRoles}</span>
              <RiLockLine className="size-5 text-text-tertiary" />
            </div>
          </div>

          <div className="bg-background-primary-default border border-border-button-default rounded-xl p-3.5 shadow-2xs">
            <span className="text-caption-2-medium uppercase text-text-tertiary">Custom Roles</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-headline-medium text-text-primary">{stats.customRoles}</span>
              <RiShieldCheckLine className="size-5 text-blue-500" />
            </div>
          </div>

          <div className="bg-background-primary-default border border-border-button-default rounded-xl p-3.5 shadow-2xs">
            <span className="text-caption-2-medium uppercase text-text-tertiary">Active Roles</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-headline-medium text-text-primary">{stats.activeRoles}</span>
              <span className="size-2 rounded-full bg-accent-500" />
            </div>
          </div>

          <div className="bg-background-primary-default border border-border-button-default rounded-xl p-3.5 shadow-2xs">
            <span className="text-caption-2-medium uppercase text-text-tertiary">Total Permissions</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-headline-medium text-text-primary">{stats.totalPermissions}</span>
              <RiKeyLine className="size-5 text-text-tertiary" />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="md" className="text-accent-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((role) => {
            const isSystemRole = role.isSystem || role.code === 'SUPER_ADMIN';
            return (
              <div
                key={role._id}
                className="bg-background-primary-default border border-border-button-default rounded-xl p-5 shadow-2xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
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
                    </div>
                  </div>

                  <div>
                    <h2 className="text-title-3-semibold text-text-primary">{role.name}</h2>
                    <p className="text-caption-1-medium text-text-secondary line-clamp-2 mt-0.5">
                      {role.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* User assignment stat */}
                  <div className="flex items-center gap-1.5 text-caption-2-medium text-text-secondary pt-1">
                    <RiUserLine className="size-3.5 text-text-tertiary" />
                    <span>
                      {role.userCount !== undefined ? `${role.userCount} assigned user${role.userCount === 1 ? '' : 's'}` : '0 assigned users'}
                    </span>
                  </div>

                  <div className="pt-2">
                    <p className="text-caption-2-medium text-text-tertiary uppercase mb-1">
                      Permissions ({role.permissions?.length || 0})
                    </p>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {role.permissions?.slice(0, 8).map((p) => (
                        <span
                          key={p}
                          className="text-[11px] font-mono bg-background-secondary-default text-text-secondary px-1.5 py-0.5 rounded border border-separator-border"
                        >
                          {p}
                        </span>
                      ))}
                      {(role.permissions?.length || 0) > 8 && (
                        <span className="text-[11px] text-text-tertiary font-semibold self-center">
                          +{role.permissions.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-separator-border flex items-center justify-end gap-2">
                  {isSuperAdmin && !isSystemRole && (
                    <>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => handleOpenEdit(role)}
                        leadingIcon={RiEditLine}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setDeleteRoleDialog(role)}
                        className="text-red-600 hover:text-red-700"
                        leadingIcon={RiDeleteBinLine}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                  {isSuperAdmin && isSystemRole && role.code !== 'SUPER_ADMIN' && (
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => handleOpenEdit(role)}
                      leadingIcon={RiEditLine}
                    >
                      Edit Permissions
                    </Button>
                  )}
                  {role.code === 'SUPER_ADMIN' && (
                    <span className="text-caption-2-medium text-text-tertiary italic">
                      Immutable Full Access
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Role Modal */}
      <Modal isOpen={createModalOpen} onOpenChange={setCreateModalOpen}>
        {({ close }) => (
          <form onSubmit={handleCreateSubmit}>
            <ModalHeader
              title="Create Custom Role"
              description="Define a new role and grant specific module permissions."
            />
            <ModalBody className="space-y-4 max-h-[65vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-caption-1-medium rounded-xl">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Role Code (Uppercase)"
                  placeholder="FINANCE_LEAD"
                  value={formCode}
                  onChange={(val) => setFormCode(val.toUpperCase())}
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
                placeholder="Operational oversight for financial modules"
                value={formDescription}
                onChange={(val) => setFormDescription(val)}
              />

              {/* Permission Matrix Selection */}
              <div className="space-y-3 pt-2 border-t border-separator-border">
                <p className="text-caption-1-semibold text-text-primary">Assign Permissions</p>
                {Object.entries(permsByModule).map(([mod, perms]) => {
                  const allSelected = perms.every((p) => formPermissions.includes(p.id));
                  return (
                    <div key={mod} className="p-3 bg-background-secondary-default rounded-xl space-y-2 border border-separator-border">
                      <div className="flex items-center justify-between">
                        <p className="text-caption-2-medium text-text-tertiary uppercase font-bold tracking-wider">
                          Module: {mod}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleModulePermissions(perms)}
                          className="text-[11px] text-accent-700 dark:text-accent-300 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RiCheckboxLine className="size-3" />
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {perms.map((p) => {
                          const checked = formPermissions.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer border transition-colors ${
                                checked
                                  ? 'bg-accent-100/60 dark:bg-accent-950/60 border-accent-300 dark:border-accent-800'
                                  : 'bg-background-primary-default border-border-button-default hover:bg-background-secondary-hover'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(p.id)}
                                className="mt-1 rounded text-accent-600 focus:ring-accent-500"
                              />
                              <div className="flex flex-col text-caption-1-medium leading-tight">
                                <span className="font-semibold text-text-primary">{p.name}</span>
                                <span className="text-[11px] text-text-tertiary">{p.description}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={close} type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Role'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* Edit Role Modal */}
      <Modal isOpen={editModalOpen} onOpenChange={setEditModalOpen}>
        {({ close }) => (
          <form onSubmit={handleEditSubmit}>
            <ModalHeader
              title={`Edit Role: ${selectedRole?.name}`}
              description="Modify role display information and granted permissions."
            />
            <ModalBody className="space-y-4 max-h-[65vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-caption-1-medium rounded-xl">
                  {formError}
                </div>
              )}
              <Input
                label="Role Code"
                value={formCode}
                isDisabled
              />
              <Input
                label="Display Name"
                value={formName}
                onChange={(val) => setFormName(val)}
                isRequired
              />
              <Input
                label="Description"
                value={formDescription}
                onChange={(val) => setFormDescription(val)}
              />

              {/* Permission Matrix Selection */}
              <div className="space-y-3 pt-2 border-t border-separator-border">
                <p className="text-caption-1-semibold text-text-primary">Permissions Assignment</p>
                {Object.entries(permsByModule).map(([mod, perms]) => {
                  const allSelected = perms.every((p) => formPermissions.includes(p.id));
                  return (
                    <div key={mod} className="p-3 bg-background-secondary-default rounded-xl space-y-2 border border-separator-border">
                      <div className="flex items-center justify-between">
                        <p className="text-caption-2-medium text-text-tertiary uppercase font-bold tracking-wider">
                          Module: {mod}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleModulePermissions(perms)}
                          className="text-[11px] text-accent-700 dark:text-accent-300 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RiCheckboxLine className="size-3" />
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {perms.map((p) => {
                          const checked = formPermissions.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer border transition-colors ${
                                checked
                                  ? 'bg-accent-100/60 dark:bg-accent-950/60 border-accent-300 dark:border-accent-800'
                                  : 'bg-background-primary-default border-border-button-default hover:bg-background-secondary-hover'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(p.id)}
                                className="mt-1 rounded text-accent-600 focus:ring-accent-500"
                              />
                              <div className="flex flex-col text-caption-1-medium leading-tight">
                                <span className="font-semibold text-text-primary">{p.name}</span>
                                <span className="text-[11px] text-text-tertiary">{p.description}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={close} type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Permissions'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog
        isOpen={!!deleteRoleDialog}
        onOpenChange={(open) => !open && setDeleteRoleDialog(null)}
        title="Delete Custom Role?"
        description={`Are you sure you want to permanently delete the role "${deleteRoleDialog?.name}" (${deleteRoleDialog?.code})? Users assigned to this role may lose access.`}
        confirmLabel="Delete Role"
        variant="danger"
        onConfirm={handleDeleteRole}
      />
    </div>
  );
}
