import React, { Suspense } from 'react';
import { PageShellSkeleton } from '@/components/application/loading/page-skeletons';
import CustomerDetailPage from '@/features/sales/components/customer-detail-view';

export default function CustomerDetailRoutePage() {
  return (
    <Suspense fallback={<PageShellSkeleton showStats />}>
      <CustomerDetailPage />
    </Suspense>
  );
}
