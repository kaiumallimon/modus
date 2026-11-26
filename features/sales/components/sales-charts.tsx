'use client';

import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
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
import { cx } from '@/utils/cx';
import type {
  SalesDashboardOverview,
  SalesOrderStatus,
} from '../types/sales';
import {
  formatSalesCurrency,
  getSalesOrderStatusMeta,
} from '../utils/formatters';

const SALES_STATUS_COLORS: Record<
  SalesOrderStatus,
  { color: string; active: string }
> = {
  DRAFT: { color: 'var(--color-chart-6)', active: 'var(--color-chart-6-active)' },
  CONFIRMED: { color: 'var(--color-chart-5)', active: 'var(--color-chart-5-active)' },
  PARTIALLY_FULFILLED: {
    color: 'var(--color-chart-8)',
    active: 'var(--color-chart-8-active)',
  },
  FULFILLED: { color: 'var(--color-chart-2)', active: 'var(--color-chart-2-active)' },
  CANCELLED: { color: 'var(--color-chart-4)', active: 'var(--color-chart-4-active)' },
};

export function SalesOrderStatusChartCard({
  statusBreakdown,
  currency = 'USD',
  className,
}: {
  statusBreakdown: SalesDashboardOverview['statusBreakdown'];
  currency?: string;
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(
    () =>
      (statusBreakdown || []).map((row) => {
        const meta = getSalesOrderStatusMeta(row.status);
        const palette = SALES_STATUS_COLORS[row.status];
        return {
          ...row,
          label: meta.label,
          color: palette.color,
          activeColor: palette.active,
        };
      }),
    [statusBreakdown]
  );

  const totalCount = useMemo(
    () => data.reduce((sum, item) => sum + item.count, 0),
    [data]
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
              value: 0,
              color: 'var(--color-background-secondary-default)',
              activeColor: 'var(--color-background-secondary-default)',
            },
          ],
    [hasOrders, nonZeroSlices]
  );

  const point = activeIndex !== null && data[activeIndex] ? data[activeIndex] : null;
  const displayCount = useCountUp(point ? point.count : totalCount);

  return (
    <section
      className={cx(
        'flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs select-none',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-body-medium text-text-secondary">
            {point ? `${point.label} Orders` : 'Sales Orders by Status'}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-title-2-bold font-bold text-text-primary font-mono tabular-nums">
              {Math.round(displayCount)}
            </span>
            <Chip variant="caption" color="neutral" className="font-mono">
              {point
                ? formatSalesCurrency(point.value, currency)
                : `${nonZeroSlices.length} active stages`}
            </Chip>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-36 h-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="count"
                nameKey="label"
                innerRadius={44}
                outerRadius={66}
                paddingAngle={hasOrders ? 3 : 0}
                strokeWidth={0}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {pieData.map((entry, idx) => {
                  const originalIdx = data.findIndex((d) => d.status === entry.status);
                  const isHighlighted = activeIndex === originalIdx && originalIdx !== -1;
                  return (
                    <Cell
                      key={entry.status || idx}
                      fill={isHighlighted ? entry.activeColor : entry.color}
                      onMouseEnter={() => {
                        if (originalIdx !== -1) setActiveIndex(originalIdx);
                      }}
                    />
                  );
                })}
              </Pie>
              {hasOrders && (
                <Tooltip
                  formatter={(value: unknown, _name: unknown, props: any) => [
                    `${value} orders (${formatSalesCurrency(props?.payload?.value, currency)})`,
                    props?.payload?.label ?? 'Status',
                  ]}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-2">
            <span className="text-body-2-semibold text-text-primary font-mono tabular-nums">
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
                    : 'hover:bg-background-secondary-default/60'
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
                  {row.count} · {formatSalesCurrency(row.value, currency)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function SalesRevenueTrendCard({
  dailyTrend,
  totalFulfilledRevenue,
  fulfilledUnits,
  currency = 'USD',
  className,
}: {
  dailyTrend: SalesDashboardOverview['dailyTrend'];
  totalFulfilledRevenue: number;
  fulfilledUnits: number;
  currency?: string;
  className?: string;
}) {
  const animatedRevenue = useCountUp(totalFulfilledRevenue);

  const chartData = useMemo(
    () =>
      (dailyTrend || []).map((item) => ({
        ...item,
        shortDate: item.date.slice(5),
      })),
    [dailyTrend]
  );

  return (
    <section
      className={cx(
        'flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs select-none',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-body-medium text-text-secondary">
            Fulfilled Sales Revenue Trend
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-title-2-bold font-bold text-text-primary font-mono tabular-nums">
              {formatSalesCurrency(animatedRevenue, currency)}
            </span>
            <Chip variant="caption" color="lime" className="font-mono">
              {fulfilledUnits} units shipped
            </Chip>
          </div>
        </div>
      </div>

      <div className="mt-4 h-44 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-separator-border text-caption-1-regular text-text-tertiary">
            No fulfilled shipments recorded in this date window yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="salesRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-chart-2-active)"
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-chart-2-active)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="shortDate"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={54}
                tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                tickFormatter={(v) =>
                  typeof v === 'number' && v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                }
              />
              <Tooltip
                formatter={(value: unknown, name: unknown) => [
                  name === 'revenue'
                    ? formatSalesCurrency(Number(value), currency)
                    : `${value} units`,
                  name === 'revenue' ? 'Fulfilled Sales' : 'Units Shipped',
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-chart-2-active)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#salesRevenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
