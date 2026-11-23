'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RiShieldCheckLine } from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Chip } from '@/components/base/badges/chip';

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
      <div className="flex flex-col">
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
        {title && <h1 className="text-title-3-semibold text-text-primary leading-tight mt-0.5">{title}</h1>}
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {user?.role && (
          <Chip
            color="lime"
            variant="caption"
            className="capitalize"
          >
            <RiShieldCheckLine className="size-3.5 mr-1 inline" />
            {String(user.role).replace('_', ' ')}
          </Chip>
        )}
        <div className="text-caption-2-medium text-text-tertiary border-l border-separator-border pl-3">
          ID: <span className="font-mono text-text-secondary font-semibold">{user?.humanId || 'MOD-USER'}</span>
        </div>
      </div>
    </header>
  );
}
