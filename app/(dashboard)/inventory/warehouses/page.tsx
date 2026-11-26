'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiAddLine,
  RiBuilding2Line,
  RiDeleteBinLine,
  RiEditLine,
  RiEyeLine,
  RiShutDownLine,
  RiStackLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Chip } from '@/components/base/badges/chip';
import { Meter } from '@/components/base/meter/meter';
import { Select, SelectItem } from '@/components/base/select/select';
import { TableRowsSkeleton } from '@/components/application/loading/page-skeletons';
import { AlertDialog } from '@/components/base/modal/modal';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@/components/base/table/table';
import { toast } from '@/components/base/toast/toast';
import { InventoryModuleGate } from '@/features/inventory/components/inventory-module-gate';
import { InventoryPageHeader } from '@/features/inventory/components/inventory-page-header';
import {
  InventoryStatsBar,
  type InventoryStatItem,
} from '@/features/inventory/components/inventory-stats-bar';
import {
  InventoryToolbar,
  type InventorySortOption,
} from '@/features/inventory/components/inventory-toolbar';
import { InventoryEmptyState } from '@/features/inventory/components/inventory-empty-state';
import { InventoryPaginationFooter } from '@/features/inventory/components/inventory-pagination-footer';
import { WarehouseFormModal } from '@/features/inventory/components/warehouse-form-modal';
import { WarehouseDetailDrawer } from '@/features/inventory/components/warehouse-detail-drawer';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { downloadCsv, formatQuantity } from '@/features/inventory/utils/formatters';
import type { Warehouse } from '@/features/inventory/types/inventory';

const WAREHOUSE_SORT_OPTIONS: InventorySortOption[] = [
  { id: 'name:asc', label: 'Name (A → Z)' },
  { id: 'code:asc', label: 'Code (A → Z)' },
  { id: 'units:desc', label: 'Highest Stock Units' },
  { id: 'skus:desc', label: 'Most Stocked SKUs' },
];

