'use client';

import React from 'react';
import Link from 'next/link';
import { RiArrowLeftLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { InventoryPageHeader } from '@/features/inventory/components/inventory-page-header';
import { ReportsTab } from '@/features/sales/components/reports-tab';
import { SalesModuleGate } from '@/features/sales/components/sales-module-gate';

export default function SalesReportsPage() {
  return (
    <SalesModuleGate permission="sales.reports.read">
      <div className="space-y-6">
        <InventoryPageHeader
          title="Sales Reports"
          description="Analyze fulfilled sales revenue, shipped unit totals, top customers, and top-selling products."
          actions={
            <Link href="/sales">
              <Button variant="secondary" leadingIcon={RiArrowLeftLine}>
                Sales Overview
              </Button>
            </Link>
          }
        />
        <ReportsTab />
      </div>
    </SalesModuleGate>
  );
}
