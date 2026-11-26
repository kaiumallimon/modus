'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAddLine,
  RiAlertLine,
  RiArchiveLine,
  RiEditLine,
  RiEyeLine,
  RiPriceTag3Line,
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
import { InventoryToolbar, type InventorySortOption } from '../inventory-toolbar';
import { InventoryEmptyState } from '../inventory-empty-state';
import { StockLevelMeter } from '../inventory-charts';
import { ProductFormModal } from '../product-form-modal';
import { ProductDetailDrawer } from '../product-detail-drawer';
import { inventoryApi } from '../../api/inventory-api';
import { downloadCsv, formatCurrency, formatQuantity, getRefName } from '../../utils/formatters';
import type {
  Product,
  ProductCategory,
  UnitOfMeasurement,
} from '../../types/inventory';

const PRODUCT_SORT_OPTIONS: InventorySortOption[] = [
  { id: 'createdAt:desc', label: 'Newest First' },
  { id: 'name:asc', label: 'Name (A → Z)' },
  { id: 'sku:asc', label: 'SKU (A → Z)' },
  { id: 'costPrice:desc', label: 'Highest Cost' },
  { id: 'costPrice:asc', label: 'Lowest Cost' },
];

export interface ProductsTabProps {
  onCountChange?: (count: number) => void;
}

