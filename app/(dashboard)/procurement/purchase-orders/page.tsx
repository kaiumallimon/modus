'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  RiAddLine,
  RiEditLine,
  RiEyeLine,
  RiFileList3Line,
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
import {
  PageShellSkeleton,
  TableRowsSkeleton,
} from '@/components/application/loading/page-skeletons';
import { InventoryEmptyState } from '@/features/inventory/components/inventory-empty-state';
import { InventoryPageHeader } from '@/features/inventory/components/inventory-page-header';
import { InventoryPaginationFooter } from '@/features/inventory/components/inventory-pagination-footer';
import {
  InventoryStatsBar,
  type InventoryStatItem,
} from '@/features/inventory/components/inventory-stats-bar';
import { InventoryToolbar } from '@/features/inventory/components/inventory-toolbar';
import { downloadCsv, formatCurrency } from '@/features/inventory/utils/formatters';
import { procurementApi } from '@/features/procurement/api/procurement-api';
import { GoodsReceiptFormModal } from '@/features/procurement/components/goods-receipt-form-modal';
import { ProcurementModuleGate } from '@/features/procurement/components/procurement-module-gate';
import { PurchaseOrderDetailDrawer } from '@/features/procurement/components/purchase-order-detail-drawer';
import { PurchaseOrderFormModal } from '@/features/procurement/components/purchase-order-form-modal';
import { getPurchaseOrderStatusMeta } from '@/features/procurement/utils/formatters';
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
  Supplier,
} from '@/features/procurement/types/procurement';

