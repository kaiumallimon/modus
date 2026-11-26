'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiArrowDownCircleLine,
  RiArrowUpCircleLine,
  RiCloseLine,
  RiEyeLine,
  RiHistoryLine,
} from '@remixicon/react';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Chip } from '@/components/base/badges/chip';
import { Select, SelectItem } from '@/components/base/select/select';
import {
  DateRangePicker,
  type DateRangeValue,
} from '@/components/base/date-picker/date-range-picker';
import { TableRowsSkeleton } from '@/components/application/loading/page-skeletons';
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
import { MovementBreakdownChartCard } from '../inventory-charts';
import { MovementDetailDrawer } from '../transfer-detail-drawer';
import { inventoryApi } from '../../api/inventory-api';
import {
  downloadCsv,
  formatQuantity,
  getMovementTypeMeta,
  getRefName,
} from '../../utils/formatters';
import type {
  Product,
  StockMovement,
  StockMovementType,
  Warehouse,
} from '../../types/inventory';

export interface MovementsTabProps {
  initialWarehouseId?: string;
  onCountChange?: (count: number) => void;
}

export function MovementsTab({
  initialWarehouseId,
  onCountChange,
}: MovementsTabProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [productFilter, setProductFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState(initialWarehouseId || 'ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | StockMovementType>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [showStatistics, setShowStatistics] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);

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

  useEffect(() => {
    if (initialWarehouseId) {
      setWarehouseFilter(initialWarehouseId);
      setPage(1);
    }
  }, [initialWarehouseId]);

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

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listMovements({
        page,
        limit,
        search: debouncedSearch || undefined,
        productId: productFilter !== 'ALL' ? productFilter : undefined,
        warehouseId: warehouseFilter !== 'ALL' ? warehouseFilter : undefined,
        movementType: typeFilter !== 'ALL' ? typeFilter : undefined,
        startDate: dateRange?.start ? dateRange.start.toString() : undefined,
        endDate: dateRange?.end ? dateRange.end.toString() : undefined,
      });
      setMovements(res.data || []);
      const nextTotal = res.meta?.total ?? 0;
      setTotal(nextTotal);
      setTotalPages(res.meta?.totalPages ?? 1);
      setHasLoaded(true);
      onCountChangeRef.current?.(nextTotal);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load stock movement ledger');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, productFilter, warehouseFilter, typeFilter, dateRange]);

  useEffect(() => {
    void loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    void loadMovements();
  }, [loadMovements]);

  const hasActiveFilters = Boolean(
    productFilter !== 'ALL' ||
      warehouseFilter !== 'ALL' ||
      typeFilter !== 'ALL' ||
      dateRange,
  );

  const resetFilters = () => {
    setProductFilter('ALL');
    setWarehouseFilter('ALL');
    setTypeFilter('ALL');
    setDateRange(null);
    setPage(1);
  };

  const statsItems = useMemo<InventoryStatItem[]>(() => {
    const inbound = movements
      .filter((m) => m.quantityChange > 0)
      .reduce((sum, m) => sum + m.quantityChange, 0);
    const outbound = movements
      .filter((m) => m.quantityChange < 0)
      .reduce((sum, m) => sum + Math.abs(m.quantityChange), 0);

    return [
      {
        id: 'ledger-total',
        label: 'Ledger Entries',
        value: total,
        tooltip: 'Append-only immutable audit records capturing every stock change.',
        contextLabel: 'audit posture',
        badgeText: 'Immutable',
        badgeTone: 'accent',
        icon: RiHistoryLine,
      },
      {
        id: 'ledger-in',
        label: 'Inbound Volume',
        value: `+${formatQuantity(inbound)}`,
        tooltip: 'Positive stock deltas displayed on this page (opening, increase, transfer in).',
        contextLabel: 'positive deltas',
        badgeText: `${movements.filter((m) => m.quantityChange > 0).length} entries`,
        badgeTone: 'accent',
        icon: RiArrowUpCircleLine,
      },
      {
        id: 'ledger-out',
        label: 'Outbound Volume',
        value: `-${formatQuantity(outbound)}`,
        tooltip: 'Negative stock deltas displayed on this page (decrease, transfer out).',
        contextLabel: 'negative deltas',
        badgeText: `${movements.filter((m) => m.quantityChange < 0).length} entries`,
        badgeTone: outbound > 0 ? 'rose' : 'neutral',
        icon: RiArrowDownCircleLine,
      },
    ];
  }, [movements, total]);

  const handleExportCsv = () => {
    downloadCsv(
      `modus-movements-page-${page}.csv`,
      ['Movement Type', 'Timestamp', 'Product', 'SKU', 'Warehouse', 'Qty Delta', 'Previous', 'Resulting', 'Reference', 'Actor'],
      movements.map((m) => {
        const prod = typeof m.productId === 'object' ? m.productId : null;
        return [
          m.movementType,
          new Date(m.createdAt).toISOString(),
          prod?.name || '',
          prod?.sku || '',
          getRefName(m.warehouseId),
          m.quantityChange,
          m.previousBalance,
          m.resultingBalance,
          m.referenceNumber,
          m.actor?.email || '',
        ];
      }),
    );
    toast.success('Exported movement ledger CSV');
  };

  return (
    <div className="space-y-5">
      {showStatistics && (
        <div className="space-y-4">
          <InventoryStatsBar items={statsItems} />
          <MovementBreakdownChartCard movements={movements} />
        </div>
      )}

      <InventoryToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search reference number, SKU, or description..."
        filterTitle="Filter Movement Ledger"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        filterContent={
          <>
            <Select
              label="Movement Type"
              aria-label="Filter by movement type"
              size="sm"
              selectedKey={typeFilter}
              onSelectionChange={(k) => {
                setTypeFilter(String(k) as 'ALL' | StockMovementType);
                setPage(1);
              }}
              className="w-full"
            >
              <SelectItem id="ALL" textValue="All Movement Types">
                All Types
              </SelectItem>
              <SelectItem id="OPENING_STOCK" textValue="Opening Stock">
                Opening Stock
              </SelectItem>
              <SelectItem id="ADJUSTMENT_INCREASE" textValue="Adjustment Increase">
                Adjustment (+)
              </SelectItem>
              <SelectItem id="ADJUSTMENT_DECREASE" textValue="Adjustment Decrease">
                Adjustment (-)
              </SelectItem>
              <SelectItem id="TRANSFER_IN" textValue="Transfer In">
                Transfer In
              </SelectItem>
              <SelectItem id="TRANSFER_OUT" textValue="Transfer Out">
                Transfer Out
              </SelectItem>
              <SelectItem id="PURCHASE_RECEIPT" textValue="Purchase Receipt">
                Purchase Receipt
              </SelectItem>
            </Select>

            <Select
              label="Product"
              aria-label="Filter by product"
              size="sm"
              selectedKey={productFilter}
              onSelectionChange={(k) => {
                setProductFilter(String(k));
                setPage(1);
              }}
              className="w-full"
            >
              <SelectItem id="ALL" textValue="All Products">
                All Products
              </SelectItem>
              {products.map((p) => (
                <SelectItem key={p._id} id={p._id} textValue={p.name}>
                  {p.sku} — {p.name}
                </SelectItem>
              ))}
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-caption-1-medium text-text-primary">Date Range</span>
                {dateRange && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateRange(null);
                      setPage(1);
                    }}
                    className="inline-flex items-center gap-0.5 text-caption-1-medium text-text-tertiary hover:text-text-primary cursor-pointer"
                  >
                    <RiCloseLine className="size-3.5" /> Clear
                  </button>
                )}
              </div>
              <DateRangePicker
                aria-label="Filter movements by date range"
                value={dateRange}
                onChange={(range) => {
                  setDateRange(range);
                  setPage(1);
                }}
              />
            </div>
          </>
        }
        showStatistics={showStatistics}
        onShowStatisticsChange={setShowStatistics}
        onRefresh={loadMovements}
        refreshing={loading}
        onExport={handleExportCsv}
        exportDisabled={movements.length === 0}
      />

      <div className="border border-border-button-default rounded-2xl bg-background-primary-default shadow-xs overflow-hidden">
        {!hasLoaded && loading ? (
          <TableRowsSkeleton rows={6} columns={6} />
        ) : movements.length === 0 ? (
          <InventoryEmptyState
            icon={RiHistoryLine}
            title="No stock movements recorded"
            description={
              search || hasActiveFilters
                ? 'Try clearing filters or widening the selected date range.'
                : 'All stock adjustments and confirmed warehouse transfers automatically log entries here.'
            }
            hasActiveFilters={Boolean(search || hasActiveFilters)}
            onClearFilters={() => {
              setSearch('');
              resetFilters();
            }}
          />
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
            <Table aria-label="Stock movement ledger table" size="md">
              <TableHeader>
                <TableColumn isRowHeader>Movement / Timestamp</TableColumn>
                <TableColumn>Product</TableColumn>
                <TableColumn>Warehouse</TableColumn>
                <TableColumn>Qty Delta</TableColumn>
                <TableColumn>Balance Trail</TableColumn>
                <TableColumn>Reference</TableColumn>
                <TableColumn>Inspect</TableColumn>
              </TableHeader>
              <TableBody items={movements}>
                {(mov) => {
                  const meta = getMovementTypeMeta(mov.movementType);
                  const prod = typeof mov.productId === 'object' ? mov.productId : null;
                  const sym = prod?.unitId?.symbol || '';

                  return (
                    <TableRow key={mov._id}>
                      <TableCell>
                        <div className="space-y-1">
                          <Chip variant="bold" color={meta.color}>
                            {meta.label}
                          </Chip>
                          <p className="text-caption-1-regular text-text-tertiary">
                            {new Date(mov.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium text-text-primary">
                            {prod?.name || 'Product'}
                          </p>
                          <p className="font-mono text-caption-1-regular text-text-tertiary">
                            {prod?.sku || ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-body-2-medium text-text-secondary">
                          {getRefName(mov.warehouseId)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-mono text-body-medium font-semibold tabular-nums ${
                            mov.quantityChange > 0
                              ? 'text-status-lime-text'
                              : 'text-status-rose-text'
                          }`}
                        >
                          {mov.quantityChange > 0
                            ? `+${formatQuantity(mov.quantityChange, sym)}`
                            : formatQuantity(mov.quantityChange, sym)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-body-2-medium text-text-secondary tabular-nums">
                          {mov.previousBalance} →{' '}
                          <strong className="text-text-primary">{mov.resultingBalance}</strong>
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-mono text-caption-1-semibold text-text-primary">
                            {mov.referenceNumber}
                          </p>
                          <p className="text-caption-2-medium text-text-tertiary">
                            {mov.actor?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          icon={RiEyeLine}
                          size="small"
                          aria-label={`Inspect movement ${mov.referenceNumber}`}
                          onClick={() => setSelectedMovement(mov)}
                        />
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
          itemLabel="movements"
        />
      </div>

      <MovementDetailDrawer
        movement={selectedMovement}
        onClose={() => setSelectedMovement(null)}
      />
    </div>
  );
}
