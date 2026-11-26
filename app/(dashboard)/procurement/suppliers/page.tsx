'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RiExchangeDollarLine, RiTruckLine } from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { PageShellSkeleton } from '@/components/application/loading/page-skeletons';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/base/segmented-control/segmented-control';
import { InventoryPageHeader } from '@/features/inventory/components/inventory-page-header';
import { procurementApi } from '@/features/procurement/api/procurement-api';
import { ProcurementModuleGate } from '@/features/procurement/components/procurement-module-gate';
import { SupplierTransactionsTab } from '@/features/procurement/components/supplier-transactions-tab';
import { SuppliersDirectoryTab } from '@/features/procurement/components/suppliers-directory-tab';

type SuppliersTabKey = 'directory' | 'transactions';

const SUPPLIERS_READ_PERMS = [
  'procurement.suppliers.read',
  'procurement.supplier-transactions.read',
];

function ProcurementSuppliersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();

  const canSuppliers = hasPermission('procurement.suppliers.read');
  const canTransactions = hasPermission('procurement.supplier-transactions.read');

  const supplierIdParam = searchParams.get('supplierId') || '';

  const allowedTabs = useMemo<SuppliersTabKey[]>(() => {
    const list: SuppliersTabKey[] = [];
    if (canSuppliers) list.push('directory');
    if (canTransactions) list.push('transactions');
    return list;
  }, [canSuppliers, canTransactions]);

  const requestedTab = searchParams.get('tab') as SuppliersTabKey | null;
  const activeTab: SuppliersTabKey =
    requestedTab && allowedTabs.includes(requestedTab)
      ? requestedTab
      : allowedTabs[0] || 'directory';

  const [counts, setCounts] = useState<{
    directory: number | null;
    transactions: number | null;
  }>({ directory: null, transactions: null });

  const [focusedSupplierId, setFocusedSupplierId] = useState(supplierIdParam);

  useEffect(() => {
    let active = true;
    Promise.all([
      canSuppliers
        ? procurementApi
            .listSuppliers({ page: 1, limit: 1 })
            .then((r) => r.meta?.total ?? 0)
            .catch(() => null)
        : Promise.resolve(null),
      canTransactions
        ? procurementApi
            .listSupplierTransactions({ page: 1, limit: 1 })
            .then((r) => r.meta?.total ?? 0)
            .catch(() => null)
        : Promise.resolve(null),
    ]).then(([directory, transactions]) => {
      if (active) setCounts({ directory, transactions });
    });
    return () => {
      active = false;
    };
  }, [canSuppliers, canTransactions]);

  const handleDirectoryCount = useCallback((n: number) => {
    setCounts((prev) =>
      prev.directory === n ? prev : { ...prev, directory: n },
    );
  }, []);

  const handleTransactionsCount = useCallback((n: number) => {
    setCounts((prev) =>
      prev.transactions === n ? prev : { ...prev, transactions: n },
    );
  }, []);

  const navigateTab = useCallback(
    (next: SuppliersTabKey, extraSupplierId?: string) => {
      if (extraSupplierId !== undefined) {
        setFocusedSupplierId(extraSupplierId);
      }
      router.replace(`/procurement/suppliers?tab=${next}`, { scroll: false });
    },
    [router],
  );

  const handleSelectionChange = useCallback(
    (keys: Iterable<React.Key>) => {
      const next = Array.from(keys)[0] as SuppliersTabKey | undefined;
      if (next && next !== activeTab) {
        navigateTab(next);
      }
    },
    [activeTab, navigateTab],
  );

  return (
    <ProcurementModuleGate anyPermissions={SUPPLIERS_READ_PERMS}>
      <div className="space-y-6">
        <InventoryPageHeader
          title="Suppliers & Statements"
          description="Manage approved vendors, contact persons, purchase commitments, and receiving transaction history."
        />

        <div className="overflow-x-auto no-scrollbar">
          <SegmentedControl
            aria-label="Supplier workspace sections"
            selectedKeys={[activeTab]}
            onSelectionChange={handleSelectionChange}
            className="rounded-xl p-1"
          >
            {canSuppliers && (
              <SegmentedControlItem
                id="directory"
                className="gap-2 rounded-lg px-3.5 py-1.5"
              >
                <RiTruckLine className="size-4 shrink-0" aria-hidden />
                <span>Directory</span>
                {counts.directory != null && (
                  <span className="inline-flex items-center justify-center rounded-md bg-background-secondary-default px-1.5 py-0.5 text-caption-1-medium font-mono tabular-nums text-text-secondary">
                    {counts.directory}
                  </span>
                )}
              </SegmentedControlItem>
            )}
            {canTransactions && (
              <SegmentedControlItem
                id="transactions"
                className="gap-2 rounded-lg px-3.5 py-1.5"
              >
                <RiExchangeDollarLine className="size-4 shrink-0" aria-hidden />
                <span>Transactions &amp; Statements</span>
                {counts.transactions != null && (
                  <span className="inline-flex items-center justify-center rounded-md bg-background-secondary-default px-1.5 py-0.5 text-caption-1-medium font-mono tabular-nums text-text-secondary">
                    {counts.transactions}
                  </span>
                )}
              </SegmentedControlItem>
            )}
          </SegmentedControl>
        </div>

        {activeTab === 'directory' && canSuppliers && (
          <SuppliersDirectoryTab
            onCountChange={handleDirectoryCount}
            onSwitchToTransactions={(supId) =>
              navigateTab('transactions', supId || '')
            }
          />
        )}
        {activeTab === 'transactions' && canTransactions && (
          <SupplierTransactionsTab
            initialSupplierId={focusedSupplierId}
            onCountChange={handleTransactionsCount}
          />
        )}
      </div>
    </ProcurementModuleGate>
  );
}

export default function ProcurementSuppliersPage() {
  return (
    <Suspense fallback={<PageShellSkeleton showStats={false} />}>
      <ProcurementSuppliersContent />
    </Suspense>
  );
}
