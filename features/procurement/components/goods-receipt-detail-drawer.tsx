'use client';

import React, { useEffect, useState } from 'react';
import { RiCheckDoubleLine } from '@remixicon/react';
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
} from '@/components/base/drawer/drawer';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { AlertDialog } from '@/components/base/modal/modal';
import { DetailDrawerSkeleton } from '@/components/application/loading/page-skeletons';
import { toast } from '@/components/base/toast/toast';
import { formatCurrency, formatQuantity } from '@/features/inventory/utils/formatters';
import { procurementApi } from '../api/procurement-api';
import { getGoodsReceiptStatusMeta } from '../utils/formatters';
import type { GoodsReceipt } from '../types/procurement';

export interface GoodsReceiptDetailDrawerProps {
  receiptId: string | null;
  onClose: () => void;
  onConfirmed?: () => void;
  canConfirm?: boolean;
}

export function GoodsReceiptDetailDrawer({
  receiptId,
  onClose,
  onConfirmed,
  canConfirm = false,
}: GoodsReceiptDetailDrawerProps) {
  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmKey, setConfirmKey] = useState('');

  useEffect(() => {
    if (!receiptId) {
      setReceipt(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    procurementApi
      .getGoodsReceipt(receiptId)
      .then((res) => {
        if (!cancelled) setReceipt(res);
      })
      .catch(() => {
        if (!cancelled) setReceipt(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [receiptId]);

  const supplierObj =
    receipt && typeof receipt.supplierId === 'object' ? receipt.supplierId : null;
  const whObj =
    receipt && typeof receipt.destinationWarehouseId === 'object'
      ? receipt.destinationWarehouseId
      : null;

  return (
    <>
      <Drawer
        isOpen={Boolean(receiptId)}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        placement="end"
        size="lg"
      >
        {({ close }) => (
          <>
            <DrawerHeader
              title={receipt ? `Receipt ${receipt.receiptNumber}` : 'Goods Receipt Details'}
              description={
                receipt
                  ? `Purchase Order: ${receipt.purchaseOrderNumber}`
                  : undefined
              }
            />
            <DrawerBody>
              {loading ? (
                <DetailDrawerSkeleton />
              ) : !receipt ? (
                <p className="text-body-regular text-text-secondary">
                  Unable to load goods receipt details.
                </p>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip variant="caption" color="neutral" className="font-mono">
                      {receipt.receiptNumber}
                    </Chip>
                    <Chip
                      variant="caption"
                      color={getGoodsReceiptStatusMeta(receipt.status).color}
                    >
                      {getGoodsReceiptStatusMeta(receipt.status).label}
                    </Chip>
                    <Chip variant="caption" color="blue" className="font-mono">
                      PO: {receipt.purchaseOrderNumber}
                    </Chip>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3.5">
                      <p className="text-caption-1-medium text-text-secondary">
                        Supplier
                      </p>
                      <p className="mt-1 text-body-2-medium font-semibold text-text-primary">
                        {supplierObj?.name || 'Supplier'}
                      </p>
                      {supplierObj?.code && (
                        <p className="text-caption-1-regular font-mono text-text-tertiary">
                          {supplierObj.code}
                        </p>
                      )}
                    </div>
                    <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3.5">
                      <p className="text-caption-1-medium text-text-secondary">
                        Destination Warehouse
                      </p>
                      <p className="mt-1 text-body-2-medium font-semibold text-text-primary">
                        {whObj?.name || 'Warehouse'}
                      </p>
                      {whObj?.code && (
                        <p className="text-caption-1-regular font-mono text-text-tertiary">
                          {whObj.code}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3.5">
                      <p className="text-caption-1-medium text-text-secondary">
                        Received Units
                      </p>
                      <p className="mt-1 text-title-3-semibold font-mono text-text-primary tabular-nums">
                        {formatQuantity(receipt.totalReceivedUnits)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3.5">
                      <p className="text-caption-1-medium text-text-secondary">
                        Received Value
                      </p>
                      <p className="mt-1 text-title-3-semibold font-mono text-text-primary tabular-nums">
                        {formatCurrency(receipt.totalReceivedValue, receipt.currency)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3.5">
                      <p className="text-caption-1-medium text-text-secondary">
                        Received Date
                      </p>
                      <p className="mt-1 text-body-2-medium font-mono text-text-primary">
                        {new Date(receipt.receivedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-caption-1-semibold text-text-primary">
                      Received Line Items ({receipt.items.length})
                    </p>
                    <div className="divide-y divide-separator-border rounded-2xl border border-separator-border overflow-hidden">
                      {receipt.items.map((item) => (
                        <div
                          key={item.productId}
                          className="p-3 bg-background-primary-default space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-body-2-medium font-semibold text-text-primary">
                                {item.productName}
                              </p>
                              <p className="text-caption-1-regular font-mono text-text-tertiary">
                                {item.sku} · {formatCurrency(item.unitPrice, receipt.currency)} /{' '}
                                {item.unitSymbol || 'unit'}
                              </p>
                            </div>
                            <span className="font-mono text-body-2-medium font-semibold text-text-primary tabular-nums">
                              {formatCurrency(item.lineReceivedAmount, receipt.currency)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-caption-1-medium">
                            <div className="rounded-lg bg-background-secondary-default/60 px-2.5 py-1.5">
                              <span className="text-text-tertiary block">Ordered</span>
                              <span className="font-mono text-text-primary">
                                {formatQuantity(item.orderedQuantity, item.unitSymbol)}
                              </span>
                            </div>
                            <div className="rounded-lg bg-background-secondary-default/60 px-2.5 py-1.5">
                              <span className="text-text-tertiary block">Previously</span>
                              <span className="font-mono text-text-primary">
                                {formatQuantity(
                                  item.previouslyReceivedQuantity,
                                  item.unitSymbol,
                                )}
                              </span>
                            </div>
                            <div className="rounded-lg bg-accent-50 dark:bg-accent-950/30 px-2.5 py-1.5">
                              <span className="text-accent-700 dark:text-accent-300 block">
                                Received
                              </span>
                              <span className="font-mono font-semibold text-accent-700 dark:text-accent-300">
                                +{formatQuantity(item.receivedQuantity, item.unitSymbol)}
                              </span>
                            </div>
                            <div className="rounded-lg bg-background-secondary-default/60 px-2.5 py-1.5">
                              <span className="text-text-tertiary block">Remaining</span>
                              <span className="font-mono text-text-primary">
                                {formatQuantity(item.remainingQuantity, item.unitSymbol)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-separator-border bg-background-secondary-default/50 p-3.5 text-caption-1-regular text-text-secondary space-y-1">
                    <p>
                      <strong className="text-text-primary">Created by:</strong>{' '}
                      {receipt.createdBy?.email || '—'} on{' '}
                      {receipt.createdAt
                        ? new Date(receipt.createdAt).toLocaleString()
                        : '—'}
                    </p>
                    {receipt.confirmedAt && (
                      <p>
                        <strong className="text-text-primary">Confirmed by:</strong>{' '}
                        {receipt.confirmedBy?.email || '—'} on{' '}
                        {new Date(receipt.confirmedAt).toLocaleString()}
                      </p>
                    )}
                    {receipt.notes && (
                      <p>
                        <strong className="text-text-primary">Notes:</strong>{' '}
                        {receipt.notes}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </DrawerBody>
            <DrawerFooter>
              <Button variant="secondary" onClick={close}>
                Close
              </Button>
              {canConfirm && receipt?.status === 'DRAFT' && (
                <Button
                  variant="primary"
                  leadingIcon={RiCheckDoubleLine}
                  className="text-[#171B18]"
                  onClick={() => {
                    setConfirmKey(
                      `grn-confirm-${receipt._id}-${Date.now()}`,
                    );
                    setConfirmDialogOpen(true);
                  }}
                >
                  Confirm &amp; Update Inventory
                </Button>
              )}
            </DrawerFooter>
          </>
        )}
      </Drawer>

      <AlertDialog
        isOpen={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        variant="default"
        title="Confirm Goods Receipt & Update Inventory"
        description={
          receipt
            ? `Confirming ${receipt.receiptNumber} will increase Inventory warehouse stock by ${receipt.totalReceivedUnits} unit(s), record PURCHASE_RECEIPT ledger entries, and lock this receipt from edits.`
            : ''
        }
        confirmLabel="Confirm & Update Stock"
        pendingLabel="Confirming..."
        onConfirm={async () => {
          if (!receipt) return;
          try {
            const updated = await procurementApi.confirmGoodsReceipt(
              receipt._id,
              confirmKey,
            );
            setReceipt(updated);
            toast.success(
              `Goods receipt ${receipt.receiptNumber} confirmed and Inventory updated.`,
            );
            onConfirmed?.();
          } catch (err: any) {
            toast.error(err?.message || 'Unable to confirm goods receipt.');
            throw err;
          }
        }}
      />
    </>
  );
}
