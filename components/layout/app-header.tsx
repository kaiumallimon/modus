'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  RiShareForwardLine,
  RiNotification3Line,
  RiUserAddLine,
  RiShieldCheckLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Chip } from '@/components/base/badges/chip';
import { Avatar } from '@/components/base/avatar/avatar';
import { ThemeToggle } from '@/components/application/theme/theme-toggle';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function AppHeader({ title, breadcrumbs = [] }: { title?: string; breadcrumbs?: BreadcrumbItem[] }) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Auto-generate breadcrumbs if not explicitly provided
  const generatedBreadcrumbs = breadcrumbs.length > 0 ? breadcrumbs : [
    { label: 'Modus', href: '/dashboard' },
    { label: title || pathname.replace('/', '').replace(/-/g, ' ').toUpperCase() },
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
        {title && <h1 className="text-title-3-semibold text-text-primary leading-tight mt-0.5 truncate">{title}</h1>}
      </div>

      {/* Header Actions matching reference design */}
      <div className="flex items-center gap-3">
        {/* Share Button */}
        <button
          type="button"
          className="size-9 rounded-xl border border-border-button-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors"
          title="Share"
          aria-label="Share workspace"
        >
          <RiShareForwardLine className="size-4.5" />
        </button>

        {/* Notifications Button with unread indicator */}
        <button
          type="button"
          className="relative size-9 rounded-xl border border-border-button-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors"
          title="Notifications"
          aria-label="Notifications"
        >
          <RiNotification3Line className="size-4.5" />
          <span className="absolute top-2 end-2 size-2 rounded-full bg-accent-500 ring-2 ring-background-primary-default" />
        </button>

        {/* Team Avatars Cluster */}
        <div className="hidden sm:flex items-center ps-1">
          <Avatar size="sm" initials="AK" color="neutral" className="ring-2 ring-background-primary-default" />
          <Avatar size="sm" initials="MR" color="lime" className="ring-2 ring-background-primary-default -ms-2" />
          <Avatar size="sm" initials="SP" color="pink" className="ring-2 ring-background-primary-default -ms-2" />
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
        <div className="border-l border-separator-border ps-3">
          <ThemeToggle collapsed />
        </div>

        {/* User Identity Chip */}
        {user?.role && (
          <div className="hidden md:flex items-center gap-2 border-l border-separator-border ps-3">
            <Chip color="lime" variant="caption" className="capitalize font-medium">
              <RiShieldCheckLine className="size-3.5 me-1 inline text-accent-700 dark:text-accent-400" />
              {String(user.role).replace('_', ' ')}
            </Chip>
            <span className="text-caption-2-medium text-text-tertiary">
              <span className="font-mono text-text-secondary font-semibold">{user?.humanId || 'MOD-USER'}</span>
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
