'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RiBarChart2Line, RiCheckDoubleLine } from '@remixicon/react';
import type { Key } from 'react-aria-components';
import { useAuth } from '@/providers/auth-provider';
import { PageShellSkeleton } from '@/components/application/loading/page-skeletons';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/base/segmented-control/segmented-control';
import { InventoryPageHeader } from '@/features/inventory/components/inventory-page-header';
import { salesApi } from '@/features/sales/api/sales-api';
import { FulfillmentsTab } from '@/features/sales/components/fulfillments-tab';
import { ReportsTab } from '@/features/sales/components/reports-tab';
import { SalesModuleGate } from '@/features/sales/components/sales-module-gate';

type FulfillmentsTabKey = 'fulfillments' | 'reports';

const FULFILLMENTS_OR_REPORTS_PERMS = [
  'sales.fulfillments.read',
  'sales.reports.read',
];

function SalesFulfillmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();

  const canFulfillments = hasPermission('sales.fulfillments.read');
  const canReports = hasPermission('sales.reports.read');

  const allowedTabs = useMemo<FulfillmentsTabKey[]>(() => {
    const tabs: FulfillmentsTabKey[] = [];
    if (canFulfillments) tabs.push('fulfillments');
    if (canReports) tabs.push('reports');
    return tabs;
  }, [canFulfillments, canReports]);

  const requestedTab = searchParams.get('tab') as FulfillmentsTabKey | null;
  const activeTab: FulfillmentsTabKey =
    requestedTab && allowedTabs.includes(requestedTab)
      ? requestedTab
      : allowedTabs[0] || 'fulfillments';

  const [fulfillmentCount, setFulfillmentCount] = useState<number | null>(null);

  const loadCount = useCallback(() => {
    if (!canFulfillments) return;
    salesApi
      .listFulfillments({ page: 1, limit: 1 })
      .then((res) => setFulfillmentCount(res.pagination?.total ?? 0))
      .catch(() => {});
  }, [canFulfillments]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  const handleTabChange = (keys: Set<Key>) => {
    const first = [...keys][0];
    if (!first) return;
    const next = String(first) as FulfillmentsTabKey;
    if (next === activeTab) return;
    router.replace(
      next === 'fulfillments'
        ? '/sales/fulfillments'
        : '/sales/fulfillments?tab=reports',
      { scroll: false }
    );
  };

  return (
    <div className="space-y-6">
      <InventoryPageHeader
        title="Fulfillments & Sales Reports"
        description="Process partial and full warehouse order fulfillments and review fulfilled revenue analytics."
      />

      <div className="overflow-x-auto no-scrollbar">
        <SegmentedControl
          aria-label="Fulfillments and Reports sections"
          selectedKeys={[activeTab]}
          onSelectionChange={handleTabChange}
          className="rounded-xl p-1"
        >
          {canFulfillments && (
            <SegmentedControlItem
              id="fulfillments"
              className="gap-2 rounded-lg px-3.5 py-1.5"
            >
              <RiCheckDoubleLine className="size-4 shrink-0" aria-hidden />
              <span>Fulfillments</span>
              {fulfillmentCount !== null && (
                <span className="inline-flex items-center justify-center rounded-md bg-background-secondary-default px-1.5 py-0.5 text-caption-1-medium font-mono tabular-nums text-text-secondary">
                  {fulfillmentCount}
                </span>
              )}
            </SegmentedControlItem>
          )}
          {canReports && (
            <SegmentedControlItem
              id="reports"
              className="gap-2 rounded-lg px-3.5 py-1.5"
            >
              <RiBarChart2Line className="size-4 shrink-0" aria-hidden />
              <span>Sales Reports</span>
            </SegmentedControlItem>
          )}
        </SegmentedControl>
      </div>

      {activeTab === 'fulfillments' ? (
        <FulfillmentsTab onChanged={loadCount} />
      ) : (
        <ReportsTab />
      )}
    </div>
  );
}

export default function SalesFulfillmentsPage() {
  return (
    <SalesModuleGate anyPermissions={FULFILLMENTS_OR_REPORTS_PERMS}>
      <Suspense fallback={<PageShellSkeleton showStats />}>
        <SalesFulfillmentsContent />
      </Suspense>
    </SalesModuleGate>
  );
}
