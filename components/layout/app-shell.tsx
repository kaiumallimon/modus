'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { RiMenuLine } from '@remixicon/react';
import { Drawer } from '@/components/base/drawer/drawer';
import { ThemeToggle } from '@/components/application/theme/theme-toggle';
import { AppSidebar } from './app-sidebar';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row h-dvh w-full overflow-hidden bg-background-primary-default text-text-primary antialiased">
      {/* Desktop / Tablet Collapsible Sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        <AppSidebar mode="desktop" />
      </div>

      {/* Mobile Top Header Bar (Always pinned at top on mobile) */}
      <header className="fixed top-0 inset-x-0 z-30 flex md:hidden items-center justify-between h-14 px-4 border-b border-border-button-default bg-background-primary-default/95 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="size-9 rounded-full border border-border-button-default bg-background-primary-default hover:bg-background-secondary-default text-text-primary flex items-center justify-center transition-colors shadow-2xs shrink-0 cursor-pointer"
            aria-label="Open navigation menu"
          >
            <RiMenuLine className="size-5" />
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 min-w-0 rounded-lg p-1 hover:bg-background-secondary-default transition-colors"
          >
            <div className="size-6 flex items-center justify-center shrink-0">
              <Image
                src="/brand/modus-symbol-lime-on-transparent.svg"
                alt="Modus"
                width={24}
                height={24}
                priority
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-body-medium font-bold text-text-primary tracking-tight truncate">
              Modus
            </span>
          </Link>
        </div>

        <ThemeToggle label={false} />
      </header>

      {/* Spacer for pinned mobile header */}
      <div className="h-14 shrink-0 md:hidden" aria-hidden />

      {/* Mobile Sheet Sidebar (Fixed / Non-Collapsible) */}
      <Drawer
        placement="start"
        size="sm"
        isOpen={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        aria-label="Navigation menu"
        className="!p-0 overflow-hidden"
      >
        <AppSidebar mode="mobile-sheet" onNavigate={() => setMobileNavOpen(false)} />
      </Drawer>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden bg-background-primary-default">
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="w-full min-w-0 space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
