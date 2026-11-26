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
import { DetailDrawerSkeleton } from '@/components/application/loading/page-skeletons';
import { Divider } from '@/components/base/divider/divider';
import { formatCurrency } from '@/features/inventory/utils/formatters';
import { procurementApi } from '../api/procurement-api';
import {
  getGoodsReceiptStatusMeta,
  getPurchaseOrderStatusMeta,
} from '../utils/formatters';
import type { Supplier } from '../types/procurement';

export interface SupplierDetailDrawerProps {
  supplierId: string | null;
  onClose: () => void;
  onEdit?: (supplier: Supplier) => void;
  onViewStatement?: (supplierId: string) => void;
  canEdit?: boolean;
}

export function SupplierDetailDrawer({
  supplierId,
  onClose,
  onEdit,
  onViewStatement,
  canEdit = false,
}: SupplierDetailDrawerProps) {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supplierId) {
      setSupplier(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    procurementApi
      .getSupplier(supplierId)
      .then((res) => {
        if (!cancelled) setSupplier(res);
      })
      .catch(() => {
        if (!cancelled) setSupplier(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  const addressParts = supplier?.address
    ? [
        supplier.address.street,
        supplier.address.city,
        supplier.address.state,
        supplier.address.postalCode,
        supplier.address.country,
      ].filter(Boolean)
    : [];

  return (
    <Drawer
      isOpen={Boolean(supplierId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      placement="end"
      size="lg"
    >
      {({ close }) => (
        <>
          <DrawerHeader
            title={supplier ? supplier.name : 'Supplier Details'}
            description={supplier ? `Code: ${supplier.code}` : undefined}
          />
          <DrawerBody>
            {loading ? (
              <DetailDrawerSkeleton />
            ) : !supplier ? (
              <p className="text-body-regular text-text-secondary">
                Unable to load supplier details.
              </p>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip variant="caption" color="neutral" className="font-mono">
                    {supplier.code}
                  </Chip>
                  <Chip
                    variant="caption"
                    color={supplier.isActive ? 'lime' : 'rose'}
                  >
                    {supplier.isActive ? 'Active' : 'Inactive'}
                  </Chip>
                  {supplier.taxId && (
                    <Chip variant="caption" color="neutral">
                      TIN: {supplier.taxId}
                    </Chip>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3.5">
                    <p className="text-caption-1-medium text-text-secondary">
                      Purchase Orders
                    </p>
                    <p className="mt-1 text-title-2-medium text-text-primary tabular-nums font-mono">
                      {supplier.purchaseOrderCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3.5">
                    <p className="text-caption-1-medium text-text-secondary">
                      Total Ordered Value
                    </p>
                    <p className="mt-1 text-title-2-medium text-text-primary tabular-nums font-mono">
                      {formatCurrency(supplier.totalOrderedValue ?? 0)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3.5 space-y-2 text-body-2-medium">
                  <p className="text-caption-1-semibold text-text-primary">
                    Primary Contact &amp; Address
                  </p>
                  <p className="text-text-primary font-semibold">
                    {supplier.contactPerson}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption-1-regular text-text-secondary">
                    <span>Email: {supplier.email}</span>
                    <span>Phone: {supplier.phone}</span>
                    {supplier.alternativePhone && (
                      <span>Alt: {supplier.alternativePhone}</span>
                    )}
                    {supplier.website && <span>Web: {supplier.website}</span>}
                  </div>
                  <p className="text-caption-1-regular text-text-secondary pt-1">
                    Address:{' '}
                    {addressParts.length > 0
                      ? addressParts.join(', ')
                      : 'No address recorded'}
                  </p>
                  {supplier.notes && (
                    <p className="text-caption-1-regular text-text-tertiary pt-1">
                      Notes: {supplier.notes}
                    </p>
                  )}
                </div>

                {supplier.contacts && supplier.contacts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-caption-1-semibold text-text-primary">
                      Additional Contacts
                    </p>
                    <div className="space-y-2">
                      {supplier.contacts.map((c, idx) => (
                        <div
                          key={idx}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-separator-border px-3 py-2 text-caption-1-regular"
                        >
                          <div>
                            <span className="font-semibold text-text-primary">
                              {c.name}
                            </span>
                            {c.role && (
                              <span className="text-text-tertiary ms-1.5">
                                ({c.role})
                              </span>
                            )}
                          </div>
                          <span className="text-text-secondary">
                            {[c.email, c.phone].filter(Boolean).join(' · ') || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Divider />

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-caption-1-semibold text-text-primary">
                      Recent Purchase Orders
                    </p>
                    <Link
                      href={`/procurement/purchase-orders?supplierId=${supplier._id}`}
                      className="text-caption-1-medium text-accent-700 dark:text-accent-300 hover:underline"
                      onClick={close}
                    >
                      View all →
                    </Link>
                  </div>
                  {!supplier.recentPurchaseOrders ||
                  supplier.recentPurchaseOrders.length === 0 ? (
                    <p className="text-caption-1-regular text-text-tertiary">
                      No purchase orders created for this supplier yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {supplier.recentPurchaseOrders.map((po) => {
                        const meta = getPurchaseOrderStatusMeta(po.status);
                        return (
                          <div
                            key={po._id}
                            className="flex items-center justify-between rounded-xl border border-separator-border px-3 py-2"
                          >
                            <div>
                              <p className="text-body-2-medium font-mono font-semibold text-text-primary">
                                {po.orderNumber}
                              </p>
                              <p className="text-caption-1-regular text-text-tertiary">
                                {new Date(po.orderDate).toLocaleDateString()} ·{' '}
                                {po.items.length} line(s)
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-body-2-medium font-semibold text-text-primary">
                                {formatCurrency(po.grandTotal, po.currency)}
                              </span>
                              <Chip variant="caption" color={meta.color}>
                                {meta.label}
                              </Chip>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {supplier.recentReceipts && supplier.recentReceipts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-caption-1-semibold text-text-primary">
                      Recent Goods Receipts
                    </p>
                    <div className="space-y-2">
                      {supplier.recentReceipts.map((gr) => {
                        const meta = getGoodsReceiptStatusMeta(gr.status);
                        return (
                          <div
                            key={gr._id}
                            className="flex items-center justify-between rounded-xl border border-separator-border px-3 py-2"
                          >
                            <div>
                              <p className="text-body-2-medium font-mono font-semibold text-text-primary">
                                {gr.receiptNumber}
                              </p>
                              <p className="text-caption-1-regular text-text-tertiary">
                                {gr.purchaseOrderNumber} ·{' '}
                                {gr.totalReceivedUnits} units
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
              </div>
            )}
          </DrawerBody>
          <DrawerFooter>
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
            {supplier && onViewStatement && (
              <Button
                variant="secondary"
                onClick={() => {
                  const id = supplier._id;
                  close();
                  onViewStatement(id);
                }}
              >
                View Statement
              </Button>
            )}
            {canEdit && supplier && onEdit && (
              <Button
                variant="primary"
                className="text-[#171B18]"
                onClick={() => {
                  close();
                  onEdit(supplier);
                }}
              >
                Edit Supplier
              </Button>
            )}
          </DrawerFooter>
        </>
      )}
    </Drawer>
  );
}
