'use client';

import React from 'react';
import { AppSidebar } from './app-sidebar';
import { AppHeader } from './app-header';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function AppShell({ children, title, breadcrumbs }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f6ee] dark:bg-[#121613] text-text-primary antialiased">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <AppHeader title={title} breadcrumbs={breadcrumbs} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
          <div className="max-w-[1700px] mx-auto space-y-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
