'use client';

import React from 'react';
import { RiInformationLine } from '@remixicon/react';
import { Button as AriaButton } from 'react-aria-components';
import { Tooltip, TooltipTrigger } from '@/components/base/tooltip/tooltip';
import { cx } from '@/utils/cx';

export type InventoryStatBadgeTone = 'accent' | 'rose' | 'yellow' | 'neutral';

export interface InventoryStatItem {
  id: string;
  label: string;
  value: string | number;
  tooltip: string;
  contextLabel: string;
  badgeText: string;
  badgeTone?: InventoryStatBadgeTone;
  icon?: React.ComponentType<{ className?: string }>;
}

const BADGE_STYLES: Record<InventoryStatBadgeTone, string> = {
  accent: 'text-accent-800 dark:text-accent-300 bg-accent-100 dark:bg-accent-950/60',
  rose: 'text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60',
  yellow: 'text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60',
  neutral: 'text-text-tertiary bg-background-secondary-default',
};

export interface InventoryStatsBarProps {
  items: InventoryStatItem[];
  className?: string;
}

export function InventoryStatsBar({ items, className }: InventoryStatsBarProps) {
  if (!items.length) return null;

  const gridColsClass =
    items.length === 1
      ? 'grid-cols-1'
      : items.length === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : items.length === 3
          ? 'grid-cols-1 sm:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div
      className={cx(
        'rounded-2xl border border-border-button-default bg-background-primary-default shadow-2xs overflow-hidden animate-in fade-in duration-200',
        className,
      )}
    >
      <div
        className={cx(
          'grid divide-y sm:divide-y-0 sm:divide-x divide-separator-border',
          gridColsClass,
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const tone = item.badgeTone || 'accent';
          return (
            <div key={item.id} className="p-5 flex flex-col justify-between min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-caption-1-medium text-text-primary font-medium min-w-0">
                  <span className="truncate">{item.label}</span>
                  <TooltipTrigger delay={80}>
                    <AriaButton
                      className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500 shrink-0"
                      aria-label={`${item.label} info`}
                    >
                      <RiInformationLine className="size-3.5" />
                    </AriaButton>
                    <Tooltip size="sm">{item.tooltip}</Tooltip>
                  </TooltipTrigger>
                </div>
                {Icon && <Icon className="size-4 text-text-tertiary shrink-0" />}
              </div>

              <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight font-mono tabular-nums">
                {item.value}
              </div>

              <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary min-w-0">
                <span className="truncate">{item.contextLabel}</span>
                <span
                  className={cx(
                    'inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold shrink-0',
                    BADGE_STYLES[tone],
                  )}
                >
                  {item.badgeText}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
