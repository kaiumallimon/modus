'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAddCircleLine,
  RiAddLine,
  RiEqualizerLine,
  RiIndeterminateCircleLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Chip } from '@/components/base/badges/chip';
import { Select, SelectItem } from '@/components/base/select/select';
import { Spinner } from '@/components/base/spinner/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@/components/base/table/table';
import { toast } from '@/components/base/toast/toast';
import { InventoryPaginationFooter } from '../inventory-pagination-footer';
import { InventoryStatsBar, type InventoryStatItem } from '../inventory-stats-bar';
import { InventoryToolbar } from '../inventory-toolbar';
import { InventoryEmptyState } from '../inventory-empty-state';
import { AdjustmentFormModal } from '../adjustment-form-modal';
import { inventoryApi } from '../../api/inventory-api';
import {
  downloadCsv,
  formatQuantity,
  getAdjustmentTypeMeta,
  getRefName,
} from '../../utils/formatters';
import type {
  AdjustmentType,
  Product,
  StockAdjustment,
  Warehouse,
} from '../../types/inventory';

export interface AdjustmentsTabProps {
  onCountChange?: (count: number) => void;
}

export function AdjustmentsTab({ onCountChange }: AdjustmentsTabProps) {
  const { hasPermission } = useAuth();
  const canAdjust = hasPermission('inventory.stock.adjust');

  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | AdjustmentType>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [showStatistics, setShowStatistics] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed) {
      setDebouncedSearch('');
      return;
    }
    const timer = setTimeout(() => setDebouncedSearch(trimmed), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const loadMetadata = useCallback(async () => {
    try {
      const [prodRes, whRes] = await Promise.all([
        inventoryApi.listProducts({ limit: 100 }),
        inventoryApi.listWarehouses({ limit: 100 }),
      ]);
      setProducts(prodRes.data || []);
      setWarehouses(whRes.data || []);
    } catch {
      // Optional filters
    }
  }, []);

  const loadAdjustments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listAdjustments({
        page,
        limit,
        search: debouncedSearch || undefined,
        adjustmentType: typeFilter !== 'ALL' ? typeFilter : undefined,
        warehouseId: warehouseFilter !== 'ALL' ? warehouseFilter : undefined,
      });
      setAdjustments(res.data || []);
      const nextTotal = res.meta?.total ?? 0;
      setTotal(nextTotal);
      setTotalPages(res.meta?.totalPages ?? 1);
      setHasLoaded(true);
      onCountChangeRef.current?.(nextTotal);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load stock adjustments');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, typeFilter, warehouseFilter]);

  useEffect(() => {
    void loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    void loadAdjustments();
  }, [loadAdjustments]);

  const hasActiveFilters = typeFilter !== 'ALL' || warehouseFilter !== 'ALL';
  const resetFilters = () => {
    setTypeFilter('ALL');
    setWarehouseFilter('ALL');
    setPage(1);
  };

  const statsItems = useMemo<InventoryStatItem[]>(() => {
    const addedUnits = adjustments
      .filter((a) => a.adjustmentType !== 'DECREASE')
      .reduce((sum, a) => sum + a.quantity, 0);
    const deductedUnits = adjustments
      .filter((a) => a.adjustmentType === 'DECREASE')
      .reduce((sum, a) => sum + a.quantity, 0);

    return [
      {
        id: 'adj-total',
        label: 'Adjustments Logged',
        value: total,
        tooltip: 'Controlled opening stock and balance corrections recorded in the ledger.',
        contextLabel: 'on current page',
        badgeText: `${adjustments.length} records`,
        badgeTone: 'accent',
        icon: RiEqualizerLine,
      },
      {
        id: 'adj-added',
        label: 'Additions & Opening',
        value: `+${formatQuantity(addedUnits)}`,
        tooltip: 'Total units added via Opening Stock or Increase adjustments on this page.',
        contextLabel: 'inbound deltas',
        badgeText: `${adjustments.filter((a) => a.adjustmentType !== 'DECREASE').length} events`,
        badgeTone: 'accent',
        icon: RiAddCircleLine,
      },
      {
        id: 'adj-deducted',
        label: 'Deductions',
        value: `-${formatQuantity(deductedUnits)}`,
        tooltip: 'Total units written off or subtracted via Decrease adjustments on this page.',
        contextLabel: 'outbound deltas',
        badgeText: `${adjustments.filter((a) => a.adjustmentType === 'DECREASE').length} events`,
        badgeTone: deductedUnits > 0 ? 'rose' : 'neutral',
        icon: RiIndeterminateCircleLine,
      },
    ];
  }, [adjustments, total]);

  const handleExportCsv = () => {
    downloadCsv(
      `modus-adjustments-page-${page}.csv`,
      ['Reference', 'Type', 'Product', 'Warehouse', 'Quantity', 'Previous', 'Resulting', 'Reason', 'Actor', 'Timestamp'],
      adjustments.map((a) => [
        a.referenceNumber,
        a.adjustmentType,
        typeof a.productId === 'object' ? `${a.productId.name} (${a.productId.sku})` : a.productId,
        getRefName(a.warehouseId),
        a.adjustmentType === 'DECREASE' ? -a.quantity : a.quantity,
        a.previousQuantity,
        a.resultingQuantity,
        a.reason,
        a.createdBy?.email || '',
        new Date(a.createdAt).toISOString(),
      ]),
    );
    toast.success('Exported stock adjustments CSV');
  };

  return (
    <div className="space-y-5">
      {showStatistics && <InventoryStatsBar items={statsItems} />}

      <InventoryToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search reference, reason, or notes..."
        filterTitle="Filter Adjustments"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        filterContent={
          <>
            <Select
              label="Adjustment Type"
              aria-label="Filter by adjustment type"
              size="sm"
              selectedKey={typeFilter}
              onSelectionChange={(k) => {
                setTypeFilter(String(k) as 'ALL' | AdjustmentType);
                setPage(1);
              }}
              className="w-full"
            >
              <SelectItem id="ALL" textValue="All Types">
                All Types
              </SelectItem>
              <SelectItem id="OPENING_STOCK" textValue="Opening Stock">
                Opening Stock
              </SelectItem>
              <SelectItem id="INCREASE" textValue="Increase (+)">
                Increase (+)
              </SelectItem>
              <SelectItem id="DECREASE" textValue="Decrease (-)">
                Decrease (-)
              </SelectItem>
            </Select>

            <Select
              label="Warehouse"
              aria-label="Filter by warehouse"
              size="sm"
              selectedKey={warehouseFilter}
              onSelectionChange={(k) => {
                setWarehouseFilter(String(k));
                setPage(1);
              }}
              className="w-full"
            >
              <SelectItem id="ALL" textValue="All Warehouses">
                All Warehouses
              </SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w._id} id={w._id} textValue={w.name}>
                  {w.name} ({w.code})
                </SelectItem>
              ))}
            </Select>
          </>
        }
        showStatistics={showStatistics}
        onShowStatisticsChange={setShowStatistics}
        onRefresh={loadAdjustments}
        refreshing={loading}
        onExport={handleExportCsv}
        exportDisabled={adjustments.length === 0}
        primaryAction={
          canAdjust
            ? {
                label: 'New Adjustment',
                icon: RiAddLine,
                onClick: () => setModalOpen(true),
              }
            : undefined
        }
      />

      <div className="border border-border-button-default rounded-2xl bg-background-primary-default shadow-xs overflow-hidden">
        {!hasLoaded && loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="md" className="text-accent-600" />
          </div>
        ) : adjustments.length === 0 ? (
          <InventoryEmptyState
            icon={RiEqualizerLine}
            title="No stock adjustments recorded"
            description={
              search || hasActiveFilters
                ? 'Try clearing filters or another search keyword.'
                : 'Record opening stock or balance corrections to track changes in the movement ledger.'
            }
            hasActiveFilters={Boolean(search || hasActiveFilters)}
            onClearFilters={() => {
              setSearch('');
              resetFilters();
            }}
          />
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
            <Table aria-label="Stock adjustments history table" size="md">
              <TableHeader>
                <TableColumn isRowHeader>Reference</TableColumn>
                <TableColumn>Type</TableColumn>
                <TableColumn>Product / Warehouse</TableColumn>
                <TableColumn>Qty & Balance</TableColumn>
                <TableColumn>Reason</TableColumn>
                <TableColumn>Recorded By</TableColumn>
              </TableHeader>
              <TableBody items={adjustments}>
                {(adj) => {
                  const meta = getAdjustmentTypeMeta(adj.adjustmentType);
                  const prod = typeof adj.productId === 'object' ? adj.productId : null;
                  const sym = prod?.unitId?.symbol || '';

                  return (
                    <TableRow key={adj._id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-mono text-body-2-medium font-semibold text-text-primary">
                            {adj.referenceNumber}
                          </span>
                          <p className="text-caption-1-regular text-text-tertiary">
                            {new Date(adj.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip variant="bold" color={meta.color}>
                          {meta.label}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium text-text-primary">
                            {prod?.name || 'Product'}{' '}
                            {prod?.sku ? (
                              <span className="font-mono text-caption-1-regular text-text-tertiary">
                                ({prod.sku})
                              </span>
                            ) : null}
                          </p>
                          <p className="text-caption-1-regular text-text-secondary">
                            {getRefName(adj.warehouseId)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono tabular-nums space-y-0.5">
                          <p className="text-body-2-medium font-semibold text-text-primary">
                            {adj.adjustmentType === 'DECREASE' ? '-' : '+'}
                            {formatQuantity(adj.quantity, sym)}
                          </p>
                          <p className="text-caption-1-regular text-text-tertiary">
                            {adj.previousQuantity} → {adj.resultingQuantity}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs space-y-0.5">
                          <p className="truncate text-body-2-medium text-text-primary">
                            {adj.reason}
                          </p>
                          {adj.notes && (
                            <p className="truncate text-caption-1-regular text-text-tertiary">
                              {adj.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-caption-1-medium text-text-secondary">
                          {adj.createdBy?.email}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                }}
              </TableBody>
            </Table>
          </div>
        )}

        <InventoryPaginationFooter
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
          itemLabel="adjustments"
        />
      </div>

      <AdjustmentFormModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        products={products}
        warehouses={warehouses}
        onSaved={loadAdjustments}
      />
    </div>
  );
}
