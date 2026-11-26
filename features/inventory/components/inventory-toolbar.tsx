'use client';

import React from 'react';
import {
  RiArrowUpDownLine,
  RiDownloadLine,
  RiFilter3Line,
  RiRefreshLine,
  RiTableLine,
} from '@remixicon/react';
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from 'react-aria-components';
import { Button } from '@/components/base/buttons/button';
import { SearchField } from '@/components/base/search-field/search-field';
import { Switch } from '@/components/base/switch/switch';
import { cx } from '@/utils/cx';

export interface InventorySortOption {
  id: string;
  label: string;
}

export interface InventoryToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder: string;
  filterTitle?: string;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  filterContent?: React.ReactNode;
  sortOptions?: InventorySortOption[];
  activeSortId?: string;
  onSortSelect?: (id: string) => void;
  showStatistics?: boolean;
  onShowStatisticsChange?: (val: boolean) => void;
  statisticsLabel?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  onExport?: () => void;
  exportDisabled?: boolean;
  primaryAction?: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
  };
  extraActions?: React.ReactNode;
}

export function InventoryToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  filterTitle = 'Filters',
  hasActiveFilters = false,
  onResetFilters,
  filterContent,
  sortOptions,
  activeSortId,
  onSortSelect,
  showStatistics,
  onShowStatisticsChange,
  statisticsLabel = 'Show Statistics',
  onRefresh,
  refreshing,
  onExport,
  exportDisabled,
  primaryAction,
  extraActions,
}: InventoryToolbarProps) {
  const PrimaryIcon = primaryAction?.icon;

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
      {/* Left controls: Search pill, Table View badge, Filter popover, Sort popover, Statistics toggle */}
      <div className="flex items-center flex-wrap gap-2.5">
        <SearchField
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={search}
          onChange={onSearchChange}
          shape="pill"
          className="w-full sm:w-64 lg:w-72"
        />

        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-button-default bg-background-primary-default text-body-2-medium text-text-primary shadow-2xs">
          <RiTableLine className="size-4 text-text-tertiary" />
          <span>Table View</span>
        </div>

        {filterContent && (
          <AriaDialogTrigger>
            <AriaButton
              className={cx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-button-default bg-background-primary-default text-body-2-medium hover:bg-background-secondary-default transition-colors shadow-2xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
                hasActiveFilters
                  ? 'border-accent-500 text-accent-700 dark:text-accent-300 font-semibold'
                  : 'text-text-secondary',
              )}
            >
              <RiFilter3Line className="size-4" />
              <span>Filter</span>
              {hasActiveFilters && <span className="size-2 rounded-full bg-accent-500 ms-0.5" />}
            </AriaButton>
            <AriaPopover
              placement="bottom start"
              offset={8}
              className="z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-2xl outline-none"
            >
              <AriaDialog className="outline-none flex flex-col gap-3.5">
                <div className="flex items-center justify-between border-b border-separator-border pb-2.5">
                  <span className="text-body-2-medium font-semibold text-text-primary">
                    {filterTitle}
                  </span>
                  {hasActiveFilters && onResetFilters && (
                    <button
                      type="button"
                      onClick={onResetFilters}
                      className="text-caption-1-medium text-accent-700 dark:text-accent-300 hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                {filterContent}
              </AriaDialog>
            </AriaPopover>
          </AriaDialogTrigger>
        )}

        {sortOptions && sortOptions.length > 0 && onSortSelect && (
          <AriaDialogTrigger>
            <AriaButton className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-button-default bg-background-primary-default text-body-2-medium text-text-secondary hover:bg-background-secondary-default transition-colors shadow-2xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-500">
              <RiArrowUpDownLine className="size-4 text-text-tertiary" />
              <span>Sort</span>
            </AriaButton>
            <AriaPopover
              placement="bottom start"
              offset={8}
              className="z-50 w-52 rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-xl outline-none"
            >
              <AriaDialog className="outline-none flex flex-col gap-0.5">
                {({ close }) => (
                  <>
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onSortSelect(opt.id);
                          close();
                        }}
                        className={cx(
                          'w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium transition-colors cursor-pointer',
                          activeSortId === opt.id
                            ? 'bg-background-secondary-default text-text-primary font-semibold'
                            : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary-default',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </>
                )}
              </AriaDialog>
            </AriaPopover>
          </AriaDialogTrigger>
        )}

        {typeof showStatistics === 'boolean' && onShowStatisticsChange && (
          <div className="flex items-center gap-2 ps-1">
            <span className="text-body-2-medium text-text-secondary select-none">
              {statisticsLabel}
            </span>
            <Switch
              aria-label={statisticsLabel}
              isSelected={showStatistics}
              onChange={onShowStatisticsChange}
            />
          </div>
        )}
      </div>

      {/* Right actions: Refresh, Export CSV, Extra CTAs, Primary CTA */}
      <div className="flex items-center flex-wrap gap-2.5 shrink-0">
        {onRefresh && (
          <Button
            variant="secondary"
            size="medium"
            onClick={onRefresh}
            disabled={refreshing}
            leadingIcon={RiRefreshLine}
            className="h-10 px-4 gap-2 rounded-full text-body-medium font-medium shadow-2xs hover:shadow-xs transition-all"
          >
            Refresh
          </Button>
        )}

        {onExport && (
          <Button
            variant="secondary"
            size="medium"
            onClick={onExport}
            disabled={exportDisabled}
            leadingIcon={RiDownloadLine}
            className="h-10 px-5 gap-2.5 rounded-full text-body-medium font-medium shadow-2xs hover:shadow-xs transition-all"
          >
            Export
          </Button>
        )}

        {extraActions}

        {primaryAction && PrimaryIcon && (
          <Button
            variant="primary"
            size="medium"
            onClick={primaryAction.onClick}
            leadingIcon={PrimaryIcon}
            className="h-10 px-5 gap-2.5 rounded-full text-body-medium font-semibold text-[#171B18] shadow-2xs hover:shadow-xs transition-all"
          >
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
