'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Spinner } from '@/components/base/spinner/spinner';

export default function RootPage() {
  const router = useRouter();
  const { user, isLoading, isInstallationChecked, setupRequired } = useAuth();

  useEffect(() => {
    if (!isInstallationChecked || isLoading) return;

    if (setupRequired) {
      router.replace('/setup');
    } else if (user) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [user, isLoading, isInstallationChecked, setupRequired, router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background-full">
      <div className="flex flex-col items-center gap-3">
        <div className="size-10 rounded-xl bg-accent-500 flex items-center justify-center font-bold text-xl text-graphite-950 shadow-md">
          M
        </div>
        <Spinner size="md" className="text-accent-600" />
        <span className="text-body-medium text-text-secondary">Loading Modus...</span>
      </div>
    </div>
  );
}
