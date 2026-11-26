'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  RiBarChart2Line,
  RiDownloadLine,
  RiGroupLine,
  RiRefreshLine,
  RiShoppingCart2Line,
  RiStackLine,
} from '@remixicon/react';
import { Chip } from '@/components/base/badges/chip';
import { Button } from '@/components/base/buttons/button';
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
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { InventoryEmptyState } from '@/features/inventory/components/inventory-empty-state';
import {
  InventoryStatsBar,
  type InventoryStatItem,
} from '@/features/inventory/components/inventory-stats-bar';
import type { Warehouse } from '@/features/inventory/types/inventory';
import { downloadCsv } from '@/features/inventory/utils/formatters';
import { salesApi } from '../api/sales-api';
import type {
  SalesSummaryReport,
  SalesTopProductsReport,
} from '../types/sales';
import {
  formatSalesCurrency,
  formatSalesDate,
  formatSalesQty,
  getSalesOrderStatusMeta,
} from '../utils/formatters';
import { SalesRevenueTrendCard } from './sales-charts';

export function ReportsTab() {
  const [days, setDays] = useState('30');
  const [warehouseId, setWarehouseId] = useState('ALL');
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [summary, setSummary] = useState<SalesSummaryReport | null>(null);
  const [topProducts, setTopProducts] =
    useState<SalesTopProductsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    inventoryApi
      .listWarehouses({ limit: 100 })
      .then((res) => setWarehouses(res.data || []))
      .catch(() => {});
  }, []);

  const loadReports = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const params = {
        days: dateRange ? undefined : Number(days) || 30,
        startDate: dateRange?.start
          ? `${dateRange.start}T00:00:00.000Z`
          : undefined,
        endDate: dateRange?.end ? `${dateRange.end}T23:59:59.999Z` : undefined,
        warehouseId: warehouseId !== 'ALL' ? warehouseId : undefined,
        limit: 15,
      };

      try {
        const [summaryRes, productsRes] = await Promise.all([
          salesApi.getSummaryReport(params),
          salesApi.getTopProductsReport(params),
        ]);
        setSummary(summaryRes);
        setTopProducts(productsRes);
      } catch (err: any) {
        toast.error('Failed to Load Sales Reports', {
          description: err?.message || 'Unable to compute sales report metrics.',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days, warehouseId, dateRange]
  );

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleExportProducts = () => {
    if (!topProducts?.items.length) return;
    downloadCsv(
      'sales-top-products-report.csv',
      ['Product', 'SKU', 'Units Sold', 'Revenue', 'Fulfillments', 'Last Sold'],
      topProducts.items.map((p) => [
        p.productName,
        p.sku,
        p.unitsSold,
        p.revenue.toFixed(2),
        p.fulfillmentCount,
        formatSalesDate(p.lastSoldAt),
      ])
    );
  };

  if (loading && !summary) {
    return <PageShellSkeleton showStats />;
  }

  const statItems: InventoryStatItem[] = [
    {
      id: 'fulfilled-revenue',
      label: 'Fulfilled Sales Revenue',
      value: formatSalesCurrency(
        summary?.totals.fulfilledRevenue,
        summary?.currency
      ),
      tooltip: 'Recognized revenue from completed fulfillments (excludes Draft & Cancelled).',
      contextLabel: `${summary?.totals.fulfillmentCount ?? 0} fulfillments`,
      badgeText: 'Actual Sales',
      badgeTone: 'accent',
      icon: RiBarChart2Line,
    },
    {
      id: 'committed-value',
      label: 'Confirmed Commitments',
      value: formatSalesCurrency(
        summary?.totals.committedValue,
        summary?.currency
      ),
      tooltip: 'Confirmed, partially fulfilled, and fulfilled order values.',
      contextLabel: `${summary?.totals.committedOrders ?? 0} orders`,
      badgeText: 'Committed',
      badgeTone: 'neutral',
      icon: RiShoppingCart2Line,
    },
    {
      id: 'fulfilled-units',
      label: 'Total Units Shipped',
      value: formatSalesQty(summary?.totals.fulfilledUnits),
      tooltip: 'Units deducted from warehouses for customer orders.',
      contextLabel: 'Inventory Dispatched',
      badgeText: 'Verified Stock Out',
      badgeTone: 'accent',
      icon: RiStackLine,
    },
    {
      id: 'draft-cancelled',
      label: 'Drafts & Cancelled',
      value: `${summary?.totals.draftOrders ?? 0} / ${summary?.totals.cancelledOrders ?? 0}`,
      tooltip: 'Uncommitted draft orders vs cancelled orders excluded from revenue.',
      contextLabel: `Drafts ${formatSalesCurrency(summary?.totals.draftValue, summary?.currency)}`,
      badgeText: 'Excluded from Sales',
      badgeTone: 'yellow',
      icon: RiGroupLine,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-separator-border bg-background-primary-default p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 min-w-[260px]">
          <Select
            label="Period"
            selectedKey={days}
            onSelectionChange={(k) => {
              setDays(String(k));
              setDateRange(null);
            }}
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
            <SelectItem id="365" textValue="Last 365 Days">
              Last 365 Days
            </SelectItem>
          </Select>

          <Select
            label="Warehouse"
            selectedKey={warehouseId}
            onSelectionChange={(k) => setWarehouseId(String(k))}
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
            <span className="text-caption-1-medium text-text-secondary block">
              Custom Date Range
            </span>
            <DateRangePicker
              aria-label="Report Custom Date Range"
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            leadingIcon={RiRefreshLine}
            disabled={refreshing}
            onClick={() => loadReports(true)}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="secondary"
            leadingIcon={RiDownloadLine}
            disabled={!topProducts?.items.length}
            onClick={handleExportProducts}
          >
            Export Top Products
          </Button>
        </div>
      </div>

      <InventoryStatsBar items={statItems} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SalesRevenueTrendCard
          dailyTrend={summary?.dailyTrend || []}
          totalFulfilledRevenue={summary?.totals.fulfilledRevenue ?? 0}
          fulfilledUnits={summary?.totals.fulfilledUnits ?? 0}
          currency={summary?.currency}
        />

        <div className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs space-y-3">
          <div>
            <h3 className="text-body-1-semibold text-text-primary">
              Order Pipeline Breakdown
            </h3>
            <p className="text-caption-1-regular text-text-secondary">
              Clearly separates Draft quotes and Cancelled orders from confirmed
              commitments.
            </p>
          </div>
          {summary?.ordersByStatus.length ? (
            <div className="space-y-2">
              {summary.ordersByStatus.map((row) => {
                const meta = getSalesOrderStatusMeta(row.status);
                return (
                  <div
                    key={row.status}
                    className="flex items-center justify-between gap-2 rounded-xl border border-separator-border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Chip variant="caption" color={meta.color}>
                        {meta.label}
                      </Chip>
                      <span className="text-caption-1-regular text-text-secondary">
                        {row.count} orders
                      </span>
                    </div>
                    <span className="font-mono text-body-2-semibold text-text-primary tabular-nums">
                      {formatSalesCurrency(row.orderValue, summary.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <InventoryEmptyState
              icon={RiShoppingCart2Line}
              title="No Orders in Period"
              description="Adjust the date range or warehouse filter to inspect sales order activity."
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-separator-border bg-background-primary-default overflow-hidden">
          <div className="px-5 py-4 border-b border-separator-border">
            <h3 className="text-body-1-semibold text-text-primary">
              Top-Selling Products (Fulfilled)
            </h3>
            <p className="text-caption-1-regular text-text-secondary">
              Ranked by fulfilled sales revenue and shipped units.
            </p>
          </div>
          {loading ? (
            <div className="p-4">
              <TableRowsSkeleton rows={4} columns={4} />
            </div>
          ) : !topProducts?.items.length ? (
            <div className="p-6">
              <InventoryEmptyState
                icon={RiStackLine}
                title="No Fulfilled Products"
                description="Products appear here once sales orders are fulfilled."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table aria-label="Top Selling Products">
                <TableHeader>
                  <TableColumn isRowHeader>Product</TableColumn>
                  <TableColumn>SKU</TableColumn>
                  <TableColumn>Units Sold</TableColumn>
                  <TableColumn>Revenue</TableColumn>
                </TableHeader>
                <TableBody>
                  {topProducts.items.map((p) => (
                    <TableRow key={p.productId}>
                      <TableCell>
                        <span className="text-body-2-medium text-text-primary">
                          {p.productName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-caption-1-regular text-text-secondary">
                          {p.sku}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-body-2-medium tabular-nums">
                          {formatSalesQty(p.unitsSold)} {p.unitSymbol}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-body-2-semibold text-text-primary tabular-nums">
                          {formatSalesCurrency(p.revenue, topProducts.currency)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-separator-border bg-background-primary-default overflow-hidden">
          <div className="px-5 py-4 border-b border-separator-border">
            <h3 className="text-body-1-semibold text-text-primary">
              Top Customers by Fulfilled Sales
            </h3>
            <p className="text-caption-1-regular text-text-secondary">
              Customer accounts ranked by completed fulfillment value.
            </p>
          </div>
          {loading ? (
            <div className="p-4">
              <TableRowsSkeleton rows={4} columns={4} />
            </div>
          ) : !summary?.topCustomers.length ? (
            <div className="p-6">
              <InventoryEmptyState
                icon={RiGroupLine}
                title="No Customer Fulfillments"
                description="Customer revenue leaders appear once orders are fulfilled."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table aria-label="Top Customers">
                <TableHeader>
                  <TableColumn isRowHeader>Customer</TableColumn>
                  <TableColumn>Fulfillments</TableColumn>
                  <TableColumn>Units</TableColumn>
                  <TableColumn>Revenue</TableColumn>
                </TableHeader>
                <TableBody>
                  {summary.topCustomers.map((c) => (
                    <TableRow key={c.customerId}>
                      <TableCell>
                        <Link
                          href={`/sales/customers/${c.customerId}`}
                          className="hover:underline"
                        >
                          <p className="text-body-2-medium text-text-brand">
                            {c.customerName}
                          </p>
                          <p className="text-caption-1-regular font-mono text-text-tertiary">
                            {c.customerCode}
                          </p>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {c.fulfillments}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {formatSalesQty(c.units)}
                      </TableCell>
                      <TableCell className="font-mono font-semibold tabular-nums">
                        {formatSalesCurrency(c.revenue, summary.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
