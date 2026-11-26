'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { RiAddLine, RiDeleteBinLine } from '@remixicon/react';
import { Chip } from '@/components/base/badges/chip';
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
import type {
  Product,
  StockBalanceRow,
  Warehouse,
} from '@/features/inventory/types/inventory';
import { salesApi } from '../api/sales-api';
import {
  computeSalesLineClient,
  validateSalesOrderForm,
} from '../schemas/validation';
import type {
  CustomerRecord,
  SalesOrderRecord,
  SalesPricingAdjustmentType,
} from '../types/sales';
import { formatSalesCurrency, formatSalesQty } from '../utils/formatters';

interface OrderLineDraft {
  key: string;
  productId: string;
  orderedQuantity: number;
  unitPrice: number;
  discountType: SalesPricingAdjustmentType;
  discountValue: number;
  taxType: SalesPricingAdjustmentType;
  taxValue: number;
}

const makeLine = (): OrderLineDraft => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  productId: '',
  orderedQuantity: 1,
  unitPrice: 0,
  discountType: 'FIXED',
  discountValue: 0,
  taxType: 'FIXED',
  taxValue: 0,
});

export interface SalesOrderFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingOrder: SalesOrderRecord | null;
  preselectedCustomerId?: string;
  onSuccess: (order: SalesOrderRecord) => void;
}

