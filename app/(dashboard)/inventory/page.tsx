'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  RiAlertLine,
  RiArrowLeftRightLine,
  RiBuilding2Line,
  RiEqualizerLine,
  RiErrorWarningLine,
  RiHistoryLine,
  RiPriceTag3Line,
  RiRefreshLine,
  RiStackLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { InventoryOverviewSkeleton } from '@/components/application/loading/page-skeletons';
import { toast } from '@/components/base/toast/toast';
import { InventoryModuleGate } from '@/features/inventory/components/inventory-module-gate';
import { InventoryPageHeader } from '@/features/inventory/components/inventory-page-header';
import {
  InventoryStatsBar,
  type InventoryStatItem,
} from '@/features/inventory/components/inventory-stats-bar';
import {
  StockFlowChartCard,
  StockLevelMeter,
  WarehouseDistributionChartCard,
} from '@/features/inventory/components/inventory-charts';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import {
  formatQuantity,
  getMovementTypeMeta,
  getRefName,
} from '@/features/inventory/utils/formatters';
import type {
  InventoryDashboardSummary,
  StockMovement,
} from '@/features/inventory/types/inventory';

const INVENTORY_READ_PERMS = [
  'inventory.products.read',
  'inventory.categories.read',
  'inventory.units.read',
  'inventory.warehouses.read',
  'inventory.stock.read',
  'inventory.movements.read',
];

