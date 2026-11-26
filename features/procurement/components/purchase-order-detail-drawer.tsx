'use client';

import React, { useEffect, useState } from 'react';
import {
  RiCheckDoubleLine,
  RiCloseCircleLine,
  RiEditLine,
  RiInboxArchiveLine,
  RiPrinterLine,
} from '@remixicon/react';
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
} from '@/components/base/drawer/drawer';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { Meter } from '@/components/base/meter/meter';
import { AlertDialog } from '@/components/base/modal/modal';
import { DetailDrawerSkeleton } from '@/components/application/loading/page-skeletons';
import { toast } from '@/components/base/toast/toast';
import { formatCurrency, formatQuantity } from '@/features/inventory/utils/formatters';
import { procurementApi } from '../api/procurement-api';
import {
  getGoodsReceiptStatusMeta,
  getPurchaseOrderStatusMeta,
} from '../utils/formatters';
import type { PurchaseOrder } from '../types/procurement';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function openPrintablePurchaseOrder(po: PurchaseOrder) {
  if (typeof window === 'undefined') return;
  const sup = typeof po.supplierId === 'object' ? po.supplierId : null;
  const wh =
    typeof po.destinationWarehouseId === 'object'
      ? po.destinationWarehouseId
      : null;

  const rowsHtml = po.items
    .map(
      (item) => `
      <tr>
        <td><strong>${escapeHtml(item.sku)}</strong></td>
        <td>${escapeHtml(item.productName)}</td>
        <td style="text-align:right">${escapeHtml(item.orderedQuantity)} ${escapeHtml(item.unitSymbol || '')}</td>
        <td style="text-align:right">${escapeHtml(formatCurrency(item.unitPrice, po.currency))}</td>
        <td style="text-align:right">-${escapeHtml(formatCurrency(item.discountAmount, po.currency))}</td>
        <td style="text-align:right">+${escapeHtml(formatCurrency(item.taxAmount, po.currency))}</td>
        <td style="text-align:right"><strong>${escapeHtml(formatCurrency(item.lineTotal, po.currency))}</strong></td>
      </tr>
    `,
    )
    .join('');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(po.orderNumber)} — Purchase Order</title>
  <style>
    body { font-family: Inter, -apple-system, sans-serif; color: #171B18; margin: 36px; line-height: 1.45; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #E4E8DD; padding-bottom: 16px; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; background: #EDF6D7; font-size: 12px; font-weight: 600; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .card { border: 1px solid #E4E8DD; border-radius: 12px; padding: 12px 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
    th, td { border-bottom: 1px solid #E4E8DD; padding: 10px 8px; text-align: left; }
    th { font-size: 11px; text-transform: uppercase; color: #73796E; }
    .totals { max-width: 280px; margin-left: auto; font-size: 13px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { border-top: 2px solid #171B18; font-size: 15px; font-weight: 700; padding-top: 8px; margin-top: 4px; }
    @media print { button { display: none; } body { margin: 18px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 style="margin:0;font-size:22px;">Purchase Order ${escapeHtml(po.orderNumber)}</h1>
      <p style="margin:4px 0 0;color:#73796E;font-size:13px;">Order Date: ${escapeHtml(new Date(po.orderDate).toLocaleDateString())}${po.expectedDeliveryDate ? ` · Expected: ${escapeHtml(new Date(po.expectedDeliveryDate).toLocaleDateString())}` : ''}</p>
    </div>
    <div style="text-align:right">
      <span class="badge">${escapeHtml(getPurchaseOrderStatusMeta(po.status).label)}</span>
      <div style="margin-top:8px;"><button onclick="window.print()" style="padding:6px 14px;border-radius:999px;border:1px solid #E4E8DD;cursor:pointer;">Print / Save PDF</button></div>
    </div>
  </div>
  <div class="grid">
    <div class="card">
      <div style="font-size:11px;color:#73796E;text-transform:uppercase;font-weight:600;">Supplier</div>
      <div style="font-weight:600;margin-top:4px;">${escapeHtml(sup?.name || po.supplierNameSnapshot)} (${escapeHtml(sup?.code || po.supplierCodeSnapshot)})</div>
      <div style="font-size:12px;color:#73796E;margin-top:4px;">${escapeHtml(sup?.contactPerson || '')} ${sup?.email ? `· ${escapeHtml(sup.email)}` : ''} ${sup?.phone ? `· ${escapeHtml(sup.phone)}` : ''}</div>
    </div>
    <div class="card">
      <div style="font-size:11px;color:#73796E;text-transform:uppercase;font-weight:600;">Destination Warehouse</div>
      <div style="font-weight:600;margin-top:4px;">${escapeHtml(wh ? `${wh.name} (${wh.code})` : 'Warehouse')}</div>
      <div style="font-size:12px;color:#73796E;margin-top:4px;">Created by: ${escapeHtml(po.createdBy?.email || '')}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>Product</th>
        <th style="text-align:right">Ordered</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Discount</th>
        <th style="text-align:right">Tax</th>
        <th style="text-align:right">Line Total</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="totals">
    <div><span>Subtotal</span><span>${escapeHtml(formatCurrency(po.subtotal, po.currency))}</span></div>
    <div><span>Discount Total</span><span>-${escapeHtml(formatCurrency(po.discountTotal, po.currency))}</span></div>
    <div><span>Tax Total</span><span>+${escapeHtml(formatCurrency(po.taxTotal, po.currency))}</span></div>
    <div class="grand"><span>Grand Total (${escapeHtml(po.currency)})</span><span>${escapeHtml(formatCurrency(po.grandTotal, po.currency))}</span></div>
  </div>
  ${po.notes ? `<div class="card" style="margin-top:20px;font-size:12px;"><strong>Notes:</strong> ${escapeHtml(po.notes)}</div>` : ''}
</body>
</html>`;

  const win = window.open('', '_blank', 'width=960,height=740');
  if (!win) {
    window.print();
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export interface PurchaseOrderDetailDrawerProps {
  orderId: string | null;
  onClose: () => void;
  onEditDraft?: (order: PurchaseOrder) => void;
  onReceiveGoods?: (order: PurchaseOrder) => void;
  onChanged?: () => void;
  canUpdate?: boolean;
  canSubmit?: boolean;
  canCancel?: boolean;
  canReceive?: boolean;
}

export function PurchaseOrderDetailDrawer({
  orderId,
  onClose,
  onEditDraft,
  onReceiveGoods,
  onChanged,
  canUpdate = false,
  canSubmit = false,
  canCancel = false,
  canReceive = false,
}: PurchaseOrderDetailDrawerProps) {
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    procurementApi
      .getPurchaseOrder(orderId)
      .then((res) => {
        if (!cancelled) setOrder(res);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const supplierObj =
    order && typeof order.supplierId === 'object' ? order.supplierId : null;
  const whObj =
    order && typeof order.destinationWarehouseId === 'object'
      ? order.destinationWarehouseId
      : null;

  const hasAnyReceived = Boolean(
    order?.items.some((i) => (i.receivedQuantity || 0) > 0),
  );
  const canCancelOrder =
    canCancel &&
    order &&
    (order.status === 'DRAFT' || (order.status === 'ORDERED' && !hasAnyReceived));
  const canReceiveOrder =
    canReceive &&
    order &&
    (order.status === 'ORDERED' || order.status === 'PARTIALLY_RECEIVED');

  return (
    <>
      <Drawer
        isOpen={Boolean(orderId)}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        placement="end"
        size="lg"
      >
        {({ close }) => (
          <>
            <DrawerHeader
              title={order ? order.orderNumber : 'Purchase Order Details'}
              description={
                order
                  ? `${supplierObj?.name || order.supplierNameSnapshot}`
                  : undefined
              }
            />
            <DrawerBody>
              {loading ? (
                <DetailDrawerSkeleton />
              ) : !order ? (
                <p className="text-body-regular text-text-secondary">
                  Unable to load purchase order details.
                </p>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip
                        variant="caption"
                        color={getPurchaseOrderStatusMeta(order.status).color}
                      >
                        {getPurchaseOrderStatusMeta(order.status).label}
                      </Chip>
                      <Chip variant="caption" color="neutral" className="font-mono">
                        {order.currency}
                      </Chip>
                    </div>
                    <Button
                      variant="secondary"
                      size="small"
                      leadingIcon={RiPrinterLine}
                      onClick={() => openPrintablePurchaseOrder(order)}
                    >
                      Print View
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3.5">
                      <p className="text-caption-1-medium text-text-secondary">
                        Supplier
                      </p>
                      <p className="mt-1 text-body-2-medium font-semibold text-text-primary">
                        {supplierObj?.name || order.supplierNameSnapshot}
                      </p>
                      <p className="text-caption-1-regular font-mono text-text-tertiary">
                        {supplierObj?.code || order.supplierCodeSnapshot}
                      </p>
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

                  <div className="space-y-2">
                    <p className="text-caption-1-semibold text-text-primary">
                      Line Items ({order.items.length})
                    </p>
                    <div className="divide-y divide-separator-border rounded-2xl border border-separator-border overflow-hidden">
                      {order.items.map((item, idx) => {
                        const prodKey =
                          typeof item.productId === 'string'
                            ? item.productId
                            : item.productId?._id || String(idx);
                        return (
                          <div
                            key={prodKey}
                            className="p-3.5 bg-background-primary-default space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-body-2-medium font-semibold text-text-primary truncate">
                                  {item.productName}
                                </p>
                                <p className="text-caption-1-regular font-mono text-text-tertiary">
                                  {item.sku} ·{' '}
                                  {formatQuantity(item.orderedQuantity, item.unitSymbol)} ×{' '}
                                  {formatCurrency(item.unitPrice, order.currency)}
                                </p>
                              </div>
                              <div className="text-end shrink-0">
                                <p className="font-mono text-body-2-medium font-semibold text-text-primary">
                                  {formatCurrency(item.lineTotal, order.currency)}
                                </p>
                                {(item.discountAmount > 0 || item.taxAmount > 0) && (
                                  <p className="text-[11px] font-mono text-text-tertiary">
                                    Disc -{formatCurrency(item.discountAmount, order.currency)} · Tax +
                                    {formatCurrency(item.taxAmount, order.currency)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Meter
                              aria-label={`${item.sku} received progress`}
                              value={item.receivedQuantity || 0}
                              maxValue={Math.max(1, item.orderedQuantity)}
                              tone={
                                item.receivedQuantity >= item.orderedQuantity
                                  ? 'success'
                                  : 'warning'
                              }
                              size="sm"
                              label="Received"
                              showValueLabel
                              valueLabel={`${formatQuantity(item.receivedQuantity)} / ${formatQuantity(item.orderedQuantity, item.unitSymbol)}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-separator-border bg-background-secondary-default/40 p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-caption-1-medium">
                    <div>
                      <span className="text-text-tertiary block">Subtotal</span>
                      <span className="font-mono text-body-2-medium text-text-primary">
                        {formatCurrency(order.subtotal, order.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-tertiary block">Discount</span>
                      <span className="font-mono text-body-2-medium text-text-primary">
                        -{formatCurrency(order.discountTotal, order.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-tertiary block">Tax</span>
                      <span className="font-mono text-body-2-medium text-text-primary">
                        +{formatCurrency(order.taxTotal, order.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-tertiary block">Grand Total</span>
                      <span className="font-mono text-body-medium font-bold text-text-primary">
                        {formatCurrency(order.grandTotal, order.currency)}
                      </span>
                    </div>
                  </div>

                  {order.receipts && order.receipts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-caption-1-semibold text-text-primary">
                        Goods Receipts ({order.receipts.length})
                      </p>
                      <div className="space-y-2">
                        {order.receipts.map((gr) => {
                          const meta = getGoodsReceiptStatusMeta(gr.status);
                          return (
                            <div
                              key={gr._id}
                              className="flex items-center justify-between rounded-xl border border-separator-border px-3 py-2"
                            >
                              <div>
                                <p className="font-mono text-body-2-medium font-semibold text-text-primary">
                                  {gr.receiptNumber}
                                </p>
                                <p className="text-caption-1-regular text-text-tertiary">
                                  {new Date(gr.receivedDate).toLocaleDateString()} ·{' '}
                                  {formatQuantity(gr.totalReceivedUnits)} units
                                </p>
                              </div>
                              <Chip variant="caption" color={meta.color}>
                                {meta.label}
                              </Chip>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {order.notes && (
                    <div className="rounded-xl border border-separator-border p-3 text-caption-1-regular text-text-secondary">
                      <strong className="text-text-primary">Notes:</strong>{' '}
                      {order.notes}
                    </div>
                  )}
                </div>
              )}
            </DrawerBody>
            <DrawerFooter>
              <Button variant="secondary" onClick={close}>
                Close
              </Button>
              {canUpdate && order?.status === 'DRAFT' && onEditDraft && (
                <Button
                  variant="secondary"
                  leadingIcon={RiEditLine}
                  onClick={() => {
                    close();
                    onEditDraft(order);
                  }}
                >
                  Edit Draft
                </Button>
              )}
              {canCancelOrder && (
                <Button
                  variant="secondary"
                  leadingIcon={RiCloseCircleLine}
                  onClick={() => setCancelConfirmOpen(true)}
                >
                  Cancel PO
                </Button>
              )}
              {canSubmit && order?.status === 'DRAFT' && (
                <Button
                  variant="primary"
                  leadingIcon={RiCheckDoubleLine}
                  className="text-[#171B18]"
                  onClick={() => setSubmitConfirmOpen(true)}
                >
                  Submit Order
                </Button>
              )}
              {canReceiveOrder && onReceiveGoods && order && (
                <Button
                  variant="primary"
                  leadingIcon={RiInboxArchiveLine}
                  className="text-[#171B18]"
                  onClick={() => {
                    close();
                    onReceiveGoods(order);
                  }}
                >
                  Receive Goods
                </Button>
              )}
            </DrawerFooter>
          </>
        )}
      </Drawer>

      <AlertDialog
        isOpen={submitConfirmOpen}
        onOpenChange={setSubmitConfirmOpen}
        variant="default"
        title="Submit Purchase Order"
        description={
          order
            ? `Submit ${order.orderNumber} (${formatCurrency(order.grandTotal, order.currency)}) to "${supplierObj?.name || order.supplierNameSnapshot}"? Draft line items will be locked once Ordered.`
            : ''
        }
        confirmLabel="Submit Order"
        pendingLabel="Submitting..."
        onConfirm={async () => {
          if (!order) return;
          try {
            const updated = await procurementApi.submitPurchaseOrder(order._id);
            setOrder(updated);
            toast.success(`Purchase order ${order.orderNumber} submitted.`);
            onChanged?.();
          } catch (err: any) {
            toast.error(err?.message || 'Unable to submit purchase order.');
            throw err;
          }
        }}
      />

      <AlertDialog
        isOpen={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        variant="danger"
        title="Cancel Purchase Order"
        description={
          order
            ? `Cancel ${order.orderNumber}? This action marks the purchase order as Cancelled.`
            : ''
        }
        confirmLabel="Cancel Order"
        pendingLabel="Cancelling..."
        onConfirm={async () => {
          if (!order) return;
          try {
            const updated = await procurementApi.cancelPurchaseOrder(order._id);
            setOrder(updated);
            toast.success(`Purchase order ${order.orderNumber} cancelled.`);
            onChanged?.();
          } catch (err: any) {
            toast.error(err?.message || 'Unable to cancel purchase order.');
            throw err;
          }
        }}
      />
    </>
  );
}
