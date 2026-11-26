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
import { Spinner } from '@/components/base/spinner/spinner';
import { Tab, TabList, TabPanel, Tabs } from '@/components/base/tabs/tabs';
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

  return (
    <InventoryModuleGate anyPermissions={STOCK_READ_PERMS}>
      <div className="space-y-6">
        <InventoryPageHeader
          title="Stock & Ledger"
          description="Monitor per-warehouse stock balances, record controlled adjustments, execute transfers, and audit ledger movements."
        />

        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => navigateTab(String(key) as StockTabKey)}
          className="gap-5"
        >
          <TabList aria-label="Stock operations and ledger sections">
            {canStock && (
              <Tab id="balances" icon={RiStackLine} count={counts.balances}>
                Balances
              </Tab>
            )}
            {canStock && (
              <Tab id="adjustments" icon={RiEqualizerLine} count={counts.adjustments}>
                Adjustments
              </Tab>
            )}
            {canStock && (
              <Tab id="transfers" icon={RiArrowLeftRightLine} count={counts.transfers}>
                Transfers
              </Tab>
            )}
            {canMovements && (
              <Tab id="movements" icon={RiHistoryLine} count={counts.movements}>
                Movement History
              </Tab>
            )}
          </TabList>

          {canStock && (
            <TabPanel id="balances">
              <StockBalancesTab
                initialWarehouseId={warehouseIdParam}
                onCountChange={handleBalancesCount}
                onSwitchTab={navigateTab}
              />
            </TabPanel>
          )}

          {canStock && (
            <TabPanel id="adjustments">
              <AdjustmentsTab onCountChange={handleAdjustmentsCount} />
            </TabPanel>
          )}

          {canStock && (
            <TabPanel id="transfers">
              <TransfersTab onCountChange={handleTransfersCount} />
            </TabPanel>
          )}

          {canMovements && (
            <TabPanel id="movements">
              <MovementsTab
                initialWarehouseId={warehouseIdParam}
                onCountChange={handleMovementsCount}
              />
            </TabPanel>
          )}
        </Tabs>
      </div>
    </InventoryModuleGate>
  );
}

export default function InventoryStockPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Spinner size="md" className="text-accent-600" />
        </div>
      }
    >
      <InventoryStockContent />
    </Suspense>
  );
}
