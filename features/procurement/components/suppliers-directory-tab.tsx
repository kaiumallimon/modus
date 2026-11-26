'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiEyeLine,
  RiFileTextLine,
  RiShutDownLine,
  RiTruckLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Chip } from '@/components/base/badges/chip';
import { IconButton } from '@/components/base/buttons/icon-button';
import { AlertDialog } from '@/components/base/modal/modal';
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
import type { Supplier } from '../types/procurement';
import { SupplierDetailDrawer } from './supplier-detail-drawer';
import { SupplierFormModal } from './supplier-form-modal';
import { SupplierStatementDrawer } from './supplier-statement-drawer';

export interface SuppliersDirectoryTabProps {
  onCountChange?: (total: number) => void;
  onSwitchToTransactions?: (supplierId?: string) => void;
}

export function SuppliersDirectoryTab({
  onCountChange,
  onSwitchToTransactions,
}: SuppliersDirectoryTabProps) {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('procurement.suppliers.create');
  const canUpdate = hasPermission('procurement.suppliers.update');
  const canDelete = hasPermission('procurement.suppliers.delete');
  const canTransactions = hasPermission('procurement.supplier-transactions.read');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'value-desc'>('name-asc');
  const [showStats, setShowStats] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [statementSupplierId, setStatementSupplierId] = useState<string | null>(null);
  const [deactivatingTarget, setDeactivatingTarget] = useState<Supplier | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<Supplier | null>(null);

  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await procurementApi.listSuppliers({
        page,
        limit,
        search: debouncedSearch || undefined,
        isActive:
          statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
      });
      setSuppliers(res.data || []);
      setTotal(res.meta?.total || 0);
      setTotalPages(res.meta?.totalPages || 1);
      onCountChangeRef.current?.(res.meta?.total || 0);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [page, limit, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const sortedSuppliers = useMemo(() => {
    const list = [...suppliers];
    if (sortBy === 'name-desc') {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === 'value-desc') {
      list.sort((a, b) => (b.totalOrderedValue ?? 0) - (a.totalOrderedValue ?? 0));
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [suppliers, sortBy]);

  const statsItems = useMemo<InventoryStatItem[]>(() => {
    const activeCount = suppliers.filter((s) => s.isActive).length;
    const totalOrders = suppliers.reduce(
      (sum, s) => sum + (s.purchaseOrderCount ?? 0),
      0,
    );
    const totalOrderedValue = suppliers.reduce(
      (sum, s) => sum + (s.totalOrderedValue ?? 0),
      0,
    );

    return [
      {
        id: 'registered-suppliers',
        label: 'Registered Suppliers',
        value: total,
        tooltip: 'Total vendor records in directory',
        contextLabel: 'directory',
        badgeText: `${activeCount} active on page`,
        badgeTone: 'accent',
      },
      {
        id: 'supplier-orders',
        label: 'Purchase Orders (Page)',
        value: totalOrders,
        tooltip: 'Linked purchase orders for listed suppliers',
        contextLabel: 'ordered volume',
        badgeText: `${formatCurrency(totalOrderedValue)}`,
        badgeTone: 'accent',
      },
    ];
  }, [suppliers, total]);

  const handleExportCsv = () => {
    downloadCsv(
      'modus-suppliers.csv',
      ['Code', 'Name', 'Contact Person', 'Email', 'Phone', 'PO Count', 'Ordered Value', 'Status'],
      sortedSuppliers.map((s) => [
        s.code,
        s.name,
        s.contactPerson,
        s.email,
        s.phone,
        s.purchaseOrderCount ?? 0,
        s.totalOrderedValue ?? 0,
        s.isActive ? 'Active' : 'Inactive',
      ]),
    );
  };

  return (
    <div className="space-y-5">
      {showStats && <InventoryStatsBar items={statsItems} />}

      <InventoryToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search supplier name, code, contact, email..."
        filterTitle="Filter Suppliers"
        hasActiveFilters={statusFilter !== 'ALL'}
        onResetFilters={() => {
          setStatusFilter('ALL');
          setPage(1);
        }}
        filterContent={
          <Select
            label="Supplier Status"
            size="sm"
            selectedKey={statusFilter}
            onSelectionChange={(k) => {
              setStatusFilter(String(k) as 'ALL' | 'ACTIVE' | 'INACTIVE');
              setPage(1);
            }}
            className="w-full"
          >
            <SelectItem id="ALL" textValue="All Statuses">
              All Statuses
            </SelectItem>
            <SelectItem id="ACTIVE" textValue="Active Only">
              Active Only
            </SelectItem>
            <SelectItem id="INACTIVE" textValue="Inactive Only">
              Inactive Only
            </SelectItem>
          </Select>
        }
        sortOptions={[
          { id: 'name-asc', label: 'Name (A → Z)' },
          { id: 'name-desc', label: 'Name (Z → A)' },
          { id: 'value-desc', label: 'Highest Ordered Value' },
        ]}
        activeSortId={sortBy}
        onSortSelect={(id) => setSortBy(id as typeof sortBy)}
        showStatistics={showStats}
        onShowStatisticsChange={setShowStats}
        onRefresh={loadSuppliers}
        refreshing={loading}
        onExport={handleExportCsv}
        exportDisabled={sortedSuppliers.length === 0}
        primaryAction={
          canCreate
            ? {
                label: 'Register Supplier',
                icon: RiAddLine,
                onClick: () => {
                  setEditing(null);
                  setModalOpen(true);
                },
              }
            : undefined
        }
      />

      <div className="border border-border-button-default rounded-2xl bg-background-primary-default shadow-xs overflow-hidden">
        {!hasLoaded && loading ? (
          <TableRowsSkeleton rows={6} columns={5} />
        ) : sortedSuppliers.length === 0 ? (
          <InventoryEmptyState
            icon={RiTruckLine}
            title="No suppliers registered"
            description={
              search || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or status filter.'
                : 'Register your first vendor to begin creating purchase orders.'
            }
            hasActiveFilters={Boolean(search || statusFilter !== 'ALL')}
            onClearFilters={() => {
              setSearch('');
              setStatusFilter('ALL');
              setPage(1);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table aria-label="Suppliers directory" selectionMode="none" className="w-full">
              <TableHeader>
                <TableColumn isRowHeader>Supplier</TableColumn>
                <TableColumn>Primary Contact</TableColumn>
                <TableColumn>Purchase Orders</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn className="text-end">Actions</TableColumn>
              </TableHeader>
              <TableBody items={sortedSuppliers}>
                {(s) => (
                  <TableRow key={s._id} id={s._id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-text-primary">{s.name}</p>
                        <p className="font-mono text-caption-1-regular text-text-tertiary">
                          {s.code}
                          {s.taxId ? ` · TIN ${s.taxId}` : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-body-2-medium text-text-primary">
                          {s.contactPerson}
                        </p>
                        <p className="text-caption-1-regular text-text-tertiary">
                          {s.email} · {s.phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 font-mono tabular-nums">
                        <p className="text-body-2-medium text-text-primary">
                          {s.purchaseOrderCount ?? 0} PO(s)
                        </p>
                        <p className="text-caption-1-regular text-text-tertiary">
                          {formatCurrency(s.totalOrderedValue ?? 0)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip variant="caption" color={s.isActive ? 'lime' : 'rose'}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          aria-label={`View ${s.name}`}
                          size="small"
                          icon={RiEyeLine}
                          onClick={() => setDetailId(s._id)}
                        />
                        {canTransactions && (
                          <IconButton
                            aria-label={`Statement for ${s.name}`}
                            size="small"
                            icon={RiFileTextLine}
                            onClick={() => setStatementSupplierId(s._id)}
                          />
                        )}
                        {canUpdate && (
                          <IconButton
                            aria-label={`Edit ${s.name}`}
                            size="small"
                            icon={RiEditLine}
                            onClick={() => {
                              setEditing(s);
                              setModalOpen(true);
                            }}
                          />
                        )}
                        {canDelete && s.isActive && (
                          <IconButton
                            aria-label={`Deactivate ${s.name}`}
                            size="small"
                            icon={RiShutDownLine}
                            onClick={() => setDeactivatingTarget(s)}
                          />
                        )}
                        {canDelete && (s.purchaseOrderCount ?? 0) === 0 && (
                          <IconButton
                            aria-label={`Delete ${s.name}`}
                            size="small"
                            icon={RiDeleteBinLine}
                            onClick={() => setDeletingTarget(s)}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
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
          itemLabel="suppliers"
        />
      </div>

      <SupplierFormModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        editingSupplier={editing}
        onSuccess={loadSuppliers}
      />

      <SupplierDetailDrawer
        supplierId={detailId}
        onClose={() => setDetailId(null)}
        canEdit={canUpdate}
        onEdit={(sup) => {
          setEditing(sup);
          setModalOpen(true);
        }}
        onViewStatement={(id) =>
          onSwitchToTransactions
            ? onSwitchToTransactions(id)
            : setStatementSupplierId(id)
        }
      />

      <SupplierStatementDrawer
        supplierId={statementSupplierId}
        onClose={() => setStatementSupplierId(null)}
      />

      <AlertDialog
        isOpen={Boolean(deactivatingTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivatingTarget(null);
        }}
        variant="danger"
        title="Deactivate Supplier"
        description={
          deactivatingTarget
            ? `Deactivate "${deactivatingTarget.name}" (${deactivatingTarget.code})? Historical purchase orders and receipts remain intact, and new orders will be prevented.`
            : ''
        }
        confirmLabel="Deactivate"
        pendingLabel="Deactivating..."
        onConfirm={async () => {
          if (!deactivatingTarget) return;
          try {
            await procurementApi.deactivateSupplier(deactivatingTarget._id);
            toast.success(`Supplier "${deactivatingTarget.name}" deactivated.`);
            loadSuppliers();
          } catch (err: any) {
            toast.error(err?.message || 'Unable to deactivate supplier.');
            throw err;
          }
        }}
      />

      <AlertDialog
        isOpen={Boolean(deletingTarget)}
        onOpenChange={(open) => {
          if (!open) setDeletingTarget(null);
        }}
        variant="danger"
        title="Delete Unused Supplier"
        description={
          deletingTarget
            ? `Permanently delete unused supplier "${deletingTarget.name}"? Suppliers with purchase orders or receipts cannot be deleted.`
            : ''
        }
        confirmLabel="Delete"
        pendingLabel="Deleting..."
        onConfirm={async () => {
          if (!deletingTarget) return;
          try {
            await procurementApi.deleteSupplier(deletingTarget._id);
            toast.success(`Supplier "${deletingTarget.name}" deleted.`);
            loadSuppliers();
          } catch (err: any) {
            toast.error(err?.message || 'Unable to delete supplier.');
            throw err;
          }
        }}
      />
    </div>
  );
}
