'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiAddLine,
  RiEyeLine,
  RiInboxArchiveLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Chip } from '@/components/base/badges/chip';
import { IconButton } from '@/components/base/buttons/icon-button';
import {
  DateRangePicker,
  type DateRangeValue,
} from '@/components/base/date-picker/date-range-picker';
import { Select, SelectItem } from '@/components/base/select/select';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@/components/base/table/table';
import { toast } from '@/components/base/toast/toast';
import { TableRowsSkeleton } from '@/components/application/loading/page-skeletons';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { InventoryEmptyState } from '@/features/inventory/components/inventory-empty-state';
import { InventoryPageHeader } from '@/features/inventory/components/inventory-page-header';
import { InventoryPaginationFooter } from '@/features/inventory/components/inventory-pagination-footer';
import {
  InventoryStatsBar,
  type InventoryStatItem,
} from '@/features/inventory/components/inventory-stats-bar';
import { InventoryToolbar } from '@/features/inventory/components/inventory-toolbar';
import type { Warehouse } from '@/features/inventory/types/inventory';
import {
  downloadCsv,
  formatCurrency,
  formatQuantity,
} from '@/features/inventory/utils/formatters';
import { procurementApi } from '@/features/procurement/api/procurement-api';
import { GoodsReceiptDetailDrawer } from '@/features/procurement/components/goods-receipt-detail-drawer';
import { GoodsReceiptFormModal } from '@/features/procurement/components/goods-receipt-form-modal';
import { ProcurementModuleGate } from '@/features/procurement/components/procurement-module-gate';
import { getGoodsReceiptStatusMeta } from '@/features/procurement/utils/formatters';
import type {
  GoodsReceipt,
  GoodsReceiptStatus,
  Supplier,
} from '@/features/procurement/types/procurement';

