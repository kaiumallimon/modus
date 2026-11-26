'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiExchangeDollarLine,
  RiFileTextLine,
  RiInformationLine,
} from '@remixicon/react';
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
import { InventoryEmptyState } from '@/features/inventory/components/inventory-empty-state';
import { InventoryPaginationFooter } from '@/features/inventory/components/inventory-pagination-footer';
import {
  InventoryStatsBar,
  type InventoryStatItem,
} from '@/features/inventory/components/inventory-stats-bar';
import { InventoryToolbar } from '@/features/inventory/components/inventory-toolbar';
import { downloadCsv, formatCurrency } from '@/features/inventory/utils/formatters';
import { procurementApi } from '../api/procurement-api';
import type {
  Supplier,
  SupplierTransactionEntry,
  SupplierTransactionsSummary,
  SupplierTransactionType,
} from '../types/procurement';
import { getTransactionTypeMeta } from '../utils/formatters';
import { SupplierStatementDrawer } from './supplier-statement-drawer';

export interface SupplierTransactionsTabProps {
  initialSupplierId?: string;
  onCountChange?: (total: number) => void;
}

export function SupplierTransactionsTab({
  initialSupplierId = '',
  onCountChange,
}: SupplierTransactionsTabProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [entries, setEntries] = useState<SupplierTransactionEntry[]>([]);
  const [summary, setSummary] = useState<SupplierTransactionsSummary | null>(
    null,
  );
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState(initialSupplierId || 'ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | SupplierTransactionType>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [statementSupplierId, setStatementSupplierId] = useState<string | null>(
    null,
  );

  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  useEffect(() => {
    if (initialSupplierId) {
      setSupplierFilter(initialSupplierId);
      setPage(1);
    }
  }, [initialSupplierId]);

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

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await procurementApi.listSupplierTransactions({
        page,
        limit,
        search: debouncedSearch || undefined,
        supplierId: supplierFilter !== 'ALL' ? supplierFilter : undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        startDate: dateRange?.start ? dateRange.start.toString() : undefined,
        endDate: dateRange?.end ? dateRange.end.toString() : undefined,
      });
      setEntries(res.data || []);
      setSummary(res.summary || null);
      setTotal(res.meta?.total || 0);
      setTotalPages(res.meta?.totalPages || 1);
      onCountChangeRef.current?.(res.meta?.total || 0);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load supplier transactions');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [page, limit, debouncedSearch, supplierFilter, typeFilter, dateRange]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const statsItems = useMemo<InventoryStatItem[]>(() => {
    const cur = summary?.currency || 'USD';
    return [
      {
        id: 'committed-po-value',
        label: 'Committed PO Value',
        value: formatCurrency(summary?.totalOrderedCommitment ?? 0, cur),
        tooltip: 'Submitted, partial, and completed PO totals (non-accounting)',
        contextLabel: 'commitments',
        badgeText: `${summary?.transactionCount ?? 0} entries`,
        badgeTone: 'neutral',
      },
      {
        id: 'confirmed-goods-received',
        label: 'Confirmed Goods Received',
        value: formatCurrency(summary?.totalReceivedGoodsValue ?? 0, cur),
        tooltip: 'Value of inventory received across confirmed Goods Receipts',
        contextLabel: 'receipts',
        badgeText: 'Inventory backed',
        badgeTone: 'accent',
      },
      {
        id: 'open-unreceived',
        label: 'Open Unreceived Commitment',
        value: formatCurrency(summary?.unreceivedCommitmentAmount ?? 0, cur),
        tooltip:
          'Committed PO value minus confirmed receipts (not an AP payment balance)',
        contextLabel: 'pending delivery',
        badgeText: 'Non-accounting',
        badgeTone: 'yellow',
      },
    ];
  }, [summary]);

  const hasActiveFilters =
    supplierFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    Boolean(dateRange?.start || dateRange?.end);

  const handleExportCsv = () => {
    downloadCsv(
      'modus-supplier-transactions.csv',
      ['Date', 'Type', 'Reference', 'PO Ref', 'Supplier', 'Warehouse', 'Commitment Note', 'Amount', 'Status'],
      entries.map((e) => [
        new Date(e.date).toISOString(),
        e.transactionType,
        e.referenceNumber,
        e.purchaseOrderNumber,
        `${e.supplierName} (${e.supplierCode})`,
        e.warehouseCode || '—',
        e.commitmentLabel,
        e.amount,
        e.status,
      ]),
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2.5 rounded-2xl border border-separator-border bg-background-secondary-default/70 px-4 py-3 text-caption-1-regular text-text-secondary">
        <RiInformationLine className="size-4.5 shrink-0 text-text-tertiary mt-0.5" />
        <p>
          {summary?.accountingNote ||
            'Procurement activity summary only: totals reflect purchase order commitments and confirmed goods receipt values, not verified vendor invoices, payments, or accounts payable debt.'}
        </p>
      </div>

      {showStats && <InventoryStatsBar items={statsItems} />}

      <InventoryToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search PO #, GRN #, supplier..."
        filterTitle="Filter Transactions"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={() => {
          setSupplierFilter('ALL');
          setTypeFilter('ALL');
          setDateRange(null);
          setPage(1);
        }}
        filterContent={
          <div className="space-y-3">
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
              label="Entry Type"
              size="sm"
              selectedKey={typeFilter}
              onSelectionChange={(k) => {
                setTypeFilter(String(k) as 'ALL' | SupplierTransactionType);
                setPage(1);
              }}
              className="w-full"
            >
              <SelectItem id="ALL" textValue="All Types">
                All Types
              </SelectItem>
              <SelectItem id="PURCHASE_ORDER" textValue="Purchase Orders">
                Purchase Orders
              </SelectItem>
              <SelectItem id="GOODS_RECEIPT" textValue="Confirmed Goods Receipts">
                Confirmed Goods Receipts
              </SelectItem>
            </Select>

            <div>
              <span className="text-caption-1-medium text-text-secondary block mb-1">
                Date Range
              </span>
              <DateRangePicker
                aria-label="Filter transactions by date range"
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
        onRefresh={loadTransactions}
        refreshing={loading}
        onExport={handleExportCsv}
        exportDisabled={entries.length === 0}
      />

      <div className="border border-border-button-default rounded-2xl bg-background-primary-default shadow-xs overflow-hidden">
        {!hasLoaded && loading ? (
          <TableRowsSkeleton rows={6} columns={5} />
        ) : entries.length === 0 ? (
          <InventoryEmptyState
            icon={RiExchangeDollarLine}
            title="No supplier transactions found"
            description={
              search || hasActiveFilters
                ? 'Try clearing filters or widening the date range.'
                : 'Purchase orders and confirmed goods receipts will appear here chronologically.'
            }
            hasActiveFilters={Boolean(search || hasActiveFilters)}
            onClearFilters={() => {
              setSearch('');
              setSupplierFilter('ALL');
              setTypeFilter('ALL');
              setDateRange(null);
              setPage(1);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table aria-label="Supplier transactions history" selectionMode="none" className="w-full">
              <TableHeader>
                <TableColumn isRowHeader>Reference &amp; Type</TableColumn>
                <TableColumn>Supplier</TableColumn>
                <TableColumn>PO / Warehouse</TableColumn>
                <TableColumn>Commitment / Receipt Value</TableColumn>
                <TableColumn>Date</TableColumn>
                <TableColumn className="text-end">Statement</TableColumn>
              </TableHeader>
              <TableBody items={entries}>
                {(entry) => {
                  const meta = getTransactionTypeMeta(entry.transactionType);
                  return (
                    <TableRow key={entry.id} id={entry.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-semibold text-text-primary">
                              {entry.referenceNumber}
                            </span>
                            <Chip variant="caption" color={meta.color}>
                              {meta.label}
                            </Chip>
                          </div>
                          <p className="text-caption-1-regular text-text-tertiary">
                            {entry.commitmentLabel} · {entry.status}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium text-text-primary">
                            {entry.supplierName}
                          </p>
                          <p className="font-mono text-caption-1-regular text-text-tertiary">
                            {entry.supplierCode}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 font-mono text-caption-1-regular text-text-secondary">
                          <p>{entry.purchaseOrderNumber}</p>
                          <p className="text-text-tertiary">
                            {entry.warehouseCode || '—'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold text-text-primary tabular-nums">
                          {formatCurrency(entry.amount, entry.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-caption-1-regular text-text-secondary">
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <IconButton
                            aria-label={`Statement for ${entry.supplierName}`}
                            size="small"
                            icon={RiFileTextLine}
                            onClick={() => setStatementSupplierId(entry.supplierId)}
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
          itemLabel="transactions"
        />
      </div>

      <SupplierStatementDrawer
        supplierId={statementSupplierId}
        onClose={() => setStatementSupplierId(null)}
      />
    </div>
  );
}
