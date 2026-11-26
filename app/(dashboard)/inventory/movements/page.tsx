'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/base/spinner/spinner';

export default function LegacyMovementsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/inventory/stock?tab=movements');
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner size="md" className="text-accent-600" />
    </div>
  );
}
