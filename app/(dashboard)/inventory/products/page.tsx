'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageShellSkeleton } from '@/components/application/loading/page-skeletons';

export default function LegacyProductsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/inventory/catalog?tab=products');
  }, [router]);

  return <PageShellSkeleton showStats={false} />;
}
