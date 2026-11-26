'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import {
  AlertDialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@/components/base/modal/modal';
import { NumberField } from '@/components/base/number-field/number-field';
import { Select, SelectItem } from '@/components/base/select/select';
import { Textarea } from '@/components/base/textarea/textarea';
import { toast } from '@/components/base/toast/toast';
import { formatQuantity } from '@/features/inventory/utils/formatters';
import { procurementApi } from '../api/procurement-api';
import { validateGoodsReceiptForm } from '../schemas/validation';
import type { PurchaseOrder } from '../types/procurement';

interface ReceiveRowState {
  productId: string;
  productName: string;
  sku: string;
  unitSymbol: string;
  ordered: number;
  previouslyReceived: number;
  remaining: number;
  receivingNow: number;
}

export interface GoodsReceiptFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialPurchaseOrder?: PurchaseOrder | null;
  canConfirm?: boolean;
  onSuccess: () => void;
}

export function GoodsReceiptFormModal({
  isOpen,
  onOpenChange,
  initialPurchaseOrder,
  canConfirm = false,
  onSuccess,
}: GoodsReceiptFormModalProps) {
  const [eligibleOrders, setEligibleOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [receivedDate, setReceivedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<ReceiveRowState[]>([]);
  const [confirmPromptOpen, setConfirmPromptOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<'draft' | 'confirm'>('confirm');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setReceivedDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setIdempotencyKey(
      `grn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );

    Promise.all([
      procurementApi.listPurchaseOrders({
        page: 1,
        limit: 50,
        status: 'ORDERED',
      }),
      procurementApi.listPurchaseOrders({
        page: 1,
        limit: 50,
        status: 'PARTIALLY_RECEIVED',
      }),
    ])
      .then(([orderedRes, partialRes]) => {
        const merged = [...(orderedRes.data || []), ...(partialRes.data || [])];
        setEligibleOrders(merged);
        if (initialPurchaseOrder) {
          setSelectedPoId(initialPurchaseOrder._id);
        } else if (merged.length > 0) {
          setSelectedPoId(merged[0]._id);
        } else {
          setSelectedPoId('');
        }
      })
      .catch(() => {
        setEligibleOrders([]);
      });
  }, [isOpen, initialPurchaseOrder]);

  useEffect(() => {
    if (!isOpen || !selectedPoId) {
      setSelectedPo(null);
      setRows([]);
      return;
    }

    const found =
      (initialPurchaseOrder && initialPurchaseOrder._id === selectedPoId
        ? initialPurchaseOrder
        : eligibleOrders.find((o) => o._id === selectedPoId)) || null;

    setSelectedPo(found);
    if (found) {
      setRows(
        found.items
          .map((item) => {
            const pId =
              typeof item.productId === 'string'
                ? item.productId
                : item.productId?._id || '';
            const prev = Number(item.receivedQuantity || 0);
            const remaining = Math.max(0, Number((item.orderedQuantity - prev).toFixed(4)));
            return {
              productId: pId,
              productName: item.productName,
              sku: item.sku,
              unitSymbol: item.unitSymbol || '',
              ordered: item.orderedQuantity,
              previouslyReceived: prev,
              remaining,
              receivingNow: remaining,
            };
          })
          .filter((r) => r.remaining > 0),
      );
    }
  }, [isOpen, selectedPoId, eligibleOrders, initialPurchaseOrder]);

  const totalUnitsToReceive = useMemo(
    () =>
      rows.reduce((sum, r) => sum + Math.max(0, Number(r.receivingNow) || 0), 0),
    [rows],
  );

  const executeSubmit = async (confirmImmediately: boolean) => {
    const activeItems = rows
      .filter((r) => r.receivingNow > 0)
      .map((r) => ({
        productId: r.productId,
        receivedQuantity: r.receivingNow,
      }));

    setSubmitting(true);
    setError('');
    try {
      const result = await procurementApi.createGoodsReceipt({
        purchaseOrderId: selectedPoId,
        receivedDate: receivedDate || undefined,
        items: activeItems,
        notes: notes.trim(),
        idempotencyKey,
        confirmImmediately,
      });

      toast.success(
        confirmImmediately
          ? `Goods receipt ${result.receiptNumber} confirmed — Inventory stock updated.`
          : `Draft goods receipt ${result.receiptNumber} saved.`,
      );
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || 'Unable to save goods receipt.');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestAction = (mode: 'draft' | 'confirm') => {
    const errMsg = validateGoodsReceiptForm({
      purchaseOrderId: selectedPoId,
      items: rows.map((r) => ({
        productId: r.productId,
        receivedQuantity: r.receivingNow,
        remaining: r.remaining,
      })),
    });
    if (errMsg) {
      setError(errMsg);
      return;
    }
    setError('');
    if (mode === 'confirm') {
      setPendingMode('confirm');
      setConfirmPromptOpen(true);
    } else {
      executeSubmit(false).catch(() => undefined);
    }
  };

  const selectedWh =
    selectedPo && typeof selectedPo.destinationWarehouseId === 'object'
      ? selectedPo.destinationWarehouseId
      : null;

  return (
    <>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="xl">
        {({ close }) => (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRequestAction(canConfirm ? 'confirm' : 'draft');
            }}
            className="flex min-h-0 flex-1 flex-col gap-2"
          >
            <ModalHeader
              title="Receive Goods Against Purchase Order"
              description="Record full or partial deliveries. Confirming updates warehouse stock in Inventory and appends PURCHASE_RECEIPT ledger entries."
            />
            <ModalBody className="space-y-4 max-h-[68vh] overflow-y-auto">
              {error && (
                <div className="rounded-xl border border-border-error-default bg-status-rose-background px-3 py-2 text-body-2-medium text-status-rose-text">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Purchase Order"
                  placeholder="Select ordered PO"
                  selectedKey={selectedPoId || null}
                  onSelectionChange={(k) => setSelectedPoId(k ? String(k) : '')}
                  isRequired
                  className="w-full"
                >
                  {eligibleOrders.map((po) => (
                    <SelectItem
                      key={po._id}
                      id={po._id}
                      textValue={`${po.orderNumber} ${po.supplierNameSnapshot}`}
                    >
                      {po.orderNumber} — {po.supplierNameSnapshot}
                    </SelectItem>
                  ))}
                </Select>

                <Input
                  label="Received Date"
                  type="date"
                  value={receivedDate}
                  onChange={setReceivedDate}
                />
              </div>

              {selectedPo && (
                <div className="rounded-xl border border-separator-border bg-background-secondary-default/60 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-caption-1-medium">
                  <span>
                    Destination:{' '}
                    <strong className="text-text-primary">
                      {selectedWh
                        ? `${selectedWh.name} (${selectedWh.code})`
                        : 'Assigned Warehouse'}
                    </strong>
                  </span>
                  <span className="font-mono text-text-secondary">
                    Receiving {formatQuantity(totalUnitsToReceive)} total unit(s)
                  </span>
                </div>
              )}

              {rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-separator-border p-6 text-center text-body-2-regular text-text-tertiary">
                  {eligibleOrders.length === 0
                    ? 'No submitted or partially received purchase orders are currently awaiting delivery.'
                    : 'All lines on the selected purchase order have already been received.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {rows.map((row) => (
                    <div
                      key={row.productId}
                      className="rounded-2xl border border-separator-border bg-background-secondary-default/40 p-3.5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                    >
                      <div className="sm:col-span-5">
                        <p className="text-body-2-medium font-semibold text-text-primary">
                          {row.productName}
                        </p>
                        <p className="font-mono text-caption-1-regular text-text-tertiary">
                          {row.sku}
                        </p>
                      </div>
                      <div className="sm:col-span-4 grid grid-cols-3 gap-2 text-caption-1-medium">
                        <div>
                          <span className="text-text-tertiary block">Ordered</span>
                          <span className="font-mono text-text-primary">
                            {formatQuantity(row.ordered, row.unitSymbol)}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-tertiary block">Prev</span>
                          <span className="font-mono text-text-primary">
                            {formatQuantity(row.previouslyReceived)}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-tertiary block">Remaining</span>
                          <span className="font-mono font-semibold text-text-primary">
                            {formatQuantity(row.remaining)}
                          </span>
                        </div>
                      </div>
                      <div className="sm:col-span-3">
                        <NumberField
                          label="Receiving Now"
                          value={row.receivingNow}
                          onChange={(val) =>
                            setRows((prev) =>
                              prev.map((item) =>
                                item.productId === row.productId
                                  ? {
                                      ...item,
                                      receivingNow: Number.isFinite(val) ? val : 0,
                                    }
                                  : item,
                              ),
                            )
                          }
                          minValue={0}
                          maxValue={row.remaining}
                          step={1}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Textarea
                label="Receiving Notes (Optional)"
                placeholder="Packing slip #, carrier reference, batch inspection comments..."
                value={notes}
                onChange={setNotes}
                rows={2}
              />
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={submitting || rows.length === 0}
                onClick={() => handleRequestAction('draft')}
              >
                Save as Draft
              </Button>
              {canConfirm && (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting || rows.length === 0}
                  className="text-[#171B18]"
                >
                  {submitting
                    ? 'Confirming...'
                    : 'Confirm & Update Inventory'}
                </Button>
              )}
            </ModalFooter>
          </form>
        )}
      </Modal>

      <AlertDialog
        isOpen={confirmPromptOpen}
        onOpenChange={setConfirmPromptOpen}
        variant="default"
        title="Confirm Goods Receipt & Update Inventory Stock"
        description={`Confirming this delivery for ${selectedPo?.orderNumber || 'the purchase order'} will immediately increase warehouse stock by ${formatQuantity(totalUnitsToReceive)} unit(s) in Inventory, record immutable PURCHASE_RECEIPT ledger entries, and lock this receipt.`}
        confirmLabel="Confirm & Update Stock"
        pendingLabel="Processing..."
        onConfirm={async () => {
          if (pendingMode === 'confirm') {
            await executeSubmit(true);
          }
        }}
      />
    </>
  );
}
