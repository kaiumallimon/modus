'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  RiAddLine,
  RiExchangeDollarLine,
  RiFileList3Line,
  RiInboxArchiveLine,
  RiRefreshLine,
  RiTruckLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { toast } from '@/components/base/toast/toast';
import { InventoryOverviewSkeleton } from '@/components/application/loading/page-skeletons';
import { InventoryPageHeader } from '@/features/inventory/components/inventory-page-header';
import {
  InventoryStatsBar,
  type InventoryStatItem,
} from '@/features/inventory/components/inventory-stats-bar';
import { formatCurrency, formatQuantity } from '@/features/inventory/utils/formatters';
import { procurementApi } from '@/features/procurement/api/procurement-api';
import { ProcurementModuleGate } from '@/features/procurement/components/procurement-module-gate';
import {
  ProcurementVolumeChartCard,
  PurchaseOrderStatusChartCard,
} from '@/features/procurement/components/procurement-charts';
import {
  getGoodsReceiptStatusMeta,
  getPurchaseOrderStatusMeta,
} from '@/features/procurement/utils/formatters';
import type { ProcurementDashboardSummary } from '@/features/procurement/types/procurement';

const PROCUREMENT_READ_PERMS = [
  'procurement.dashboard.read',
  'procurement.suppliers.read',
  'procurement.purchase-orders.read',
  'procurement.goods-receipts.read',
  'procurement.supplier-transactions.read',
];

