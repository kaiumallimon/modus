'use client';

import React, { useEffect, useState } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
} from '@/components/base/drawer/drawer';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { Divider } from '@/components/base/divider/divider';
import { Spinner } from '@/components/base/spinner/spinner';
import { inventoryApi } from '../api/inventory-api';
import {
  formatCurrency,
  formatQuantity,
  getMovementTypeMeta,
  getRefName,
} from '../utils/formatters';
import type { Product } from '../types/inventory';

export interface ProductDetailDrawerProps {
  productId: string | null;
  onClose: () => void;
  onEdit?: (product: Product) => void;
  canEdit?: boolean;
}

export function ProductDetailDrawer({
  productId,
  onClose,
  onEdit,
  canEdit = false,
}: ProductDetailDrawerProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    inventoryApi
      .getProduct(productId)
      .then((res) => {
        if (!cancelled) setProduct(res);
      })
      .catch(() => {
        if (!cancelled) setProduct(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const unitSymbol =
    product && typeof product.unitId === 'object' ? product.unitId.symbol : '';
  const unitName =
    product && typeof product.unitId === 'object'
      ? `${product.unitId.name} (${product.unitId.symbol})`
      : '—';

  return (
    <Drawer
      isOpen={Boolean(productId)}
      onOpenChange={(open) => !open && onClose()}
      size="lg"
    >
      {({ close }) => (
        <>
          <DrawerHeader
            title={product ? product.name : 'Product Details'}
            description={product ? `SKU: ${product.sku}` : undefined}
          />
          <DrawerBody>
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <Spinner size="md" className="text-accent-600" />
              </div>
            ) : !product ? (
              <p className="text-body-regular text-text-secondary">
                Unable to load product details.
              </p>
            ) : (
              <div className="space-y-5">
                {product.imageUrl && (
                  <div className="overflow-hidden rounded-2xl border border-separator-border bg-background-secondary-default">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-44 w-full object-contain p-2"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Chip variant="caption" color="neutral" className="font-mono">
                    {product.sku}
                  </Chip>
                  {product.barcode && (
                    <Chip variant="caption" color="soft" className="font-mono">
                      Barcode: {product.barcode}
                    </Chip>
                  )}
                  <Chip variant="bold" color={product.isActive ? 'lime' : 'neutral'}>
                    {product.isActive ? 'Active' : 'Archived'}
                  </Chip>
                </div>

                {product.description && (
                  <p className="text-body-regular text-text-secondary">
                    {product.description}
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3">
                    <p className="text-caption-1-medium text-text-secondary">Total Stock</p>
                    <p className="mt-0.5 text-title-2-medium text-text-primary tabular-nums">
                      {formatQuantity(product.totalStock ?? 0, unitSymbol)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3">
                    <p className="text-caption-1-medium text-text-secondary">Cost Price</p>
                    <p className="mt-0.5 text-title-3-semibold text-text-primary tabular-nums">
                      {formatCurrency(product.costPrice)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3">
                    <p className="text-caption-1-medium text-text-secondary">Selling Price</p>
                    <p className="mt-0.5 text-title-3-semibold text-text-primary tabular-nums">
                      {formatCurrency(product.sellingPrice)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3">
                    <p className="text-caption-1-medium text-text-secondary">Category</p>
                    <p className="mt-0.5 text-body-medium text-text-primary truncate">
                      {getRefName(product.categoryId)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3">
                    <p className="text-caption-1-medium text-text-secondary">Base Unit</p>
                    <p className="mt-0.5 text-body-medium text-text-primary">{unitName}</p>
                  </div>
                  <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3">
                    <p className="text-caption-1-medium text-text-secondary">Min Threshold</p>
                    <p className="mt-0.5 text-body-medium text-text-primary tabular-nums">
                      {formatQuantity(product.minStockThreshold, unitSymbol)}
                    </p>
                  </div>
                </div>

                <Divider>Warehouse Stock Breakdown</Divider>

                {!product.warehouseBalances || product.warehouseBalances.length === 0 ? (
                  <p className="text-body-2-regular text-text-tertiary">
                    No warehouse stock balances initialized for this product yet. Use Adjustments to set Opening Stock.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {product.warehouseBalances.map((bal) => (
                      <div
                        key={bal._id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-separator-border bg-background-primary-default px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-body-medium text-text-primary">
                            {bal.warehouseId?.name || 'Warehouse'}
                          </p>
                          <p className="text-caption-1-regular font-mono text-text-tertiary">
                            {bal.warehouseId?.code}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-body-medium text-text-primary tabular-nums">
                          {formatQuantity(bal.quantity, unitSymbol)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <Divider>Recent Stock Movements</Divider>

                {!product.recentMovements || product.recentMovements.length === 0 ? (
                  <p className="text-body-2-regular text-text-tertiary">
                    No historical movements recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {product.recentMovements.map((mov) => {
                      const meta = getMovementTypeMeta(mov.movementType);
                      return (
                        <div
                          key={mov._id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-separator-border bg-background-primary-default px-3 py-2"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Chip variant="caption" color={meta.color}>
                                {meta.label}
                              </Chip>
                              <span className="font-mono text-caption-1-medium text-text-tertiary">
                                {mov.referenceNumber}
                              </span>
                            </div>
                            <p className="truncate text-caption-1-regular text-text-secondary">
                              {getRefName(mov.warehouseId)} · {new Date(mov.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <span className="shrink-0 font-mono text-body-medium text-text-primary tabular-nums">
                            {mov.quantityChange > 0 ? `+${mov.quantityChange}` : mov.quantityChange}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </DrawerBody>
          <DrawerFooter>
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
            {canEdit && product && onEdit && (
              <Button
                variant="primary"
                onClick={() => {
                  close();
                  onEdit(product);
                }}
              >
                Edit Product
              </Button>
            )}
          </DrawerFooter>
        </>
      )}
    </Drawer>
  );
}
