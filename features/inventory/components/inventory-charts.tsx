'use client';

import React, { useId, useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Chip } from '@/components/base/badges/chip';
import { Meter, type MeterTone } from '@/components/base/meter/meter';
import { useCountUp } from '@/hooks/use-count-up';
import { cx } from '@/utils/cx';
import type {
  InventoryDashboardSummary,
  StockMovement,
  StockStatus,
} from '../types/inventory';

type InventoryWarehouseSummaryRow = InventoryDashboardSummary['warehouseSummary'][number];

const DONUT_COLORS = [
  { color: 'var(--color-chart-2)', active: 'var(--color-chart-2-active)' },
  { color: 'var(--color-chart-6)', active: 'var(--color-chart-6-active)' },
  { color: 'var(--color-chart-5)', active: 'var(--color-chart-5-active)' },
  { color: 'var(--color-chart-8)', active: 'var(--color-chart-8-active)' },
  { color: 'var(--color-chart-4)', active: 'var(--color-chart-4-active)' },
];

/* -------------------------------------------------------------------------- */
/* 1. Stock Level Meter (BoardUI Meter with semantic stock tones)             */
/* -------------------------------------------------------------------------- */

export interface StockLevelMeterProps {
  quantity: number;
  minThreshold?: number;
  status?: StockStatus;
  symbol?: string;
  maxReference?: number;
  label?: string;
  showValueLabel?: boolean;
  className?: string;
}