export default function GoodsReceiptsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('procurement.goods-receipts.create');
  const canConfirm = hasPermission('procurement.goods-receipts.confirm');

  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | GoodsReceiptStatus>('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      procurementApi.listSuppliers({ page: 1, limit: 100 }),
      inventoryApi.listWarehouses({ page: 1, limit: 100 }),
    ])
      .then(([sRes, wRes]) => {
        setSuppliers(sRes.data || []);
        setWarehouses(wRes.data || []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const loadReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await procurementApi.listGoodsReceipts({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        supplierId: supplierFilter !== 'ALL' ? supplierFilter : undefined,
        warehouseId: warehouseFilter !== 'ALL' ? warehouseFilter : undefined,
        startDate: dateRange?.start ? dateRange.start.toString() : undefined,
        endDate: dateRange?.end ? dateRange.end.toString() : undefined,
      });
      setReceipts(res.data || []);
      setTotal(res.meta?.total || 0);
      setTotalPages(res.meta?.totalPages || 1);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load goods receipts');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [
    page,
    limit,
    debouncedSearch,
    statusFilter,
    supplierFilter,
    warehouseFilter,
    dateRange,
  ]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const statsItems = useMemo<InventoryStatItem[]>(() => {
    const confirmedCount = receipts.filter(
      (r) => r.status === 'CONFIRMED',
    ).length;
    const totalUnits = receipts.reduce(
      (sum, r) => sum + (r.totalReceivedUnits || 0),
      0,
    );
    const totalVal = receipts.reduce(
      (sum, r) => sum + (r.totalReceivedValue || 0),
      0,
    );

    return [
      {
        id: 'goods-receipts-total',
        label: 'Goods Receipts',
        value: total,
        tooltip: 'Recorded receiving operations matching filters',
        contextLabel: 'filtered',
        badgeText: `${confirmedCount} confirmed on page`,
        badgeTone: 'accent',
      },
      {
        id: 'units-received-page',
        label: 'Units Received (Page)',
        value: formatQuantity(totalUnits),
        tooltip: 'Total physical stock units recorded in visible receipts',
        contextLabel: 'received value',
        badgeText: formatCurrency(totalVal),
        badgeTone: 'neutral',
      },
    ];
  }, [receipts, total]);

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    supplierFilter !== 'ALL' ||
    warehouseFilter !== 'ALL' ||
    Boolean(dateRange?.start || dateRange?.end);

  const handleExportCsv = () => {
    downloadCsv(
      'modus-goods-receipts.csv',
      ['Receipt #', 'PO #', 'Supplier', 'Warehouse', 'Received Units', 'Value', 'Date', 'Status'],
      receipts.map((r) => [
        r.receiptNumber,
        r.purchaseOrderNumber,
        typeof r.supplierId === 'object' ? r.supplierId?.name : '—',
        typeof r.destinationWarehouseId === 'object'
          ? r.destinationWarehouseId?.code
          : '—',
        r.totalReceivedUnits,
        r.totalReceivedValue,
        new Date(r.receivedDate).toLocaleDateString(),
        r.status,
      ]),
    );
  };

  return (
    <ProcurementModuleGate permission="procurement.goods-receipts.read">
      <div className="space-y-6">
        <InventoryPageHeader
          title="Goods Receipts"
          description="Receive full or partial shipments against submitted purchase orders and post verified stock increases into Inventory."
        />

        {showStats && <InventoryStatsBar items={statsItems} />}

        <InventoryToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search GRN #, PO #, SKU..."
          filterTitle="Filter Goods Receipts"
          hasActiveFilters={hasActiveFilters}
          onResetFilters={() => {
            setStatusFilter('ALL');
            setSupplierFilter('ALL');
            setWarehouseFilter('ALL');
            setDateRange(null);
            setPage(1);
          }}
          filterContent={
            <div className="space-y-3">
              <Select
                label="Receipt Status"
                size="sm"
                selectedKey={statusFilter}
                onSelectionChange={(k) => {
                  setStatusFilter(String(k) as 'ALL' | GoodsReceiptStatus);
                  setPage(1);
                }}
                className="w-full"
              >
                <SelectItem id="ALL" textValue="All Statuses">
                  All Statuses
                </SelectItem>
                <SelectItem id="CONFIRMED" textValue="Confirmed">
                  Confirmed
                </SelectItem>
                <SelectItem id="DRAFT" textValue="Draft">
                  Draft
                </SelectItem>
              </Select>

              <Select
                label="Supplier"
                size="sm"
                selectedKey={supplierFilter}
                onSelectionChange={(k) => {
                  setSupplierFilter(String(k));
                  setPage(1);
                }}
                className="w-full"
              >
                <SelectItem id="ALL" textValue="All Suppliers">
                  All Suppliers
                </SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s._id} id={s._id} textValue={`${s.name} ${s.code}`}>
                    {s.name} ({s.code})
                  </SelectItem>
                ))}
              </Select>

              <Select
                label="Warehouse"
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
                  <SelectItem key={w._id} id={w._id} textValue={`${w.name} ${w.code}`}>
                    {w.name} ({w.code})
                  </SelectItem>
                ))}
              </Select>

              <div>
                <span className="text-caption-1-medium text-text-secondary block mb-1">
                  Received Date Range
                </span>
                <DateRangePicker
                  aria-label="Filter goods receipts by received date range"
                  value={dateRange}
                  onChange={(val) => {
                    setDateRange(val);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          }
          showStatistics={showStats}
          onShowStatisticsChange={setShowStats}
          onRefresh={loadReceipts}
          refreshing={loading}
          onExport={handleExportCsv}
          exportDisabled={receipts.length === 0}
          primaryAction={
            canCreate
              ? {
                  label: 'Receive Goods',
                  icon: RiAddLine,
                  onClick: () => setModalOpen(true),
                }
              : undefined
          }
        />

        <div className="border border-border-button-default rounded-2xl bg-background-primary-default shadow-xs overflow-hidden">
          {!hasLoaded && loading ? (
            <TableRowsSkeleton rows={6} columns={5} />
          ) : receipts.length === 0 ? (
            <InventoryEmptyState
              icon={RiInboxArchiveLine}
              title="No goods receipts found"
              description={
                search || hasActiveFilters
                  ? 'Try adjusting your search keywords or filters.'
                  : 'Receive goods against an ordered purchase order to log warehouse deliveries.'
              }
              hasActiveFilters={Boolean(search || hasActiveFilters)}
              onClearFilters={() => {
                setSearch('');
                setStatusFilter('ALL');
                setSupplierFilter('ALL');
                setWarehouseFilter('ALL');
                setDateRange(null);
                setPage(1);
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table aria-label="Goods receipt history" selectionMode="none" className="w-full">
                <TableHeader>
                  <TableColumn isRowHeader>Receipt # &amp; PO</TableColumn>
                  <TableColumn>Supplier &amp; Warehouse</TableColumn>
                  <TableColumn>Received</TableColumn>
                  <TableColumn>Status</TableColumn>
                  <TableColumn className="text-end">Inspect</TableColumn>
                </TableHeader>
                <TableBody items={receipts}>
                  {(gr) => {
                    const meta = getGoodsReceiptStatusMeta(gr.status);
                    const supObj =
                      typeof gr.supplierId === 'object' ? gr.supplierId : null;
                    const whObj =
                      typeof gr.destinationWarehouseId === 'object'
                        ? gr.destinationWarehouseId
                        : null;
                    return (
                      <TableRow key={gr._id} id={gr._id}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-mono font-semibold text-text-primary">
                              {gr.receiptNumber}
                            </p>
                            <p className="font-mono text-caption-1-regular text-text-tertiary">
                              PO: {gr.purchaseOrderNumber} ·{' '}
                              {new Date(gr.receivedDate).toLocaleDateString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium text-text-primary">
                              {supObj?.name || 'Supplier'}
                            </p>
                            <p className="font-mono text-caption-1-regular text-text-tertiary">
                              → {whObj ? `${whObj.name} (${whObj.code})` : 'Warehouse'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 font-mono tabular-nums">
                            <p className="font-semibold text-text-primary">
                              +{formatQuantity(gr.totalReceivedUnits)} units
                            </p>
                            <p className="text-caption-1-regular text-text-tertiary">
                              {formatCurrency(gr.totalReceivedValue, gr.currency)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip variant="caption" color={meta.color}>
                            {meta.label}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <IconButton
                              aria-label={`Inspect ${gr.receiptNumber}`}
                              size="small"
                              icon={RiEyeLine}
                              onClick={() => setDetailId(gr._id)}
                            />
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
            itemLabel="receipts"
          />
        </div>

        <GoodsReceiptFormModal
          isOpen={modalOpen}
          onOpenChange={setModalOpen}
          canConfirm={canConfirm}
          onSuccess={loadReceipts}
        />

        <GoodsReceiptDetailDrawer
          receiptId={detailId}
          onClose={() => setDetailId(null)}
          canConfirm={canConfirm}
          onConfirmed={loadReceipts}
        />
      </div>
    </ProcurementModuleGate>
  );
}
