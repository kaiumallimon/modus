'use client';

import React from 'react';
import { AppSidebar } from './app-sidebar';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background-primary-default text-text-primary antialiased">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden bg-background-primary-default">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1700px] mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
