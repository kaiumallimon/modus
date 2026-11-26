'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { RiAddLine, RiDeleteBinLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { ComboBox, ComboBoxItem } from '@/components/base/combobox/combobox';
import { Divider } from '@/components/base/divider/divider';
import { Input } from '@/components/base/input/input';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@/components/base/modal/modal';
import { NumberField } from '@/components/base/number-field/number-field';
import { Select, SelectItem } from '@/components/base/select/select';
import { Textarea } from '@/components/base/textarea/textarea';
import { toast } from '@/components/base/toast/toast';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import type { Product, Warehouse } from '@/features/inventory/types/inventory';
import { formatCurrency } from '@/features/inventory/utils/formatters';
import { procurementApi } from '../api/procurement-api';
import {
  calculateLinePreview,
  validatePurchaseOrderForm,
} from '../schemas/validation';
import type {
  PricingAdjustmentType,
  PurchaseOrder,
  Supplier,
} from '../types/procurement';
import { PROCUREMENT_APP_CURRENCY } from '../utils/formatters';

interface LineDraft {
  key: string;
  productId: string;
  orderedQuantity: number;
  unitPrice: number;
  discountType: PricingAdjustmentType;
  discountValue: number;
  taxType: PricingAdjustmentType;
  taxValue: number;
}

const makeLine = (): LineDraft => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  productId: '',
  orderedQuantity: 1,
  unitPrice: 0,
  discountType: 'FIXED',
  discountValue: 0,
  taxType: 'FIXED',
  taxValue: 0,
});

export interface PurchaseOrderFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingOrder: PurchaseOrder | null;
  defaultSupplierId?: string;
  onSuccess: () => void;
}

