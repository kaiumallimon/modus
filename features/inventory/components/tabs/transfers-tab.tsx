'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAddLine,
  RiArrowLeftRightLine,
  RiCheckDoubleLine,
  RiEyeLine,
  RiTimeLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Chip } from '@/components/base/badges/chip';
import { Select, SelectItem } from '@/components/base/select/select';
import { Spinner } from '@/components/base/spinner/spinner';
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
import { InventoryPaginationFooter } from '../inventory-pagination-footer';
import { InventoryStatsBar, type InventoryStatItem } from '../inventory-stats-bar';
import { InventoryToolbar } from '../inventory-toolbar';
import { InventoryEmptyState } from '../inventory-empty-state';
import { TransferFormModal } from '../transfer-form-modal';
import { TransferDetailDrawer } from '../transfer-detail-drawer';
import { inventoryApi } from '../../api/inventory-api';
import {
  downloadCsv,
  formatQuantity,
  getRefName,
  getTransferStatusMeta,
} from '../../utils/formatters';
import type {
  Product,
  StockTransfer,
  TransferStatus,
  Warehouse,
} from '../../types/inventory';

export interface TransfersTabProps {
  onCountChange?: (count: number) => void;
}

export function TransfersTab({ onCountChange }: TransfersTabProps) {
  const { hasPermission } = useAuth();
  const canTransfer = hasPermission('inventory.stock.transfer');

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransferStatus>('ALL');
  const [showStatistics, setShowStatistics] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed) {
      setDebouncedSearch('');
      return;
    }
    const timer = setTimeout(() => setDebouncedSearch(trimmed), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailTransfer, setDetailTransfer] = useState<StockTransfer | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<StockTransfer | null>(null);

  const loadMetadata = useCallback(async () => {
    try {
      const [prodRes, whRes] = await Promise.all([
        inventoryApi.listProducts({ limit: 100 }),
        inventoryApi.listWarehouses({ limit: 100 }),
      ]);
      setProducts(prodRes.data || []);
      setWarehouses(whRes.data || []);
    } catch {
      // Optional
    }
  }, []);

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listTransfers({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setTransfers(res.data || []);
      const nextTotal = res.meta?.total ?? 0;
      setTotal(nextTotal);
      setTotalPages(res.meta?.totalPages ?? 1);
      setHasLoaded(true);
      onCountChangeRef.current?.(nextTotal);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load stock transfers');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter]);

  useEffect(() => {
    void loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    void loadTransfers();
  }, [loadTransfers]);

  const executeConfirm = async (transfer: StockTransfer) => {
    try {
      const updated = await inventoryApi.confirmTransfer(transfer._id);
      toast.success(`Transfer ${updated.referenceNumber} confirmed atomically`);
      setConfirmTarget(null);
      if (detailTransfer?._id === transfer._id) {
        setDetailTransfer(updated);
      }
      await loadTransfers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm transfer');
    }
  };

  const hasActiveFilters = statusFilter !== 'ALL';

  const statsItems = useMemo<InventoryStatItem[]>(() => {
    const pendingCount = transfers.filter((t) => t.status === 'PENDING').length;
    const confirmedCount = transfers.filter((t) => t.status === 'CONFIRMED').length;

    return [
      {
        id: 'transfers-total',
        label: 'Stock Transfers',
        value: total,
        tooltip: 'Inter-warehouse transfer orders tracked across facilities.',
        contextLabel: 'on current page',
        badgeText: `${transfers.length} shown`,
        badgeTone: 'accent',
        icon: RiArrowLeftRightLine,
      },
      {
        id: 'transfers-pending',
        label: 'Pending Confirmation',
        value: pendingCount,
        tooltip: 'Transfer orders awaiting explicit confirmation to move balances.',
        contextLabel: 'awaiting sign-off',
        badgeText: pendingCount > 0 ? 'Action needed' : 'Queue clear',
        badgeTone: pendingCount > 0 ? 'yellow' : 'accent',
        icon: RiTimeLine,
      },
      {
        id: 'transfers-confirmed',
        label: 'Confirmed Transfers',
        value: confirmedCount,
        tooltip: 'Atomically executed transfers posted to the movement ledger.',
        contextLabel: 'settled on page',
        badgeText: `${confirmedCount} settled`,
        badgeTone: 'accent',
        icon: RiCheckDoubleLine,
      },
    ];
  }, [transfers, total]);

  const handleExportCsv = () => {
    downloadCsv(
      `modus-transfers-page-${page}.csv`,
      ['Reference', 'Source Warehouse', 'Destination Warehouse', 'Lines', 'Units', 'Status', 'Created By', 'Timestamp'],
      transfers.map((trf) => [
        trf.referenceNumber,
        getRefName(trf.sourceWarehouseId),
        getRefName(trf.destinationWarehouseId),
        trf.items.length,
        trf.items.reduce((acc, i) => acc + i.quantity, 0),
        trf.status,
        trf.createdBy?.email || '',
        new Date(trf.createdAt).toISOString(),
      ]),
    );
    toast.success('Exported stock transfers CSV');
  };

  return (
    <div className="space-y-5">
      {showStatistics && <InventoryStatsBar items={statsItems} />}

      <InventoryToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search transfer reference or notes..."
        filterTitle="Filter Transfers"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={() => {
          setStatusFilter('ALL');
          setPage(1);
        }}
        filterContent={
          <Select
            label="Transfer Status"
            aria-label="Filter by transfer status"
            size="sm"
            selectedKey={statusFilter}
            onSelectionChange={(k) => {
              setStatusFilter(String(k) as 'ALL' | TransferStatus);
              setPage(1);
            }}
            className="w-full"
          >
            <SelectItem id="ALL" textValue="All Statuses">
              All Statuses
            </SelectItem>
            <SelectItem id="PENDING" textValue="Pending Confirmation">
              Pending Confirmation
            </SelectItem>
            <SelectItem id="CONFIRMED" textValue="Confirmed">
              Confirmed
            </SelectItem>
          </Select>
        }
        showStatistics={showStatistics}
        onShowStatisticsChange={setShowStatistics}
        onRefresh={loadTransfers}
        refreshing={loading}
        onExport={handleExportCsv}
        exportDisabled={transfers.length === 0}
        primaryAction={
          canTransfer
            ? {
                label: 'New Transfer',
                icon: RiAddLine,
                onClick: () => setCreateOpen(true),
              }
            : undefined
        }
      />

      <div className="border border-border-button-default rounded-2xl bg-background-primary-default shadow-xs overflow-hidden">
        {!hasLoaded && loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="md" className="text-accent-600" />
          </div>
        ) : transfers.length === 0 ? (
          <InventoryEmptyState
            icon={RiArrowLeftRightLine}
            title="No stock transfers found"
            description={
              search || hasActiveFilters
                ? 'Try clearing filters or another search keyword.'
                : 'Create a transfer to relocate inventory from one warehouse to another.'
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
            <Table aria-label="Inter-warehouse stock transfers table" size="md">
              <TableHeader>
                <TableColumn isRowHeader>Reference</TableColumn>
                <TableColumn>Route (Source → Destination)</TableColumn>
                <TableColumn>Items</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Created By</TableColumn>
                <TableColumn>Actions</TableColumn>
              </TableHeader>
              <TableBody items={transfers}>
                {(trf) => {
                  const statusMeta = getTransferStatusMeta(trf.status);
                  const totalUnits = trf.items.reduce((acc, i) => acc + i.quantity, 0);

                  return (
                    <TableRow key={trf._id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-mono text-body-2-medium font-semibold text-text-primary">
                            {trf.referenceNumber}
                          </span>
                          <p className="text-caption-1-regular text-text-tertiary">
                            {new Date(trf.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-body-2-medium text-text-primary">
                            {getRefName(trf.sourceWarehouseId)} →{' '}
                            {getRefName(trf.destinationWarehouseId)}
                          </p>
                          {trf.notes && (
                            <p className="truncate max-w-xs text-caption-1-regular text-text-tertiary">
                              {trf.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-body-2-medium text-text-secondary tabular-nums">
                          {trf.items.length} SKU(s) · {formatQuantity(totalUnits)} units
                        </span>
                      </TableCell>
                      <TableCell>
                        <Chip variant="bold" color={statusMeta.color}>
                          {statusMeta.label}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <span className="text-caption-1-medium text-text-secondary">
                          {trf.createdBy?.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <IconButton
                            icon={RiEyeLine}
                            size="small"
                            aria-label={`Inspect transfer ${trf.referenceNumber}`}
                            onClick={() => setDetailTransfer(trf)}
                          />
                          {canTransfer && trf.status === 'PENDING' && (
                            <Button
                              variant="primary"
                              size="small"
                              leadingIcon={RiCheckDoubleLine}
                              onClick={() => setConfirmTarget(trf)}
                            >
                              Confirm
                            </Button>
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
          itemLabel="transfers"
        />
      </div>

      <TransferFormModal
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        products={products}
        warehouses={warehouses}
        onCreated={loadTransfers}
      />

      <TransferDetailDrawer
        transfer={detailTransfer}
        onClose={() => setDetailTransfer(null)}
        canConfirm={canTransfer}
        onConfirmTransfer={executeConfirm}
      />

      <AlertDialog
        isOpen={Boolean(confirmTarget)}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        title={`Confirm transfer ${confirmTarget?.referenceNumber}?`}
        description="This atomically decreases stock in the source warehouse, increases stock in the destination warehouse, and writes append-only ledger entries."
        confirmLabel="Confirm & Move Stock"
        variant="default"
        onConfirm={() => {
          if (confirmTarget) return executeConfirm(confirmTarget);
        }}
      />
    </div>
  );
}