export default function InventoryWarehousesPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('inventory.warehouses.create');
  const canUpdate = hasPermission('inventory.warehouses.update');
  const canDelete = hasPermission('inventory.warehouses.delete');

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortId, setSortId] = useState('name:asc');
  const [showStatistics, setShowStatistics] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Warehouse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);

  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed) {
      setDebouncedSearch('');
      return;
    }
    const timer = setTimeout(() => setDebouncedSearch(trimmed), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const loadWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listWarehouses({
        page,
        limit,
        search: debouncedSearch || undefined,
        isActive:
          statusFilter === 'active'
            ? true
            : statusFilter === 'inactive'
              ? false
              : undefined,
      });
      setWarehouses(res.data || []);
      setTotal(res.meta?.total ?? 0);
      setTotalPages(res.meta?.totalPages ?? 1);
      setHasLoaded(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter]);

  useEffect(() => {
    void loadWarehouses();
  }, [loadWarehouses]);

  const sortedWarehouses = useMemo(() => {
    const copy = [...warehouses];
    switch (sortId) {
      case 'code:asc':
        return copy.sort((a, b) => a.code.localeCompare(b.code));
      case 'units:desc':
        return copy.sort((a, b) => (b.totalStockUnits ?? 0) - (a.totalStockUnits ?? 0));
      case 'skus:desc':
        return copy.sort(
          (a, b) => (b.stockedProductsCount ?? 0) - (a.stockedProductsCount ?? 0),
        );
      default:
        return copy.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [warehouses, sortId]);

  const aggregateUnits = useMemo(
    () => warehouses.reduce((sum, w) => sum + (w.totalStockUnits ?? 0), 0),
    [warehouses],
  );

  const statsItems = useMemo<InventoryStatItem[]>(() => {
    const activeCount = warehouses.filter((w) => w.isActive).length;
    const inactiveCount = warehouses.filter((w) => !w.isActive).length;
    const totalSkusHeld = warehouses.reduce(
      (sum, w) => sum + (w.stockedProductsCount ?? 0),
      0,
    );

    return [
      {
        id: 'wh-active',
        label: 'Warehouses',
        value: total,
        tooltip: 'Physical facilities holding independent stock balances.',
        contextLabel: 'facility status',
        badgeText: `${activeCount} active · ${inactiveCount} inactive`,
        badgeTone: inactiveCount > 0 ? 'neutral' : 'accent',
        icon: RiBuilding2Line,
      },
      {
        id: 'wh-units',
        label: 'Stocked Units',
        value: formatQuantity(aggregateUnits),
        tooltip: 'Aggregate physical stock units across displayed facilities.',
        contextLabel: 'on current page',
        badgeText: `${warehouses.filter((w) => (w.totalStockUnits ?? 0) > 0).length} stocked`,
        badgeTone: 'accent',
        icon: RiStackLine,
      },
      {
        id: 'wh-skus',
        label: 'Facility SKU Slots',
        value: totalSkusHeld,
        tooltip: 'Sum of active product slots distributed across these locations.',
        contextLabel: 'distribution',
        badgeText: `${totalSkusHeld} balance links`,
        badgeTone: 'neutral',
      },
    ];
  }, [warehouses, total, aggregateUnits]);

  const hasActiveFilters = statusFilter !== 'ALL';

  const handleExportCsv = () => {
    downloadCsv(
      `modus-warehouses-page-${page}.csv`,
      ['Name', 'Code', 'City', 'Country', 'Total Units', 'Stocked SKUs', 'Status'],
      sortedWarehouses.map((w) => [
        w.name,
        w.code,
        w.address?.city || '',
        w.address?.country || '',
        w.totalStockUnits ?? 0,
        w.stockedProductsCount ?? 0,
        w.isActive ? 'Active' : 'Deactivated',
      ]),
    );
    toast.success('Exported warehouses CSV');
  };

  return (
    <InventoryModuleGate permission="inventory.warehouses.read">
      <div className="space-y-6">
        <InventoryPageHeader
          title="Warehouses"
          description="Storage locations and physical facilities tracking independent product balances."
        />

        {showStatistics && <InventoryStatsBar items={statsItems} />}

        <InventoryToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search warehouses by name, code, or city..."
          filterTitle="Filter Warehouses"
          hasActiveFilters={hasActiveFilters}
          onResetFilters={() => {
            setStatusFilter('ALL');
            setPage(1);
          }}
          filterContent={
            <Select
              label="Facility Status"
              aria-label="Filter by warehouse status"
              size="sm"
              selectedKey={statusFilter}
              onSelectionChange={(k) => {
                setStatusFilter(String(k));
                setPage(1);
              }}
              className="w-full"
            >
              <SelectItem id="ALL" textValue="All Statuses">
                All Statuses
              </SelectItem>
              <SelectItem id="active" textValue="Active Only">
                Active Only
              </SelectItem>
              <SelectItem id="inactive" textValue="Deactivated Only">
                Deactivated Only
              </SelectItem>
            </Select>
          }
          sortOptions={WAREHOUSE_SORT_OPTIONS}
          activeSortId={sortId}
          onSortSelect={setSortId}
          showStatistics={showStatistics}
          onShowStatisticsChange={setShowStatistics}
          onRefresh={loadWarehouses}
          refreshing={loading}
          onExport={handleExportCsv}
          exportDisabled={sortedWarehouses.length === 0}
          primaryAction={
            canCreate
              ? {
                  label: 'New Warehouse',
                  icon: RiAddLine,
                  onClick: () => {
                    setEditing(null);
                    setModalOpen(true);
                  },
                }
              : undefined
          }
        />

        <div className="border border-border-button-default rounded-2xl bg-background-primary-default shadow-xs overflow-hidden">
          {!hasLoaded && loading ? (
            <TableRowsSkeleton rows={6} columns={5} />
          ) : sortedWarehouses.length === 0 ? (
            <InventoryEmptyState
              icon={RiBuilding2Line}
              title="No warehouses configured"
              description={
                search || hasActiveFilters
                  ? 'Try adjusting your search query or filters.'
                  : 'Create warehouses to track physical stock balances per facility.'
              }
              hasActiveFilters={Boolean(search || hasActiveFilters)}
              onClearFilters={() => {
                setSearch('');
                setStatusFilter('ALL');
                setPage(1);
              }}
            />
          ) : (
            <div className={`overflow-x-auto transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
              <Table aria-label="Inventory warehouses table" size="md">
                <TableHeader>
                  <TableColumn isRowHeader>Warehouse</TableColumn>
                  <TableColumn>Code</TableColumn>
                  <TableColumn>Location</TableColumn>
                  <TableColumn>Stock Allocation</TableColumn>
                  <TableColumn>Status</TableColumn>
                  <TableColumn>Actions</TableColumn>
                </TableHeader>
                <TableBody items={sortedWarehouses}>
                  {(wh) => {
                    const addr = wh.address;
                    const locationStr = [addr?.city, addr?.state, addr?.country]
                      .filter(Boolean)
                      .join(', ');
                    const unitsCount = wh.totalStockUnits ?? 0;
                    const sharePct =
                      aggregateUnits > 0
                        ? Math.round((unitsCount / aggregateUnits) * 100)
                        : 0;

                    return (
                      <TableRow key={wh._id}>
                        <TableCell>
                          <div className="space-y-0.5 max-w-xs">
                            <p className="font-medium text-text-primary">{wh.name}</p>
                            {wh.description && (
                              <p className="truncate text-caption-1-regular text-text-tertiary">
                                {wh.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip variant="caption" color="neutral" className="font-mono">
                            {wh.code}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <span className="text-body-2-regular text-text-secondary">
                            {locationStr || addr?.street || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[165px] space-y-1.5">
                            <div className="flex items-center justify-between gap-2 font-mono tabular-nums">
                              <span className="text-body-2-medium text-text-primary">
                                {formatQuantity(unitsCount)} units
                              </span>
                              <span className="text-caption-1-regular text-text-tertiary">
                                {wh.stockedProductsCount ?? 0} SKU(s) · {sharePct}%
                              </span>
                            </div>
                            <Meter
                              aria-label={`${wh.name} stock allocation`}
                              showValueLabel={false}
                              value={unitsCount}
                              minValue={0}
                              maxValue={Math.max(aggregateUnits, 1)}
                              tone={unitsCount > 0 ? 'accent' : 'warning'}
                              size="sm"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip variant="bold" color={wh.isActive ? 'lime' : 'neutral'}>
                            {wh.isActive ? 'Active' : 'Deactivated'}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <IconButton
                              icon={RiEyeLine}
                              size="small"
                              aria-label={`View warehouse details for ${wh.name}`}
                              onClick={() => setDetailId(wh._id)}
                            />
                            {canUpdate && (
                              <IconButton
                                icon={RiEditLine}
                                size="small"
                                aria-label={`Edit warehouse ${wh.name}`}
                                onClick={() => {
                                  setEditing(wh);
                                  setModalOpen(true);
                                }}
                              />
                            )}
                            {canDelete && wh.isActive && (
                              <IconButton
                                icon={RiShutDownLine}
                                size="small"
                                aria-label={`Deactivate warehouse ${wh.name}`}
                                onClick={() => setDeactivateTarget(wh)}
                              />
                            )}
                            {canDelete && (wh.stockedProductsCount ?? 0) === 0 && (
                              <IconButton
                                icon={RiDeleteBinLine}
                                size="small"
                                aria-label={`Delete unused warehouse ${wh.name}`}
                                onClick={() => setDeleteTarget(wh)}
                              />
                            )}
                          </div>
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
            itemLabel="warehouses"
          />
        </div>
      </div>

      <WarehouseFormModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        editingWarehouse={editing}
        onSaved={loadWarehouses}
      />

      <WarehouseDetailDrawer
        warehouseId={detailId}
        onClose={() => setDetailId(null)}
      />

      <AlertDialog
        isOpen={Boolean(deactivateTarget)}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title={`Deactivate "${deactivateTarget?.name}" (${deactivateTarget?.code})?`}
        description="Deactivated warehouses keep their historical stock records intact but cannot be selected for new adjustments or transfers."
        confirmLabel="Deactivate Warehouse"
        variant="danger"
        onConfirm={async () => {
          if (!deactivateTarget) return;
          try {
            await inventoryApi.deactivateWarehouse(deactivateTarget._id);
            toast.success(`Warehouse "${deactivateTarget.name}" deactivated`);
            setDeactivateTarget(null);
            await loadWarehouses();
          } catch (err: any) {
            toast.error(err.message || 'Failed to deactivate warehouse');
          }
        }}
      />

      <AlertDialog
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="Only warehouses with zero stock balances, movements, or transfers may be deleted permanently."
        confirmLabel="Delete Warehouse"
        variant="danger"
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await inventoryApi.deleteWarehouse(deleteTarget._id);
            toast.success(`Warehouse "${deleteTarget.name}" deleted`);
            setDeleteTarget(null);
            await loadWarehouses();
          } catch (err: any) {
            toast.error(err.message || 'Cannot delete warehouse');
          }
        }}
      />
    </InventoryModuleGate>
  );
}
