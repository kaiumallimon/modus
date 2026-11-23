'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  RiShareForwardLine,
  RiNotification3Line,
  RiUserAddLine,
  RiLayoutGridLine,
} from '@remixicon/react';
import { Avatar } from '@/components/base/avatar/avatar';
import { ThemeToggle } from '@/components/application/theme/theme-toggle';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function AppHeader({ title, breadcrumbs = [] }: { title?: string; breadcrumbs?: BreadcrumbItem[] }) {
  const pathname = usePathname();

  // Auto-generate breadcrumbs if not explicitly provided
  const pageTitle = title || (pathname === '/dashboard' ? 'Dashboard' : pathname.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
  const generatedBreadcrumbs = breadcrumbs.length > 0 ? breadcrumbs : [
    { label: 'Modus', href: '/dashboard' },
    { label: pageTitle },
  ];

  return (
    <header className="h-16 px-6 border-b border-border-button-default bg-background-primary-default flex items-center justify-between shrink-0 z-20">
      {/* Breadcrumbs & Title */}
      <div className="flex flex-col min-w-0">
        <nav className="flex items-center gap-1.5 text-caption-2-medium text-text-tertiary">
          {generatedBreadcrumbs.map((crumb, idx) => {
            const isLast = idx === generatedBreadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-text-disabled">/</span>}
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="hover:text-text-primary transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-text-secondary font-medium' : ''}>{crumb.label}</span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
        <h1 className="text-title-2-medium font-bold text-text-primary leading-tight mt-0.5 truncate">{pageTitle}</h1>
      </div>

      {/* Header Actions matching reference design */}
      <div className="flex items-center gap-2.5">
        {/* Share Button */}
        <button
          type="button"
          className="size-9 rounded-lg border border-border-button-default bg-background-primary-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors shadow-2xs"
          title="Share"
          aria-label="Share workspace"
        >
          <RiShareForwardLine className="size-4.5" />
        </button>

        {/* Notifications Button with unread indicator */}
        <button
          type="button"
          className="relative size-9 rounded-lg border border-border-button-default bg-background-primary-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors shadow-2xs"
          title="Notifications"
          aria-label="Notifications"
        >
          <RiNotification3Line className="size-4.5" />
          <span className="absolute top-2 end-2 size-2 rounded-full bg-accent-500 ring-2 ring-background-primary-default" />
        </button>

        {/* Team Avatars Cluster */}
        <div className="hidden sm:flex items-center ps-1">
          <Avatar size="sm" initials="A" color="neutral" className="ring-2 ring-background-primary-default" />
          <Avatar size="sm" initials="M" color="lime" className="ring-2 ring-background-primary-default -ms-2" />
          <Avatar size="sm" initials="S" color="pink" className="ring-2 ring-background-primary-default -ms-2" />
          <span className="size-6 -ms-2 rounded-full bg-background-secondary-default border border-border-button-default text-[10px] font-semibold text-text-secondary flex items-center justify-center ring-2 ring-background-primary-default">
            +3
          </span>
          <button
            type="button"
            className="size-6 -ms-1 rounded-full border border-dashed border-border-button-default text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors"
            title="Invite teammate"
            aria-label="Invite teammate"
          >
            <RiUserAddLine className="size-3" />
          </button>
        </div>

        {/* Theme Toggle */}
        <div className="border-l border-separator-border ps-2.5">
          <ThemeToggle collapsed />
        </div>

        {/* Customize Widget Button */}
        <button
          type="button"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-button-default bg-background-primary-default hover:bg-background-secondary-default text-body-2-medium text-text-primary font-medium transition-colors shadow-2xs"
        >
          <RiLayoutGridLine className="size-4 text-text-secondary" />
          <span>Customize Widget</span>
        </button>
      </div>
    </header>
  );
}