export function PurchaseOrderFormModal({
  isOpen,
  onOpenChange,
  editingOrder,
  defaultSupplierId,
  onSuccess,
}: PurchaseOrderFormModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [supplierId, setSupplierId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineDraft[]>([makeLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      procurementApi.listSuppliers({ page: 1, limit: 100, isActive: true }),
      inventoryApi.listWarehouses({ page: 1, limit: 100, isActive: true }),
      inventoryApi.listProducts({ page: 1, limit: 100, isActive: true }),
    ])
      .then(([sRes, wRes, pRes]) => {
        setSuppliers(sRes.data || []);
        setWarehouses(wRes.data || []);
        setProducts(pRes.data || []);
      })
      .catch(() => {
        // Handled when options render empty
      });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingOrder) {
      const supId =
        typeof editingOrder.supplierId === 'string'
          ? editingOrder.supplierId
          : editingOrder.supplierId?._id || '';
      const whId =
        typeof editingOrder.destinationWarehouseId === 'string'
          ? editingOrder.destinationWarehouseId
          : editingOrder.destinationWarehouseId?._id || '';
      setSupplierId(supId);
      setDestinationWarehouseId(whId);
      setOrderDate(
        editingOrder.orderDate
          ? new Date(editingOrder.orderDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      );
      setExpectedDeliveryDate(
        editingOrder.expectedDeliveryDate
          ? new Date(editingOrder.expectedDeliveryDate)
              .toISOString()
              .slice(0, 10)
          : '',
      );
      setNotes(editingOrder.notes || '');
      setItems(
        editingOrder.items.map((item, idx) => ({
          key: `edit-${idx}-${Date.now()}`,
          productId:
            typeof item.productId === 'string'
              ? item.productId
              : item.productId?._id || '',
          orderedQuantity: item.orderedQuantity,
          unitPrice: item.unitPrice,
          discountType: item.discountType || 'FIXED',
          discountValue: item.discountValue ?? 0,
          taxType: item.taxType || 'FIXED',
          taxValue: item.taxValue ?? 0,
        })),
      );
    } else {
      setSupplierId(defaultSupplierId || '');
      setDestinationWarehouseId('');
      setOrderDate(new Date().toISOString().slice(0, 10));
      setExpectedDeliveryDate('');
      setNotes('');
      setItems([makeLine()]);
    }
  }, [isOpen, editingOrder, defaultSupplierId]);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p._id, p])),
    [products],
  );

  const updateLine = (key: string, patch: Partial<LineDraft>) => {
    setItems((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const totalsPreview = useMemo(() => {
    let subtotalCents = 0;
    let discountCents = 0;
    let taxCents = 0;
    let grandCents = 0;
    for (const line of items) {
      const p = calculateLinePreview(line);
      subtotalCents += Math.round(p.subtotal * 100);
      discountCents += Math.round(p.discountAmount * 100);
      taxCents += Math.round(p.taxAmount * 100);
      grandCents += Math.round(p.lineTotal * 100);
    }
    return {
      subtotal: subtotalCents / 100,
      discountTotal: discountCents / 100,
      taxTotal: taxCents / 100,
      grandTotal: grandCents / 100,
    };
  }, [items]);

  const handleSubmit = async (e: React.FormEvent, close: () => void) => {
    e.preventDefault();
    const errMsg = validatePurchaseOrderForm({
      supplierId,
      destinationWarehouseId,
      items,
    });
    if (errMsg) {
      setError(errMsg);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        supplierId,
        destinationWarehouseId,
        orderDate: orderDate || undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        items: items.map((line) => ({
          productId: line.productId,
          orderedQuantity: line.orderedQuantity,
          unitPrice: line.unitPrice,
          discountType: line.discountType,
          discountValue: line.discountValue,
          taxType: line.taxType,
          taxValue: line.taxValue,
        })),
        notes: notes.trim(),
      };

      if (editingOrder) {
        await procurementApi.updatePurchaseOrder(editingOrder._id, {
          ...payload,
          expectedDeliveryDate: expectedDeliveryDate || null,
        });
        toast.success(`Purchase order ${editingOrder.orderNumber} updated.`);
      } else {
        const created = await procurementApi.createPurchaseOrder(payload);
        toast.success(
          `Draft purchase order ${created.orderNumber} created.`,
        );
      }
      onSuccess();
      close();
    } catch (err: any) {
      setError(err?.message || 'Unable to save purchase order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="xl">
      {({ close }) => (
        <form
          onSubmit={(e) => handleSubmit(e, close)}
          className="flex min-h-0 flex-1 flex-col gap-2"
        >
          <ModalHeader
            title={
              editingOrder
                ? `Edit Draft ${editingOrder.orderNumber}`
                : 'New Purchase Order'
            }
            description="Select an active supplier, destination warehouse, and Inventory SKUs. Authoritative line and order totals are calculated on the backend."
          />
          <ModalBody className="space-y-4 max-h-[68vh] overflow-y-auto">
            {error && (
              <div className="rounded-xl border border-border-error-default bg-status-rose-background px-3 py-2 text-body-2-medium text-status-rose-text">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Supplier"
                placeholder="Select active supplier"
                selectedKey={supplierId || null}
                onSelectionChange={(k) => setSupplierId(k ? String(k) : '')}
                isRequired
                className="w-full"
              >
                {suppliers.map((s) => (
                  <SelectItem
                    key={s._id}
                    id={s._id}
                    textValue={`${s.name} (${s.code})`}
                  >
                    {s.name} ({s.code})
                  </SelectItem>
                ))}
              </Select>

              <Select
                label="Destination Warehouse"
                placeholder="Select warehouse"
                selectedKey={destinationWarehouseId || null}
                onSelectionChange={(k) =>
                  setDestinationWarehouseId(k ? String(k) : '')
                }
                isRequired
                className="w-full"
              >
                {warehouses.map((w) => (
                  <SelectItem
                    key={w._id}
                    id={w._id}
                    textValue={`${w.name} (${w.code})`}
                  >
                    {w.name} ({w.code})
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Order Date"
                type="date"
                value={orderDate}
                onChange={setOrderDate}
              />
              <Input
                label="Expected Delivery Date"
                type="date"
                value={expectedDeliveryDate}
                onChange={setExpectedDeliveryDate}
              />
            </div>

            <Divider>Line Items ({PROCUREMENT_APP_CURRENCY})</Divider>

            <div className="space-y-3">
              {items.map((line) => {
                const selectedProduct = line.productId
                  ? productMap.get(line.productId)
                  : undefined;
                const preview = calculateLinePreview(line);

                return (
                  <div
                    key={line.key}
                    className="rounded-2xl border border-separator-border bg-background-secondary-default/50 p-3.5 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-6">
                        <ComboBox
                          label="Product SKU"
                          placeholder="Search Inventory product..."
                          items={products}
                          selectedKey={line.productId || null}
                          onSelectionChange={(key) => {
                            const id = key ? String(key) : '';
                            const prod = id ? productMap.get(id) : undefined;
                            updateLine(line.key, {
                              productId: id,
                              unitPrice:
                                line.unitPrice === 0 && prod?.costPrice != null
                                  ? prod.costPrice
                                  : line.unitPrice,
                            });
                          }}
                          isRequired
                        >
                          {(p) => (
                            <ComboBoxItem
                              id={p._id}
                              textValue={`${p.name} ${p.sku}`}
                            >
                              <span className="truncate font-medium">
                                {p.name}
                              </span>
                              <span className="font-mono text-caption-1-regular text-text-tertiary">
                                {p.sku}
                              </span>
                            </ComboBoxItem>
                          )}
                        </ComboBox>
                      </div>

                      <div className="sm:col-span-3">
                        <NumberField
                          label={
                            selectedProduct &&
                            typeof selectedProduct.unitId === 'object'
                              ? `Qty (${selectedProduct.unitId.symbol})`
                              : 'Quantity'
                          }
                          value={line.orderedQuantity}
                          onChange={(val) =>
                            updateLine(line.key, {
                              orderedQuantity: Number.isFinite(val) ? val : 1,
                            })
                          }
                          minValue={0.0001}
                          step={1}
                          isRequired
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <NumberField
                          label="Unit Price"
                          value={line.unitPrice}
                          onChange={(val) =>
                            updateLine(line.key, {
                              unitPrice: Number.isFinite(val) ? val : 0,
                            })
                          }
                          minValue={0}
                          step={0.01}
                          isRequired
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <IconButton
                          aria-label="Remove line"
                          size="small"
                          icon={RiDeleteBinLine}
                          disabled={items.length === 1}
                          onClick={() =>
                            setItems((prev) =>
                              prev.filter((r) => r.key !== line.key),
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-2">
                        <Select
                          label="Discount Type"
                          size="sm"
                          selectedKey={line.discountType}
                          onSelectionChange={(k) =>
                            updateLine(line.key, {
                              discountType: String(k) as PricingAdjustmentType,
                            })
                          }
                          className="w-full"
                        >
                          <SelectItem id="FIXED" textValue="Fixed ($)">
                            Fixed ($)
                          </SelectItem>
                          <SelectItem id="PERCENTAGE" textValue="Percent (%)">
                            Percent (%)
                          </SelectItem>
                        </Select>
                      </div>
                      <div className="sm:col-span-3">
                        <NumberField
                          label={
                            line.discountType === 'PERCENTAGE'
                              ? 'Discount (%)'
                              : 'Discount ($)'
                          }
                          value={line.discountValue}
                          onChange={(val) =>
                            updateLine(line.key, {
                              discountValue: Number.isFinite(val) ? val : 0,
                            })
                          }
                          minValue={0}
                          step={0.01}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Select
                          label="Tax Type"
                          size="sm"
                          selectedKey={line.taxType}
                          onSelectionChange={(k) =>
                            updateLine(line.key, {
                              taxType: String(k) as PricingAdjustmentType,
                            })
                          }
                          className="w-full"
                        >
                          <SelectItem id="FIXED" textValue="Fixed ($)">
                            Fixed ($)
                          </SelectItem>
                          <SelectItem id="PERCENTAGE" textValue="Percent (%)">
                            Percent (%)
                          </SelectItem>
                        </Select>
                      </div>
                      <div className="sm:col-span-3">
                        <NumberField
                          label={
                            line.taxType === 'PERCENTAGE'
                              ? 'Tax (%)'
                              : 'Tax ($)'
                          }
                          value={line.taxValue}
                          onChange={(val) =>
                            updateLine(line.key, {
                              taxValue: Number.isFinite(val) ? val : 0,
                            })
                          }
                          minValue={0}
                          step={0.01}
                        />
                      </div>
                      <div className="sm:col-span-2 text-end pb-1">
                        <span className="text-caption-2-medium text-text-tertiary block">
                          Line Total
                        </span>
                        <span className="font-mono text-body-2-medium font-semibold text-text-primary tabular-nums">
                          {formatCurrency(preview.lineTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="secondary"
                size="small"
                leadingIcon={RiAddLine}
                onClick={() => setItems((prev) => [...prev, makeLine()])}
              >
                Add Line Item
              </Button>
            </div>

            <div className="rounded-2xl border border-separator-border bg-background-secondary-default/40 p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-caption-1-medium">
              <div>
                <span className="text-text-tertiary block">Subtotal</span>
                <span className="font-mono text-body-2-medium text-text-primary">
                  {formatCurrency(totalsPreview.subtotal)}
                </span>
              </div>
              <div>
                <span className="text-text-tertiary block">Discount</span>
                <span className="font-mono text-body-2-medium text-text-primary">
                  -{formatCurrency(totalsPreview.discountTotal)}
                </span>
              </div>
              <div>
                <span className="text-text-tertiary block">Tax</span>
                <span className="font-mono text-body-2-medium text-text-primary">
                  +{formatCurrency(totalsPreview.taxTotal)}
                </span>
              </div>
              <div>
                <span className="text-text-tertiary block">Order Total</span>
                <span className="font-mono text-body-medium font-bold text-text-primary">
                  {formatCurrency(totalsPreview.grandTotal)}
                </span>
              </div>
            </div>

            <Textarea
              label="Notes (Optional)"
              placeholder="Delivery instructions, vendor quote reference, or packaging notes"
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
              type="submit"
              variant="primary"
              disabled={submitting}
              className="text-[#171B18]"
            >
              {submitting
                ? 'Saving...'
                : editingOrder
                  ? 'Save Draft Changes'
                  : 'Save Draft Order'}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
