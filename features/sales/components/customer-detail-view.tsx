'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  RiAddLine,
  RiArchiveLine,
  RiArrowLeftLine,
  RiCheckDoubleLine,
  RiEditLine,
  RiGroupLine,
  RiMailLine,
  RiMapPinLine,
  RiPhoneLine,
  RiRefreshLine,
  RiShoppingCart2Line,
} from '@remixicon/react';
import type { Key } from 'react-aria-components';
import { useAuth } from '@/providers/auth-provider';
import { Chip } from '@/components/base/badges/chip';
import { Breadcrumb, BreadcrumbItem } from '@/components/base/breadcrumb/breadcrumb';
import { Button } from '@/components/base/buttons/button';
import { AlertDialog } from '@/components/base/modal/modal';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/base/segmented-control/segmented-control';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@/components/base/table/table';
import { toast } from '@/components/base/toast/toast';
import { PageShellSkeleton } from '@/components/application/loading/page-skeletons';
import { InventoryEmptyState } from '@/features/inventory/components/inventory-empty-state';
import { InventoryPaginationFooter } from '@/features/inventory/components/inventory-pagination-footer';
import {
  InventoryStatsBar,
  type InventoryStatItem,
} from '@/features/inventory/components/inventory-stats-bar';
import { salesApi } from '@/features/sales/api/sales-api';
import { CustomerFormModal } from '@/features/sales/components/customer-form-modal';
import { SalesModuleGate } from '@/features/sales/components/sales-module-gate';
import { SalesOrderFormModal } from '@/features/sales/components/sales-order-form-modal';
import type {
  CustomerRecord,
  SalesFulfillmentRecord,
  SalesOrderRecord,
} from '@/features/sales/types/sales';
import {
  formatCustomerAddress,
  formatSalesCurrency,
  formatSalesDate,
  formatSalesQty,
  getSalesOrderStatusMeta,
} from '@/features/sales/utils/formatters';

function CustomerDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('sales.customers.update');
  const canArchive = hasPermission('sales.customers.archive');
  const canCreateOrder = hasPermission('sales.orders.create');

  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [orders, setOrders] = useState<SalesOrderRecord[]>([]);
  const [fulfillments, setFulfillments] = useState<SalesFulfillmentRecord[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [historyTab, setHistoryTab] = useState<'orders' | 'fulfillments'>('orders');
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [custRes, ordersRes] = await Promise.all([
        salesApi.getCustomer(id),
        salesApi.getCustomerOrders(id, { page, limit }),
      ]);
      setCustomer(custRes);
      setOrders(ordersRes.items || []);
      setFulfillments(ordersRes.fulfillments || []);
      setTotal(ordersRes.pagination?.total ?? 0);
      setTotalPages(ordersRes.pagination?.totalPages ?? 1);
    } catch (err: any) {
      toast.error('Failed to Load Customer', {
        description: err?.message || 'Customer details could not be loaded.',
      });
    } finally {
      setLoading(false);
    }
  }, [id, page, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleArchive = async () => {
    if (!customer) return;
    try {
      await salesApi.archiveCustomer(customer._id, !customer.isActive);
      toast.success(
        customer.isActive ? 'Customer Archived' : 'Customer Restored',
        { description: `${customer.name} status updated.` }
      );
      setArchiveConfirmOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Update Failed', {
        description: err?.message || 'Could not update archive status.',
      });
      throw err;
    }
  };

  if (loading && !customer) {
    return <PageShellSkeleton showStats />;
  }

  if (!customer) {
    return (
      <InventoryEmptyState
        icon={RiGroupLine}
        title="Customer Not Found"
        description="The requested customer profile could not be found."
        action={
          <Button
            variant="secondary"
            onClick={() => router.push('/sales/customers')}
          >
            Back to Customers
          </Button>
        }
      />
    );
  }

  const statItems: InventoryStatItem[] = [
    {
      id: 'orders',
      label: 'Total Orders',
      value: String(customer.stats?.totalOrders ?? 0),
      tooltip: 'All sales orders linked to this customer.',
      contextLabel: `${customer.stats?.confirmedOrders ?? 0} in progress · ${customer.stats?.fulfilledOrders ?? 0} fulfilled`,
      badgeText: `${customer.stats?.draftOrders ?? 0} drafts`,
      badgeTone: 'neutral',
    },
    {
      id: 'committed',
      label: 'Committed Value',
      value: formatSalesCurrency(customer.stats?.committedValue ?? 0),
      tooltip: 'Confirmed + fulfilled sales order value (excludes drafts & cancelled).',
      contextLabel: 'Order Commitments',
      badgeText: 'Confirmed+',
      badgeTone: 'neutral',
    },
    {
      id: 'fulfilled',
      label: 'Fulfilled Sales',
      value: formatSalesCurrency(customer.stats?.fulfilledValue ?? 0),
      tooltip: 'Total completed fulfillment revenue.',
      contextLabel: `${customer.stats?.fulfillmentCount ?? 0} fulfillments`,
      badgeText: `${formatSalesQty(customer.stats?.fulfilledUnits ?? 0)} units`,
      badgeTone: 'accent',
    },
    {
      id: 'last-fulfill',
      label: 'Last Fulfillment',
      value: formatSalesDate(customer.stats?.lastFulfilledAt),
      tooltip: 'Most recent fulfilled shipment date.',
      contextLabel: `Customer since ${formatSalesDate(customer.createdAt)}`,
      badgeText: customer.isActive ? 'Active Account' : 'Archived',
      badgeTone: customer.isActive ? 'accent' : 'yellow',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Breadcrumb>
          <BreadcrumbItem href="/sales">Sales</BreadcrumbItem>
          <BreadcrumbItem href="/sales/customers">Customers</BreadcrumbItem>
          <BreadcrumbItem>{customer.code}</BreadcrumbItem>
        </Breadcrumb>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-title-1-semibold text-text-primary">
                {customer.name}
              </h1>
              <Chip variant="caption" color={customer.isActive ? 'lime' : 'neutral'}>
                {customer.isActive ? 'Active' : 'Archived'}
              </Chip>
              <Chip variant="caption" color="neutral" className="font-mono">
                {customer.code}
              </Chip>
            </div>
            <p className="text-body-2-regular text-text-secondary">
              Created {formatSalesDate(customer.createdAt)} by{' '}
              {customer.createdBy?.name || customer.createdBy?.email}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/sales/customers">
              <Button variant="secondary" leadingIcon={RiArrowLeftLine}>
                Directory
              </Button>
            </Link>
            {canUpdate && (
              <Button
                variant="secondary"
                leadingIcon={RiEditLine}
                onClick={() => setEditOpen(true)}
              >
                Edit
              </Button>
            )}
            {canArchive && (
              <Button
                variant="secondary"
                leadingIcon={customer.isActive ? RiArchiveLine : RiRefreshLine}
                onClick={() => setArchiveConfirmOpen(true)}
              >
                {customer.isActive ? 'Archive' : 'Restore'}
              </Button>
            )}
            {canCreateOrder && customer.isActive && (
              <Button
                variant="primary"
                leadingIcon={RiAddLine}
                onClick={() => setOrderModalOpen(true)}
              >
                New Sales Order
              </Button>
            )}
          </div>
        </div>
      </div>

      <InventoryStatsBar items={statItems} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-separator-border bg-background-primary-default p-4 space-y-2.5">
          <h2 className="text-body-2-semibold text-text-primary">
            Contact Details
          </h2>
          <p className="flex items-center gap-2 text-body-2-regular text-text-secondary">
            <RiPhoneLine className="size-4 text-text-tertiary shrink-0" />
            <span>{customer.phone}</span>
          </p>
          <p className="flex items-center gap-2 text-body-2-regular text-text-secondary">
            <RiMailLine className="size-4 text-text-tertiary shrink-0" />
            <span>{customer.email || 'No email on file'}</span>
          </p>
          {customer.notes && (
            <p className="text-caption-1-regular text-text-secondary pt-1 border-t border-separator-border">
              {customer.notes}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-separator-border bg-background-primary-default p-4 space-y-2">
          <h2 className="text-body-2-semibold text-text-primary flex items-center gap-1.5">
            <RiMapPinLine className="size-4 text-text-tertiary" />
            Billing Address
          </h2>
          <p className="text-body-2-regular text-text-secondary">
            {formatCustomerAddress(customer.billingAddress)}
          </p>
        </div>

        <div className="rounded-2xl border border-separator-border bg-background-primary-default p-4 space-y-2">
          <h2 className="text-body-2-semibold text-text-primary flex items-center gap-1.5">
            <RiMapPinLine className="size-4 text-text-tertiary" />
            Shipping Address
          </h2>
          <p className="text-body-2-regular text-text-secondary">
            {formatCustomerAddress(customer.shippingAddress)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-title-2-semibold text-text-primary">
            Customer Sales History
          </h2>
          <SegmentedControl
            aria-label="Customer history tabs"
            selectedKeys={[historyTab]}
            onSelectionChange={(keys: Set<Key>) => {
              const first = [...keys][0];
              if (first) setHistoryTab(String(first) as 'orders' | 'fulfillments');
            }}
          >
            <SegmentedControlItem id="orders">
              Sales Orders ({total})
            </SegmentedControlItem>
            <SegmentedControlItem id="fulfillments">
              Fulfillments ({fulfillments.length})
            </SegmentedControlItem>
          </SegmentedControl>
        </div>

        {historyTab === 'orders' ? (
          orders.length === 0 ? (
            <InventoryEmptyState
              icon={RiShoppingCart2Line}
              title="No Orders Yet"
              description="This customer does not have any sales orders yet."
              action={
                canCreateOrder && customer.isActive ? (
                  <Button
                    variant="primary"
                    leadingIcon={RiAddLine}
                    onClick={() => setOrderModalOpen(true)}
                  >
                    Create First Order
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="rounded-2xl border border-separator-border bg-background-primary-default overflow-hidden">
              <div className="overflow-x-auto">
                <Table aria-label="Customer Orders">
                  <TableHeader>
                    <TableColumn isRowHeader>Order #</TableColumn>
                    <TableColumn>Order Date</TableColumn>
                    <TableColumn>Warehouse</TableColumn>
                    <TableColumn>Items</TableColumn>
                    <TableColumn>Grand Total</TableColumn>
                    <TableColumn>Status</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => {
                      const meta = getSalesOrderStatusMeta(o.status);
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
                          <TableCell>{formatSalesDate(o.orderDate)}</TableCell>
                          <TableCell>{o.warehouseNameSnapshot}</TableCell>
                          <TableCell className="font-mono">
                            {o.items.length}
                          </TableCell>
                          <TableCell className="font-mono font-semibold tabular-nums">
                            {formatSalesCurrency(o.grandTotal, o.currency)}
                          </TableCell>
                          <TableCell>
                            <Chip variant="caption" color={meta.color}>
                              {meta.label}
                            </Chip>
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
          )
        ) : fulfillments.length === 0 ? (
          <InventoryEmptyState
            icon={RiCheckDoubleLine}
            title="No Fulfillments Recorded"
            description="Fulfillment records appear here once confirmed orders are dispatched."
          />
        ) : (
          <div className="rounded-2xl border border-separator-border bg-background-primary-default overflow-hidden">
            <div className="overflow-x-auto">
              <Table aria-label="Customer Fulfillments">
                <TableHeader>
                  <TableColumn isRowHeader>Fulfillment #</TableColumn>
                  <TableColumn>Sales Order #</TableColumn>
                  <TableColumn>Date</TableColumn>
                  <TableColumn>Units Shipped</TableColumn>
                  <TableColumn>Fulfilled Value</TableColumn>
                </TableHeader>
                <TableBody>
                  {fulfillments.map((f) => (
                    <TableRow key={f._id}>
                      <TableCell className="font-mono font-semibold">
                        {f.fulfillmentNumber}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/sales/orders/${
                            typeof f.salesOrderId === 'object'
                              ? f.salesOrderId._id
                              : f.salesOrderId
                          }`}
                          className="font-mono text-text-brand hover:underline"
                        >
                          {f.salesOrderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{formatSalesDate(f.fulfilledDate)}</TableCell>
                      <TableCell className="font-mono">
                        {formatSalesQty(f.totalFulfilledUnits)}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {formatSalesCurrency(f.totalFulfilledValue, f.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <CustomerFormModal
        isOpen={editOpen}
        onOpenChange={setEditOpen}
        editingCustomer={customer}
        onSuccess={() => loadData()}
      />

      <SalesOrderFormModal
        isOpen={orderModalOpen}
        onOpenChange={setOrderModalOpen}
        editingOrder={null}
        preselectedCustomerId={customer._id}
        onSuccess={(order) => router.push(`/sales/orders/${order._id}`)}
      />

      <AlertDialog
        isOpen={archiveConfirmOpen}
        onOpenChange={(open) => {
          if (!open) setArchiveConfirmOpen(false);
        }}
        title={customer.isActive ? 'Archive Customer?' : 'Restore Customer?'}
        description={
          customer.isActive
            ? 'Historical orders and fulfillments remain intact, while new sales orders cannot target an archived customer.'
            : 'Restoring reactivates this customer for new sales orders.'
        }
        confirmLabel={customer.isActive ? 'Archive Customer' : 'Restore Customer'}
        pendingLabel={customer.isActive ? 'Archiving...' : 'Restoring...'}
        variant={customer.isActive ? 'danger' : 'default'}
        onConfirm={handleToggleArchive}
      />
    </div>
  );
}

export default function CustomerDetailPage() {
  return (
    <SalesModuleGate permission="sales.customers.read">
      <CustomerDetailContent />
    </SalesModuleGate>
  );
}