function PurchaseOrdersContent() {
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('procurement.purchase-orders.create');
  const canUpdate = hasPermission('procurement.purchase-orders.update');
  const canSubmit = hasPermission('procurement.purchase-orders.submit');
  const canCancel = hasPermission('procurement.purchase-orders.cancel');
  const canCreateReceipt = hasPermission('procurement.goods-receipts.create');
  const canConfirmReceipt = hasPermission('procurement.goods-receipts.confirm');

  const initialSupplierParam = searchParams.get('supplierId') || 'ALL';

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PurchaseOrderStatus>('ALL');
  const [supplierFilter, setSupplierFilter] = useState(initialSupplierParam);
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'amount-desc'>('newest');
  const [showStats, setShowStats] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    procurementApi
      .listSuppliers({ page: 1, limit: 100 })
      .then((res) => setSuppliers(res.data || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await procurementApi.listPurchaseOrders({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        supplierId: supplierFilter !== 'ALL' ? supplierFilter : undefined,
        startDate: dateRange?.start ? dateRange.start.toString() : undefined,
        endDate: dateRange?.end ? dateRange.end.toString() : undefined,
      });
      setOrders(res.data || []);
      setTotal(res.meta?.total || 0);
      setTotalPages(res.meta?.totalPages || 1);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [page, limit, debouncedSearch, statusFilter, supplierFilter, dateRange]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const sortedOrders = useMemo(() => {
    const list = [...orders];
    if (sortBy === 'amount-desc') {
      list.sort((a, b) => b.grandTotal - a.grandTotal);
    }
    return list;
  }, [orders, sortBy]);

  const statsItems = useMemo<InventoryStatItem[]>(() => {
    const drafts = orders.filter((o) => o.status === 'DRAFT').length;
    const open = orders.filter(
      (o) => o.status === 'ORDERED' || o.status === 'PARTIALLY_RECEIVED',
    ).length;
    const valueSum = orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.grandTotal, 0);

    return [
      {
        id: 'total-pos',
        label: 'Purchase Orders',
        value: total,
        tooltip: 'Orders matching current search and filter criteria',
        contextLabel: 'filtered',
        badgeText: `${drafts} drafts on page`,
        badgeTone: 'neutral',
      },
      {
        id: 'awaiting-delivery',
        label: 'Awaiting Delivery (Page)',
        value: open,
        tooltip: 'Ordered or partially received purchase orders',
        contextLabel: 'open',
        badgeText: 'Ready to receive',
        badgeTone: open > 0 ? 'yellow' : 'neutral',
      },
      {
        id: 'po-value',
        label: 'Order Value (Page)',
        value: formatCurrency(valueSum),
        tooltip: 'Total non-cancelled PO value on current page',
        contextLabel: 'currency',
        badgeText: 'USD',
        badgeTone: 'accent',
      },
    ];
  }, [orders, total]);

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    supplierFilter !== 'ALL' ||
    Boolean(dateRange?.start || dateRange?.end);

  const handleExportCsv = () => {
    downloadCsv(
      'modus-purchase-orders.csv',
      ['PO Number', 'Supplier', 'Warehouse', 'Order Date', 'Items', 'Grand Total', 'Status'],
      sortedOrders.map((o) => [
        o.orderNumber,
        o.supplierNameSnapshot,
        typeof o.destinationWarehouseId === 'object'
          ? o.destinationWarehouseId?.code
          : '—',
        new Date(o.orderDate).toLocaleDateString(),
        o.items.length,
        o.grandTotal,
        o.status,
      ]),
    );
  };

  return (
    <ProcurementModuleGate permission="procurement.purchase-orders.read">
      <div className="space-y-6">
        <InventoryPageHeader
          title="Purchase Orders"
          description="Create multi-item supplier orders, manage Draft → Ordered → Received transitions, print POs, and trigger receiving."
        />

        {showStats && <InventoryStatsBar items={statsItems} />}

        <InventoryToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search PO #, supplier, SKU..."
          filterTitle="Filter Purchase Orders"
          hasActiveFilters={hasActiveFilters}
          onResetFilters={() => {
            setStatusFilter('ALL');
            setSupplierFilter('ALL');
            setDateRange(null);
            setPage(1);
          }}
          filterContent={
            <div className="space-y-3">
              <Select
                label="Order Status"
                size="sm"
                selectedKey={statusFilter}
                onSelectionChange={(k) => {
                  setStatusFilter(String(k) as 'ALL' | PurchaseOrderStatus);
                  setPage(1);
                }}
                className="w-full"
              >
                <SelectItem id="ALL" textValue="All Statuses">
                  All Statuses
                </SelectItem>
                <SelectItem id="DRAFT" textValue="Draft">
                  Draft
                </SelectItem>
                <SelectItem id="ORDERED" textValue="Ordered">
                  Ordered
                </SelectItem>
                <SelectItem id="PARTIALLY_RECEIVED" textValue="Partially Received">
                  Partially Received
                </SelectItem>
                <SelectItem id="RECEIVED" textValue="Received">
                  Received
                </SelectItem>
                <SelectItem id="CANCELLED" textValue="Cancelled">
                  Cancelled
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

              <div>
                <span className="text-caption-1-medium text-text-secondary block mb-1">
                  Order Date Range
                </span>
                <DateRangePicker
                  aria-label="Filter purchase orders by date range"
                  value={dateRange}
                  onChange={(val) => {
                    setDateRange(val);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          }
          sortOptions={[
            { id: 'newest', label: 'Newest First' },
            { id: 'amount-desc', label: 'Highest Order Total' },
          ]}
          activeSortId={sortBy}
          onSortSelect={(id) => setSortBy(id as typeof sortBy)}
          showStatistics={showStats}
          onShowStatisticsChange={setShowStats}
          onRefresh={loadOrders}
          refreshing={loading}
          onExport={handleExportCsv}
          exportDisabled={sortedOrders.length === 0}
          primaryAction={
            canCreate
              ? {
                  label: 'New Purchase Order',
                  icon: RiAddLine,
                  onClick: () => {
                    setEditingOrder(null);
                    setModalOpen(true);
                  },
                }
              : undefined
          }
        />

        <div className="border border-border-button-default rounded-2xl bg-background-primary-default shadow-xs overflow-hidden">
          {!hasLoaded && loading ? (
            <TableRowsSkeleton rows={6} columns={5} />
          ) : sortedOrders.length === 0 ? (
            <InventoryEmptyState
              icon={RiFileList3Line}
              title="No purchase orders found"
              description={
                search || hasActiveFilters
                  ? 'Try adjusting your search query, date range, or status filters.'
                  : 'Create your first draft purchase order from an active supplier.'
              }
              hasActiveFilters={Boolean(search || hasActiveFilters)}
              onClearFilters={() => {
                setSearch('');
                setStatusFilter('ALL');
                setSupplierFilter('ALL');
                setDateRange(null);
                setPage(1);
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table aria-label="Purchase orders list" selectionMode="none" className="w-full">
                <TableHeader>
                  <TableColumn isRowHeader>PO Number</TableColumn>
                  <TableColumn>Supplier &amp; Warehouse</TableColumn>
                  <TableColumn>Items</TableColumn>
                  <TableColumn>Grand Total</TableColumn>
                  <TableColumn>Status</TableColumn>
                  <TableColumn className="text-end">Actions</TableColumn>
                </TableHeader>
                <TableBody items={sortedOrders}>
                  {(po) => {
                    const meta = getPurchaseOrderStatusMeta(po.status);
                    const whObj =
                      typeof po.destinationWarehouseId === 'object'
                        ? po.destinationWarehouseId
                        : null;
                    const receivable =
                      canCreateReceipt &&
                      (po.status === 'ORDERED' ||
                        po.status === 'PARTIALLY_RECEIVED');
                    return (
                      <TableRow key={po._id} id={po._id}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-mono font-semibold text-text-primary">
                              {po.orderNumber}
                            </p>
                            <p className="text-caption-1-regular text-text-tertiary">
                              {new Date(po.orderDate).toLocaleDateString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium text-text-primary">
                              {po.supplierNameSnapshot}
                            </p>
                            <p className="font-mono text-caption-1-regular text-text-tertiary">
                              → {whObj ? `${whObj.name} (${whObj.code})` : 'Warehouse'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-body-2-medium text-text-secondary">
                            {po.items.length} line(s)
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-semibold text-text-primary tabular-nums">
                            {formatCurrency(po.grandTotal, po.currency)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Chip variant="caption" color={meta.color}>
                            {meta.label}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <IconButton
                              aria-label={`View ${po.orderNumber}`}
                              size="small"
                              icon={RiEyeLine}
                              onClick={() => setDetailId(po._id)}
                            />
                            {canUpdate && po.status === 'DRAFT' && (
                              <IconButton
                                aria-label={`Edit ${po.orderNumber}`}
                                size="small"
                                icon={RiEditLine}
                                onClick={() => {
                                  setEditingOrder(po);
                                  setModalOpen(true);
                                }}
                              />
                            )}
                            {receivable && (
                              <IconButton
                                aria-label={`Receive goods for ${po.orderNumber}`}
                                size="small"
                                icon={RiInboxArchiveLine}
                                onClick={() => setReceivingOrder(po)}
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
            itemLabel="orders"
          />
        </div>

        <PurchaseOrderFormModal
          isOpen={modalOpen}
          onOpenChange={setModalOpen}
          editingOrder={editingOrder}
          defaultSupplierId={
            supplierFilter !== 'ALL' ? supplierFilter : undefined
          }
          onSuccess={loadOrders}
        />

        <PurchaseOrderDetailDrawer
          orderId={detailId}
          onClose={() => setDetailId(null)}
          canUpdate={canUpdate}
          canSubmit={canSubmit}
          canCancel={canCancel}
          canReceive={canCreateReceipt}
          onEditDraft={(order) => {
            setEditingOrder(order);
            setModalOpen(true);
          }}
          onReceiveGoods={(order) => setReceivingOrder(order)}
          onChanged={loadOrders}
        />

        <GoodsReceiptFormModal
          isOpen={Boolean(receivingOrder)}
          onOpenChange={(open) => {
            if (!open) setReceivingOrder(null);
          }}
          initialPurchaseOrder={receivingOrder}
          canConfirm={canConfirmReceipt}
          onSuccess={loadOrders}
        />
      </div>
    </ProcurementModuleGate>
  );
}

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={<PageShellSkeleton showStats={false} />}>
      <PurchaseOrdersContent />
    </Suspense>
  );
}
