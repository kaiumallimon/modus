'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { RiCheckDoubleLine, RiInformationLine } from '@remixicon/react';
import { Chip } from '@/components/base/badges/chip';
import { Button } from '@/components/base/buttons/button';
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
import { salesApi } from '../api/sales-api';
import { validateFulfillOrderForm } from '../schemas/validation';
import type {
  SalesFulfillmentRecord,
  SalesOrderRecord,
} from '../types/sales';
import { formatSalesCurrency, formatSalesQty } from '../utils/formatters';

interface FulfillLineState {
  productId: string;
  productName: string;
  sku: string;
  unitSymbol: string;
  orderedQuantity: number;
  previouslyFulfilled: number;
  remainingQuantity: number;
  availableStock?: number;
  fulfilledQuantity: number;
}

export interface SalesFulfillmentFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedOrder?: SalesOrderRecord | null;
  onSuccess: (fulfillment: SalesFulfillmentRecord) => void;
}

export function SalesFulfillmentFormModal({
  isOpen,
  onOpenChange,
  preselectedOrder = null,
  onSuccess,
}: SalesFulfillmentFormModalProps) {
  const [eligibleOrders, setEligibleOrders] = useState<SalesOrderRecord[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [orderDetail, setOrderDetail] = useState<SalesOrderRecord | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const [lines, setLines] = useState<FulfillLineState[]>([]);
  const [fulfilledDate, setFulfilledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFieldErrors({});
    setSubmitError('');
    setNotes('');
    setFulfilledDate(new Date().toISOString().slice(0, 10));
    setIdempotencyKey(
      `fulfill-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );

    if (preselectedOrder) {
      setSelectedOrderId(preselectedOrder._id);
      setEligibleOrders([preselectedOrder]);
    } else {
      setSelectedOrderId('');
      setOrderDetail(null);
      setLines([]);
      Promise.all([
        salesApi.listOrders({ status: 'CONFIRMED', limit: 100 }),
        salesApi.listOrders({ status: 'PARTIALLY_FULFILLED', limit: 100 }),
      ])
        .then(([confRes, partRes]) => {
          setEligibleOrders([
            ...(confRes.items || []),
            ...(partRes.items || []),
          ]);
        })
        .catch(() => {
          toast.error('Failed to Load Orders', {
            description: 'Could not load confirmable sales orders.',
          });
        });
    }
  }, [isOpen, preselectedOrder]);

  useEffect(() => {
    if (!isOpen || !selectedOrderId) {
      setOrderDetail(null);
      setLines([]);
      return;
    }

    let cancelled = false;
    setLoadingOrder(true);
    salesApi
      .getOrder(selectedOrderId)
      .then((detail) => {
        if (cancelled) return;
        setOrderDetail(detail);
        const mapped: FulfillLineState[] = detail.items
          .map((it) => {
            const rem = Math.max(
              0,
              Math.round((it.orderedQuantity - it.fulfilledQuantity) * 10000) /
                10000
            );
            const defaultFulfill =
              it.availableStock !== undefined
                ? Math.min(rem, it.availableStock)
                : rem;
            return {
              productId: it.productId,
              productName: it.productName,
              sku: it.sku,
              unitSymbol: it.unitSymbol,
              orderedQuantity: it.orderedQuantity,
              previouslyFulfilled: it.fulfilledQuantity,
              remainingQuantity: rem,
              availableStock: it.availableStock,
              fulfilledQuantity: rem > 0 ? Math.max(0, defaultFulfill) : 0,
            };
          })
          .filter((row) => row.remainingQuantity > 0);
        setLines(mapped);
      })
      .catch((err: any) => {
        if (!cancelled) {
          toast.error('Order Load Error', {
            description: err?.message || 'Unable to load order line items.',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOrder(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedOrderId]);

  const totalUnits = useMemo(
    () =>
      lines.reduce(
        (sum, l) => sum + (Number(l.fulfilledQuantity) > 0 ? l.fulfilledQuantity : 0),
        0
      ),
    [lines]
  );

  const fillMaxAvailable = () => {
    setLines((prev) =>
      prev.map((row) => ({
        ...row,
        fulfilledQuantity:
          row.availableStock !== undefined
            ? Math.max(0, Math.min(row.remainingQuantity, row.availableStock))
            : row.remainingQuantity,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderDetail) {
      setSubmitError('Select a confirmed or partially fulfilled sales order.');
      return;
    }

    const errs = validateFulfillOrderForm(lines);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const payloadItems = lines
      .filter((l) => Number(l.fulfilledQuantity) > 0)
      .map((l) => ({
        productId: l.productId,
        fulfilledQuantity: Number(l.fulfilledQuantity),
      }));

    setSubmitting(true);
    setSubmitError('');
    try {
      const created = await salesApi.fulfillOrder(orderDetail._id, {
        items: payloadItems,
        fulfilledDate: fulfilledDate
          ? new Date(`${fulfilledDate}T00:00:00.000Z`).toISOString()
          : undefined,
        notes: notes.trim(),
        idempotencyKey,
      });

      toast.success('Order Fulfilled', {
        description: `${created.fulfillmentNumber} deducted ${formatSalesQty(created.totalFulfilledUnits)} units (${formatSalesCurrency(created.totalFulfilledValue, created.currency)}).`,
      });
      onSuccess(created);
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.message || 'Unable to fulfill sales order.';
      setSubmitError(msg);
      toast.error('Fulfillment Failed', { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col gap-2"
      >
        <ModalHeader
          title="Fulfill Sales Order"
          description="Dispatch partial or full quantities from the assigned warehouse and record stock movements."
        />

        <ModalBody className="space-y-4">
          {submitError && (
            <div className="rounded-xl border border-border-error-default bg-status-rose-background px-3 py-2 text-body-2-medium text-status-rose-text">
              {submitError}
            </div>
          )}

          {!preselectedOrder && (
            <Select
              label="Sales Order to Fulfill *"
              placeholder="Select a confirmed or partially fulfilled order..."
              selectedKey={selectedOrderId || null}
              onSelectionChange={(k) => setSelectedOrderId(k ? String(k) : '')}
            >
              {eligibleOrders.map((order) => (
                <SelectItem
                  key={order._id}
                  id={order._id}
                  textValue={`${order.orderNumber} ${order.customerNameSnapshot}`}
                >
                  {order.orderNumber} — {order.customerNameSnapshot} (
                  {formatSalesCurrency(order.grandTotal, order.currency)})
                </SelectItem>
              ))}
            </Select>
          )}

          {orderDetail && (
            <div className="rounded-xl border border-separator-border bg-background-secondary-default/40 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-caption-1-regular text-text-secondary">
              <span>
                Order{' '}
                <strong className="text-text-primary font-mono">
                  {orderDetail.orderNumber}
                </strong>{' '}
                · Customer:{' '}
                <strong className="text-text-primary">
                  {orderDetail.customerNameSnapshot}
                </strong>
              </span>
              <span>
                Warehouse:{' '}
                <strong className="text-text-primary">
                  {orderDetail.warehouseNameSnapshot}
                </strong>
              </span>
            </div>
          )}

          {loadingOrder && (
            <div className="rounded-xl border border-separator-border p-4 text-body-2-regular text-text-secondary">
              Loading live warehouse stock levels...
            </div>
          )}

          {!loadingOrder && orderDetail && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-body-2-semibold text-text-primary">
                  Remaining Line Items ({lines.length})
                </p>
                <Button
                  type="button"
                  size="small"
                  variant="ghost"
                  leadingIcon={RiCheckDoubleLine}
                  onClick={fillMaxAvailable}
                >
                  Fill Max Available
                </Button>
              </div>

              {fieldErrors.items && (
                <p className="text-caption-1-medium text-text-status-error">
                  {fieldErrors.items}
                </p>
              )}

              <div className="space-y-2.5">
                {lines.map((row, idx) => {
                  const lowStock =
                    row.availableStock !== undefined &&
                    row.availableStock < row.remainingQuantity;

                  return (
                    <div
                      key={row.productId}
                      className="rounded-2xl border border-separator-border p-3.5 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-body-2-semibold text-text-primary">
                            {row.productName}
                          </p>
                          <p className="text-caption-1-regular font-mono text-text-secondary">
                            {row.sku} · Ordered {formatSalesQty(row.orderedQuantity)}{' '}
                            {row.unitSymbol} · Fulfilled{' '}
                            {formatSalesQty(row.previouslyFulfilled)} · Remaining{' '}
                            {formatSalesQty(row.remainingQuantity)}
                          </p>
                        </div>
                        {row.availableStock !== undefined && (
                          <Chip color={lowStock ? 'yellow' : 'lime'} variant="caption">
                            Available: {formatSalesQty(row.availableStock)}{' '}
                            {row.unitSymbol}
                          </Chip>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                        <NumberField
                          label={`Fulfill Now (${row.unitSymbol})`}
                          minValue={0}
                          maxValue={
                            row.availableStock !== undefined
                              ? Math.min(row.remainingQuantity, row.availableStock)
                              : row.remainingQuantity
                          }
                          step={1}
                          value={row.fulfilledQuantity}
                          onChange={(v) =>
                            setLines((prev) =>
                              prev.map((item) =>
                                item.productId === row.productId
                                  ? {
                                      ...item,
                                      fulfilledQuantity: Number.isNaN(v) ? 0 : v,
                                    }
                                  : item
                              )
                            )
                          }
                          isInvalid={Boolean(
                            fieldErrors[`items.${idx}.fulfilledQuantity`]
                          )}
                          hint={fieldErrors[`items.${idx}.fulfilledQuantity`]}
                        />
                        {lowStock && (
                          <p className="flex items-center gap-1.5 text-caption-1-regular text-status-yellow-text">
                            <RiInformationLine className="size-4 shrink-0" />
                            Only {formatSalesQty(row.availableStock)}{' '}
                            {row.unitSymbol} available in warehouse.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <Input
                  label="Fulfillment Date"
                  type="date"
                  value={fulfilledDate}
                  onChange={setFulfilledDate}
                />
                <div className="rounded-xl border border-separator-border bg-background-secondary-default/40 px-3.5 py-2.5 flex items-center justify-between">
                  <span className="text-body-2-regular text-text-secondary">
                    Units to Dispatch
                  </span>
                  <span className="text-body-1-semibold font-mono text-text-primary tabular-nums">
                    {formatSalesQty(totalUnits)}
                  </span>
                </div>
              </div>

              <Textarea
                label="Fulfillment Notes"
                placeholder="Packing slip, carrier, or dispatch reference..."
                rows={2}
                value={notes}
                onChange={setNotes}
              />
            </div>
          )}
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
          <Button
            type="submit"
            variant="primary"
            disabled={!orderDetail || loadingOrder || submitting}
          >
            {submitting ? 'Fulfilling...' : 'Confirm Fulfillment & Deduct Stock'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