export default function InventoryOverviewPage() {
  const { hasPermission } = useAuth();
  const [summary, setSummary] = useState<InventoryDashboardSummary | null>(null);
  const [chartMovements, setChartMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const canReadMovements = hasPermission('inventory.movements.read');

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, movRes] = await Promise.all([
        inventoryApi.getDashboard(),
        canReadMovements
          ? inventoryApi.listMovements({ limit: 100 }).catch(() => null)
          : Promise.resolve(null),
      ]);
      setSummary(dash);
      setChartMovements(movRes?.data || dash.recentMovements || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load inventory overview');
    } finally {
      setLoading(false);
    }
  }, [canReadMovements]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const metrics = summary?.metrics;

  const statsItems = useMemo<InventoryStatItem[]>(
    () => [
      {
        id: 'active-products',
        label: 'Active Products',
        value: metrics?.totalActiveProducts ?? 0,
        tooltip: 'Active SKUs configured across your master product catalog.',
        contextLabel: 'catalog coverage',
        badgeText: `${metrics?.totalCategories ?? 0} categories`,
        badgeTone: 'accent',
        icon: RiPriceTag3Line,
      },
      {
        id: 'active-warehouses',
        label: 'Active Warehouses',
        value: metrics?.totalWarehouses ?? 0,
        tooltip: 'Physical storage locations holding independent stock balances.',
        contextLabel: 'units available',
        badgeText: `${metrics?.totalUnits ?? 0} units`,
        badgeTone: 'neutral',
        icon: RiBuilding2Line,
      },
      {
        id: 'total-stock-units',
        label: 'Total Stock Units',
        value: formatQuantity(metrics?.totalStockUnits ?? 0),
        tooltip: 'Aggregate physical unit count across every active facility.',
        contextLabel: 'transfers queue',
        badgeText: `${metrics?.pendingTransfersCount ?? 0} pending`,
        badgeTone: (metrics?.pendingTransfersCount ?? 0) > 0 ? 'yellow' : 'accent',
        icon: RiStackLine,
      },
      {
        id: 'low-stock-alerts',
        label: 'Low Stock Alerts',
        value: metrics?.lowStockProductsCount ?? 0,
        tooltip: 'Active products at or below their configured minimum threshold.',
        contextLabel: 'availability',
        badgeText: `${metrics?.outOfStockProductsCount ?? 0} out of stock`,
        badgeTone:
          (metrics?.outOfStockProductsCount ?? 0) > 0
            ? 'rose'
            : (metrics?.lowStockProductsCount ?? 0) > 0
              ? 'yellow'
              : 'accent',
        icon: RiAlertLine,
      },
    ],
    [metrics],
  );

  return (
    <InventoryModuleGate anyPermissions={INVENTORY_READ_PERMS}>
      <div className="space-y-6">
        <InventoryPageHeader
          title="Inventory Overview"
          description="Live warehouse stock visibility, replenishment alerts, and immutable movement activity."
          actions={
            <>
              <Button
                variant="secondary"
                size="medium"
                leadingIcon={RiRefreshLine}
                onClick={loadSummary}
                disabled={loading}
                className="h-10 px-5 gap-2 rounded-full text-body-medium font-medium shadow-2xs hover:shadow-xs transition-all"
              >
                Refresh
              </Button>
              {hasPermission('inventory.stock.adjust') && (
                <Link href="/inventory/stock?tab=adjustments">
                  <Button
                    variant="secondary"
                    size="medium"
                    leadingIcon={RiEqualizerLine}
                    className="h-10 px-5 gap-2 rounded-full text-body-medium font-medium shadow-2xs hover:shadow-xs transition-all"
                  >
                    Adjust Stock
                  </Button>
                </Link>
              )}
              {hasPermission('inventory.stock.transfer') && (
                <Link href="/inventory/stock?tab=transfers">
                  <Button
                    variant="primary"
                    size="medium"
                    leadingIcon={RiArrowLeftRightLine}
                    className="h-10 px-5 gap-2 rounded-full text-body-medium font-semibold text-[#171B18] shadow-2xs hover:shadow-xs transition-all"
                  >
                    Transfer Stock
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
            {/* Segmented KPI Metrics Row */}
            <InventoryStatsBar items={statsItems} />

            {/* BoardUI Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <StockFlowChartCard
                movements={chartMovements}
                className="lg:col-span-7"
              />
              <WarehouseDistributionChartCard
                warehouses={summary?.warehouseSummary || []}
                className="lg:col-span-5"
              />
            </div>

            {/* Operational Split: Watchlist & Recent Ledger */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Low & Out-of-Stock Watchlist */}
              <div className="lg:col-span-5 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-title-3-semibold text-text-primary flex items-center gap-2">
                      <RiErrorWarningLine className="size-5 text-status-yellow-text" />
                      Low &amp; Out-of-Stock Watchlist
                    </h2>
                    <p className="text-caption-1-regular text-text-secondary mt-0.5">
                      Active SKUs requiring replenishment attention.
                    </p>
                  </div>
                  <Link href="/inventory/stock?tab=balances">
                    <Button variant="secondary" size="small">
                      View Stock
                    </Button>
                  </Link>
                </div>

                {!summary?.lowStockProducts || summary.lowStockProducts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-separator-border p-8 text-center">
                    <p className="text-body-2-regular text-text-secondary">
                      All active products currently meet healthy stock levels.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {summary.lowStockProducts.map((item) => (
                      <div
                        key={item._id}
                        className="rounded-xl border border-separator-border bg-background-secondary-default/40 p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-body-medium font-medium text-text-primary">
                              {item.name}
                            </p>
                            <p className="text-caption-1-regular font-mono text-text-tertiary">
                              {item.sku} · Min: {formatQuantity(item.minStockThreshold, item.unit?.symbol)}
                            </p>
                          </div>
                          <Chip
                            variant="bold"
                            color={item.status === 'OUT_OF_STOCK' ? 'rose' : 'yellow'}
                          >
                            {formatQuantity(item.totalStock, item.unit?.symbol)}
                          </Chip>
                        </div>
                        <StockLevelMeter
                          quantity={item.totalStock}
                          minThreshold={item.minStockThreshold}
                          status={item.status}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Movements Feed */}
              <div className="lg:col-span-7 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-title-3-semibold text-text-primary flex items-center gap-2">
                      <RiHistoryLine className="size-5 text-accent-600" />
                      Recent Stock Movements
                    </h2>
                    <p className="text-caption-1-regular text-text-secondary mt-0.5">
                      Latest append-only inventory movements across warehouses.
                    </p>
                  </div>
                  <Link href="/inventory/stock?tab=movements">
                    <Button variant="secondary" size="small">
                      Full Ledger
                    </Button>
                  </Link>
                </div>

                {!summary?.recentMovements || summary.recentMovements.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-separator-border p-8 text-center">
                    <p className="text-body-2-regular text-text-secondary">
                      No movements logged yet. Record an adjustment or confirm a transfer.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {summary.recentMovements.map((mov) => {
                      const meta = getMovementTypeMeta(mov.movementType);
                      const product =
                        typeof mov.productId === 'object' ? mov.productId : null;
                      const unitSym = product?.unitId?.symbol;
                      return (
                        <div
                          key={mov._id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-separator-border bg-background-secondary-default/40 px-3.5 py-2.5"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <Chip variant="caption" color={meta.color}>
                                {meta.label}
                              </Chip>
                              <span className="font-mono text-caption-1-semibold text-text-primary">
                                {mov.referenceNumber}
                              </span>
                              <span className="text-caption-1-regular text-text-secondary truncate">
                                {product?.name} · {getRefName(mov.warehouseId)}
                              </span>
                            </div>
                            <p className="truncate text-caption-1-regular text-text-tertiary">
                              {mov.description} · By {mov.actor?.email}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 font-mono">
                            <span
                              className={`text-body-medium font-semibold tabular-nums ${
                                mov.quantityChange > 0
                                  ? 'text-status-lime-text'
                                  : 'text-status-rose-text'
                              }`}
                            >
                              {mov.quantityChange > 0
                                ? `+${formatQuantity(mov.quantityChange, unitSym)}`
                                : formatQuantity(mov.quantityChange, unitSym)}
                            </span>
                            <span className="text-caption-1-regular text-text-tertiary tabular-nums">
                              ({mov.previousBalance} → {mov.resultingBalance})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </InventoryModuleGate>
  );
}