export function StockLevelMeter({
  quantity,
  minThreshold = 0,
  status,
  symbol,
  maxReference,
  label,
  showValueLabel = false,
  className,
}: StockLevelMeterProps) {
  const computedMax = Math.max(
    maxReference || 0,
    minThreshold > 0 ? minThreshold * 2.5 : 0,
    quantity,
    10,
  );

  let tone: MeterTone = 'success';
  if (status === 'OUT_OF_STOCK' || quantity <= 0) {
    tone = 'error';
  } else if (status === 'LOW_STOCK' || (minThreshold > 0 && quantity <= minThreshold)) {
    tone = 'warning';
  }

  return (
    <Meter
      aria-label={label || 'Stock threshold level'}
      label={label}
      showValueLabel={showValueLabel}
      value={Math.max(0, quantity)}
      minValue={0}
      maxValue={computedMax}
      valueLabel={symbol ? `${quantity} ${symbol}` : String(quantity)}
      tone={tone}
      size="sm"
      className={className}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Stock Flow Activity Chart Card (Inbound vs Outbound timeline)           */
/* -------------------------------------------------------------------------- */

interface FlowPoint {
  date: string;
  inbound: number;
  outbound: number;
  events: number;
}

function FlowActiveDot({ cx: x, cy: y }: { cx?: number; cy?: number }) {
  if (x === undefined || y === undefined) return null;
  return (
    <g>
      <circle cx={x} cy={y} r={7} fill="var(--color-chart-2-active)" opacity={0.25} />
      <circle
        cx={x}
        cy={y}
        r={4}
        fill="var(--color-chart-2-active)"
        stroke="var(--color-background-primary-default)"
        strokeWidth={2}
      />
    </g>
  );
}

export function StockFlowChartCard({
  movements,
  className,
}: {
  movements: StockMovement[];
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const inboundGradId = useId();

  const data = useMemo<FlowPoint[]>(() => {
    const byDate = new Map<string, FlowPoint>();

    // Chronological order for timeline visualization
    const sorted = [...(movements || [])].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    for (const mov of sorted) {
      const dt = new Date(mov.createdAt);
      const label = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const existing = byDate.get(label) || {
        date: label,
        inbound: 0,
        outbound: 0,
        events: 0,
      };
      if (mov.quantityChange >= 0) {
        existing.inbound += mov.quantityChange;
      } else {
        existing.outbound += Math.abs(mov.quantityChange);
      }
      existing.events += 1;
      byDate.set(label, existing);
    }

    const entries = Array.from(byDate.values());
    if (entries.length === 1) {
      // Pad single-day ledger with prior zero baseline so area curve draws smoothly
      return [
        { date: 'Start', inbound: 0, outbound: 0, events: 0 },
        entries[0],
      ];
    }
    return entries;
  }, [movements]);

  const totals = useMemo(() => {
    return data.reduce(
      (acc, pt) => {
        acc.inbound += pt.inbound;
        acc.outbound += pt.outbound;
        acc.events += pt.events;
        return acc;
      },
      { inbound: 0, outbound: 0, events: 0 },
    );
  }, [data]);

  const hovering = activeIndex !== null && activeIndex >= 0 && activeIndex < data.length;
  const hovered = hovering ? data[activeIndex] : null;
  const headlineInbound = hovered ? hovered.inbound : totals.inbound;
  const headlineOutbound = hovered ? hovered.outbound : totals.outbound;
  const netDelta = headlineInbound - headlineOutbound;
  const displayInbound = useCountUp(headlineInbound);

  const yMax = Math.max(
    10,
    ...data.map((d) => Math.max(d.inbound, d.outbound)),
  );

  return (
    <section
      className={cx(
        'flex min-h-[340px] h-full min-w-0 flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs select-none',
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-medium text-text-secondary">
            {hovered ? `Stock Flow · ${hovered.date}` : 'Stock Flow Activity'}
          </p>
          <div className="flex items-center gap-2.5 mt-1 flex-wrap">
            <p
              key={activeIndex ?? 'total'}
              className="animate-number-fade text-title-1-medium font-bold text-text-primary tabular-nums font-mono"
            >
              +{displayInbound.toLocaleString('en-US')} in
            </p>
            <Chip
              variant="bold"
              color={netDelta > 0 ? 'lime' : netDelta < 0 ? 'rose' : 'neutral'}
              className="font-mono"
            >
              Net {netDelta >= 0 ? `+${netDelta.toLocaleString('en-US')}` : netDelta.toLocaleString('en-US')}
            </Chip>
          </div>
          <p className="text-caption-1-regular text-text-tertiary mt-0.5 font-mono tabular-nums">
            {hovered
              ? `${hovered.outbound.toLocaleString('en-US')} units out · ${hovered.events} movement(s)`
              : `${totals.outbound.toLocaleString('en-US')} total units out across ${totals.events} recorded movement(s)`}
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 pt-0.5">
          <span className="inline-flex items-center gap-1.5 text-caption-1-medium text-text-secondary">
            <span className="size-2 rounded-full bg-[var(--color-chart-2-active)]" />
            Inbound
          </span>
          <span className="inline-flex items-center gap-1.5 text-caption-1-medium text-text-secondary">
            <span className="size-2 rounded-full bg-[var(--color-chart-8)]" />
            Outbound
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-separator-border my-3 p-8 text-center">
          <p className="text-body-2-regular text-text-tertiary">
            Record stock adjustments or confirm transfers to visualize stock movement trends.
          </p>
        </div>
      ) : (
        <div className="h-[220px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              onMouseMove={(state) => {
                if (state && typeof state.activeTooltipIndex === 'number') {
                  setActiveIndex(state.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <defs>
                <linearGradient id={inboundGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2-active)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-chart-2-active)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                domain={[0, Math.ceil(yMax * 1.15)]}
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ stroke: 'var(--color-border-button-default)', strokeDasharray: '4 4' }}
                content={() => null}
              />
              <Area
                type="monotone"
                dataKey="inbound"
                stroke="var(--color-chart-2-active)"
                strokeWidth={2.25}
                fill={`url(#${inboundGradId})`}
                activeDot={<FlowActiveDot />}
              />
              <Line
                type="monotone"
                dataKey="outbound"
                stroke="var(--color-chart-8)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Warehouse Stock Share Donut Card                                        */
/* -------------------------------------------------------------------------- */

export function WarehouseDistributionChartCard({
  warehouses,
  className,
}: {
  warehouses: InventoryWarehouseSummaryRow[];
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalUnits = useMemo(
    () => (warehouses || []).reduce((sum, w) => sum + (w.totalUnits || 0), 0),
    [warehouses],
  );

  const data = useMemo(() => {
    return (warehouses || []).map((wh, idx) => {
      const palette = DONUT_COLORS[idx % DONUT_COLORS.length];
      const pct = totalUnits > 0 ? Math.round((wh.totalUnits / totalUnits) * 100) : 0;
      return {
        ...wh,
        percentage: pct,
        color: palette.color,
        activeColor: palette.active,
      };
    });
  }, [warehouses, totalUnits]);

  const hovering = activeIndex !== null && activeIndex >= 0 && activeIndex < data.length;
  const point = hovering ? data[activeIndex] : null;
  const displayValue = useCountUp(point ? point.totalUnits : totalUnits);

  const activeSlices = useMemo(() => data.filter((d) => d.totalUnits > 0), [data]);
  const hasStock = totalUnits > 0 && activeSlices.length > 0;
  const pieData = useMemo(
    () =>
      hasStock
        ? activeSlices
        : [
            {
              warehouseId: 'empty',
              name: 'No stock',
              code: 'NONE',
              isActive: true,
              totalUnits: 1,
              skuCount: 0,
              percentage: 100,
              color: 'var(--color-chart-track)',
              activeColor: 'var(--color-chart-track)',
            },
          ],
    [activeSlices, hasStock],
  );

  return (
    <section
      className={cx(
        'flex min-h-[340px] h-full min-w-0 flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs select-none',
        className,
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-body-medium text-text-secondary truncate">
            {point ? `${point.name} (${point.code})` : 'Warehouse Stock Share'}
          </p>
          <Chip variant="bold" color="lime" className="shrink-0 font-mono">
            {point ? `${point.percentage}%` : `${warehouses.length} facilities`}
          </Chip>
        </div>

        <p
          key={activeIndex ?? 'all'}
          className="animate-number-fade mt-1 text-title-1-medium font-bold text-text-primary tabular-nums font-mono"
        >
          {displayValue.toLocaleString('en-US')} units
        </p>

        <p className="text-caption-1-regular text-text-tertiary mt-0.5 truncate">
          {point
            ? `${point.skuCount} active SKU(s) held in ${point.code}`
            : 'Real-time physical unit allocation across facilities'}
        </p>
      </div>

      <div className="my-auto pt-4 mt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border-button-default">
        <div className="relative size-32 sm:size-36 shrink-0 flex items-center justify-center mx-auto sm:mx-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={pieData}
                dataKey="totalUnits"
                nameKey="name"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={hasStock && activeSlices.length > 1 ? 3 : 0}
                cornerRadius={6}
                stroke="none"
                onMouseLeave={() => setActiveIndex(null)}
              >
                {pieData.map((entry, idx) => {
                  const dataIdx = data.findIndex((d) => d.warehouseId === entry.warehouseId);
                  const isActive = activeIndex !== null && activeIndex === dataIdx;
                  return (
                    <Cell
                      key={entry.warehouseId || idx}
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
              {point ? `${point.percentage}%` : `${warehouses.length}`}
            </span>
            <span className="text-[10px] font-medium text-text-tertiary uppercase truncate max-w-[78px]">
              {point ? point.code : 'Warehouses'}
            </span>
          </div>
        </div>

        <div className="flex-1 w-full min-w-0 space-y-1.5 max-h-[155px] overflow-y-auto pr-1">
          {data.length === 0 ? (
            <p className="text-caption-1-regular text-text-tertiary text-center sm:text-left">
              No active warehouses configured yet.
            </p>
          ) : (
            data.map((wh, idx) => {
              const isSelected = activeIndex === idx;
              return (
                <button
                  key={wh.warehouseId}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={() => setActiveIndex(isSelected ? null : idx)}
                  className={cx(
                    'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-background-secondary-default'
                      : 'hover:bg-background-secondary-default/60',
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: wh.color }}
                    />
                    <span className="text-caption-1-medium text-text-primary truncate">
                      {wh.name}
                    </span>
                  </span>
                  <span className="text-caption-1-medium font-mono text-text-secondary shrink-0 tabular-nums">
                    {wh.totalUnits.toLocaleString('en-US')} ({wh.percentage}%)
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Movement Type Breakdown Bar Chart Card                                  */
/* -------------------------------------------------------------------------- */

export function MovementBreakdownChartCard({
  movements,
  className,
}: {
  movements: StockMovement[];
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    const defs = [
      { key: 'OPENING_STOCK', label: 'Opening', fill: 'var(--color-chart-6-active)' },
      { key: 'ADJUSTMENT_INCREASE', label: 'Adj (+)', fill: 'var(--color-chart-2-active)' },
      { key: 'ADJUSTMENT_DECREASE', label: 'Adj (-)', fill: 'var(--color-chart-8-active)' },
      { key: 'TRANSFER_IN', label: 'Trf In', fill: 'var(--color-chart-5-active)' },
      { key: 'TRANSFER_OUT', label: 'Trf Out', fill: 'var(--color-chart-4-active)' },
    ];

    const counts = new Map<string, { units: number; events: number }>();
    for (const m of movements || []) {
      const prev = counts.get(m.movementType) || { units: 0, events: 0 };
      prev.units += Math.abs(m.quantityChange);
      prev.events += 1;
      counts.set(m.movementType, prev);
    }

    return defs.map((d) => {
      const c = counts.get(d.key) || { units: 0, events: 0 };
      return {
        label: d.label,
        units: c.units,
        events: c.events,
        fill: d.fill,
      };
    });
  }, [movements]);

  const totalVolume = useMemo(
    () => data.reduce((sum, d) => sum + d.units, 0),
    [data],
  );
  const point = activeIndex !== null && data[activeIndex] ? data[activeIndex] : null;
  const displayUnits = useCountUp(point ? point.units : totalVolume);

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
            {point ? `${point.label} Volume` : 'Movement Volume by Operation'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-title-2-bold font-bold text-text-primary font-mono tabular-nums">
              {displayUnits.toLocaleString('en-US')} units
            </span>
            <Chip variant="caption" color="neutral" className="font-mono">
              {point ? `${point.events} events` : `${movements.length} page rows`}
            </Chip>
          </div>
        </div>
      </div>

      <div className="h-[150px] w-full mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
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
            <Tooltip cursor={{ fill: 'var(--color-background-secondary-default)', opacity: 0.45 }} content={() => null} />
            <Bar dataKey="units" radius={[6, 6, 0, 0]} maxBarSize={38}>
              {data.map((entry, idx) => (
                <Cell key={entry.label} fill={entry.fill} opacity={activeIndex === null || activeIndex === idx ? 1 : 0.4} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
