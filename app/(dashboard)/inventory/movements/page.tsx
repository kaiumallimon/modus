'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageShellSkeleton } from '@/components/application/loading/page-skeletons';

export default function LegacyMovementsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/inventory/stock?tab=movements');
  }, [router]);

  return <PageShellSkeleton showStats={false} />;
}
