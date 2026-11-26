'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  RiArrowLeftLine,
  RiCheckDoubleLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiEditLine,
  RiShoppingCart2Line,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Chip } from '@/components/base/badges/chip';
import { Breadcrumb, BreadcrumbItem } from '@/components/base/breadcrumb/breadcrumb';
import { Button } from '@/components/base/buttons/button';
import { Divider } from '@/components/base/divider/divider';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@/components/base/modal/modal';
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
import { PageShellSkeleton } from '@/components/application/loading/page-skeletons';
import { InventoryEmptyState } from '@/features/inventory/components/inventory-empty-state';
import {
  InventoryStatsBar,
  type InventoryStatItem,
} from '@/features/inventory/components/inventory-stats-bar';
import { salesApi } from '@/features/sales/api/sales-api';
import { SalesFulfillmentFormModal } from '@/features/sales/components/sales-fulfillment-form-modal';
import { SalesModuleGate } from '@/features/sales/components/sales-module-gate';
import { SalesOrderFormModal } from '@/features/sales/components/sales-order-form-modal';
import type { SalesOrderRecord } from '@/features/sales/types/sales';
import {
  formatSalesCurrency,
  formatSalesDate,
  formatSalesQty,
  getSalesOrderStatusMeta,
} from '@/features/sales/utils/formatters';

function SalesOrderDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('sales.orders.update');
  const canConfirm = hasPermission('sales.orders.confirm');
  const canCancel = hasPermission('sales.orders.cancel');
  const canFulfill = hasPermission('sales.fulfillments.create');

  const [order, setOrder] = useState<SalesOrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await salesApi.getOrder(id);
      setOrder(res);
    } catch (err: any) {
      toast.error(err?.message || 'Unable to fetch sales order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleConfirm = async () => {
    if (!order) return;
    setBusy(true);
    try {
      await salesApi.confirmOrder(order._id);
      toast.success(`Sales order ${order.orderNumber} confirmed.`);
      loadOrder();
    } catch (err: any) {
      toast.error(err?.message || 'Could not confirm order.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setBusy(true);
    try {
      await salesApi.cancelOrder(order._id, cancelReason);
      toast.success(`Sales order ${order.orderNumber} cancelled.`);
      setCancelOpen(false);
      setCancelReason('');
      loadOrder();
    } catch (err: any) {
      toast.error(err?.message || 'Could not cancel order.');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !order) {
    return <PageShellSkeleton showStats />;
  }

  if (!order) {
    return (
      <InventoryEmptyState
        icon={RiShoppingCart2Line}
        title="Sales Order Not Found"
        description="The requested sales order could not be found."
        action={
          <Button
            variant="secondary"
            onClick={() => router.push('/sales/orders')}
          >
            Back to Sales Orders
          </Button>
        }
      />
    );
  }

  const meta = getSalesOrderStatusMeta(order.status);
  const totalOrdered = order.items.reduce(
    (sum, it) => sum + it.orderedQuantity,
    0
  );
  const totalFulfilled = order.items.reduce(
    (sum, it) => sum + it.fulfilledQuantity,
    0
  );
  const pctFulfilled =
    totalOrdered > 0
      ? Math.min(100, Math.round((totalFulfilled / totalOrdered) * 100))
      : 0;

  const isDraft = order.status === 'DRAFT';
  const canFulfillThis =
    canFulfill &&
    (order.status === 'CONFIRMED' || order.status === 'PARTIALLY_FULFILLED');
  const canCancelThis =
    canCancel &&
    (order.status === 'DRAFT' || order.status === 'CONFIRMED') &&
    totalFulfilled === 0;

  const customerObjId =
    typeof order.customerId === 'object' ? order.customerId._id : order.customerId;

  const statItems: InventoryStatItem[] = [
    {
      id: 'grand-total',
      label: 'Order Total',
      value: formatSalesCurrency(order.grandTotal, order.currency),
      tooltip: 'Snapshot total including discounts and taxes.',
      contextLabel: `${order.items.length} product line(s)`,
      badgeText: meta.label,
      badgeTone: order.status === 'FULFILLED' ? 'accent' : 'neutral',
    },
    {
      id: 'fulfillment-progress',
      label: 'Fulfillment Progress',
      value: `${pctFulfilled}%`,
      tooltip: 'Proportion of ordered units already dispatched.',
      contextLabel: `${formatSalesQty(totalFulfilled)} of ${formatSalesQty(totalOrdered)} units`,
      badgeText: `${order.fulfillments?.length ?? 0} dispatches`,
      badgeTone: pctFulfilled === 100 ? 'accent' : 'neutral',
    },
    {
      id: 'warehouse',
      label: 'Fulfillment Warehouse',
      value: order.warehouseNameSnapshot,
      tooltip: 'Warehouse assigned for stock validation and deduction.',
      contextLabel: `Order date ${formatSalesDate(order.orderDate)}`,
      badgeText: order.expectedDeliveryDate
        ? `Due ${formatSalesDate(order.expectedDeliveryDate)}`
        : 'Standard Dispatch',
      badgeTone: 'neutral',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Breadcrumb>
          <BreadcrumbItem href="/sales">Sales</BreadcrumbItem>
          <BreadcrumbItem href="/sales/orders">Orders</BreadcrumbItem>
          <BreadcrumbItem>{order.orderNumber}</BreadcrumbItem>
        </Breadcrumb>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-title-1-semibold font-mono text-text-primary">
                {order.orderNumber}
              </h1>
              <Chip variant="bold" color={meta.color}>
                {meta.label}
              </Chip>
            </div>
            <p className="text-body-2-regular text-text-secondary">
              Customer:{' '}
              <Link
                href={`/sales/customers/${customerObjId}`}
                className="text-text-brand font-medium hover:underline"
              >
                {order.customerNameSnapshot} ({order.customerCodeSnapshot})
              </Link>{' '}
              · Created {formatSalesDate(order.createdAt)} by{' '}
              {order.createdBy?.name || order.createdBy?.email}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/sales/orders">
              <Button variant="secondary" leadingIcon={RiArrowLeftLine}>
                Orders
              </Button>
            </Link>
            {canUpdate && isDraft && (
              <Button
                variant="secondary"
                leadingIcon={RiEditLine}
                disabled={busy}
                onClick={() => setEditOpen(true)}
              >
                Edit Draft
              </Button>
            )}
            {canCancelThis && (
              <Button
                variant="danger"
                leadingIcon={RiCloseCircleLine}
                disabled={busy}
                onClick={() => {
                  setCancelReason('');
                  setCancelOpen(true);
                }}
              >
                Cancel Order
              </Button>
            )}
            {canConfirm && isDraft && (
              <Button
                variant="primary"
                leadingIcon={RiCheckLine}
                disabled={busy}
                onClick={handleConfirm}
              >
                {busy ? 'Confirming...' : 'Confirm Order'}
              </Button>
            )}
            {canFulfillThis && (
              <Button
                variant="primary"
                leadingIcon={RiCheckDoubleLine}
                disabled={busy}
                onClick={() => setFulfillOpen(true)}
              >
                Fulfill Items
              </Button>
            )}
          </div>
        </div>
      </div>

      <InventoryStatsBar items={statItems} />

      {order.status === 'CANCELLED' && order.cancellationReason && (
        <div className="rounded-2xl border border-border-error-default bg-status-rose-background px-4 py-3 text-body-2-regular text-status-rose-text">
          <strong>Cancellation Reason:</strong> {order.cancellationReason}
        </div>
      )}

      <div className="rounded-2xl border border-separator-border bg-background-primary-default overflow-hidden">
        <div className="px-5 py-4 border-b border-separator-border flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-body-1-semibold text-text-primary">
              Order Line Items &amp; Stock Snapshots
            </h2>
            <p className="text-caption-1-regular text-text-secondary">
              Prices are locked from order creation; live available stock shows current balance in{' '}
              {order.warehouseNameSnapshot}.
            </p>
          </div>
          <div className="flex items-center gap-2 w-48">
            <div className="h-2 flex-1 rounded-full bg-background-secondary-default overflow-hidden">
              <div
                className="h-full rounded-full bg-button-primary transition-all"
                style={{ width: `${pctFulfilled}%` }}
              />
            </div>
            <span className="text-caption-1-medium font-mono text-text-secondary tabular-nums">
              {pctFulfilled}%
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table aria-label="Sales Order Line Items">
            <TableHeader>
              <TableColumn isRowHeader>Product</TableColumn>
              <TableColumn>SKU</TableColumn>
              <TableColumn>Ordered</TableColumn>
              <TableColumn>Fulfilled</TableColumn>
              <TableColumn>Remaining</TableColumn>
              <TableColumn>Available Stock</TableColumn>
              <TableColumn>Unit Price</TableColumn>
              <TableColumn>Line Total</TableColumn>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => {
                const rem =
                  item.remainingQuantity ??
                  Math.max(0, item.orderedQuantity - item.fulfilledQuantity);
                const shortage =
                  item.availableStock !== undefined && item.availableStock < rem;

                return (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium text-text-primary">
                      {item.productName}
                    </TableCell>
                    <TableCell className="font-mono text-caption-1-regular text-text-secondary">
                      {item.sku}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatSalesQty(item.orderedQuantity)} {item.unitSymbol}
                    </TableCell>
                    <TableCell className="font-mono text-status-lime-text">
                      {formatSalesQty(item.fulfilledQuantity)} {item.unitSymbol}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatSalesQty(rem)} {item.unitSymbol}
                    </TableCell>
                    <TableCell>
                      {item.availableStock !== undefined ? (
                        <Chip
                          variant="caption"
                          color={shortage ? 'yellow' : 'lime'}
                        >
                          {formatSalesQty(item.availableStock)} {item.unitSymbol}
                        </Chip>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {formatSalesCurrency(item.unitPrice, order.currency)}
                    </TableCell>
                    <TableCell className="font-mono font-semibold tabular-nums">
                      {formatSalesCurrency(item.lineTotal, order.currency)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="p-5 border-t border-separator-border grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="space-y-1 text-body-2-regular text-text-secondary">
            <p className="font-semibold text-text-primary">Customer &amp; Notes</p>
            <p>Phone: {order.customerPhoneSnapshot}</p>
            {order.customerEmailSnapshot && (
              <p>Email: {order.customerEmailSnapshot}</p>
            )}
            {order.notes && <p className="pt-1">{order.notes}</p>}
          </div>

          <div className="md:ml-auto w-full md:max-w-xs space-y-1.5 text-body-2-regular">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">
                {formatSalesCurrency(order.subtotal, order.currency)}
              </span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Discount</span>
              <span className="font-mono tabular-nums text-status-rose-text">
                -{formatSalesCurrency(order.discountTotal, order.currency)}
              </span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Tax</span>
              <span className="font-mono tabular-nums">
                {formatSalesCurrency(order.taxTotal, order.currency)}
              </span>
            </div>
            <Divider />
            <div className="flex justify-between text-body-1-semibold text-text-primary">
              <span>Grand Total</span>
              <span className="font-mono tabular-nums">
                {formatSalesCurrency(order.grandTotal, order.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-separator-border bg-background-primary-default overflow-hidden">
        <div className="px-5 py-4 border-b border-separator-border">
          <h2 className="text-body-1-semibold text-text-primary">
            Fulfillment History ({order.fulfillments?.length ?? 0})
          </h2>
          <p className="text-caption-1-regular text-text-secondary">
            Each fulfillment atomically deducts warehouse stock and logs an inventory{' '}
            <code>SALE_FULFILLMENT</code> movement.
          </p>
        </div>

        {!order.fulfillments?.length ? (
          <div className="p-6">
            <InventoryEmptyState
              icon={RiCheckDoubleLine}
              title="No Fulfillments Recorded"
              description={
                isDraft
                  ? 'Confirm this draft order first before fulfilling stock.'
                  : 'Use Fulfill Items to dispatch quantities from the warehouse.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table aria-label="Order Fulfillments History">
              <TableHeader>
                <TableColumn isRowHeader>Fulfillment #</TableColumn>
                <TableColumn>Fulfilled Date</TableColumn>
                <TableColumn>Units Dispatched</TableColumn>
                <TableColumn>Fulfilled Value</TableColumn>
                <TableColumn>Recorded By</TableColumn>
              </TableHeader>
              <TableBody>
                {order.fulfillments.map((f) => (
                  <TableRow key={f._id}>
                    <TableCell className="font-mono font-semibold text-text-primary">
                      {f.fulfillmentNumber}
                    </TableCell>
                    <TableCell>{formatSalesDate(f.fulfilledDate)}</TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {formatSalesQty(f.totalFulfilledUnits)}
                    </TableCell>
                    <TableCell className="font-mono font-semibold tabular-nums">
                      {formatSalesCurrency(f.totalFulfilledValue, f.currency)}
                    </TableCell>
                    <TableCell>
                      {f.createdBy?.name || f.createdBy?.email}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <SalesOrderFormModal
        isOpen={editOpen}
        onOpenChange={setEditOpen}
        editingOrder={order}
        onSuccess={() => loadOrder()}
      />

      <SalesFulfillmentFormModal
        isOpen={fulfillOpen}
        onOpenChange={setFulfillOpen}
        preselectedOrder={order}
        onSuccess={() => loadOrder()}
      />

      <Modal
        isOpen={cancelOpen}
        onOpenChange={(open) => {
          if (!open && !busy) setCancelOpen(false);
        }}
        size="md"
      >
        <form
          onSubmit={handleCancelSubmit}
          className="flex min-h-0 flex-1 flex-col gap-2"
        >
          <ModalHeader
            title={`Cancel ${order.orderNumber}`}
            description="Only unfulfilled orders can be cancelled."
          />
          <ModalBody>
            <Textarea
              label="Cancellation Reason (Optional)"
              placeholder="Customer cancelled or expired draft..."
              rows={3}
              value={cancelReason}
              onChange={setCancelReason}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setCancelOpen(false)}
            >
              Keep Order
            </Button>
            <Button type="submit" variant="danger" disabled={busy}>
              {busy ? 'Cancelling...' : 'Confirm Cancel'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}

export default function SalesOrderDetailPage() {
  return (
    <SalesModuleGate permission="sales.orders.read">
      <SalesOrderDetailContent />
    </SalesModuleGate>
  );
}
