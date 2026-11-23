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
    <div className="flex h-screen w-screen overflow-hidden bg-background-full text-text-primary">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <AppHeader title={title} breadcrumbs={breadcrumbs} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
