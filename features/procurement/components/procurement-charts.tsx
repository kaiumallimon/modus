'use client';

import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Chip } from '@/components/base/badges/chip';
import { useCountUp } from '@/hooks/use-count-up';
import { formatCurrency } from '@/features/inventory/utils/formatters';
import { cx } from '@/utils/cx';
import type {
  ProcurementDashboardSummary,
  PurchaseOrderStatus,
} from '../types/procurement';
import { getPurchaseOrderStatusMeta } from '../utils/formatters';

const PO_STATUS_COLORS: Record<
  PurchaseOrderStatus,
  { color: string; active: string }
> = {
  DRAFT: { color: 'var(--color-chart-6)', active: 'var(--color-chart-6-active)' },
  ORDERED: { color: 'var(--color-chart-5)', active: 'var(--color-chart-5-active)' },
  PARTIALLY_RECEIVED: {
    color: 'var(--color-chart-8)',
    active: 'var(--color-chart-8-active)',
  },
  RECEIVED: { color: 'var(--color-chart-2)', active: 'var(--color-chart-2-active)' },
  CANCELLED: { color: 'var(--color-chart-4)', active: 'var(--color-chart-4-active)' },
};

export function PurchaseOrderStatusChartCard({
  statusBreakdown,
  currency = 'USD',
  className,
}: {
  statusBreakdown: ProcurementDashboardSummary['statusBreakdown'];
  currency?: string;
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(
    () =>
      (statusBreakdown || []).map((row) => {
        const meta = getPurchaseOrderStatusMeta(row.status);
        const palette = PO_STATUS_COLORS[row.status];
        return {
          ...row,
          label: meta.label,
          color: palette.color,
          activeColor: palette.active,
        };
      }),
    [statusBreakdown],
  );

  const totalCount = useMemo(
    () => data.reduce((sum, item) => sum + item.count, 0),
    [data],
  );
  const nonZeroSlices = useMemo(() => data.filter((d) => d.count > 0), [data]);
  const hasOrders = nonZeroSlices.length > 0;
  const pieData = useMemo(
    () =>
      hasOrders
        ? nonZeroSlices
        : [
            {
              status: 'EMPTY',
              label: 'No orders',
              count: 1,
              amount: 0,
              color: 'var(--color-background-secondary-default)',
              activeColor: 'var(--color-background-secondary-default)',
            },
          ],
    [hasOrders, nonZeroSlices],
  );

  const point = activeIndex !== null && data[activeIndex] ? data[activeIndex] : null;
  const displayCount = useCountUp(point ? point.count : totalCount);

  return (
    <section
      className={cx(
        'flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs select-none',
        className,
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-body-medium text-text-secondary">
            {point ? `${point.label} Orders` : 'Purchase Order Pipeline'}
          </p>
          <Chip
            variant="caption"
            color={point ? getPurchaseOrderStatusMeta(point.status).color : 'neutral'}
          >
            {point
              ? formatCurrency(point.amount, currency)
              : `${totalCount} total POs`}
          </Chip>
        </div>

        <p className="text-title-1-bold font-bold text-text-primary mt-1 tabular-nums font-mono">
          {displayCount.toLocaleString('en-US')} orders
        </p>
        <p className="text-caption-1-regular text-text-tertiary mt-0.5 truncate">
          {point
            ? `Commitment value across ${point.label.toLowerCase()} orders`
            : 'Real-time order lifecycle distribution across all statuses'}
        </p>
      </div>

      <div className="my-auto pt-4 mt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border-button-default">
        <div className="relative size-32 sm:size-36 shrink-0 flex items-center justify-center mx-auto sm:mx-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={pieData}
                dataKey="count"
                nameKey="label"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={hasOrders && nonZeroSlices.length > 1 ? 3 : 0}
                cornerRadius={6}
                stroke="none"
                onMouseLeave={() => setActiveIndex(null)}
              >
                {pieData.map((entry, idx) => {
                  const dataIdx = data.findIndex((d) => d.status === entry.status);
                  const isActive = activeIndex !== null && activeIndex === dataIdx;
                  return (
                    <Cell
                      key={entry.status || idx}
                      fill={isActive ? entry.activeColor : entry.color}
                      onMouseEnter={() => {
                        if (dataIdx >= 0) setActiveIndex(dataIdx);
                      }}
                      className="transition-colors duration-150 outline-none"
                    />
                  );
                })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-2">
            <span className="text-body-semibold font-bold text-text-primary tabular-nums font-mono">
              {point ? point.count : totalCount}
            </span>
            <span className="text-[10px] font-medium text-text-tertiary uppercase truncate max-w-[78px]">
              {point ? point.label : 'Orders'}
            </span>
          </div>
        </div>

        <div className="flex-1 w-full min-w-0 space-y-1.5">
          {data.map((row, idx) => {
            const isSelected = activeIndex === idx;
            return (
              <button
                key={row.status}
                type="button"
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={() => setActiveIndex(isSelected ? null : idx)}
                className={cx(
                  'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-start transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-background-secondary-default'
                    : 'hover:bg-background-secondary-default/60',
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="text-caption-1-medium text-text-primary truncate">
                    {row.label}
                  </span>
                </span>
                <span className="text-caption-1-medium font-mono text-text-secondary shrink-0 tabular-nums">
                  {row.count} · {formatCurrency(row.amount, currency)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ProcurementVolumeChartCard({
  statusBreakdown,
  currency = 'USD',
  className,
}: {
  statusBreakdown: ProcurementDashboardSummary['statusBreakdown'];
  currency?: string;
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(
    () =>
      (statusBreakdown || [])
        .filter((s) => s.status !== 'CANCELLED')
        .map((row) => ({
          label:
            row.status === 'PARTIALLY_RECEIVED'
              ? 'Partial'
              : getPurchaseOrderStatusMeta(row.status).label,
          amount: row.amount,
          count: row.count,
          fill: PO_STATUS_COLORS[row.status].active,
        })),
    [statusBreakdown],
  );

  const totalCommitment = useMemo(
    () =>
      data
        .filter((d) => d.label !== 'Draft')
        .reduce((sum, item) => sum + item.amount, 0),
    [data],
  );

  const point = activeIndex !== null && data[activeIndex] ? data[activeIndex] : null;
  const displayAmount = useCountUp(point ? point.amount : totalCommitment);

  return (
    <section
      className={cx(
        'flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs select-none',
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-body-medium text-text-secondary">
            {point
              ? `${point.label} Purchase Value`
              : 'Committed Purchasing Volume (Excl. Drafts)'}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-title-2-bold font-bold text-text-primary font-mono tabular-nums">
              {formatCurrency(displayAmount, currency)}
            </span>
            <Chip variant="caption" color="neutral" className="font-mono">
              {point ? `${point.count} PO(s)` : 'Non-accounting value'}
            </Chip>
          </div>
        </div>
      </div>

      <div className="h-[180px] w-full mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
            onMouseMove={(state) => {
              if (state && typeof state.activeTooltipIndex === 'number') {
                setActiveIndex(state.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
            />
            <Tooltip
              cursor={{
                fill: 'var(--color-background-secondary-default)',
                opacity: 0.45,
              }}
              content={() => null}
            />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={44}>
              {data.map((entry, idx) => (
                <Cell
                  key={entry.label}
                  fill={entry.fill}
                  opacity={activeIndex === null || activeIndex === idx ? 1 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
