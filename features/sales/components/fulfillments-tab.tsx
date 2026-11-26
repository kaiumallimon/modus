'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  RiAddLine,
  RiCheckDoubleLine,
  RiEyeLine,
  RiFileList3Line,
  RiStackLine,
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
import { toast } from '@/components/base/toast/toast';
import { TableRowsSkeleton } from '@/components/application/loading/page-skeletons';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { InventoryEmptyState } from '@/features/inventory/components/inventory-empty-state';
import { InventoryPaginationFooter } from '@/features/inventory/components/inventory-pagination-footer';
import {
  InventoryStatsBar,
  type InventoryStatItem,
} from '@/features/inventory/components/inventory-stats-bar';
import { InventoryToolbar } from '@/features/inventory/components/inventory-toolbar';
import type { Warehouse } from '@/features/inventory/types/inventory';
import { downloadCsv } from '@/features/inventory/utils/formatters';
import { salesApi } from '../api/sales-api';
import type { CustomerRecord, SalesFulfillmentRecord } from '../types/sales';
import {
  formatSalesCurrency,
  formatSalesDate,
  formatSalesQty,
} from '../utils/formatters';
import { SalesFulfillmentFormModal } from './sales-fulfillment-form-modal';

export function FulfillmentsTab({
  onChanged,
}: {
  onChanged?: () => void;
}) {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('sales.fulfillments.create');

  const [fulfillments, setFulfillments] = useState<SalesFulfillmentRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [sortId, setSortId] = useState<'fulfilledDate:desc' | 'fulfilledDate:asc' | 'totalFulfilledValue:desc'>('fulfilledDate:desc');
  const [showStats, setShowStats] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewingFulfillment, setViewingFulfillment] =
    useState<SalesFulfillmentRecord | null>(null);

  useEffect(() => {
    Promise.all([
      salesApi.listCustomers({ limit: 100 }).catch(() => null),
      inventoryApi.listWarehouses({ limit: 100 }).catch(() => null),
    ]).then(([custRes, whRes]) => {
      if (custRes?.items) setCustomers(custRes.items);
      if (whRes?.data) setWarehouses(whRes.data);
    });
  }, []);

  const loadFulfillments = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [sortBy, sortOrder] = sortId.split(':') as [string, 'asc' | 'desc'];
      try {
        const res = await salesApi.listFulfillments({
          page,
          limit,
          search: search.trim() || undefined,
          customerId: customerFilter !== 'ALL' ? customerFilter : undefined,
          warehouseId: warehouseFilter !== 'ALL' ? warehouseFilter : undefined,
          startDate: dateRange?.start
            ? `${dateRange.start}T00:00:00.000Z`
            : undefined,
          endDate: dateRange?.end ? `${dateRange.end}T23:59:59.999Z` : undefined,
          sortBy,
          sortOrder,
        });
        setFulfillments(res.items || []);
        setTotal(res.pagination?.total ?? 0);
        setTotalPages(res.pagination?.totalPages ?? 1);
      } catch (err: any) {
        toast.error('Failed to Load Fulfillments', {
          description: err?.message || 'Unable to fetch sales fulfillments.',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, limit, search, customerFilter, warehouseFilter, dateRange, sortId]
  );

  useEffect(() => {
    loadFulfillments();
  }, [loadFulfillments]);

  const pageTotals = useMemo(() => {
    return fulfillments.reduce(
      (acc, f) => ({
        units: acc.units + (f.totalFulfilledUnits || 0),
        value: acc.value + (f.totalFulfilledValue || 0),
      }),
      { units: 0, value: 0 }
    );
  }, [fulfillments]);

  const statItems: InventoryStatItem[] = [
    {
      id: 'total-fulfillments',
      label: 'Total Fulfillments',
      value: String(total),
      tooltip: 'Recorded partial or full dispatch records.',
      contextLabel: 'Ledger Records',
      badgeText: `${fulfillments.length} shown`,
      badgeTone: 'neutral',
      icon: RiCheckDoubleLine,
    },
    {
      id: 'page-units',
      label: 'Units Shipped (Page)',
      value: formatSalesQty(pageTotals.units),
      tooltip: 'Total units deducted across visible fulfillments.',
      contextLabel: 'Inventory Deductions',
      badgeText: 'Outward Stock',
      badgeTone: 'accent',
      icon: RiStackLine,
    },
    {
      id: 'page-value',
      label: 'Fulfilled Value (Page)',
      value: formatSalesCurrency(pageTotals.value),
      tooltip: 'Recognized sales revenue across visible fulfillments.',
      contextLabel: 'Fulfilled Sales',
      badgeText: 'Excl. Drafts',
      badgeTone: 'accent',
      icon: RiFileList3Line,
    },
  ];

  const hasActiveFilters =
    Boolean(search.trim()) ||
    customerFilter !== 'ALL' ||
    warehouseFilter !== 'ALL' ||
    Boolean(dateRange);

  const handleExport = () => {
    downloadCsv(
      `sales-fulfillments-p${page}.csv`,
      [
        'Fulfillment #',
        'Sales Order #',
        'Customer',
        'Warehouse',
        'Fulfilled Date',
        'Units',
        'Value',
      ],
      fulfillments.map((f) => [
        f.fulfillmentNumber,
        f.salesOrderNumber,
        `${f.customerNameSnapshot} (${f.customerCodeSnapshot})`,
        f.warehouseNameSnapshot,
        formatSalesDate(f.fulfilledDate),
        f.totalFulfilledUnits,
        f.totalFulfilledValue.toFixed(2),
      ])
    );
  };

  return (
    <div className="space-y-4">
      {showStats && <InventoryStatsBar items={statItems} />}

      <InventoryToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search fulfillment #, SO #, or customer..."
        filterTitle="Filter Fulfillments"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={() => {
          setSearch('');
          setCustomerFilter('ALL');
          setWarehouseFilter('ALL');
          setDateRange(null);
          setPage(1);
        }}
        filterContent={
          <div className="space-y-3">
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
                Fulfilled Date Range
              </p>
              <DateRangePicker
                aria-label="Fulfilled Date Range"
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
          { id: 'fulfilledDate:desc', label: 'Newest First' },
          { id: 'fulfilledDate:asc', label: 'Oldest First' },
          { id: 'totalFulfilledValue:desc', label: 'Highest Value' },
        ]}
        activeSortId={sortId}
        onSortSelect={(id) => {
          setSortId(id as typeof sortId);
          setPage(1);
        }}
        showStatistics={showStats}
        onShowStatisticsChange={setShowStats}
        onRefresh={() => loadFulfillments(true)}
        refreshing={refreshing}
        onExport={handleExport}
        exportDisabled={fulfillments.length === 0}
        primaryAction={
          canCreate
            ? {
                label: 'New Fulfillment',
                icon: RiAddLine,
                onClick: () => setCreateOpen(true),
              }
            : undefined
        }
      />

      {loading ? (
        <TableRowsSkeleton rows={5} columns={7} />
      ) : fulfillments.length === 0 ? (
        <InventoryEmptyState
          icon={RiCheckDoubleLine}
          title="No Fulfillments Found"
          description={
            hasActiveFilters
              ? 'No fulfillments match your current search or filter criteria.'
              : 'Confirm a sales order and record your first partial or full fulfillment.'
          }
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => {
            setSearch('');
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
                onClick={() => setCreateOpen(true)}
              >
                Fulfill Sales Order
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-2xl border border-separator-border bg-background-primary-default overflow-hidden">
          <div className="overflow-x-auto">
            <Table aria-label="Sales Fulfillments">
              <TableHeader>
                <TableColumn isRowHeader>Fulfillment #</TableColumn>
                <TableColumn>Sales Order</TableColumn>
                <TableColumn>Customer</TableColumn>
                <TableColumn>Warehouse</TableColumn>
                <TableColumn>Date</TableColumn>
                <TableColumn>Units</TableColumn>
                <TableColumn>Value</TableColumn>
                <TableColumn>Actions</TableColumn>
              </TableHeader>
              <TableBody>
                {fulfillments.map((f) => {
                  const orderRefId =
                    typeof f.salesOrderId === 'object'
                      ? f.salesOrderId._id
                      : f.salesOrderId;
                  return (
                    <TableRow key={f._id}>
                      <TableCell>
                        <span className="font-mono text-body-2-semibold text-text-primary">
                          {f.fulfillmentNumber}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/sales/orders/${orderRefId}`}
                          className="font-mono text-body-2-medium text-text-brand hover:underline"
                        >
                          {f.salesOrderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-body-2-medium text-text-primary">
                            {f.customerNameSnapshot}
                          </p>
                          <p className="text-caption-1-regular font-mono text-text-tertiary">
                            {f.customerCodeSnapshot}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip variant="caption" color="neutral">
                          {f.warehouseNameSnapshot}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <span className="text-body-2-regular text-text-secondary">
                          {formatSalesDate(f.fulfilledDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-body-2-medium text-text-primary tabular-nums">
                          {formatSalesQty(f.totalFulfilledUnits)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-body-2-semibold text-text-primary tabular-nums">
                          {formatSalesCurrency(f.totalFulfilledValue, f.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <IconButton
                            aria-label="Inspect fulfillment"
                            size="small"
                            icon={RiEyeLine}
                            onClick={() => setViewingFulfillment(f)}
                          />
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

      <SalesFulfillmentFormModal
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          loadFulfillments(true);
          onChanged?.();
        }}
      />

      <Modal
        isOpen={Boolean(viewingFulfillment)}
        onOpenChange={(open) => {
          if (!open) setViewingFulfillment(null);
        }}
        size="lg"
      >
        <ModalHeader
          title={viewingFulfillment?.fulfillmentNumber || 'Fulfillment Details'}
          description={
            viewingFulfillment
              ? `Order ${viewingFulfillment.salesOrderNumber} · ${viewingFulfillment.customerNameSnapshot}`
              : ''
          }
        />
        <ModalBody className="space-y-4">
          {viewingFulfillment && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-separator-border bg-background-secondary-default/40 p-3.5 text-caption-1-regular">
                <div>
                  <p className="text-text-tertiary">Warehouse</p>
                  <p className="font-medium text-text-primary mt-0.5">
                    {viewingFulfillment.warehouseNameSnapshot}
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">Fulfilled Date</p>
                  <p className="font-medium text-text-primary mt-0.5">
                    {formatSalesDate(viewingFulfillment.fulfilledDate)}
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">Total Units</p>
                  <p className="font-mono font-semibold text-text-primary mt-0.5">
                    {formatSalesQty(viewingFulfillment.totalFulfilledUnits)}
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">Recognized Value</p>
                  <p className="font-mono font-semibold text-text-primary mt-0.5">
                    {formatSalesCurrency(
                      viewingFulfillment.totalFulfilledValue,
                      viewingFulfillment.currency
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-separator-border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table aria-label="Fulfillment Items">
                    <TableHeader>
                      <TableColumn isRowHeader>Product</TableColumn>
                      <TableColumn>SKU</TableColumn>
                      <TableColumn>Ordered</TableColumn>
                      <TableColumn>Dispatched</TableColumn>
                      <TableColumn>Remaining</TableColumn>
                      <TableColumn>Amount</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {viewingFulfillment.items.map((it) => (
                        <TableRow key={it.productId}>
                          <TableCell>{it.productName}</TableCell>
                          <TableCell>
                            <span className="font-mono text-caption-1-regular">
                              {it.sku}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatSalesQty(it.orderedQuantity)} {it.unitSymbol}
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-status-lime-text">
                            -{formatSalesQty(it.fulfilledQuantity)}{' '}
                            {it.unitSymbol}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatSalesQty(it.remainingQuantity)}{' '}
                            {it.unitSymbol}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatSalesCurrency(
                              it.lineFulfilledAmount,
                              viewingFulfillment.currency
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {viewingFulfillment.notes && (
                <p className="text-body-2-regular text-text-secondary">
                  <strong className="text-text-primary">Notes:</strong>{' '}
                  {viewingFulfillment.notes}
                </p>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setViewingFulfillment(null)}
          >
            Close
          </Button>
          {viewingFulfillment && (
            <Link
              href={`/sales/orders/${
                typeof viewingFulfillment.salesOrderId === 'object'
                  ? viewingFulfillment.salesOrderId._id
                  : viewingFulfillment.salesOrderId
              }`}
            >
              <Button variant="primary">View Sales Order</Button>
            </Link>
          )}
        </ModalFooter>
      </Modal>
    </div>
  );
}
