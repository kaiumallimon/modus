'use client';

import React from 'react';
import { Pagination } from '@/components/base/pagination/pagination';
import { Select, SelectItem } from '@/components/base/select/select';

export interface InventoryPaginationFooterProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  itemLabel?: string;
}

export function InventoryPaginationFooter({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  itemLabel = 'items',
}: InventoryPaginationFooterProps) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-separator-border px-4 py-3">
      <div className="flex items-center gap-3 text-caption-1-medium text-text-secondary">
        <span>
          Showing <strong className="text-text-primary tabular-nums">{start}–{end}</strong> of{' '}
          <strong className="text-text-primary tabular-nums">{total}</strong> {itemLabel}
        </span>
        <Select
          aria-label="Rows per page"
          size="sm"
          selectedKey={String(limit)}
          onSelectionChange={(key) => {
            onLimitChange(Number(key));
            onPageChange(1);
          }}
        >
          <SelectItem id="10" textValue="10 / page">
            10 / page
          </SelectItem>
          <SelectItem id="20" textValue="20 / page">
            20 / page
          </SelectItem>
          <SelectItem id="50" textValue="50 / page">
            50 / page
          </SelectItem>
        </Select>
      </div>

      <Pagination
        page={page}
        totalPages={Math.max(1, totalPages)}
        onChange={onPageChange}
      />
    </div>
  );
}
