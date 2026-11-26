'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAddLine,
  RiArchiveLine,
  RiDeleteBinLine,
  RiEditLine,
  RiFolderLine,
  RiGitBranchLine,
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
import { CategoryFormModal } from '../category-form-modal';
import { inventoryApi } from '../../api/inventory-api';
import { downloadCsv, getRefName } from '../../utils/formatters';
import type { ProductCategory } from '../../types/inventory';

export interface CategoriesTabProps {
  onCountChange?: (count: number) => void;
}

export function CategoriesTab({ onCountChange }: CategoriesTabProps) {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('inventory.categories.create');
  const canUpdate = hasPermission('inventory.categories.update');
  const canDelete = hasPermission('inventory.categories.delete');

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [allCategories, setAllCategories] = useState<ProductCategory[]>([]);
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
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ProductCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const [pageRes, allRes] = await Promise.all([
        inventoryApi.listCategories({
          page,
          limit,
          search: debouncedSearch || undefined,
          isActive:
            statusFilter === 'active'
              ? true
              : statusFilter === 'archived'
                ? false
                : undefined,
        }),
        inventoryApi.listCategories({ limit: 100 }),
      ]);
      setCategories(pageRes.data || []);
      const nextTotal = pageRes.meta?.total ?? 0;
      setTotal(nextTotal);
      setTotalPages(pageRes.meta?.totalPages ?? 1);
      setAllCategories(allRes.data || []);
      setHasLoaded(true);
      onCountChangeRef.current?.(allRes.meta?.total ?? nextTotal);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const hasActiveFilters = statusFilter !== 'ALL';

  const statsItems = useMemo<InventoryStatItem[]>(() => {
    const activeCount = allCategories.filter((c) => c.isActive).length;
    const nestedCount = allCategories.filter((c) => Boolean(c.parentCategoryId)).length;
    const totalLinked = allCategories.reduce((sum, c) => sum + (c.productCount ?? 0), 0);

    return [
      {
        id: 'total-cats',
        label: 'Categories',
        value: allCategories.length || total,
        tooltip: 'All product categories registered in the catalog taxonomy.',
        contextLabel: 'operational state',
        badgeText: `${activeCount} active`,
        badgeTone: 'accent',
        icon: RiFolderLine,
      },
      {
        id: 'hierarchy',
        label: 'Subcategories',
        value: nestedCount,
        tooltip: 'Categories organized beneath a parent category node.',
        contextLabel: 'root nodes',
        badgeText: `${Math.max(0, allCategories.length - nestedCount)} top-level`,
        badgeTone: 'neutral',
        icon: RiGitBranchLine,
      },
      {
        id: 'linked-products',
        label: 'Assigned SKUs',
        value: totalLinked,
        tooltip: 'Total catalog products grouped under these categories.',
        contextLabel: 'taxonomy coverage',
        badgeText: `${allCategories.filter((c) => (c.productCount ?? 0) > 0).length} in use`,
        badgeTone: 'accent',
      },
    ];
  }, [allCategories, total]);

  const handleExportCsv = () => {
    downloadCsv(
      `modus-categories-page-${page}.csv`,
      ['Name', 'Parent Category', 'Description', 'Linked Products', 'Status'],
      categories.map((c) => [
        c.name,
        c.parentCategoryId ? getRefName(c.parentCategoryId) : '',
        c.description || '',
        c.productCount ?? 0,
        c.isActive ? 'Active' : 'Archived',
      ]),
    );
    toast.success('Exported categories CSV');
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
        searchPlaceholder="Search categories..."
        filterTitle="Filter Categories"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={() => {
          setStatusFilter('ALL');
          setPage(1);
        }}
        filterContent={
          <Select
            label="Status"
            aria-label="Filter by category status"
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
        onRefresh={loadCategories}
        refreshing={loading}
        onExport={handleExportCsv}
        exportDisabled={categories.length === 0}
        primaryAction={
          canCreate
            ? {
                label: 'Add Category',
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
        ) : categories.length === 0 ? (
          <InventoryEmptyState
            icon={RiFolderLine}
            title="No categories found"
            description={
              search || hasActiveFilters
                ? 'Try clearing filters or searching with another term.'
                : 'Create product categories to structure your catalog.'
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
            <Table aria-label="Product categories table" size="md">
              <TableHeader>
                <TableColumn isRowHeader>Category</TableColumn>
                <TableColumn>Parent</TableColumn>
                <TableColumn>Products</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Actions</TableColumn>
              </TableHeader>
              <TableBody items={categories}>
                {(cat) => (
                  <TableRow key={cat._id}>
                    <TableCell>
                      <div className="space-y-0.5 max-w-md">
                        <p className="font-medium text-text-primary">{cat.name}</p>
                        {cat.description && (
                          <p className="truncate text-caption-1-regular text-text-tertiary">
                            {cat.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-body-2-medium text-text-secondary">
                        {cat.parentCategoryId ? getRefName(cat.parentCategoryId) : 'Top Level'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Chip variant="caption" color="neutral" className="font-mono">
                        {cat.productCount ?? 0} SKU(s)
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Chip variant="bold" color={cat.isActive ? 'lime' : 'neutral'}>
                        {cat.isActive ? 'Active' : 'Archived'}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {canUpdate && (
                          <IconButton
                            icon={RiEditLine}
                            size="small"
                            aria-label={`Edit category ${cat.name}`}
                            onClick={() => {
                              setEditing(cat);
                              setModalOpen(true);
                            }}
                          />
                        )}
                        {canDelete && cat.isActive && (
                          <IconButton
                            icon={RiArchiveLine}
                            size="small"
                            aria-label={`Archive category ${cat.name}`}
                            onClick={() => setArchiveTarget(cat)}
                          />
                        )}
                        {canDelete && (cat.productCount ?? 0) === 0 && (
                          <IconButton
                            icon={RiDeleteBinLine}
                            size="small"
                            aria-label={`Delete unused category ${cat.name}`}
                            onClick={() => setDeleteTarget(cat)}
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
          itemLabel="categories"
        />
      </div>

      <CategoryFormModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        editingCategory={editing}
        categories={allCategories}
        onSaved={loadCategories}
      />

      <AlertDialog
        isOpen={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={`Archive "${archiveTarget?.name}"?`}
        description="Archived categories preserve existing product links cleanly while preventing new product assignments."
        confirmLabel="Archive Category"
        variant="danger"
        onConfirm={async () => {
          if (!archiveTarget) return;
          try {
            await inventoryApi.archiveCategory(archiveTarget._id);
            toast.success(`Category "${archiveTarget.name}" archived`);
            setArchiveTarget(null);
            await loadCategories();
          } catch (err: any) {
            toast.error(err.message || 'Failed to archive category');
          }
        }}
      />

      <AlertDialog
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This permanently deletes the unreferenced category. Categories with linked products are protected from deletion."
        confirmLabel="Delete Category"
        variant="danger"
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await inventoryApi.deleteCategory(deleteTarget._id);
            toast.success(`Category "${deleteTarget.name}" deleted`);
            setDeleteTarget(null);
            await loadCategories();
          } catch (err: any) {
            toast.error(err.message || 'Cannot delete category');
          }
        }}
      />
    </div>
  );
}
