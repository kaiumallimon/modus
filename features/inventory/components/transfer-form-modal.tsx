'use client';

import React, { useEffect, useRef, useState } from 'react';
import { RiAddLine, RiDeleteBinLine } from '@remixicon/react';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@/components/base/modal/modal';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { NumberField } from '@/components/base/number-field/number-field';
import { Textarea } from '@/components/base/textarea/textarea';
import { Select, SelectItem } from '@/components/base/select/select';
import { ComboBox, ComboBoxItem } from '@/components/base/combobox/combobox';
import { Divider } from '@/components/base/divider/divider';
import { toast } from '@/components/base/toast/toast';
import { inventoryApi } from '../api/inventory-api';
import { validateTransferForm } from '../schemas/validation';
import type { Product, Warehouse } from '../types/inventory';

interface TransferLineDraft {
  key: string;
  productId: string;
  quantity: number;
}

export interface TransferFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  warehouses: Warehouse[];
  onCreated: () => void;
}

export function TransferFormModal({
  isOpen,
  onOpenChange,
  products,
  warehouses,
  onCreated,
}: TransferFormModalProps) {
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [items, setItems] = useState<TransferLineDraft[]>([]);
  const [notes, setNotes] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [sourceBalances, setSourceBalances] = useState<Record<string, number>>({});
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
    const first = activeWarehouses[0]?._id || '';
    const second = activeWarehouses.find((w) => w._id !== first)?._id || '';
    setSourceWarehouseId(first);
    setDestinationWarehouseId(second);
    setItems([
      {
        key: `line-${Date.now()}`,
        productId: activeProducts[0]?._id || '',
        quantity: 1,
      },
    ]);
    setNotes('');
    setIdempotencyKey(`trf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  }, [isOpen, activeWarehouses, activeProducts]);

  useEffect(() => {
    if (!isOpen || !sourceWarehouseId) {
      setSourceBalances({});
      return;
    }
    let cancelled = false;
    inventoryApi
      .listStock({ warehouseId: sourceWarehouseId, limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const next: Record<string, number> = {};
        for (const row of res.data || []) {
          next[row.productId] = row.quantity;
        }
        setSourceBalances(next);
      })
      .catch(() => {
        if (!cancelled) setSourceBalances({});
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, sourceWarehouseId]);

  const addLine = () => {
    setItems((prev) => [
      ...prev,
      { key: `line-${Date.now()}-${Math.random()}`, productId: '', quantity: 1 },
    ]);
  };

  const removeLine = (key: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  };

  const updateLine = (key: string, patch: Partial<TransferLineDraft>) => {
    setItems((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  };

  const handleSubmit = async (e: React.FormEvent, close: () => void) => {
    e.preventDefault();
    const check = validateTransferForm({
      sourceWarehouseId,
      destinationWarehouseId,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    });
    if (!check.valid) {
      setError(check.error || 'Please check transfer details.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const created = await inventoryApi.createTransfer({
        sourceWarehouseId,
        destinationWarehouseId,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        notes: notes.trim() || undefined,
        idempotencyKey,
      });
      toast.success(
        `Transfer ${created.referenceNumber} created in Pending Confirmation state`,
      );
      onCreated();
      close();
    } catch (err: any) {
      setError(err.message || 'Failed to create stock transfer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="xl">
      {({ close }) => (
        <form onSubmit={(e) => handleSubmit(e, close)}>
          <ModalHeader
            title="Create Stock Transfer"
            description="Prepare an inter-warehouse stock transfer. Available source stock is validated before creation and transferred atomically upon confirmation."
          />
          <ModalBody className="space-y-4">
            {error && (
              <div className="rounded-xl border border-border-error-default bg-status-rose-background px-3 py-2 text-body-2-medium text-status-rose-text">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Source Warehouse"
                placeholder="Select source"
                selectedKey={sourceWarehouseId || null}
                onSelectionChange={(k) => setSourceWarehouseId(k ? String(k) : '')}
                isRequired
                className="w-full"
              >
                {activeWarehouses.map((w) => (
                  <SelectItem key={w._id} id={w._id} textValue={`${w.name} (${w.code})`}>
                    {w.name} ({w.code})
                  </SelectItem>
                ))}
              </Select>

              <Select
                label="Destination Warehouse"
                placeholder="Select destination"
                selectedKey={destinationWarehouseId || null}
                onSelectionChange={(k) => setDestinationWarehouseId(k ? String(k) : '')}
                isRequired
                className="w-full"
              >
                {activeWarehouses
                  .filter((w) => w._id !== sourceWarehouseId)
                  .map((w) => (
                    <SelectItem key={w._id} id={w._id} textValue={`${w.name} (${w.code})`}>
                      {w.name} ({w.code})
                    </SelectItem>
                  ))}
              </Select>
            </div>

            <Divider>Products & Quantities</Divider>

            <div className="space-y-3">
              {items.map((line) => {
                const avail = line.productId
                  ? sourceBalances[line.productId] ?? 0
                  : null;
                return (
                  <div
                    key={line.key}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end rounded-2xl border border-separator-border bg-background-secondary-default p-3"
                  >
                    <div className="sm:col-span-7">
                      <ComboBox
                        label="Product"
                        placeholder="Select active product..."
                        items={activeProducts}
                        selectedKey={line.productId || null}
                        onSelectionChange={(key) =>
                          updateLine(line.key, { productId: key ? String(key) : '' })
                        }
                        isRequired
                      >
                        {(p) => (
                          <ComboBoxItem id={p._id} textValue={`${p.name} ${p.sku}`}>
                            <span className="truncate font-medium">{p.name}</span>
                            <span className="font-mono text-caption-1-regular text-text-tertiary">
                              {p.sku} · Avail: {sourceBalances[p._id] ?? 0}
                            </span>
                          </ComboBoxItem>
                        )}
                      </ComboBox>
                    </div>

                    <div className="sm:col-span-4">
                      <NumberField
                        label={avail !== null ? `Qty (Avail: ${avail})` : 'Quantity'}
                        value={line.quantity}
                        onChange={(val) =>
                          updateLine(line.key, {
                            quantity: Number.isFinite(val) ? val : 0,
                          })
                        }
                        minValue={0.0001}
                        step={1}
                        isRequired
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-end pb-0.5">
                      <IconButton
                        icon={RiDeleteBinLine}
                        aria-label="Remove product line"
                        type="button"
                        size="medium"
                        disabled={items.length <= 1}
                        onClick={() => removeLine(line.key)}
                      />
                    </div>
                  </div>
                );
              })}

              <Button
                variant="secondary"
                size="small"
                type="button"
                leadingIcon={RiAddLine}
                onClick={addLine}
              >
                Add Product Line
              </Button>
            </div>

            <Textarea
              label="Transfer Notes (Optional)"
              placeholder="Dispatch reason or batch handling notes"
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
              {submitting ? 'Creating...' : 'Create Pending Transfer'}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