export function SalesOrderFormModal({
  isOpen,
  onOpenChange,
  editingOrder,
  preselectedCustomerId,
  onSuccess,
}: SalesOrderFormModalProps) {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockBalances, setStockBalances] = useState<StockBalanceRow[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderLineDraft[]>([makeLine()]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingRefs(true);
    setFieldErrors({});
    setSubmitError('');

    Promise.all([
      salesApi.listCustomers({ limit: 100, isActive: true }),
      inventoryApi.listWarehouses({ limit: 100, isActive: true }),
      inventoryApi.listProducts({ limit: 100, isActive: true }),
    ])
      .then(([custRes, whRes, prodRes]) => {
        if (cancelled) return;
        setCustomers(custRes.items || []);
        setWarehouses(whRes.data || []);
        setProducts(prodRes.data || []);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Lookup Failed', {
            description: 'Could not load customers or products.',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRefs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (editingOrder) {
      const custRef =
        typeof editingOrder.customerId === 'object'
          ? editingOrder.customerId._id
          : editingOrder.customerId;
      const whRef =
        typeof editingOrder.warehouseId === 'object'
          ? editingOrder.warehouseId._id
          : editingOrder.warehouseId;

      setCustomerId(custRef || '');
      setWarehouseId(whRef || '');
      setOrderDate(
        editingOrder.orderDate ? editingOrder.orderDate.slice(0, 10) : ''
      );
      setExpectedDeliveryDate(
        editingOrder.expectedDeliveryDate
          ? editingOrder.expectedDeliveryDate.slice(0, 10)
          : ''
      );
      setNotes(editingOrder.notes || '');
      setItems(
        editingOrder.items.map((it, idx) => ({
          key: `${it.productId}-${idx}`,
          productId: it.productId,
          orderedQuantity: it.orderedQuantity,
          unitPrice: it.unitPrice,
          discountType: it.discountType,
          discountValue: it.discountValue,
          taxType: it.taxType,
          taxValue: it.taxValue,
        }))
      );
    } else {
      setCustomerId(preselectedCustomerId || '');
      setWarehouseId('');
      setOrderDate(new Date().toISOString().slice(0, 10));
      setExpectedDeliveryDate('');
      setNotes('');
      setItems([makeLine()]);
    }
  }, [isOpen, editingOrder, preselectedCustomerId]);

  useEffect(() => {
    if (!isOpen || !warehouseId) {
      setStockBalances([]);
      return;
    }
    let cancelled = false;
    inventoryApi
      .listStock({ warehouseId, limit: 100 })
      .then((res) => {
        if (!cancelled) setStockBalances(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setStockBalances([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, warehouseId]);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p._id, p])),
    [products]
  );

  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stockBalances) {
      const pid = row.productId || row.product?._id;
      if (pid) map.set(pid, row.quantity);
    }
    return map;
  }, [stockBalances]);

  const handleProductChange = (lineKey: string, productId: string) => {
    const prod = productMap.get(productId);
    const defaultPrice = prod ? (prod.sellingPrice ?? prod.costPrice ?? 0) : 0;
    setItems((prev) =>
      prev.map((row) =>
        row.key === lineKey
          ? {
              ...row,
              productId,
              unitPrice: defaultPrice,
            }
          : row
      )
    );
  };

  const updateLine = (lineKey: string, patch: Partial<OrderLineDraft>) => {
    setItems((prev) =>
      prev.map((row) => (row.key === lineKey ? { ...row, ...patch } : row))
    );
  };

  const lineComputations = useMemo(
    () =>
      items.map((line) => ({
        key: line.key,
        ...computeSalesLineClient({
          orderedQuantity: line.orderedQuantity,
          unitPrice: line.unitPrice,
          discountType: line.discountType,
          discountValue: line.discountValue,
          taxType: line.taxType,
          taxValue: line.taxValue,
        }),
      })),
    [items]
  );

  const totals = useMemo(() => {
    return lineComputations.reduce(
      (acc, l) => ({
        subtotal: Math.round((acc.subtotal + l.lineSubtotal) * 100) / 100,
        discountTotal:
          Math.round((acc.discountTotal + l.discountAmount) * 100) / 100,
        taxTotal: Math.round((acc.taxTotal + l.taxAmount) * 100) / 100,
        grandTotal: Math.round((acc.grandTotal + l.lineTotal) * 100) / 100,
      }),
      { subtotal: 0, discountTotal: 0, taxTotal: 0, grandTotal: 0 }
    );
  }, [lineComputations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateSalesOrderForm({ customerId, warehouseId, items });
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        customerId,
        warehouseId,
        orderDate: orderDate ? new Date(`${orderDate}T00:00:00.000Z`).toISOString() : undefined,
        expectedDeliveryDate: expectedDeliveryDate
          ? new Date(`${expectedDeliveryDate}T00:00:00.000Z`).toISOString()
          : undefined,
        notes: notes.trim(),
        items: items.map((line) => ({
          productId: line.productId,
          orderedQuantity: Number(line.orderedQuantity),
          unitPrice: Number(line.unitPrice),
          discountType: line.discountType,
          discountValue: Number(line.discountValue) || 0,
          taxType: line.taxType,
          taxValue: Number(line.taxValue) || 0,
        })),
      };

      const saved = editingOrder
        ? await salesApi.updateOrder(editingOrder._id, {
            ...payload,
            expectedDeliveryDate: payload.expectedDeliveryDate ?? null,
          })
        : await salesApi.createOrder(payload);

      toast.success(
        editingOrder ? 'Sales Order Updated' : 'Draft Order Created',
        { description: `${saved.orderNumber} saved cleanly.` }
      );
      onSuccess(saved);
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.message || 'Unable to save sales order.';
      setSubmitError(msg);
      toast.error('Failed to Save Order', { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="xl">
      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col gap-2"
      >
        <ModalHeader
          title={
            editingOrder
              ? `Edit Draft ${editingOrder.orderNumber}`
              : 'Create Sales Order'
          }
          description="Select customer, source fulfillment warehouse, and product pricing snapshots."
        />

        <ModalBody className="space-y-4">
          {submitError && (
            <div className="rounded-xl border border-border-error-default bg-status-rose-background px-3 py-2 text-body-2-medium text-status-rose-text">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <Select
                label="Customer *"
                placeholder={loadingRefs ? 'Loading customers...' : 'Select customer'}
                selectedKey={customerId || null}
                onSelectionChange={(k) => setCustomerId(k ? String(k) : '')}
                isDisabled={loadingRefs}
                isInvalid={Boolean(fieldErrors.customerId)}
              >
                {customers.map((c) => (
                  <SelectItem key={c._id} id={c._id} textValue={`${c.name} ${c.code}`}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </Select>
              {fieldErrors.customerId && (
                <p className="text-caption-1-regular text-status-rose-text">
                  {fieldErrors.customerId}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Select
                label="Source Warehouse *"
                placeholder={loadingRefs ? 'Loading warehouses...' : 'Select warehouse'}
                selectedKey={warehouseId || null}
                onSelectionChange={(k) => setWarehouseId(k ? String(k) : '')}
                isDisabled={loadingRefs}
                isInvalid={Boolean(fieldErrors.warehouseId)}
              >
                {warehouses.map((w) => (
                  <SelectItem key={w._id} id={w._id} textValue={`${w.name} ${w.code}`}>
                    {w.name} ({w.code})
                  </SelectItem>
                ))}
              </Select>
              {fieldErrors.warehouseId && (
                <p className="text-caption-1-regular text-status-rose-text">
                  {fieldErrors.warehouseId}
                </p>
              )}
            </div>

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

          <Divider />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-body-2-semibold text-text-primary">
                  Order Line Items
                </p>
                <p className="text-caption-1-regular text-text-secondary">
                  Unit selling prices and product metadata are snapshotted at creation.
                </p>
              </div>
              <Button
                type="button"
                size="small"
                variant="secondary"
                leadingIcon={RiAddLine}
                onClick={() => setItems((prev) => [...prev, makeLine()])}
              >
                Add Product
              </Button>
            </div>

            {fieldErrors.items && (
              <p className="text-caption-1-medium text-text-status-error">
                {fieldErrors.items}
              </p>
            )}

            <div className="space-y-3">
              {items.map((line, index) => {
                const product = productMap.get(line.productId);
                const available = line.productId
                  ? stockMap.get(line.productId) ?? 0
                  : null;
                const computed = lineComputations[index];
                const insufficient =
                  warehouseId &&
                  available !== null &&
                  line.orderedQuantity > available;

                return (
                  <div
                    key={line.key}
                    className="rounded-2xl border border-separator-border bg-background-secondary-default/40 p-3.5 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex-1 min-w-[220px]">
                        <ComboBox
                          label={`Product #${index + 1} *`}
                          placeholder="Search SKU or name..."
                          selectedKey={line.productId || null}
                          onSelectionChange={(k) =>
                            handleProductChange(line.key, k ? String(k) : '')
                          }
                          isInvalid={Boolean(fieldErrors[`items.${index}.productId`])}
                          hint={fieldErrors[`items.${index}.productId`]}
                        >
                          {products.map((p) => (
                            <ComboBoxItem
                              key={p._id}
                              id={p._id}
                              textValue={`${p.name} ${p.sku}`}
                            >
                              {p.name} ({p.sku})
                            </ComboBoxItem>
                          ))}
                        </ComboBox>
                      </div>

                      <div className="flex items-center gap-2 pt-6">
                        {warehouseId && available !== null && (
                          <Chip
                            color={insufficient ? 'yellow' : 'lime'}
                            variant="caption"
                          >
                            {available > 0
                              ? `In stock: ${formatSalesQty(available)} ${
                                  typeof product?.unitId === 'object'
                                    ? product.unitId.symbol
                                    : ''
                                }`
                              : 'Out of stock'}
                          </Chip>
                        )}
                        <IconButton
                          aria-label="Remove product line"
                          size="small"
                          icon={RiDeleteBinLine}
                          className="text-status-rose-text"
                          disabled={items.length <= 1}
                          onClick={() =>
                            setItems((prev) =>
                              prev.filter((r) => r.key !== line.key)
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                      <NumberField
                        label="Quantity *"
                        minValue={0.01}
                        step={1}
                        value={line.orderedQuantity}
                        onChange={(v) =>
                          updateLine(line.key, {
                            orderedQuantity: Number.isNaN(v) ? 0 : v,
                          })
                        }
                        isInvalid={Boolean(
                          fieldErrors[`items.${index}.orderedQuantity`]
                        )}
                        hint={fieldErrors[`items.${index}.orderedQuantity`]}
                      />

                      <NumberField
                        label="Unit Price *"
                        minValue={0}
                        step={0.01}
                        value={line.unitPrice}
                        onChange={(v) =>
                          updateLine(line.key, {
                            unitPrice: Number.isNaN(v) ? 0 : v,
                          })
                        }
                        isInvalid={Boolean(
                          fieldErrors[`items.${index}.unitPrice`]
                        )}
                        hint={fieldErrors[`items.${index}.unitPrice`]}
                      />

                      <Select
                        label="Disc. Type"
                        selectedKey={line.discountType}
                        onSelectionChange={(k) =>
                          updateLine(line.key, {
                            discountType: String(k) as SalesPricingAdjustmentType,
                          })
                        }
                      >
                        <SelectItem id="FIXED" textValue="Fixed">
                          Fixed ($)
                        </SelectItem>
                        <SelectItem id="PERCENTAGE" textValue="Percent">
                          Percent (%)
                        </SelectItem>
                      </Select>

                      <NumberField
                        label="Discount"
                        minValue={0}
                        step={0.01}
                        value={line.discountValue}
                        onChange={(v) =>
                          updateLine(line.key, {
                            discountValue: Number.isNaN(v) ? 0 : v,
                          })
                        }
                        isInvalid={Boolean(
                          fieldErrors[`items.${index}.discountValue`]
                        )}
                        hint={fieldErrors[`items.${index}.discountValue`]}
                      />

                      <Select
                        label="Tax Type"
                        selectedKey={line.taxType}
                        onSelectionChange={(k) =>
                          updateLine(line.key, {
                            taxType: String(k) as SalesPricingAdjustmentType,
                          })
                        }
                      >
                        <SelectItem id="FIXED" textValue="Fixed">
                          Fixed ($)
                        </SelectItem>
                        <SelectItem id="PERCENTAGE" textValue="Percent">
                          Percent (%)
                        </SelectItem>
                      </Select>

                      <NumberField
                        label="Tax"
                        minValue={0}
                        step={0.01}
                        value={line.taxValue}
                        onChange={(v) =>
                          updateLine(line.key, {
                            taxValue: Number.isNaN(v) ? 0 : v,
                          })
                        }
                        isInvalid={Boolean(
                          fieldErrors[`items.${index}.taxValue`]
                        )}
                        hint={fieldErrors[`items.${index}.taxValue`]}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-caption-1-regular text-text-secondary border-t border-separator-border pt-2">
                      <span>
                        {insufficient
                          ? 'Note: Quantity exceeds current stock — order can be saved as Draft, but confirmation will require stock.'
                          : 'Pricing computed with exact cent rounding.'}
                      </span>
                      <span className="font-mono font-medium text-text-primary tabular-nums">
                        Line Total:{' '}
                        {formatSalesCurrency(computed?.lineTotal ?? 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-1">
            <Textarea
              label="Order Notes"
              placeholder="Shipping instructions, reference PO, or customer notes..."
              rows={3}
              value={notes}
              onChange={setNotes}
            />

            <div className="rounded-2xl border border-separator-border bg-background-secondary-default/40 p-4 space-y-2 text-body-2-regular">
              <div className="flex items-center justify-between text-text-secondary">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">
                  {formatSalesCurrency(totals.subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-text-secondary">
                <span>Discount Total</span>
                <span className="font-mono tabular-nums text-text-status-error">
                  -{formatSalesCurrency(totals.discountTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-text-secondary">
                <span>Tax Total</span>
                <span className="font-mono tabular-nums">
                  {formatSalesCurrency(totals.taxTotal)}
                </span>
              </div>
              <Divider />
              <div className="flex items-center justify-between text-body-1-semibold text-text-primary">
                <span>Grand Total</span>
                <span className="font-mono tabular-nums">
                  {formatSalesCurrency(totals.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting
              ? 'Saving...'
              : editingOrder
                ? 'Update Draft Order'
                : 'Save Draft Order'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
