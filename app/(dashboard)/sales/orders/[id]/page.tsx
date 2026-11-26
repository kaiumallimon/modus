import React, { Suspense } from 'react';
import { PageShellSkeleton } from '@/components/application/loading/page-skeletons';
import SalesOrderDetailPage from '@/features/sales/components/sales-order-detail-view';

export default function SalesOrderDetailRoutePage() {
  return (
    <Suspense fallback={<PageShellSkeleton showStats />}>
      <SalesOrderDetailPage />
    </Suspense>
  );
}
