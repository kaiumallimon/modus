'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  RiAddLine,
  RiArrowRightLine,
  RiBarChart2Line,
  RiGroupLine,
  RiRefreshLine,
  RiShoppingCart2Line,
  RiStackLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Chip } from '@/components/base/badges/chip';
import { Button } from '@/components/base/buttons/button';
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
import { PageShellSkeleton } from '@/components/application/loading/page-skeletons';
import { InventoryEmptyState } from '@/features/inventory/components/inventory-empty-state';
import { InventoryPageHeader } from '@/features/inventory/components/inventory-page-header';
import {
  InventoryStatsBar,
  type InventoryStatItem,
} from '@/features/inventory/components/inventory-stats-bar';
import { salesApi } from '@/features/sales/api/sales-api';
import { CustomerFormModal } from '@/features/sales/components/customer-form-modal';
import {
  SalesOrderStatusChartCard,
  SalesRevenueTrendCard,
} from '@/features/sales/components/sales-charts';
import { SalesModuleGate } from '@/features/sales/components/sales-module-gate';
import { SalesOrderFormModal } from '@/features/sales/components/sales-order-form-modal';
import type { SalesDashboardOverview } from '@/features/sales/types/sales';
import {
  formatSalesCurrency,
  formatSalesDate,
  formatSalesQty,
  getSalesOrderStatusMeta,
} from '@/features/sales/utils/formatters';

