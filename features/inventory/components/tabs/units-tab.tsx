'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAddLine,
  RiArchiveLine,
  RiDeleteBinLine,
  RiEditLine,
  RiRulerLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
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
import { UnitFormModal } from '../unit-form-modal';
import { inventoryApi } from '../../api/inventory-api';
import { downloadCsv } from '../../utils/formatters';
import type { UnitOfMeasurement } from '../../types/inventory';

export interface UnitsTabProps {
  onCountChange?: (count: number) => void;
}

export function UnitsTab({ onCountChange }: UnitsTabProps) {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('inventory.units.create');
  const canUpdate = hasPermission('inventory.units.update');
  const canDelete = hasPermission('inventory.units.delete');

  const [units, setUnits] = useState<UnitOfMeasurement[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
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

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UnitOfMeasurement | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<UnitOfMeasurement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UnitOfMeasurement | null>(null);

  const loadUnits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listUnits({
        page,
        limit,
        search: debouncedSearch || undefined,
        isActive:
          statusFilter === 'active'
            ? true
            : statusFilter === 'archived'
              ? false
              : undefined,
      });
      setUnits(res.data || []);
      const nextTotal = res.meta?.total ?? 0;
      setTotal(nextTotal);
      setTotalPages(res.meta?.totalPages ?? 1);
      setHasLoaded(true);
      onCountChangeRef.current?.(nextTotal);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load units of measurement');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter]);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  const hasActiveFilters = statusFilter !== 'ALL';

  const statsItems = useMemo<InventoryStatItem[]>(() => {
    const activeCount = units.filter((u) => u.isActive).length;
    const assignedSkus = units.reduce((sum, u) => sum + (u.productCount ?? 0), 0);

    return [
      {
        id: 'units-total',
        label: 'Configured Units',
        value: total,
        tooltip: 'Standardized base measurement units seeded or created for catalog SKUs.',
        contextLabel: 'on current page',
        badgeText: `${activeCount} active`,
        badgeTone: 'accent',
        icon: RiRulerLine,
      },
      {
        id: 'units-in-use',
        label: 'Catalog Usage',
        value: assignedSkus,
        tooltip: 'Total products currently bound to measurement units in this view.',
        contextLabel: 'unit bindings',
        badgeText: `${units.filter((u) => (u.productCount ?? 0) > 0).length} units in use`,
        badgeTone: 'neutral',
      },
    ];
  }, [units, total]);

  const handleExportCsv = () => {
    downloadCsv(
      `modus-units-page-${page}.csv`,
      ['Name', 'Symbol', 'Description', 'Linked Products', 'Status'],
      units.map((u) => [
        u.name,
        u.symbol,
        u.description || '',
        u.productCount ?? 0,
        u.isActive ? 'Active' : 'Archived',
      ]),
    );
    toast.success('Exported units CSV');
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
        searchPlaceholder="Search units by name or symbol..."
        filterTitle="Filter Units"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={() => {
          setStatusFilter('ALL');
          setPage(1);
        }}
        filterContent={
          <Select
            label="Status"
            aria-label="Filter by unit status"
            size="sm"
            selectedKey={statusFilter}
            onSelectionChange={(k) => {
              setStatusFilter(String(k));
              setPage(1);
            }}
            className="w-full"
          >
            <SelectItem id="ALL" textValue="All Statuses">
              All Statuses
            </SelectItem>
            <SelectItem id="active" textValue="Active Only">
              Active Only
            </SelectItem>
            <SelectItem id="archived" textValue="Archived Only">
              Archived Only
            </SelectItem>
          </Select>
        }
        showStatistics={showStatistics}
        onShowStatisticsChange={setShowStatistics}
        onRefresh={loadUnits}
        refreshing={loading}
        onExport={handleExportCsv}
        exportDisabled={units.length === 0}
        primaryAction={
          canCreate
            ? {
                label: 'Add Unit',
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
          <div className="flex h-64 items-center justify-center">
            <Spinner size="md" className="text-accent-600" />
          </div>
        ) : units.length === 0 ? (
          <InventoryEmptyState
            icon={RiRulerLine}
            title="No units of measurement found"
            description={
              search || hasActiveFilters
                ? 'Try clearing your filter or search terms.'
                : 'Add base measurement units such as Piece, Kilogram, or Box.'
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
            <Table aria-label="Units of measurement table" size="md">
              <TableHeader>
                <TableColumn isRowHeader>Unit Name</TableColumn>
                <TableColumn>Symbol</TableColumn>
                <TableColumn>Description</TableColumn>
                <TableColumn>Products</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Actions</TableColumn>
              </TableHeader>
              <TableBody items={units}>
                {(unit) => (
                  <TableRow key={unit._id}>
                    <TableCell>
                      <span className="font-medium text-text-primary">{unit.name}</span>
                    </TableCell>
                    <TableCell>
                      <Chip variant="caption" color="blue" className="font-mono">
                        {unit.symbol}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <span className="text-body-2-regular text-text-secondary">
                        {unit.description || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Chip variant="caption" color="neutral" className="font-mono">
                        {unit.productCount ?? 0} SKU(s)
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Chip variant="bold" color={unit.isActive ? 'lime' : 'neutral'}>
                        {unit.isActive ? 'Active' : 'Archived'}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {canUpdate && (
                          <IconButton
                            icon={RiEditLine}
                            size="small"
                            aria-label={`Edit unit ${unit.name}`}
                            onClick={() => {
                              setEditing(unit);
                              setModalOpen(true);
                            }}
                          />
                        )}
                        {canDelete && unit.isActive && (
                          <IconButton
                            icon={RiArchiveLine}
                            size="small"
                            aria-label={`Archive unit ${unit.name}`}
                            onClick={() => setArchiveTarget(unit)}
                          />
                        )}
                        {canDelete && (unit.productCount ?? 0) === 0 && (
                          <IconButton
                            icon={RiDeleteBinLine}
                            size="small"
                            aria-label={`Delete unused unit ${unit.name}`}
                            onClick={() => setDeleteTarget(unit)}
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
          itemLabel="units"
        />
      </div>

      <UnitFormModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        editingUnit={editing}
        onSaved={loadUnits}
      />

      <AlertDialog
        isOpen={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={`Archive "${archiveTarget?.name}" (${archiveTarget?.symbol})?`}
        description="Archived units preserve existing product configurations while preventing selection on new products."
        confirmLabel="Archive Unit"
        variant="danger"
        onConfirm={async () => {
          if (!archiveTarget) return;
          try {
            await inventoryApi.archiveUnit(archiveTarget._id);
            toast.success(`Unit "${archiveTarget.name}" archived`);
            setArchiveTarget(null);
            await loadUnits();
          } catch (err: any) {
            toast.error(err.message || 'Failed to archive unit');
          }
        }}
      />

      <AlertDialog
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This permanently deletes an unreferenced unit. Units linked to products cannot be deleted."
        confirmLabel="Delete Unit"
        variant="danger"
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await inventoryApi.deleteUnit(deleteTarget._id);
            toast.success(`Unit "${deleteTarget.name}" deleted`);
            setDeleteTarget(null);
            await loadUnits();
          } catch (err: any) {
            toast.error(err.message || 'Cannot delete unit');
          }
        }}
      />
    </div>
  );
}
