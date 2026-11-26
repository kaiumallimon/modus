'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  RiAddLine,
  RiCheckDoubleLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiEditLine,
  RiEyeLine,
  RiShoppingCart2Line,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Chip } from '@/components/base/badges/chip';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import {
  DateRangePicker,
  type DateRangeValue,
} from '@/components/base/date-picker/date-range-picker';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@/components/base/modal/modal';
import { Select, SelectItem } from '@/components/base/select/select';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@/components/base/table/table';
import { Textarea } from '@/components/base/textarea/textarea';
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
import { downloadCsv } from '@/features/inventory/utils/formatters';
import { salesApi } from '@/features/sales/api/sales-api';
import { SalesFulfillmentFormModal } from '@/features/sales/components/sales-fulfillment-form-modal';
import { SalesModuleGate } from '@/features/sales/components/sales-module-gate';
import { SalesOrderFormModal } from '@/features/sales/components/sales-order-form-modal';
import type {
  CustomerRecord,
  SalesOrderRecord,
  SalesOrderStatus,
} from '@/features/sales/types/sales';
import {
  formatSalesCurrency,
  formatSalesDate,
  getSalesOrderStatusMeta,
} from '@/features/sales/utils/formatters';

function SalesOrdersContent() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('sales.orders.create');
  const canUpdate = hasPermission('sales.orders.update');
  const canConfirm = hasPermission('sales.orders.confirm');
  const canCancel = hasPermission('sales.orders.cancel');
  const canFulfill = hasPermission('sales.fulfillments.create');

  const [orders, setOrders] = useState<SalesOrderRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SalesOrderStatus>('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [sortId, setSortId] = useState<
    'orderDate:desc' | 'orderDate:asc' | 'grandTotal:desc'
  >('orderDate:desc');
  const [showStats, setShowStats] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrderRecord | null>(null);
  const [fulfillOrderTarget, setFulfillOrderTarget] =
    useState<SalesOrderRecord | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SalesOrderRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      salesApi.listCustomers({ limit: 100 }).catch(() => null),
      inventoryApi.listWarehouses({ limit: 100 }).catch(() => null),
    ]).then(([custRes, whRes]) => {
      if (custRes?.items) setCustomers(custRes.items);
      if (whRes?.data) setWarehouses(whRes.data);
    });
  }, []);

  const loadOrders = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [sortBy, sortOrder] = sortId.split(':') as [string, 'asc' | 'desc'];
      try {
        const res = await salesApi.listOrders({
          page,
          limit,
          search: search.trim() || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          customerId: customerFilter !== 'ALL' ? customerFilter : undefined,
          warehouseId: warehouseFilter !== 'ALL' ? warehouseFilter : undefined,
          startDate: dateRange?.start
            ? `${dateRange.start}T00:00:00.000Z`
            : undefined,
          endDate: dateRange?.end ? `${dateRange.end}T23:59:59.999Z` : undefined,
          sortBy,
          sortOrder,
        });
        setOrders(res.items || []);
        setTotal(res.pagination?.total ?? 0);
        setTotalPages(res.pagination?.totalPages ?? 1);
      } catch (err: any) {
        toast.error('Failed to Load Sales Orders', {
          description: err?.message || 'Unable to fetch sales orders.',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      limit,
      search,
      statusFilter,
      customerFilter,
      warehouseFilter,
      dateRange,
      sortId,
    ]
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleConfirmOrder = async (order: SalesOrderRecord) => {
    setActionBusyId(order._id);
    try {
      await salesApi.confirmOrder(order._id);
      toast.success('Order Confirmed', {
        description: `${order.orderNumber} validated against warehouse stock and is ready for fulfillment.`,
      });
      loadOrders(true);
    } catch (err: any) {
      toast.error('Confirmation Blocked', {
        description: err?.message || 'Could not confirm sales order.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;
    setActionBusyId(cancelTarget._id);
    try {
      await salesApi.cancelOrder(cancelTarget._id, cancelReason);
      toast.success('Order Cancelled', {
        description: `${cancelTarget.orderNumber} has been cancelled.`,
      });
      setCancelTarget(null);
      setCancelReason('');
      loadOrders(true);
    } catch (err: any) {
      toast.error('Cancellation Failed', {
        description: err?.message || 'Unable to cancel sales order.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const draftOnPage = orders.filter((o) => o.status === 'DRAFT').length;
  const openOnPage = orders.filter(
    (o) => o.status === 'CONFIRMED' || o.status === 'PARTIALLY_FULFILLED'
  ).length;
  const pageValue = orders
    .filter((o) => o.status !== 'DRAFT' && o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  const statItems: InventoryStatItem[] = [
    {
      id: 'orders-total',
      label: 'Matching Orders',
      value: String(total),
      tooltip: 'Total sales orders matching active filters.',
      contextLabel: 'Order Book',
      badgeText: `${orders.length} shown`,
      badgeTone: 'neutral',
      icon: RiShoppingCart2Line,
    },
    {
      id: 'orders-open',
      label: 'Open / Fulfillable (Page)',
      value: String(openOnPage),
      tooltip: 'Confirmed & partially fulfilled orders ready for dispatch.',
      contextLabel: 'Ready for Fulfillment',
      badgeText: `${draftOnPage} drafts`,
      badgeTone: 'accent',
      icon: RiCheckDoubleLine,
    },
    {
      id: 'orders-value',
      label: 'Committed Value (Page)',
      value: formatSalesCurrency(pageValue),
      tooltip: 'Order value excluding drafts and cancelled orders.',
      contextLabel: 'Confirmed+ Value',
      badgeText: 'Excl. Drafts',
      badgeTone: 'accent',
      icon: RiShoppingCart2Line,
    },
  ];

  const hasActiveFilters =
    Boolean(search.trim()) ||
    statusFilter !== 'ALL' ||
    customerFilter !== 'ALL' ||
    warehouseFilter !== 'ALL' ||
    Boolean(dateRange);

  const handleExport = () => {
    downloadCsv(
      `sales-orders-p${page}.csv`,
      ['Order #', 'Customer', 'Warehouse', 'Date', 'Status', 'Total'],
      orders.map((o) => [
        o.orderNumber,
        `${o.customerNameSnapshot} (${o.customerCodeSnapshot})`,
        o.warehouseNameSnapshot,
        formatSalesDate(o.orderDate),
        o.status,
        o.grandTotal.toFixed(2),
      ])
    );
  };

  return (
    <div className="space-y-6">
      <InventoryPageHeader
        title="Sales Orders"
        description="Create customer orders, confirm warehouse stock availability, and trigger partial or full fulfillments."
      />

      {showStats && <InventoryStatsBar items={statItems} />}

      <InventoryToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by order #, customer name, or warehouse..."
        filterTitle="Filter Sales Orders"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={() => {
          setSearch('');
          setStatusFilter('ALL');
          setCustomerFilter('ALL');
          setWarehouseFilter('ALL');
          setDateRange(null);
          setPage(1);
        }}
        filterContent={
          <div className="space-y-3">
            <Select
              label="Status"
              selectedKey={statusFilter}
              onSelectionChange={(k) => {
                setStatusFilter(String(k) as typeof statusFilter);
                setPage(1);
              }}
            >
              <SelectItem id="ALL" textValue="All Statuses">
                All Statuses
              </SelectItem>
              <SelectItem id="DRAFT" textValue="Draft">
                Draft
              </SelectItem>
              <SelectItem id="CONFIRMED" textValue="Confirmed">
                Confirmed
              </SelectItem>
              <SelectItem
                id="PARTIALLY_FULFILLED"
                textValue="Partially Fulfilled"
              >
                Partially Fulfilled
              </SelectItem>
              <SelectItem id="FULFILLED" textValue="Fulfilled">
                Fulfilled
              </SelectItem>
              <SelectItem id="CANCELLED" textValue="Cancelled">
                Cancelled
              </SelectItem>
            </Select>
            <Select
              label="Customer"
              selectedKey={customerFilter}
              onSelectionChange={(k) => {
                setCustomerFilter(String(k));
                setPage(1);
              }}
            >
              <SelectItem id="ALL" textValue="All Customers">
                All Customers
              </SelectItem>
              {customers.map((c) => (
                <SelectItem key={c._id} id={c._id} textValue={c.name}>
                  {c.name} ({c.code})
                </SelectItem>
              ))}
            </Select>
            <Select
              label="Warehouse"
              selectedKey={warehouseFilter}
              onSelectionChange={(k) => {
                setWarehouseFilter(String(k));
                setPage(1);
              }}
            >
              <SelectItem id="ALL" textValue="All Warehouses">
                All Warehouses
              </SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w._id} id={w._id} textValue={w.name}>
                  {w.name}
                </SelectItem>
              ))}
            </Select>
            <div className="space-y-1">
              <p className="text-caption-1-medium text-text-secondary">
                Order Date Range
              </p>
              <DateRangePicker
                aria-label="Order Date Range"
                value={dateRange}
                onChange={(v) => {
                  setDateRange(v);
                  setPage(1);
                }}
              />
            </div>
          </div>
        }
        sortOptions={[
          { id: 'orderDate:desc', label: 'Newest First' },
          { id: 'orderDate:asc', label: 'Oldest First' },
          { id: 'grandTotal:desc', label: 'Highest Value' },
        ]}
        activeSortId={sortId}
        onSortSelect={(id) => {
          setSortId(id as typeof sortId);
          setPage(1);
        }}
        showStatistics={showStats}
        onShowStatisticsChange={setShowStats}
        onRefresh={() => loadOrders(true)}
        refreshing={refreshing}
        onExport={handleExport}
        exportDisabled={orders.length === 0}
        primaryAction={
          canCreate
            ? {
                label: 'New Sales Order',
                icon: RiAddLine,
                onClick: () => {
                  setEditingOrder(null);
                  setOrderModalOpen(true);
                },
              }
            : undefined
        }
      />

      {loading ? (
        <TableRowsSkeleton rows={5} columns={7} />
      ) : orders.length === 0 ? (
        <InventoryEmptyState
          icon={RiShoppingCart2Line}
          title="No Sales Orders Found"
          description={
            hasActiveFilters
              ? 'No orders matched your current search or filter settings.'
              : 'Create your first sales order to start selling inventory products.'
          }
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => {
            setSearch('');
            setStatusFilter('ALL');
            setCustomerFilter('ALL');
            setWarehouseFilter('ALL');
            setDateRange(null);
            setPage(1);
          }}
          action={
            canCreate ? (
              <Button
                variant="primary"
                leadingIcon={RiAddLine}
                onClick={() => {
                  setEditingOrder(null);
                  setOrderModalOpen(true);
                }}
              >
                New Sales Order
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-2xl border border-separator-border bg-background-primary-default overflow-hidden">
          <div className="overflow-x-auto">
            <Table aria-label="Sales Orders List">
              <TableHeader>
                <TableColumn isRowHeader>Order #</TableColumn>
                <TableColumn>Customer</TableColumn>
                <TableColumn>Warehouse</TableColumn>
                <TableColumn>Order Date</TableColumn>
                <TableColumn>Grand Total</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Actions</TableColumn>
              </TableHeader>
              <TableBody>
                {orders.map((o) => {
                  const meta = getSalesOrderStatusMeta(o.status);
                  const busy = actionBusyId === o._id;
                  const canFulfillThis =
                    canFulfill &&
                    (o.status === 'CONFIRMED' ||
                      o.status === 'PARTIALLY_FULFILLED');
                  const canCancelThis =
                    canCancel &&
                    (o.status === 'DRAFT' || o.status === 'CONFIRMED') &&
                    o.items.every((it) => it.fulfilledQuantity <= 0);

                  return (
                    <TableRow key={o._id}>
                      <TableCell>
                        <Link
                          href={`/sales/orders/${o._id}`}
                          className="font-mono text-body-2-semibold text-text-brand hover:underline"
                        >
                          {o.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-body-2-medium text-text-primary">
                            {o.customerNameSnapshot}
                          </p>
                          <p className="text-caption-1-regular font-mono text-text-tertiary">
                            {o.customerCodeSnapshot}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{o.warehouseNameSnapshot}</TableCell>
                      <TableCell>{formatSalesDate(o.orderDate)}</TableCell>
                      <TableCell className="font-mono font-semibold tabular-nums">
                        {formatSalesCurrency(o.grandTotal, o.currency)}
                      </TableCell>
                      <TableCell>
                        <Chip variant="caption" color={meta.color}>
                          {meta.label}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link href={`/sales/orders/${o._id}`}>
                            <IconButton
                              aria-label="View order"
                              size="small"
                              icon={RiEyeLine}
                            />
                          </Link>
                          {canUpdate && o.status === 'DRAFT' && (
                            <IconButton
                              aria-label="Edit draft order"
                              size="small"
                              icon={RiEditLine}
                              disabled={busy}
                              onClick={() => {
                                setEditingOrder(o);
                                setOrderModalOpen(true);
                              }}
                            />
                          )}
                          {canConfirm && o.status === 'DRAFT' && (
                            <IconButton
                              aria-label="Confirm order"
                              size="small"
                              icon={RiCheckLine}
                              className="text-status-lime-text"
                              disabled={busy}
                              onClick={() => handleConfirmOrder(o)}
                            />
                          )}
                          {canFulfillThis && (
                            <IconButton
                              aria-label="Fulfill order"
                              size="small"
                              icon={RiCheckDoubleLine}
                              className="text-text-brand"
                              disabled={busy}
                              onClick={() => setFulfillOrderTarget(o)}
                            />
                          )}
                          {canCancelThis && (
                            <IconButton
                              aria-label="Cancel order"
                              size="small"
                              icon={RiCloseCircleLine}
                              className="text-status-rose-text"
                              disabled={busy}
                              onClick={() => {
                                setCancelTarget(o);
                                setCancelReason('');
                              }}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <InventoryPaginationFooter
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onLimitChange={(next) => {
              setLimit(next);
              setPage(1);
            }}
          />
        </div>
      )}

      <SalesOrderFormModal
        isOpen={orderModalOpen}
        onOpenChange={setOrderModalOpen}
        editingOrder={editingOrder}
        onSuccess={() => loadOrders(true)}
      />

      <SalesFulfillmentFormModal
        isOpen={Boolean(fulfillOrderTarget)}
        onOpenChange={(open) => {
          if (!open) setFulfillOrderTarget(null);
        }}
        preselectedOrder={fulfillOrderTarget}
        onSuccess={() => loadOrders(true)}
      />

      <Modal
        isOpen={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open && !actionBusyId) setCancelTarget(null);
        }}
        size="md"
      >
        <form
          onSubmit={handleCancelOrder}
          className="flex min-h-0 flex-1 flex-col gap-2"
        >
          <ModalHeader
            title={`Cancel Order ${cancelTarget?.orderNumber || ''}`}
            description="Only unfulfilled orders can be cancelled. No inventory stock has been deducted."
          />
          <ModalBody>
            <Textarea
              label="Cancellation Reason (Optional)"
              placeholder="Customer request, out-of-stock timeout, or duplicate draft..."
              rows={3}
              value={cancelReason}
              onChange={setCancelReason}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={Boolean(actionBusyId)}
              onClick={() => setCancelTarget(null)}
            >
              Keep Order
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={Boolean(actionBusyId)}
            >
              {actionBusyId ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}

export default function SalesOrdersPage() {
  return (
    <SalesModuleGate permission="sales.orders.read">
      <SalesOrdersContent />
    </SalesModuleGate>
  );
}