function SalesDashboardContent() {
  const { hasPermission } = useAuth();
  const canCreateCustomer = hasPermission('sales.customers.create');
  const canCreateOrder = hasPermission('sales.orders.create');

  const [days, setDays] = useState('30');
  const [overview, setOverview] = useState<SalesDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  const loadDashboard = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await salesApi.getDashboard({ days: Number(days) || 30 });
        setOverview(res);
      } catch (err: any) {
        toast.error('Dashboard Load Error', {
          description: err?.message || 'Unable to load sales dashboard.',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading && !overview) {
    return <PageShellSkeleton showStats />;
  }

  const s = overview?.summary;
  const currency = overview?.currency || 'USD';

  const statItems: InventoryStatItem[] = [
    {
      id: 'fulfilled-revenue',
      label: 'Fulfilled Sales',
      value: formatSalesCurrency(s?.fulfilledRevenue ?? 0, currency),
      tooltip: 'Actual recognized sales revenue from completed fulfillments (excludes drafts & cancelled).',
      contextLabel: `${s?.fulfillmentCount ?? 0} fulfillments`,
      badgeText: `${formatSalesQty(s?.fulfilledUnits ?? 0)} units`,
      badgeTone: 'accent',
      icon: RiBarChart2Line,
    },
    {
      id: 'committed-orders',
      label: 'Confirmed Commitments',
      value: formatSalesCurrency(s?.committedValue ?? 0, currency),
      tooltip: 'Total value across Confirmed, Partially Fulfilled, and Fulfilled orders.',
      contextLabel: `${s?.committedOrdersCount ?? 0} active/closed orders`,
      badgeText: `Drafts: ${s?.draftOrdersCount ?? 0}`,
      badgeTone: 'neutral',
      icon: RiShoppingCart2Line,
    },
    {
      id: 'active-customers',
      label: 'Active Customers',
      value: String(s?.activeCustomers ?? 0),
      tooltip: 'Active customer accounts in directory.',
      contextLabel: `${s?.totalCustomers ?? 0} total (${s?.archivedCustomers ?? 0} archived)`,
      badgeText: 'Directory',
      badgeTone: 'neutral',
      icon: RiGroupLine,
    },
    {
      id: 'awaiting-fulfillment',
      label: 'Orders Awaiting Dispatch',
      value: String(s?.confirmedOrdersCount ?? 0),
      tooltip: 'Confirmed and partially fulfilled orders still waiting for stock dispatch.',
      contextLabel: `${s?.fulfilledOrdersCount ?? 0} fully fulfilled`,
      badgeText:
        (s?.cancelledOrdersCount ?? 0) > 0
          ? `${s?.cancelledOrdersCount} cancelled`
          : 'On Track',
      badgeTone: (s?.cancelledOrdersCount ?? 0) > 0 ? 'yellow' : 'accent',
      icon: RiStackLine,
    },
  ];

  return (
    <div className="space-y-6">
      <InventoryPageHeader
        title="Sales Overview"
        description="Customer accounts, order commitments, inventory fulfillments, and recognized sales revenue."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-36">
              <Select
                aria-label="Dashboard lookback window"
                selectedKey={days}
                onSelectionChange={(k) => setDays(String(k))}
              >
                <SelectItem id="7" textValue="Last 7 Days">
                  Last 7 Days
                </SelectItem>
                <SelectItem id="30" textValue="Last 30 Days">
                  Last 30 Days
                </SelectItem>
                <SelectItem id="90" textValue="Last 90 Days">
                  Last 90 Days
                </SelectItem>
              </Select>
            </div>
            <Button
              variant="secondary"
              leadingIcon={RiRefreshLine}
              disabled={refreshing}
              onClick={() => loadDashboard(true)}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            {canCreateCustomer && (
              <Button
                variant="secondary"
                leadingIcon={RiAddLine}
                onClick={() => setCustomerModalOpen(true)}
              >
                New Customer
              </Button>
            )}
            {canCreateOrder && (
              <Button
                variant="primary"
                leadingIcon={RiAddLine}
                onClick={() => setOrderModalOpen(true)}
              >
                New Sales Order
              </Button>
            )}
          </div>
        }
      />

      <InventoryStatsBar items={statItems} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SalesRevenueTrendCard
          dailyTrend={overview?.dailyTrend || []}
          totalFulfilledRevenue={s?.fulfilledRevenue ?? 0}
          fulfilledUnits={s?.fulfilledUnits ?? 0}
          currency={currency}
        />
        <SalesOrderStatusChartCard
          statusBreakdown={overview?.statusBreakdown || []}
          currency={currency}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-separator-border bg-background-primary-default overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-separator-border">
            <div>
              <h2 className="text-body-1-semibold text-text-primary">
                Recent Sales Orders
              </h2>
              <p className="text-caption-1-regular text-text-secondary">
                Latest customer orders across Draft, Confirmed, and Fulfilled
                stages.
              </p>
            </div>
            <Link href="/sales/orders">
              <Button size="small" variant="ghost" trailingIcon={RiArrowRightLine}>
                All Orders
              </Button>
            </Link>
          </div>
          {!overview?.recentOrders.length ? (
            <div className="p-6">
              <InventoryEmptyState
                icon={RiShoppingCart2Line}
                title="No Sales Orders Yet"
                description="Create a sales order to reserve inventory and track fulfillments."
                action={
                  canCreateOrder ? (
                    <Button
                      variant="primary"
                      leadingIcon={RiAddLine}
                      onClick={() => setOrderModalOpen(true)}
                    >
                      Create Sales Order
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table aria-label="Recent Sales Orders">
                <TableHeader>
                  <TableColumn isRowHeader>Order #</TableColumn>
                  <TableColumn>Customer</TableColumn>
                  <TableColumn>Warehouse</TableColumn>
                  <TableColumn>Date</TableColumn>
                  <TableColumn>Total</TableColumn>
                  <TableColumn>Status</TableColumn>
                </TableHeader>
                <TableBody>
                  {overview.recentOrders.map((o) => {
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
                        <TableCell>
                          <div>
                            <p className="text-body-2-medium text-text-primary">
                              {o.customerName}
                            </p>
                            <p className="text-caption-1-regular font-mono text-text-tertiary">
                              {o.customerCode}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{o.warehouseName}</TableCell>
                        <TableCell>{formatSalesDate(o.orderDate)}</TableCell>
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
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-separator-border bg-background-primary-default p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-body-1-semibold text-text-primary">
                Top-Selling Products
              </h2>
              <Link href="/sales/reports">
                <Button size="small" variant="ghost" trailingIcon={RiArrowRightLine}>
                  Reports
                </Button>
              </Link>
            </div>
            {!overview?.topSellingProducts.length ? (
              <p className="text-caption-1-regular text-text-secondary py-4 text-center">
                No fulfilled products in this window yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {overview.topSellingProducts.map((p) => (
                  <div
                    key={p.productId}
                    className="flex items-center justify-between gap-2 rounded-xl border border-separator-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-body-2-medium text-text-primary truncate">
                        {p.productName}
                      </p>
                      <p className="text-caption-1-regular font-mono text-text-tertiary">
                        {p.sku} · {formatSalesQty(p.unitsSold)} {p.unitSymbol}
                      </p>
                    </div>
                    <span className="font-mono text-body-2-semibold text-text-primary shrink-0 tabular-nums">
                      {formatSalesCurrency(p.revenue, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-separator-border bg-background-primary-default p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-body-1-semibold text-text-primary">
                Recent Customers
              </h2>
              <Link href="/sales/customers">
                <Button size="small" variant="ghost" trailingIcon={RiArrowRightLine}>
                  Directory
                </Button>
              </Link>
            </div>
            {!overview?.recentCustomers.length ? (
              <p className="text-caption-1-regular text-text-secondary py-4 text-center">
                No customers added yet.
              </p>
            ) : (
              <div className="space-y-2">
                {overview.recentCustomers.map((c) => (
                  <Link
                    key={c._id}
                    href={`/sales/customers/${c._id}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-separator-border px-3 py-2 hover:bg-background-secondary-default/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-body-2-medium text-text-primary truncate">
                        {c.name}
                      </p>
                      <p className="text-caption-1-regular font-mono text-text-tertiary truncate">
                        {c.code} · {c.phone}
                      </p>
                    </div>
                    <Chip variant="caption" color={c.isActive ? 'lime' : 'neutral'}>
                      {c.isActive ? 'Active' : 'Archived'}
                    </Chip>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CustomerFormModal
        isOpen={customerModalOpen}
        onOpenChange={setCustomerModalOpen}
        editingCustomer={null}
        onSuccess={() => loadDashboard(true)}
      />

      <SalesOrderFormModal
        isOpen={orderModalOpen}
        onOpenChange={setOrderModalOpen}
        editingOrder={null}
        onSuccess={() => loadDashboard(true)}
      />
    </div>
  );
}

export default function SalesDashboardPage() {
  return (
    <SalesModuleGate permission="sales.dashboard.read">
      <SalesDashboardContent />
    </SalesModuleGate>
  );
}