export function ProductsTab({ onCountChange }: ProductsTabProps) {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('inventory.products.create');
  const canUpdate = hasPermission('inventory.products.update');
  const canDelete = hasPermission('inventory.products.delete');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<UnitOfMeasurement[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [archivingProduct, setArchivingProduct] = useState<Product | null>(null);

  const loadMetadata = useCallback(async () => {
    try {
      const [catRes, unitRes] = await Promise.all([
        inventoryApi.listCategories({ limit: 100 }),
        inventoryApi.listUnits({ limit: 100 }),
      ]);
      setCategories(catRes.data || []);
      setUnits(unitRes.data || []);
    } catch {
      // Optional metadata when user lacks category/unit read permissions
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listProducts({
        page,
        limit,
        search: debouncedSearch || undefined,
        categoryId: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        isActive:
          statusFilter === 'active'
            ? true
            : statusFilter === 'archived'
              ? false
              : undefined,
        sortBy,
        sortOrder,
      });
      setProducts(res.data || []);
      const nextTotal = res.meta?.total ?? 0;
      setTotal(nextTotal);
      setTotalPages(res.meta?.totalPages ?? 1);
      setHasLoaded(true);
      onCountChangeRef.current?.(nextTotal);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, categoryFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    void loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const hasActiveFilters = categoryFilter !== 'ALL' || statusFilter !== 'ALL';
  const resetFilters = () => {
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  const statsItems = useMemo<InventoryStatItem[]>(() => {
    const activeCount = products.filter((p) => p.isActive).length;
    const archivedCount = products.filter((p) => !p.isActive).length;
    const flaggedCount = products.filter((p) => {
      if (!p.isActive) return false;
      const qty = p.totalStock ?? 0;
      const thr = p.minStockThreshold ?? 0;
      return qty <= 0 || (thr > 0 && qty <= thr);
    }).length;

    return [
      {
        id: 'total-skus',
        label: 'Catalog SKUs',
        value: total,
        tooltip: 'Total matching products in the master catalog.',
        contextLabel: 'on current page',
        badgeText: `${activeCount} active`,
        badgeTone: 'accent',
        icon: RiPriceTag3Line,
      },
      {
        id: 'flagged-skus',
        label: 'Low / Out Watch',
        value: flaggedCount,
        tooltip: 'Active products currently at or below their minimum stock threshold.',
        contextLabel: 'threshold alerts',
        badgeText: flaggedCount > 0 ? `${flaggedCount} need stock` : 'Healthy levels',
        badgeTone: flaggedCount > 0 ? 'yellow' : 'accent',
        icon: RiAlertLine,
      },
      {
        id: 'archived-skus',
        label: 'Archived SKUs',
        value: archivedCount,
        tooltip: 'Discontinued products preserved strictly for historical movements.',
        contextLabel: 'page state',
        badgeText: archivedCount > 0 ? `${archivedCount} archived` : '0 archived',
        badgeTone: archivedCount > 0 ? 'neutral' : 'accent',
        icon: RiArchiveLine,
      },
    ];
  }, [products, total]);

  const handleExportCsv = () => {
    downloadCsv(
      `modus-products-page-${page}.csv`,
      ['Name', 'SKU', 'Barcode', 'Category', 'Cost Price', 'Selling Price', 'Total Stock', 'Min Threshold', 'Status'],
      products.map((p) => [
        p.name,
        p.sku,
        p.barcode || '',
        getRefName(p.categoryId),
        p.costPrice,
        p.sellingPrice ?? '',
        p.totalStock ?? 0,
        p.minStockThreshold ?? 0,
        p.isActive ? 'Active' : 'Archived',
      ]),
    );
    toast.success('Exported products CSV');
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
        searchPlaceholder="Search products by name, SKU, or barcode..."
        filterTitle="Filter Products"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        filterContent={
          <>
            <Select
              label="Category"
              aria-label="Filter by category"
              size="sm"
              selectedKey={categoryFilter}
              onSelectionChange={(k) => {
                setCategoryFilter(String(k));
                setPage(1);
              }}
              className="w-full"
            >
              <SelectItem id="ALL" textValue="All Categories">
                All Categories
              </SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat._id} id={cat._id} textValue={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </Select>

            <Select
              label="Status"
              aria-label="Filter by status"
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
          </>
        }
        sortOptions={PRODUCT_SORT_OPTIONS}
        activeSortId={`${sortBy}:${sortOrder}`}
        onSortSelect={(id) => {
          const [field, order] = id.split(':');
          setSortBy(field || 'createdAt');
          setSortOrder((order as 'asc' | 'desc') || 'desc');
          setPage(1);
        }}
        showStatistics={showStatistics}
        onShowStatisticsChange={setShowStatistics}
        onRefresh={loadProducts}
        refreshing={loading}
        onExport={handleExportCsv}
        exportDisabled={products.length === 0}
        primaryAction={
          canCreate
            ? {
                label: 'Add Product',
                icon: RiAddLine,
                onClick: () => {
                  setEditingProduct(null);
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
        ) : products.length === 0 ? (
          <InventoryEmptyState
            icon={RiPriceTag3Line}
            title="No products found"
            description={
              search || hasActiveFilters
                ? 'Try adjusting your search query or filters.'
                : 'Add your first product SKU to begin managing inventory.'
            }
            hasActiveFilters={Boolean(search || hasActiveFilters)}
            onClearFilters={() => {
              setSearch('');
              resetFilters();
            }}
          />
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
            <Table aria-label="Inventory products table" size="md">
              <TableHeader>
                <TableColumn isRowHeader>Product</TableColumn>
                <TableColumn>SKU / Barcode</TableColumn>
                <TableColumn>Category</TableColumn>
                <TableColumn>Cost / Sell</TableColumn>
                <TableColumn>Stock Health</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Actions</TableColumn>
              </TableHeader>
              <TableBody items={products}>
                {(prod) => {
                  const unitSym =
                    typeof prod.unitId === 'object' ? prod.unitId.symbol : '';
                  const stockVal = prod.totalStock ?? 0;
                  const threshold = prod.minStockThreshold ?? 0;
                  const isOut = stockVal <= 0;
                  const isLow = !isOut && threshold > 0 && stockVal <= threshold;

                  return (
                    <TableRow key={prod._id}>
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-0">
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="size-9 rounded-lg object-cover border border-separator-border shrink-0"
                            />
                          ) : (
                            <div className="size-9 rounded-lg bg-background-secondary-default border border-separator-border flex items-center justify-center text-caption-1-semibold text-text-tertiary shrink-0">
                              {prod.sku.slice(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-text-primary">
                              {prod.name}
                            </p>
                            <p className="text-caption-1-regular text-text-tertiary">
                              Min threshold: {formatQuantity(threshold, unitSym)}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5 font-mono">
                          <p className="text-body-2-medium text-text-primary">{prod.sku}</p>
                          {prod.barcode && (
                            <p className="text-caption-1-regular text-text-tertiary">
                              {prod.barcode}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-body-2-medium text-text-secondary">
                          {getRefName(prod.categoryId)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="font-mono tabular-nums space-y-0.5">
                          <p className="text-body-2-medium text-text-primary">
                            {formatCurrency(prod.costPrice)}
                          </p>
                          <p className="text-caption-1-regular text-text-tertiary">
                            {prod.sellingPrice !== null && prod.sellingPrice !== undefined
                              ? `Sell: ${formatCurrency(prod.sellingPrice)}`
                              : 'No sell price'}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="min-w-[140px] space-y-1.5">
                          <div className="flex items-center justify-between gap-2 font-mono tabular-nums">
                            <span className="text-body-2-medium text-text-primary">
                              {formatQuantity(stockVal, unitSym)}
                            </span>
                            {isOut ? (
                              <Chip variant="caption" color="rose">
                                Out
                              </Chip>
                            ) : isLow ? (
                              <Chip variant="caption" color="yellow">
                                Low
                              </Chip>
                            ) : null}
                          </div>
                          <StockLevelMeter
                            quantity={stockVal}
                            minThreshold={threshold}
                            status={isOut ? 'OUT_OF_STOCK' : isLow ? 'LOW_STOCK' : 'IN_STOCK'}
                          />
                        </div>
                      </TableCell>

                      <TableCell>
                        <Chip
                          variant="bold"
                          color={prod.isActive ? 'lime' : 'neutral'}
                        >
                          {prod.isActive ? 'Active' : 'Archived'}
                        </Chip>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <IconButton
                            icon={RiEyeLine}
                            size="small"
                            aria-label={`View details for ${prod.name}`}
                            onClick={() => setDetailProductId(prod._id)}
                          />
                          {canUpdate && (
                            <IconButton
                              icon={RiEditLine}
                              size="small"
                              aria-label={`Edit ${prod.name}`}
                              onClick={() => {
                                setEditingProduct(prod);
                                setModalOpen(true);
                              }}
                            />
                          )}
                          {canDelete && prod.isActive && (
                            <IconButton
                              icon={RiArchiveLine}
                              size="small"
                              aria-label={`Archive ${prod.name}`}
                              onClick={() => setArchivingProduct(prod)}
                            />
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
          itemLabel="products"
        />
      </div>

      <ProductFormModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        editingProduct={editingProduct}
        categories={categories}
        units={units}
        onSaved={loadProducts}
      />

      <ProductDetailDrawer
        productId={detailProductId}
        onClose={() => setDetailProductId(null)}
        canEdit={canUpdate}
        onEdit={(p) => {
          setEditingProduct(p);
          setModalOpen(true);
        }}
      />

      <AlertDialog
        isOpen={Boolean(archivingProduct)}
        onOpenChange={(open) => !open && setArchivingProduct(null)}
        title={`Archive "${archivingProduct?.name}"?`}
        description="Archived products remain preserved in stock balance reports and historical movements, but cannot receive new adjustments or transfers."
        confirmLabel="Archive Product"
        variant="danger"
        onConfirm={async () => {
          if (!archivingProduct) return;
          try {
            await inventoryApi.archiveProduct(archivingProduct._id);
            toast.success(`Product "${archivingProduct.name}" archived`);
            setArchivingProduct(null);
            await loadProducts();
          } catch (err: any) {
            toast.error(err.message || 'Failed to archive product');
          }
        }}
      />
    </div>
  );
}
