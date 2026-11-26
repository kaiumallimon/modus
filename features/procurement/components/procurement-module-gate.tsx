'use client';

import React from 'react';
import Link from 'next/link';
import {
  RiAppsLine,
  RiLockLine,
  RiShoppingBag3Line,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { PageShellSkeleton } from '@/components/application/loading/page-skeletons';
import { Button } from '@/components/base/buttons/button';

export interface ProcurementModuleGateProps {
  permission?: string;
  anyPermissions?: string[];
  children: React.ReactNode;
}

/**
 * Shared route guard for all Procurement pages:
 * enforces both Procurement + Inventory dependency activation and Modus RBAC permissions.
 */
export function ProcurementModuleGate({
  permission,
  anyPermissions,
  children,
}: ProcurementModuleGateProps) {
  const {
    user,
    isLoading: authLoading,
    modulesLoaded,
    isModuleActive,
    hasPermission,
    hasAnyPermission,
  } = useAuth();

  if (authLoading || (!modulesLoaded && user)) {
    return <PageShellSkeleton showStats={false} />;
  }

  const procurementActive = isModuleActive('procurement');
  const inventoryActive = isModuleActive('inventory');

  if (modulesLoaded && (!procurementActive || !inventoryActive)) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-border-button-default bg-background-primary-default p-8 text-center shadow-sm space-y-4 mt-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-background-secondary-default border border-separator-border text-text-secondary">
          <RiShoppingBag3Line className="size-6" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-title-2-semibold text-text-primary">
            {!procurementActive
              ? 'Procurement Module Deactivated'
              : 'Inventory Dependency Required'}
          </h2>
          <p className="text-body-2-regular text-text-secondary">
            {!procurementActive
              ? 'The Procurement module is currently turned off for this Modus installation. Historical supplier records, purchase orders, and receipts remain safely preserved.'
              : 'Procurement requires the Inventory module to be active so goods receiving can safely update stock balances and ledger history.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/modules">
            <Button variant="primary" leadingIcon={RiAppsLine}>
              Manage Modules
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const allowed = permission
    ? hasPermission(permission)
    : anyPermissions && anyPermissions.length > 0
      ? hasAnyPermission(anyPermissions)
      : true;

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-border-button-default bg-background-primary-default p-8 text-center shadow-sm space-y-4 mt-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-background-secondary-default border border-separator-border text-text-secondary">
          <RiLockLine className="size-6" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-title-2-semibold text-text-primary">
            Access Restricted
          </h2>
          <p className="text-body-2-regular text-text-secondary">
            Your assigned role does not include permission to view this
            Procurement workspace. Contact your administrator to request access
            via Roles &amp; Access.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/procurement">
            <Button variant="secondary">Back to Procurement</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
