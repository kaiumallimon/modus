'use client';

import React, { useState } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
} from '@/components/base/drawer/drawer';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { Divider } from '@/components/base/divider/divider';
import {
  formatQuantity,
  getRefName,
  getTransferStatusMeta,
} from '../utils/formatters';
import type { StockMovement, StockTransfer } from '../types/inventory';

export interface TransferDetailDrawerProps {
  transfer: StockTransfer | null;
  onClose: () => void;
  canConfirm: boolean;
  onConfirmTransfer?: (transfer: StockTransfer) => Promise<void>;
}

export function TransferDetailDrawer({
  transfer,
  onClose,
  canConfirm,
  onConfirmTransfer,
}: TransferDetailDrawerProps) {
  const [confirming, setConfirming] = useState(false);

  const statusMeta = transfer ? getTransferStatusMeta(transfer.status) : null;

  return (
    <Drawer
      isOpen={Boolean(transfer)}
      onOpenChange={(open) => !open && onClose()}
      size="md"
    >
      {({ close }) => (
        <>
          <DrawerHeader
            title={transfer ? transfer.referenceNumber : 'Transfer Details'}
            description="Inter-warehouse stock transfer record"
          />
          <DrawerBody>
            {transfer && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {statusMeta && (
                    <Chip variant="bold" color={statusMeta.color}>
                      {statusMeta.label}
                    </Chip>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-separator-border bg-background-secondary-default p-3.5">
                  <div>
                    <p className="text-caption-1-medium text-text-secondary">
                      Source Warehouse
                    </p>
                    <p className="text-body-medium text-text-primary">
                      {getRefName(transfer.sourceWarehouseId)}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption-1-medium text-text-secondary">
                      Destination Warehouse
                    </p>
                    <p className="text-body-medium text-text-primary">
                      {getRefName(transfer.destinationWarehouseId)}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption-1-medium text-text-secondary">Created By</p>
                    <p className="text-body-2-regular text-text-primary">
                      {transfer.createdBy?.email} ·{' '}
                      {new Date(transfer.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {transfer.confirmedAt && (
                    <div>
                      <p className="text-caption-1-medium text-text-secondary">
                        Confirmed By
                      </p>
                      <p className="text-body-2-regular text-text-primary">
                        {transfer.confirmedBy?.email || 'System'} ·{' '}
                        {new Date(transfer.confirmedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {transfer.notes && (
                  <div className="rounded-xl border border-separator-border bg-background-secondary-default p-3">
                    <p className="text-caption-1-semibold text-text-primary mb-1">Notes</p>
                    <p className="text-body-2-regular text-text-secondary">{transfer.notes}</p>
                  </div>
                )}

                <Divider>Line Items ({transfer.items.length})</Divider>

                <div className="space-y-2">
                  {transfer.items.map((item, idx) => {
                    const prod =
                      typeof item.productId === 'object' ? item.productId : null;
                    return (
                      <div
                        key={prod?._id || idx}
                        className="flex items-center justify-between gap-3 rounded-xl border border-separator-border bg-background-primary-default px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-body-medium text-text-primary">
                            {prod?.name || String(item.productId)}
                          </p>
                          <p className="text-caption-1-regular font-mono text-text-tertiary">
                            {prod?.sku || ''}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-body-medium text-text-primary tabular-nums">
                          {formatQuantity(item.quantity, prod?.unitId?.symbol)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </DrawerBody>
          <DrawerFooter>
            <Button variant="secondary" onClick={close} disabled={confirming}>
              Close
            </Button>
            {transfer &&
              transfer.status === 'PENDING' &&
              canConfirm &&
              onConfirmTransfer && (
                <Button
                  variant="primary"
                  disabled={confirming}
                  onClick={async () => {
                    setConfirming(true);
                    try {
                      await onConfirmTransfer(transfer);
                      close();
                    } finally {
                      setConfirming(false);
                    }
                  }}
                >
                  {confirming ? 'Confirming...' : 'Confirm Transfer'}
                </Button>
              )}
          </DrawerFooter>
        </>
      )}
    </Drawer>
  );
}

export interface MovementDetailDrawerProps {
  movement: StockMovement | null;
  onClose: () => void;
}

export function MovementDetailDrawer({
  movement,
  onClose,
}: MovementDetailDrawerProps) {
  const unitSym =
    movement && typeof movement.productId === 'object'
      ? movement.productId.unitId?.symbol
      : '';

  return (
    <Drawer
      isOpen={Boolean(movement)}
      onOpenChange={(open) => !open && onClose()}
      size="md"
    >
      {({ close }) => (
        <>
          <DrawerHeader
            title="Movement Ledger Entry"
            description={movement ? `Reference: ${movement.referenceNumber}` : undefined}
          />
          <DrawerBody>
            {movement && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-4 space-y-3">
                  <div>
                    <p className="text-caption-1-medium text-text-secondary">Product</p>
                    <p className="text-body-medium text-text-primary">
                      {typeof movement.productId === 'object'
                        ? `${movement.productId.name} (${movement.productId.sku})`
                        : movement.productId}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption-1-medium text-text-secondary">Warehouse</p>
                    <p className="text-body-medium text-text-primary">
                      {getRefName(movement.warehouseId)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="rounded-xl border border-separator-border bg-background-primary-default p-2.5">
                      <p className="text-caption-2-medium text-text-tertiary">Previous</p>
                      <p className="text-body-medium font-mono tabular-nums text-text-primary">
                        {formatQuantity(movement.previousBalance, unitSym)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-separator-border bg-background-primary-default p-2.5">
                      <p className="text-caption-2-medium text-text-tertiary">Delta</p>
                      <p className="text-body-medium font-mono tabular-nums text-text-primary">
                        {movement.quantityChange > 0
                          ? `+${movement.quantityChange}`
                          : movement.quantityChange}
                      </p>
                    </div>
                    <div className="rounded-xl border border-separator-border bg-background-primary-default p-2.5">
                      <p className="text-caption-2-medium text-text-tertiary">Resulting</p>
                      <p className="text-body-medium font-mono tabular-nums text-text-primary">
                        {formatQuantity(movement.resultingBalance, unitSym)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-4 space-y-2">
                  <p className="text-caption-1-semibold text-text-primary">Audit & Reference</p>
                  <p className="text-body-2-regular text-text-secondary">
                    {movement.description}
                  </p>
                  <p className="text-caption-1-regular font-mono text-text-tertiary">
                    {movement.referenceType} · {movement.referenceNumber} ({movement.referenceId})
                  </p>
                  <p className="text-caption-1-regular text-text-secondary">
                    Actor: {movement.actor?.email} ·{' '}
                    {new Date(movement.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </DrawerBody>
          <DrawerFooter>
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
          </DrawerFooter>
        </>
      )}
    </Drawer>
  );
}
