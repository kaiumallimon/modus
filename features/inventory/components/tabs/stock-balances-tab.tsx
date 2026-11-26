'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAlertLine,
  RiArrowLeftRightLine,
  RiCloseCircleLine,
  RiEqualizerLine,
  RiStackLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/base/buttons/button';
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
import { StockLevelMeter } from '../inventory-charts';
import { AdjustmentFormModal } from '../adjustment-form-modal';
import { TransferFormModal } from '../transfer-form-modal';
import { inventoryApi } from '../../api/inventory-api';
import {
  downloadCsv,
  formatQuantity,
  getStockStatusMeta,
} from '../../utils/formatters';
import type {
  Product,
  StockBalanceRow,
  StockStatus,
  Warehouse,
} from '../../types/inventory';

export interface StockBalancesTabProps {
  initialWarehouseId?: string;
  onCountChange?: (count: number) => void;
  onSwitchTab?: (tab: 'adjustments' | 'transfers') => void;
}

export function StockBalancesTab({
  initialWarehouseId,
  onCountChange,
  onSwitchTab,
}: StockBalancesTabProps) {
  const { hasPermission } = useAuth();
  const canAdjust = hasPermission('inventory.stock.adjust');
  const canTransfer = hasPermission('inventory.stock.transfer');

  const [rows, setRows] = useState<StockBalanceRow[]>([]);
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | StockStatus>('ALL');
  const [showStatistics, setShowStatistics] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

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

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    if (initialWarehouseId) {
      setWarehouseFilter(initialWarehouseId);
      setPage(1);
    }
  }, [initialWarehouseId]);

  const loadFilters = useCallback(async () => {
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

  const loadStock = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listStock({
        page,
        limit,
        search: debouncedSearch || undefined,
        productId: productFilter !== 'ALL' ? productFilter : undefined,
        warehouseId: warehouseFilter !== 'ALL' ? warehouseFilter : undefined,
        stockStatus: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setRows(res.data || []);
      const nextTotal = res.meta?.total ?? 0;
      setTotal(nextTotal);
      setTotalPages(res.meta?.totalPages ?? 1);
      setHasLoaded(true);
      onCountChangeRef.current?.(nextTotal);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load stock balances');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, productFilter, warehouseFilter, statusFilter]);

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  const hasActiveFilters =
    productFilter !== 'ALL' || warehouseFilter !== 'ALL' || statusFilter !== 'ALL';

  const resetFilters = () => {
    setProductFilter('ALL');
    setWarehouseFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  const statsItems = useMemo<InventoryStatItem[]>(() => {
    const pageUnits = rows.reduce((sum, r) => sum + (r.quantity || 0), 0);
    const lowCount = rows.filter((r) => r.stockStatus === 'LOW_STOCK').length;
    const outCount = rows.filter((r) => r.stockStatus === 'OUT_OF_STOCK').length;
    const healthyCount = rows.filter((r) => r.stockStatus === 'IN_STOCK').length;

    return [
      {
        id: 'stock-rows',
        label: 'Tracked Balances',
        value: total,
        tooltip: 'Distinct product-warehouse stock balances tracked across facilities.',
        contextLabel: 'on current page',
        badgeText: `${healthyCount} healthy`,
        badgeTone: 'accent',
        icon: RiStackLine,
      },
      {
        id: 'physical-units',
        label: 'Units in View',
        value: formatQuantity(pageUnits),
        tooltip: 'Sum of physical unit quantities across the displayed stock rows.',
        contextLabel: 'facilities',
        badgeText: `${new Set(rows.map((r) => r.warehouse._id)).size} warehouses`,
        badgeTone: 'neutral',
      },
      {
        id: 'low-stock',
        label: 'Low Stock Alerts',
        value: lowCount,
        tooltip: 'Rows currently at or below the product minimum stock threshold (> 0).',
        contextLabel: 'replenishment',
        badgeText: lowCount > 0 ? 'Reorder soon' : 'All healthy',
        badgeTone: lowCount > 0 ? 'yellow' : 'accent',
        icon: RiAlertLine,
      },
      {
        id: 'out-of-stock',
        label: 'Out of Stock',
        value: outCount,
        tooltip: 'SKU-warehouse balances with zero remaining physical units.',
        contextLabel: 'availability',
        badgeText: outCount > 0 ? 'Depleted' : '0 depleted',
        badgeTone: outCount > 0 ? 'rose' : 'accent',
        icon: RiCloseCircleLine,
      },
    ];
  }, [rows, total]);

  const handleExportCsv = () => {
    downloadCsv(
      `modus-stock-balances-page-${page}.csv`,
      ['Product', 'SKU', 'Category', 'Warehouse', 'Warehouse Code', 'Quantity', 'Unit', 'Min Threshold', 'Status'],
      rows.map((r) => [
        r.product.name,
        r.product.sku,
        r.category?.name || '',
        r.warehouse.name,
        r.warehouse.code,
        r.quantity,
        r.unit?.symbol || '',
        r.product.minStockThreshold ?? 0,
        r.stockStatus,
      ]),
    );
    toast.success('Exported stock balances CSV');
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
        searchPlaceholder="Search product name, SKU, or warehouse..."
        filterTitle="Filter Stock Balances"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        filterContent={
          <>
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
                <SelectItem key={p._id} id={p._id} textValue={`${p.name} (${p.sku})`}>
                  {p.sku} — {p.name}
                </SelectItem>
              ))}
            </Select>

            <Select
              label="Stock Status"
              aria-label="Filter by stock status"
              size="sm"
              selectedKey={statusFilter}
              onSelectionChange={(k) => {
                setStatusFilter(String(k) as 'ALL' | StockStatus);
                setPage(1);
              }}
              className="w-full"
            >
              <SelectItem id="ALL" textValue="All Statuses">
                All Statuses
              </SelectItem>
              <SelectItem id="IN_STOCK" textValue="In Stock">
                In Stock
              </SelectItem>
              <SelectItem id="LOW_STOCK" textValue="Low Stock">
                Low Stock
              </SelectItem>
              <SelectItem id="OUT_OF_STOCK" textValue="Out of Stock">
                Out of Stock
              </SelectItem>
            </Select>
          </>
        }
        showStatistics={showStatistics}
        onShowStatisticsChange={setShowStatistics}
        onRefresh={loadStock}
        refreshing={loading}
        onExport={handleExportCsv}
        exportDisabled={rows.length === 0}
        extraActions={
          canAdjust ? (
            <Button
              variant="secondary"
              size="medium"
              leadingIcon={RiEqualizerLine}
              onClick={() => setAdjustOpen(true)}
              className="h-10 px-5 gap-2 rounded-full text-body-medium font-medium shadow-2xs hover:shadow-xs transition-all"
            >
              Adjust Stock
            </Button>
          ) : undefined
        }
        primaryAction={
          canTransfer
            ? {
                label: 'Transfer Stock',
                icon: RiArrowLeftRightLine,
                onClick: () => setTransferOpen(true),
              }
            : undefined
        }
      />

      <div className="border border-border-button-default rounded-2xl bg-background-primary-default shadow-xs overflow-hidden">
        {!hasLoaded && loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="md" className="text-accent-600" />
          </div>
        ) : rows.length === 0 ? (
          <InventoryEmptyState
            icon={RiStackLine}
            title="No warehouse stock rows found"
            description={
              search || hasActiveFilters
                ? 'Try clearing filters or selecting another warehouse.'
                : 'Use Stock Adjustments (Opening Stock) to initialize balances in a warehouse.'
            }
            hasActiveFilters={Boolean(search || hasActiveFilters)}
            onClearFilters={() => {
              setSearch('');
              resetFilters();
            }}
            action={
              canAdjust && !search && !hasActiveFilters ? (
                <Button
                  variant="primary"
                  size="small"
                  leadingIcon={RiEqualizerLine}
                  onClick={() => setAdjustOpen(true)}
                >
                  Record Opening Stock
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
            <Table aria-label="Warehouse stock balances table" size="md">
              <TableHeader>
                <TableColumn isRowHeader>Product</TableColumn>
                <TableColumn>SKU</TableColumn>
                <TableColumn>Warehouse</TableColumn>
                <TableColumn>Balance vs. Threshold</TableColumn>
                <TableColumn>Stock Status</TableColumn>
              </TableHeader>
              <TableBody items={rows}>
                {(row) => {
                  const statusMeta = getStockStatusMeta(row.stockStatus);
                  const sym = row.unit?.symbol || '';
                  const threshold = row.product.minStockThreshold ?? 0;

                  return (
                    <TableRow key={row._id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium text-text-primary">{row.product.name}</p>
                          <p className="text-caption-1-regular text-text-tertiary">
                            {row.category?.name || 'Uncategorized'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-body-2-medium text-text-primary">
                          {row.product.sku}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-body-2-medium text-text-primary">
                            {row.warehouse.name}
                          </p>
                          <p className="font-mono text-caption-1-regular text-text-tertiary">
                            {row.warehouse.code}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[175px] space-y-1.5">
                          <div className="flex items-center justify-between gap-2 font-mono tabular-nums">
                            <span className="text-body-medium font-semibold text-text-primary">
                              {formatQuantity(row.quantity, sym)}
                            </span>
                            <span className="text-caption-1-regular text-text-tertiary">
                              Min: {formatQuantity(threshold, sym)}
                            </span>
                          </div>
                          <StockLevelMeter
                            quantity={row.quantity}
                            minThreshold={threshold}
                            status={row.stockStatus}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip variant="bold" color={statusMeta.color}>
                          {statusMeta.label}
                        </Chip>
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
          itemLabel="stock rows"
        />
      </div>

      <AdjustmentFormModal
        isOpen={adjustOpen}
        onOpenChange={setAdjustOpen}
        products={products}
        warehouses={warehouses}
        onSaved={() => {
          void loadStock();
          onSwitchTab?.('adjustments');
        }}
      />

      <TransferFormModal
        isOpen={transferOpen}
        onOpenChange={setTransferOpen}
        products={products}
        warehouses={warehouses}
        onCreated={() => {
          void loadStock();
          onSwitchTab?.('transfers');
        }}
      />
    </div>
  );
}
