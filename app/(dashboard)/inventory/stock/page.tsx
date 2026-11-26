'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  RiArrowLeftRightLine,
  RiEqualizerLine,
  RiHistoryLine,
  RiStackLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { PageShellSkeleton } from '@/components/application/loading/page-skeletons';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/base/segmented-control/segmented-control';
import { InventoryModuleGate } from '@/features/inventory/components/inventory-module-gate';
import { InventoryPageHeader } from '@/features/inventory/components/inventory-page-header';
import { StockBalancesTab } from '@/features/inventory/components/tabs/stock-balances-tab';
import { AdjustmentsTab } from '@/features/inventory/components/tabs/adjustments-tab';
import { TransfersTab } from '@/features/inventory/components/tabs/transfers-tab';
import { MovementsTab } from '@/features/inventory/components/tabs/movements-tab';
import { inventoryApi } from '@/features/inventory/api/inventory-api';

type StockTabKey = 'balances' | 'adjustments' | 'transfers' | 'movements';

const STOCK_READ_PERMS = ['inventory.stock.read', 'inventory.movements.read'];

function InventoryStockContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();

  const canStock = hasPermission('inventory.stock.read');
  const canMovements = hasPermission('inventory.movements.read');

  const allowedTabs = useMemo<StockTabKey[]>(() => {
    const tabs: StockTabKey[] = [];
    if (canStock) {
      tabs.push('balances', 'adjustments', 'transfers');
    }
    if (canMovements) {
      tabs.push('movements');
    }
    return tabs;
  }, [canStock, canMovements]);

  const requestedTab = searchParams.get('tab') as StockTabKey | null;
  const warehouseIdParam = searchParams.get('warehouseId') || undefined;
  const activeTab: StockTabKey =
    requestedTab && allowedTabs.includes(requestedTab)
      ? requestedTab
      : allowedTabs[0] || 'balances';

  const [counts, setCounts] = useState<{
    balances?: number;
    adjustments?: number;
    transfers?: number;
    movements?: number;
  }>({});

  const updateCount = useCallback((key: StockTabKey, count: number) => {
    setCounts((prev) => (prev[key] === count ? prev : { ...prev, [key]: count }));
  }, []);

  const handleBalancesCount = useCallback((c: number) => updateCount('balances', c), [updateCount]);
  const handleAdjustmentsCount = useCallback((c: number) => updateCount('adjustments', c), [updateCount]);
  const handleTransfersCount = useCallback((c: number) => updateCount('transfers', c), [updateCount]);
  const handleMovementsCount = useCallback((c: number) => updateCount('movements', c), [updateCount]);

  // Preload tab badge counts once on mount
  useEffect(() => {
    let cancelled = false;
    const loadCounts = async () => {
      const [bRes, aRes, tRes, mRes] = await Promise.allSettled([
        canStock ? inventoryApi.listStock({ page: 1, limit: 1 }) : Promise.resolve(null),
        canStock ? inventoryApi.listAdjustments({ page: 1, limit: 1 }) : Promise.resolve(null),
        canStock ? inventoryApi.listTransfers({ page: 1, limit: 1 }) : Promise.resolve(null),
        canMovements ? inventoryApi.listMovements({ page: 1, limit: 1 }) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setCounts((prev) => ({
        balances: bRes.status === 'fulfilled' && bRes.value ? bRes.value.meta.total : prev.balances,
        adjustments:
          aRes.status === 'fulfilled' && aRes.value ? aRes.value.meta.total : prev.adjustments,
        transfers:
          tRes.status === 'fulfilled' && tRes.value ? tRes.value.meta.total : prev.transfers,
        movements:
          mRes.status === 'fulfilled' && mRes.value ? mRes.value.meta.total : prev.movements,
      }));
    };
    void loadCounts();
    return () => {
      cancelled = true;
    };
  }, [canStock, canMovements]);

  const navigateTab = useCallback(
    (tab: StockTabKey) => {
      const params = new URLSearchParams();
      params.set('tab', tab);
      if (warehouseIdParam && (tab === 'balances' || tab === 'movements')) {
        params.set('warehouseId', warehouseIdParam);
      }
      router.replace(`/inventory/stock?${params.toString()}`, { scroll: false });
    },
    [router, warehouseIdParam],
  );

  const handleSelectionChange = useCallback(
    (keys: Iterable<React.Key>) => {
      const next = Array.from(keys)[0] as StockTabKey | undefined;
      if (next && next !== activeTab) {
        navigateTab(next);
      }
    },
    [activeTab, navigateTab],
  );

  return (
    <InventoryModuleGate anyPermissions={STOCK_READ_PERMS}>
      <div className="space-y-6">
        <InventoryPageHeader
          title="Stock & Ledger"
          description="Monitor per-warehouse stock balances, record controlled adjustments, execute transfers, and audit ledger movements."
        />

        <div className="overflow-x-auto no-scrollbar">
          <SegmentedControl
            aria-label="Stock operations and ledger sections"
            selectedKeys={[activeTab]}
            onSelectionChange={handleSelectionChange}
            className="rounded-xl p-1"
          >
            {canStock && (
              <SegmentedControlItem id="balances" className="gap-2 rounded-lg px-3.5 py-1.5">
                <RiStackLine className="size-4 shrink-0" aria-hidden />
                <span>Balances</span>
                {counts.balances != null && (
                  <span className="inline-flex items-center justify-center rounded-md bg-background-secondary-default px-1.5 py-0.5 text-caption-1-medium font-mono tabular-nums text-text-secondary">
                    {counts.balances}
                  </span>
                )}
              </SegmentedControlItem>
            )}
            {canStock && (
              <SegmentedControlItem id="adjustments" className="gap-2 rounded-lg px-3.5 py-1.5">
                <RiEqualizerLine className="size-4 shrink-0" aria-hidden />
                <span>Adjustments</span>
                {counts.adjustments != null && (
                  <span className="inline-flex items-center justify-center rounded-md bg-background-secondary-default px-1.5 py-0.5 text-caption-1-medium font-mono tabular-nums text-text-secondary">
                    {counts.adjustments}
                  </span>
                )}
              </SegmentedControlItem>
            )}
            {canStock && (
              <SegmentedControlItem id="transfers" className="gap-2 rounded-lg px-3.5 py-1.5">
                <RiArrowLeftRightLine className="size-4 shrink-0" aria-hidden />
                <span>Transfers</span>
                {counts.transfers != null && (
                  <span className="inline-flex items-center justify-center rounded-md bg-background-secondary-default px-1.5 py-0.5 text-caption-1-medium font-mono tabular-nums text-text-secondary">
                    {counts.transfers}
                  </span>
                )}
              </SegmentedControlItem>
            )}
            {canMovements && (
              <SegmentedControlItem id="movements" className="gap-2 rounded-lg px-3.5 py-1.5">
                <RiHistoryLine className="size-4 shrink-0" aria-hidden />
                <span>Movement History</span>
                {counts.movements != null && (
                  <span className="inline-flex items-center justify-center rounded-md bg-background-secondary-default px-1.5 py-0.5 text-caption-1-medium font-mono tabular-nums text-text-secondary">
                    {counts.movements}
                  </span>
                )}
              </SegmentedControlItem>
            )}
          </SegmentedControl>
        </div>

        {activeTab === 'balances' && canStock && (
          <StockBalancesTab
            initialWarehouseId={warehouseIdParam}
            onCountChange={handleBalancesCount}
            onSwitchTab={navigateTab}
          />
        )}
        {activeTab === 'adjustments' && canStock && (
          <AdjustmentsTab onCountChange={handleAdjustmentsCount} />
        )}
        {activeTab === 'transfers' && canStock && (
          <TransfersTab onCountChange={handleTransfersCount} />
        )}
        {activeTab === 'movements' && canMovements && (
          <MovementsTab
            initialWarehouseId={warehouseIdParam}
            onCountChange={handleMovementsCount}
          />
        )}
      </div>
    </InventoryModuleGate>
  );
}

export default function InventoryStockPage() {
  return (
    <Suspense fallback={<PageShellSkeleton showStats={false} />}>
      <InventoryStockContent />
    </Suspense>
  );
}