export default function ProcurementOverviewPage() {
  const { hasPermission } = useAuth();
  const canCreatePo = hasPermission('procurement.purchase-orders.create');
  const canReceive = hasPermission('procurement.goods-receipts.create');

  const [summary, setSummary] = useState<ProcurementDashboardSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await procurementApi.getDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load procurement overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const statsItems = useMemo<InventoryStatItem[]>(() => {
    const m = summary?.metrics;
    const openOrders =
      (m?.orderedPurchaseOrders ?? 0) +
      (m?.partiallyReceivedPurchaseOrders ?? 0);
    return [
      {
        id: 'active-suppliers',
        label: 'Active Suppliers',
        value: m?.activeSuppliers ?? 0,
        tooltip: 'Vendors eligible for new purchase orders',
        contextLabel: 'directory',
        badgeText: `${m?.totalSuppliers ?? 0} registered`,
        badgeTone: 'accent',
      },
      {
        id: 'open-orders',
        label: 'Open Orders (Awaiting Delivery)',
        value: openOrders,
        tooltip: 'Submitted and partially received purchase orders',
        contextLabel: 'pipeline',
        badgeText: `${m?.partiallyReceivedPurchaseOrders ?? 0} partial`,
        badgeTone: openOrders > 0 ? 'yellow' : 'neutral',
      },
      {
        id: 'total-orders',
        label: 'Draft & Completed Orders',
        value: m?.totalPurchaseOrders ?? 0,
        tooltip: 'Total purchase orders across all lifecycle statuses',
        contextLabel: 'all POs',
        badgeText: `${m?.draftPurchaseOrders ?? 0} drafts · ${m?.receivedPurchaseOrders ?? 0} received`,
        badgeTone: 'neutral',
      },
      {
        id: 'confirmed-receipts',
        label: 'Confirmed Goods Receipts',
        value: m?.confirmedGoodsReceipts ?? 0,
        tooltip: 'Receipts posted to Inventory stock balances',
        contextLabel: 'inventory',
        badgeText: 'Synced with Inventory',
        badgeTone: 'accent',
      },
    ];
  }, [summary]);

  return (
    <ProcurementModuleGate anyPermissions={PROCUREMENT_READ_PERMS}>
      <div className="space-y-6">
        <InventoryPageHeader
          title="Procurement Overview"
          description="Monitor suppliers, purchase order commitments, and Inventory goods receiving across Modus."
          actions={
            <>
              <Button
                variant="secondary"
                size="medium"
                leadingIcon={RiRefreshLine}
                onClick={loadDashboard}
                disabled={loading}
                className="h-10 px-4 gap-2 rounded-full text-body-medium font-medium shadow-2xs"
              >
                Refresh
              </Button>
              {canReceive && (
                <Link href="/procurement/goods-receipts">
                  <Button
                    variant="secondary"
                    size="medium"
                    leadingIcon={RiInboxArchiveLine}
                    className="h-10 px-4 gap-2 rounded-full text-body-medium font-medium shadow-2xs"
                  >
                    Goods Receipts
                  </Button>
                </Link>
              )}
              {canCreatePo && (
                <Link href="/procurement/purchase-orders">
                  <Button
                    variant="primary"
                    size="medium"
                    leadingIcon={RiAddLine}
                    className="h-10 px-5 gap-2 rounded-full text-body-medium font-semibold text-[#171B18] shadow-2xs hover:shadow-xs transition-all"
                  >
                    New Purchase Order
                  </Button>
                </Link>
              )}
            </>
          }
        />

        {loading && !summary ? (
          <InventoryOverviewSkeleton />
        ) : (
          <>
            <InventoryStatsBar items={statsItems} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <PurchaseOrderStatusChartCard
                statusBreakdown={summary?.statusBreakdown || []}
                currency={summary?.currency || 'USD'}
                className="lg:col-span-6"
              />
              <ProcurementVolumeChartCard
                statusBreakdown={summary?.statusBreakdown || []}
                currency={summary?.currency || 'USD'}
                className="lg:col-span-6"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Recent Purchase Orders */}
              <div className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-title-3-semibold text-text-primary">
                      Recent Purchase Orders
                    </h2>
                    <p className="text-caption-1-regular text-text-secondary">
                      Latest drafts, submitted orders, and completed receipts
                    </p>
                  </div>
                  <Link
                    href="/procurement/purchase-orders"
                    className="text-caption-1-semibold text-accent-700 dark:text-accent-300 hover:underline shrink-0"
                  >
                    View all →
                  </Link>
                </div>

                {!summary?.recentPurchaseOrders?.length ? (
                  <p className="py-6 text-center text-body-2-regular text-text-tertiary">
                    No purchase orders recorded yet.
                  </p>
                ) : (
                  <div className="divide-y divide-separator-border">
                    {summary.recentPurchaseOrders.map((po) => {
                      const meta = getPurchaseOrderStatusMeta(po.status);
                      return (
                        <div
                          key={po._id}
                          className="py-3 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-body-2-medium font-semibold text-text-primary">
                                {po.orderNumber}
                              </span>
                              <Chip variant="caption" color={meta.color}>
                                {meta.label}
                              </Chip>
                            </div>
                            <p className="text-caption-1-regular text-text-tertiary mt-0.5 truncate">
                              {po.supplierNameSnapshot} ·{' '}
                              {new Date(po.orderDate).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="font-mono text-body-2-medium font-semibold text-text-primary tabular-nums">
                            {formatCurrency(po.grandTotal, po.currency)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Goods Receipts */}
              <div className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-title-3-semibold text-text-primary">
                      Recent Goods Receipts
                    </h2>
                    <p className="text-caption-1-regular text-text-secondary">
                      Deliveries received against POs into Inventory warehouses
                    </p>
                  </div>
                  <Link
                    href="/procurement/goods-receipts"
                    className="text-caption-1-semibold text-accent-700 dark:text-accent-300 hover:underline shrink-0"
                  >
                    View all →
                  </Link>
                </div>

                {!summary?.recentGoodsReceipts?.length ? (
                  <p className="py-6 text-center text-body-2-regular text-text-tertiary">
                    No goods receipts recorded yet.
                  </p>
                ) : (
                  <div className="divide-y divide-separator-border">
                    {summary.recentGoodsReceipts.map((gr) => {
                      const meta = getGoodsReceiptStatusMeta(gr.status);
                      const supName =
                        typeof gr.supplierId === 'object'
                          ? gr.supplierId?.name
                          : 'Supplier';
                      return (
                        <div
                          key={gr._id}
                          className="py-3 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-body-2-medium font-semibold text-text-primary">
                                {gr.receiptNumber}
                              </span>
                              <Chip variant="caption" color={meta.color}>
                                {meta.label}
                              </Chip>
                            </div>
                            <p className="text-caption-1-regular text-text-tertiary mt-0.5 truncate">
                              {gr.purchaseOrderNumber} · {supName}
                            </p>
                          </div>
                          <span className="font-mono text-body-2-medium font-semibold text-text-primary tabular-nums">
                            +{formatQuantity(gr.totalReceivedUnits)} units
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Consolidated Directory Shortcuts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/procurement/suppliers"
                className="group rounded-2xl border border-border-button-default bg-background-primary-default p-4 hover:border-border-button-hover transition-colors flex items-center gap-3 shadow-2xs"
              >
                <div className="size-10 rounded-xl bg-background-secondary-default flex items-center justify-center text-text-secondary shrink-0">
                  <RiTruckLine className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-body-2-medium font-semibold text-text-primary">
                    Supplier Directory
                  </p>
                  <p className="text-caption-1-regular text-text-tertiary truncate">
                    Vendors, contacts &amp; terms
                  </p>
                </div>
              </Link>

              <Link
                href="/procurement/suppliers?tab=transactions"
                className="group rounded-2xl border border-border-button-default bg-background-primary-default p-4 hover:border-border-button-hover transition-colors flex items-center gap-3 shadow-2xs"
              >
                <div className="size-10 rounded-xl bg-background-secondary-default flex items-center justify-center text-text-secondary shrink-0">
                  <RiExchangeDollarLine className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-body-2-medium font-semibold text-text-primary">
                    Supplier Statements
                  </p>
                  <p className="text-caption-1-regular text-text-tertiary truncate">
                    Commitments &amp; receipts log
                  </p>
                </div>
              </Link>

              <Link
                href="/procurement/purchase-orders"
                className="group rounded-2xl border border-border-button-default bg-background-primary-default p-4 hover:border-border-button-hover transition-colors flex items-center gap-3 shadow-2xs"
              >
                <div className="size-10 rounded-xl bg-background-secondary-default flex items-center justify-center text-text-secondary shrink-0">
                  <RiFileList3Line className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-body-2-medium font-semibold text-text-primary">
                    Purchase Orders
                  </p>
                  <p className="text-caption-1-regular text-text-tertiary truncate">
                    Draft, submit &amp; print POs
                  </p>
                </div>
              </Link>

              <Link
                href="/procurement/goods-receipts"
                className="group rounded-2xl border border-border-button-default bg-background-primary-default p-4 hover:border-border-button-hover transition-colors flex items-center gap-3 shadow-2xs"
              >
                <div className="size-10 rounded-xl bg-background-secondary-default flex items-center justify-center text-text-secondary shrink-0">
                  <RiInboxArchiveLine className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-body-2-medium font-semibold text-text-primary">
                    Goods Receiving
                  </p>
                  <p className="text-caption-1-regular text-text-tertiary truncate">
                    Post deliveries to Inventory
                  </p>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </ProcurementModuleGate>
  );
}
