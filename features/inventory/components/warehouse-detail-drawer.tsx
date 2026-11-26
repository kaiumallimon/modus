'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
import { formatQuantity, getMovementTypeMeta } from '../utils/formatters';
import type { Warehouse } from '../types/inventory';

export interface WarehouseDetailDrawerProps {
  warehouseId: string | null;
  onClose: () => void;
}

export function WarehouseDetailDrawer({
  warehouseId,
  onClose,
}: WarehouseDetailDrawerProps) {
  const [detail, setDetail] = useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!warehouseId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    inventoryApi
      .getWarehouse(warehouseId)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [warehouseId]);

  const addressParts = detail?.address
    ? [
        detail.address.street,
        detail.address.city,
        detail.address.state,
        detail.address.postalCode,
        detail.address.country,
      ].filter(Boolean)
    : [];

  return (
    <Drawer
      isOpen={Boolean(warehouseId)}
      onOpenChange={(open) => !open && onClose()}
      size="lg"
    >
      {({ close }) => (
        <>
          <DrawerHeader
            title={detail ? detail.name : 'Warehouse Details'}
            description={detail ? `Code: ${detail.code}` : undefined}
          />
          <DrawerBody>
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <Spinner size="md" className="text-accent-600" />
              </div>
            ) : !detail ? (
              <p className="text-body-regular text-text-secondary">
                Unable to load warehouse details.
              </p>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip variant="caption" color="neutral" className="font-mono">
                    {detail.code}
                  </Chip>
                  <Chip variant="bold" color={detail.isActive ? 'lime' : 'neutral'}>
                    {detail.isActive ? 'Active Facility' : 'Deactivated'}
                  </Chip>
                </div>

                {detail.description && (
                  <p className="text-body-regular text-text-secondary">
                    {detail.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3.5">
                    <p className="text-caption-1-medium text-text-secondary">Stocked SKUs</p>
                    <p className="mt-1 text-title-2-medium text-text-primary tabular-nums">
                      {detail.stockedProductsCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3.5">
                    <p className="text-caption-1-medium text-text-secondary">Total Stock Units</p>
                    <p className="mt-1 text-title-2-medium text-text-primary tabular-nums">
                      {formatQuantity(detail.totalStockUnits ?? 0)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3.5 space-y-1">
                  <p className="text-caption-1-semibold text-text-primary">Location Address</p>
                  <p className="text-body-regular text-text-secondary">
                    {addressParts.length > 0 ? addressParts.join(', ') : 'No address provided'}
                  </p>
                </div>

                <Divider>Stocked Items</Divider>

                {!detail.stockItems || detail.stockItems.length === 0 ? (
                  <p className="text-body-2-regular text-text-tertiary">
                    No active stock currently held in this warehouse.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detail.stockItems.map((item) => (
                      <div
                        key={item._id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-separator-border bg-background-primary-default px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-body-medium text-text-primary">
                            {item.productId?.name || 'Product'}
                          </p>
                          <p className="text-caption-1-regular font-mono text-text-tertiary">
                            {item.productId?.sku}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-body-medium text-text-primary tabular-nums">
                          {formatQuantity(item.quantity, item.productId?.unitId?.symbol)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <Divider>Recent Movements</Divider>

                {!detail.recentMovements || detail.recentMovements.length === 0 ? (
                  <p className="text-body-2-regular text-text-tertiary">
                    No stock movements recorded for this warehouse yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detail.recentMovements.map((mov) => {
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
                              {typeof mov.productId === 'object' ? mov.productId?.name : ''}
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
            {detail && (
              <div className="flex flex-wrap items-center gap-2 mr-auto">
                <Link href={`/inventory/stock?warehouseId=${detail._id}`} onClick={close}>
                  <Button variant="secondary" size="small">
                    View Facility Stock
                  </Button>
                </Link>
                <Link
                  href={`/inventory/stock?tab=movements&warehouseId=${detail._id}`}
                  onClick={close}
                >
                  <Button variant="secondary" size="small">
                    Facility Ledger
                  </Button>
                </Link>
              </div>
            )}
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
          </DrawerFooter>
        </>
      )}
    </Drawer>
  );
}
