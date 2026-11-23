"use client";

import React from "react";
import {
  RiShieldCheckLine,
  RiCheckLine,
  RiCloseLine,
  RiLockLine,
} from "@remixicon/react";
import { useAuth } from "@/providers/auth-provider";
import { Chip } from "@/components/base/badges/chip";
import {
  CORE_PERMISSIONS,
  MODULE_NAMES,
  getRoleDisplayName,
} from "@/lib/permissions";
import {
  SettingsCard,
  SettingsRow,
  SettingsSectionLabel,
} from "./settings-rows";

export function SettingsAccess() {
  const { user, permissions, isSuperAdmin, hasPermission } = useAuth();

  // Group core permissions by module
  const permissionsByModule = CORE_PERMISSIONS.reduce<Record<string, typeof CORE_PERMISSIONS>>(
    (acc, perm) => {
      const mod = perm.module || "other";
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(perm);
      return acc;
    },
    {}
  );

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Role Summary */}
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Assigned Role & Authorization</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow label="Security role" description="Your assigned RBAC system or custom role">
            <div className="flex items-center gap-2">
              <Chip color={isSuperAdmin ? "lime" : "blue"} variant="caption" className="font-mono">
                {user?.role || "EMPLOYEE"}
              </Chip>
              <span className="text-body-2-medium text-text-primary">
                {getRoleDisplayName(String(user?.role || "EMPLOYEE"))}
              </span>
            </div>
          </SettingsRow>
          <SettingsRow label="Access level" description="Scope of actions permitted within the system">
            {isSuperAdmin ? (
              <span className="text-caption-1-semibold text-accent-700 dark:text-accent-300 flex items-center gap-1">
                <RiShieldCheckLine className="size-4" /> Full Installation Super Admin
              </span>
            ) : (
              <span className="text-caption-1-medium text-text-secondary flex items-center gap-1">
                <RiLockLine className="size-4" /> Role-Restricted Access ({permissions.length} permissions)
              </span>
            )}
          </SettingsRow>
        </SettingsCard>
      </div>

      {/* Permissions Breakdown by Module */}
      <div className="flex w-full flex-col gap-3">
        <SettingsSectionLabel>Effective Module Permissions</SettingsSectionLabel>
        {Object.entries(permissionsByModule).map(([moduleKey, perms]) => {
          const meta = MODULE_NAMES[moduleKey] || {
            name: moduleKey,
            description: `Permissions for ${moduleKey}`,
          };

          return (
            <div key={moduleKey} className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-caption-1-semibold text-text-primary">
                  {meta.name}
                </span>
                <span className="text-[11px] text-text-tertiary">
                  {perms.filter((p) => hasPermission(p.id)).length} of {perms.length} granted
                </span>
              </div>
              <SettingsCard>
                {perms.map((p) => {
                  const isGranted = hasPermission(p.id);
                  return (
                    <SettingsRow
                      key={p.id}
                      label={p.name}
                      description={`${p.id} — ${p.description}`}
                    >
                      {isGranted ? (
                        <div className="flex items-center gap-1 text-accent-700 dark:text-accent-300 text-caption-1-medium bg-accent-50 dark:bg-accent-950/40 px-2 py-0.5 rounded-md border border-accent-200 dark:border-accent-800">
                          <RiCheckLine className="size-3.5" />
                          <span>Granted</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-text-tertiary text-caption-1-medium bg-background-tertiary-default px-2 py-0.5 rounded-md border border-separator-border">
                          <RiCloseLine className="size-3.5" />
                          <span>Denied</span>
                        </div>
                      )}
                    </SettingsRow>
                  );
                })}
              </SettingsCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}
