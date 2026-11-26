'use client';

import React from 'react';
import { RiRestartLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';

export interface InventoryEmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  action?: React.ReactNode;
}

export function InventoryEmptyState({
  icon: Icon,
  title,
  description,
  hasActiveFilters = false,
  onClearFilters,
  action,
}: InventoryEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="size-14 rounded-2xl bg-background-secondary-default flex items-center justify-center text-text-tertiary mb-3.5 border border-separator-border">
        <Icon className="size-7" />
      </div>
      <h3 className="text-title-3-semibold text-text-primary">{title}</h3>
      <p className="text-body-2-regular text-text-secondary max-w-sm mt-1">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
        {hasActiveFilters && onClearFilters && (
          <Button
            variant="secondary"
            size="small"
            onClick={onClearFilters}
            leadingIcon={RiRestartLine}
          >
            Clear all filters
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
