'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageShellSkeleton } from '@/components/application/loading/page-skeletons';

export default function LegacySupplierTransactionsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/procurement/suppliers?tab=transactions');
  }, [router]);

  return <PageShellSkeleton showStats={false} />;
}
