'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@/components/base/modal/modal';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { NumberField } from '@/components/base/number-field/number-field';
import { Textarea } from '@/components/base/textarea/textarea';
import { Select, SelectItem } from '@/components/base/select/select';
import { ComboBox, ComboBoxItem } from '@/components/base/combobox/combobox';
import { toast } from '@/components/base/toast/toast';
import { inventoryApi } from '../api/inventory-api';
import { validateAdjustmentForm } from '../schemas/validation';
import { formatQuantity } from '../utils/formatters';
import type {
  AdjustmentType,
  Product,
  Warehouse,
} from '../types/inventory';

export interface AdjustmentFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  warehouses: Warehouse[];
  onSaved: () => void;
}

export function AdjustmentFormModal({
  isOpen,
  onOpenChange,
  products,
  warehouses,
  onSaved,
}: AdjustmentFormModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('INCREASE');
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [availableQty, setAvailableQty] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const activeProducts = products.filter((p) => p.isActive);
  const activeWarehouses = warehouses.filter((w) => w.isActive);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    setError('');
    setAdjustmentType('INCREASE');
    setProductId(activeProducts[0]?._id || '');
    setWarehouseId(activeWarehouses[0]?._id || '');
    setQuantity(1);
    setReason('');
    setNotes('');
    setIdempotencyKey(`adj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  }, [isOpen, activeProducts, activeWarehouses]);

  useEffect(() => {
    if (!isOpen || !productId || !warehouseId) {
      setAvailableQty(null);
      return;
    }
    let cancelled = false;
    inventoryApi
      .listStock({ productId, warehouseId, limit: 1 })
      .then((res) => {
        if (!cancelled) {
          setAvailableQty(res.data?.[0]?.quantity ?? 0);
        }
      })
      .catch(() => {
        if (!cancelled) setAvailableQty(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, productId, warehouseId]);

  const selectedProduct = activeProducts.find((p) => p._id === productId);
  const unitSymbol =
    selectedProduct && typeof selectedProduct.unitId === 'object'
      ? selectedProduct.unitId.symbol
      : '';

  const handleSubmit = async (e: React.FormEvent, close: () => void) => {
    e.preventDefault();
    const check = validateAdjustmentForm({
      adjustmentType,
      productId,
      warehouseId,
      quantity,
      reason,
      notes,
    });
    if (!check.valid) {
      setError(check.error || 'Invalid adjustment inputs.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const created = await inventoryApi.createAdjustment({
        adjustmentType,
        productId,
        warehouseId,
        quantity,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        idempotencyKey,
      });
      toast.success(
        `Adjustment ${created.referenceNumber} applied (${created.previousQuantity} -> ${created.resultingQuantity})`,
      );
      onSaved();
      close();
    } catch (err: any) {
      setError(err.message || 'Failed to record stock adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
      {({ close }) => (
        <form onSubmit={(e) => handleSubmit(e, close)} className="flex min-h-0 flex-1 flex-col gap-2">
          <ModalHeader
            title="New Stock Adjustment"
            description="Record opening stock, manual increases, or write-offs. Authoritative balances and ledger entries are computed atomically on the server."
          />
          <ModalBody className="space-y-4">
            {error && (
              <div className="rounded-xl border border-border-error-default bg-status-rose-background px-3 py-2 text-body-2-medium text-status-rose-text">
                {error}
              </div>
            )}

            <Select
              label="Adjustment Type"
              selectedKey={adjustmentType}
              onSelectionChange={(k) => setAdjustmentType(String(k) as AdjustmentType)}
              isRequired
              className="w-full"
            >
              <SelectItem id="OPENING_STOCK" textValue="Opening Stock">
                Opening Stock (Initial balance when stock is 0)
              </SelectItem>
              <SelectItem id="INCREASE" textValue="Stock Increase (+)">
                Stock Increase (+)
              </SelectItem>
              <SelectItem id="DECREASE" textValue="Stock Decrease (-)">
                Stock Decrease (-)
              </SelectItem>
            </Select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ComboBox
                label="Product"
                placeholder="Search active product..."
                items={activeProducts}
                selectedKey={productId || null}
                onSelectionChange={(key) => setProductId(key ? String(key) : '')}
                isRequired
              >
                {(p) => (
                  <ComboBoxItem id={p._id} textValue={`${p.name} ${p.sku}`}>
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="font-mono text-caption-1-regular text-text-tertiary">
                      {p.sku}
                    </span>
                  </ComboBoxItem>
                )}
              </ComboBox>

              <Select
                label="Warehouse"
                placeholder="Select warehouse"
                selectedKey={warehouseId || null}
                onSelectionChange={(k) => setWarehouseId(k ? String(k) : '')}
                isRequired
                className="w-full"
              >
                {activeWarehouses.map((w) => (
                  <SelectItem key={w._id} id={w._id} textValue={`${w.name} (${w.code})`}>
                    {w.name} ({w.code})
                  </SelectItem>
                ))}
              </Select>
            </div>

            {availableQty !== null && (
              <div className="flex items-center justify-between rounded-2lg border border-separator-border bg-background-secondary-default px-3.5 py-2.5">
                <span className="text-body-2-medium text-text-secondary">
                  Current Server Balance (selected warehouse)
                </span>
                <span className="font-mono text-body-medium font-semibold text-text-primary tabular-nums">
                  {formatQuantity(availableQty, unitSymbol)}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberField
                label="Quantity (Positive)"
                value={quantity}
                onChange={(val) => setQuantity(Number.isFinite(val) ? val : 0)}
                minValue={0.0001}
                step={1}
                isRequired
              />

              <Input
                label="Reason"
                placeholder="e.g., Physical cycle count, damaged items, opening stock"
                value={reason}
                onChange={setReason}
                isRequired
              />
            </div>

            <Textarea
              label="Notes (Optional)"
              placeholder="Reference voucher, bin location, or audit explanation"
              value={notes}
              onChange={setNotes}
              rows={2}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" type="button" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Applying...' : 'Confirm & Record Adjustment'}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
