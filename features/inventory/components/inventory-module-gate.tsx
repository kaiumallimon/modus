'use client';

import React from 'react';
import Link from 'next/link';
import { RiBox3Line, RiLockLine, RiAppsLine } from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Spinner } from '@/components/base/spinner/spinner';
import { Button } from '@/components/base/buttons/button';

export interface InventoryModuleGateProps {
  /** Single permission required to access the page. */
  permission?: string;
  /** Alternative list where any single matching permission allows access. */
  anyPermissions?: string[];
  children: React.ReactNode;
}

/**
 * Shared route guard for all Inventory pages:
 * enforces both installation-wide Inventory module activation and Modus RBAC permissions.
 */
export function InventoryModuleGate({
  permission,
  anyPermissions,
  children,
}: InventoryModuleGateProps) {
  const {
    user,
    isLoading: authLoading,
    modulesLoaded,
    isModuleActive,
    hasPermission,
    hasAnyPermission,
  } = useAuth();

  if (authLoading || (!modulesLoaded && user)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" className="text-accent-600" />
      </div>
    );
  }

  if (modulesLoaded && !isModuleActive('inventory')) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-border-button-default bg-background-primary-default p-8 text-center shadow-sm space-y-4 mt-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-background-secondary-default border border-separator-border text-text-secondary">
          <RiBox3Line className="size-6" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-title-2-medium text-text-primary">
            Inventory Module Deactivated
          </h1>
          <p className="text-body-regular text-text-secondary">
            The Inventory module is currently inactive for this Modus installation. Historical
            records remain preserved and accessible once an administrator reactivates the module.
          </p>
        </div>
        {hasPermission('modules.read') && (
          <div className="pt-2 flex justify-center">
            <Link href="/modules">
              <Button variant="secondary" leadingIcon={RiAppsLine}>
                Open Module Registry
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  const permitted = permission
    ? hasPermission(permission)
    : anyPermissions && anyPermissions.length > 0
      ? hasAnyPermission(anyPermissions)
      : true;

  if (!permitted) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-border-button-default bg-background-primary-default p-8 text-center shadow-sm space-y-4 mt-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-background-secondary-default border border-separator-border text-text-secondary">
          <RiLockLine className="size-6" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-title-2-medium text-text-primary">Access Restricted</h1>
          <p className="text-body-regular text-text-secondary">
            Your assigned role does not include permission to view this Inventory section. Contact
            an administrator if you need access.
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <Link href="/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
