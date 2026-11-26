'use client';

import React, { useEffect, useState } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
} from '@/components/base/drawer/drawer';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { DetailDrawerSkeleton } from '@/components/application/loading/page-skeletons';
import { formatCurrency } from '@/features/inventory/utils/formatters';
import { procurementApi } from '../api/procurement-api';
import { getTransactionTypeMeta } from '../utils/formatters';
import type { SupplierStatementResponse } from '../types/procurement';

export interface SupplierStatementDrawerProps {
  supplierId: string | null;
  onClose: () => void;
}

export function SupplierStatementDrawer({
  supplierId,
  onClose,
}: SupplierStatementDrawerProps) {
  const [statement, setStatement] = useState<SupplierStatementResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supplierId) {
      setStatement(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    procurementApi
      .getSupplierStatement(supplierId)
      .then((res) => {
        if (!cancelled) setStatement(res);
      })
      .catch(() => {
        if (!cancelled) setStatement(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId]);

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
            title={
              statement
                ? `Statement — ${statement.supplier.name}`
                : 'Supplier Statement'
            }
            description={
              statement
                ? `Code: ${statement.supplier.code} · Purchase & receiving activity`
                : undefined
            }
          />
          <DrawerBody>
            {loading ? (
              <DetailDrawerSkeleton />
            ) : !statement ? (
              <p className="text-body-regular text-text-secondary">
                Unable to load supplier statement.
              </p>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border border-separator-border bg-background-secondary-default/70 px-3.5 py-2.5 text-caption-1-regular text-text-secondary">
                  {statement.summary.accountingNote}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3.5">
                    <p className="text-caption-1-medium text-text-secondary">
                      Ordered Value
                    </p>
                    <p className="mt-1 text-body-1-bold font-mono text-text-primary tabular-nums">
                      {formatCurrency(
                        statement.summary.totalOrderedCommitment,
                        statement.summary.currency,
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3.5">
                    <p className="text-caption-1-medium text-text-secondary">
                      Received Goods
                    </p>
                    <p className="mt-1 text-body-1-bold font-mono text-text-primary tabular-nums">
                      {formatCurrency(
                        statement.summary.totalReceivedGoodsValue,
                        statement.summary.currency,
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-separator-border bg-background-secondary-default p-3.5">
                    <p className="text-caption-1-medium text-text-secondary">
                      Unreceived Commitment
                    </p>
                    <p className="mt-1 text-body-1-bold font-mono text-text-primary tabular-nums">
                      {formatCurrency(
                        statement.summary.unreceivedCommitmentAmount,
                        statement.summary.currency,
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <p className="text-caption-1-semibold text-text-primary">
                    Transaction History ({statement.transactions.length})
                  </p>
                  {statement.transactions.length === 0 ? (
                    <p className="text-caption-1-regular text-text-tertiary">
                      No purchase orders or confirmed receipts recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {statement.transactions.map((entry) => {
                        const meta = getTransactionTypeMeta(
                          entry.transactionType,
                        );
                        return (
                          <div
                            key={entry.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-separator-border px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Chip variant="caption" color={meta.color}>
                                  {meta.label}
                                </Chip>
                                <span className="font-mono text-body-2-medium font-semibold text-text-primary">
                                  {entry.referenceNumber}
                                </span>
                              </div>
                              <p className="text-caption-1-regular text-text-tertiary mt-1">
                                {entry.commitmentLabel} ·{' '}
                                {new Date(entry.date).toLocaleDateString()}
                                {entry.warehouseCode
                                  ? ` · ${entry.warehouseCode}`
                                  : ''}
                              </p>
                            </div>
                            <div className="text-end">
                              <p className="font-mono text-body-2-medium font-semibold text-text-primary tabular-nums">
                                {formatCurrency(entry.amount, entry.currency)}
                              </p>
                              <p className="text-caption-2-medium text-text-tertiary">
                                {entry.status}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DrawerBody>
          <DrawerFooter>
            <Button variant="primary" className="text-[#171B18]" onClick={close}>
              Close
            </Button>
          </DrawerFooter>
        </>
      )}
    </Drawer>
  );
}
