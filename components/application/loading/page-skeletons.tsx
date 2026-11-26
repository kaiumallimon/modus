'use client';

import React from 'react';
import { Skeleton, SkeletonText } from '@/components/base/skeleton/skeleton';
import { cx } from '@/utils/cx';

interface StatsBarSkeletonProps {
  columns?: number;
  className?: string;
}

export function StatsBarSkeleton({ columns = 4, className }: StatsBarSkeletonProps) {
  const gridColsClass =
    columns === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : columns === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className={cx('grid gap-3', gridColsClass, className)} aria-busy="true">
      {Array.from({ length: columns }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border-button-default bg-background-primary-default px-4 py-3.5 shadow-2xs space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton shape="text" className="w-24 h-3" />
            <Skeleton shape="circle" className="size-7" />
          </div>
          <Skeleton className="w-16 h-6 rounded-md" />
          <Skeleton shape="text" className="w-28 h-3" />
        </div>
      ))}
    </div>
  );
}

interface TableRowsSkeletonProps {
  rows?: number;
  columns?: number;
  showCheckbox?: boolean;
  className?: string;
}

export function TableRowsSkeleton({
  rows = 6,
  columns = 5,
  showCheckbox = false,
  className,
}: TableRowsSkeletonProps) {
  return (
    <div className={cx('w-full divide-y divide-border-button-default', className)} aria-busy="true">
      {/* Header row placeholder */}
      <div className="flex items-center gap-4 px-4 py-3 bg-background-secondary-default/40">
        {showCheckbox && <Skeleton className="size-4 rounded shrink-0" />}
        {Array.from({ length: columns }).map((_, colIdx) => (
          <Skeleton
            key={colIdx}
            shape="text"
            className={cx('h-3', colIdx === 0 ? 'w-32' : 'flex-1 max-w-28')}
          />
        ))}
      </div>
      {/* Data row placeholders */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex items-center gap-4 px-4 py-3.5">
          {showCheckbox && <Skeleton className="size-4 rounded shrink-0" />}
          <div className="flex items-center gap-3 min-w-0 flex-1 max-w-52">
            <Skeleton shape="circle" className="size-8 shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton shape="text" className="w-3/4 h-3.5" />
              <Skeleton shape="text" className="w-1/2 h-3" />
            </div>
          </div>
          {Array.from({ length: Math.max(1, columns - 1) }).map((_, colIdx) => (
            <div
              key={colIdx}
              className={cx(
                'flex-1 min-w-0',
                colIdx >= 2 && 'hidden sm:block',
                colIdx >= 3 && 'hidden lg:block'
              )}
            >
              <Skeleton
                shape="text"
                className={cx('h-3.5', colIdx === columns - 2 ? 'w-16 rounded-full' : 'w-20')}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

interface CardGridSkeletonProps {
  count?: number;
  columnsClassName?: string;
  className?: string;
}

export function CardGridSkeleton({
  count = 6,
  columnsClassName = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  className,
}: CardGridSkeletonProps) {
  return (
    <div className={cx('grid gap-4 sm:gap-5', columnsClassName, className)} aria-busy="true">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Skeleton className="size-10 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1 min-w-0">
                <Skeleton shape="text" className="w-36 h-4" />
                <Skeleton shape="text" className="w-24 h-3" />
              </div>
            </div>
            <Skeleton className="w-16 h-6 rounded-full shrink-0" />
          </div>
          <SkeletonText lines={2} />
          <div className="flex items-center justify-between pt-2 border-t border-separator-border">
            <Skeleton shape="text" className="w-20 h-3" />
            <Skeleton className="w-24 h-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface PageShellSkeletonProps {
  showStats?: boolean;
  statsCount?: number;
  view?: 'table' | 'cards';
  rowCount?: number;
}

export function PageShellSkeleton({
  showStats = true,
  statsCount = 4,
  view = 'table',
  rowCount = 6,
}: PageShellSkeletonProps) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      {/* Full-bleed page header skeleton */}
      <div className="bg-background-primary-default border-b border-border-button-default -mt-4 -mx-4 sm:-mt-6 sm:-mx-6 lg:-mt-8 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-6 pb-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <Skeleton className="size-11 rounded-2xl shrink-0" />
            <div className="space-y-2 min-w-0">
              <Skeleton shape="text" className="w-48 h-6" />
              <Skeleton shape="text" className="w-64 max-w-full h-3.5" />
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Skeleton className="w-24 h-9 rounded-full" />
            <Skeleton className="w-32 h-9 rounded-full" />
          </div>
        </div>

        {showStats && <StatsBarSkeleton columns={statsCount} />}
      </div>

      {/* Filter/Toolbar skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Skeleton className="w-full sm:w-80 h-9 rounded-full" />
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="w-24 h-9 rounded-full" />
          <Skeleton className="w-24 h-9 rounded-full" />
        </div>
      </div>

      {/* Main Content Area */}
      {view === 'cards' ? (
        <CardGridSkeleton count={rowCount} />
      ) : (
        <div className="rounded-xl border border-border-button-default bg-background-primary-default overflow-hidden shadow-2xs">
          <TableRowsSkeleton rows={rowCount} columns={5} />
        </div>
      )}
    </div>
  );
}

export function InventoryOverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading inventory overview">
      <StatsBarSkeleton columns={2} />

      {/* Charts / Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <Skeleton shape="text" className="w-40 h-5" />
            <Skeleton shape="text" className="w-20 h-4" />
          </div>
          <Skeleton className="w-full h-56 rounded-xl" />
        </div>
        <div className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <Skeleton shape="text" className="w-44 h-5" />
            <Skeleton shape="text" className="w-16 h-4" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-2.5 flex-1">
                  <Skeleton className="size-8 rounded-lg shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton shape="text" className="w-36 h-3.5" />
                    <Skeleton shape="text" className="w-24 h-3" />
                  </div>
                </div>
                <Skeleton className="w-16 h-6 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Directory Links */}
      <CardGridSkeleton count={3} columnsClassName="grid-cols-1 md:grid-cols-3" />
    </div>
  );
}

export function DetailDrawerSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading details">
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-separator-border">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Skeleton className="size-11 rounded-xl shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton shape="text" className="w-44 h-5" />
            <Skeleton shape="text" className="w-28 h-3.5" />
          </div>
        </div>
        <Skeleton className="w-16 h-6 rounded-full shrink-0" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border-button-default bg-background-secondary-default/40 p-3 space-y-1.5"
          >
            <Skeleton shape="text" className="w-20 h-3" />
            <Skeleton shape="text" className="w-28 h-4" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border-button-default p-4 space-y-3">
        <Skeleton shape="text" className="w-32 h-4" />
        <SkeletonText lines={3} />
      </div>

      <div className="rounded-xl border border-border-button-default p-4 space-y-3">
        <Skeleton shape="text" className="w-36 h-4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2">
              <Skeleton shape="text" className="w-32 h-3.5" />
              <Skeleton shape="text" className="w-16 h-3.5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
