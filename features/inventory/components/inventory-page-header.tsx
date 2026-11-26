'use client';

import React from 'react';
import { cx } from '@/utils/cx';

export interface InventoryPageHeaderProps {
  title: string;
  description: string;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  className?: string;
}

export function InventoryPageHeader({
  title,
  description,
  actions,
  tabs,
  className,
}: InventoryPageHeaderProps) {
  return (
    <div
      className={cx(
        '-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 px-4 sm:px-6 lg:px-8 pt-5 border-b border-border-button-default bg-background-primary-default',
        tabs ? 'pb-0' : 'pb-5',
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-title-1-medium font-bold text-text-primary tracking-tight">
            {title}
          </h1>
          <p className="text-body-medium text-text-secondary mt-0.5">{description}</p>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>
        )}
      </div>

      {tabs && <div className="mt-4 overflow-x-auto no-scrollbar">{tabs}</div>}
    </div>
  );
}
