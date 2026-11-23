"use client";

import { useId, useState, useMemo } from "react";
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Chip } from "@/components/base/badges/chip";
import { useCountUp } from "@/hooks/use-count-up";
import { cx } from "@/utils/cx";

export type CdnTimelinePoint = {
  date: string;
  bytes?: number;
  storageBytes?: number;
  requests?: number;
  count?: number;
  bandwidthEstimateBytes?: number;
  formattedStorage?: string;
};

const DEFAULT_TIMELINE: CdnTimelinePoint[] = [
  { date: "Nov 18", bytes: 12000000, count: 120 },
  { date: "Nov 19", bytes: 15400000, count: 180 },
  { date: "Nov 20", bytes: 18200000, count: 240 },
  { date: "Nov 21", bytes: 24500000, count: 390 },
  { date: "Nov 22", bytes: 29800000, count: 460 },
  { date: "Nov 23", bytes: 35200000, count: 580 },
  { date: "Nov 24", bytes: 42000000, count: 720 },
];

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function describeDelta(current: number, previous: number) {
  if (previous === 0) return { label: "New", color: "neutral" as const };
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change * 10) / 10;
  if (rounded === 0) return { label: "0%", color: "neutral" as const };
  return {
    label: `${rounded > 0 ? "+" : ""}${rounded}%`,
    color: rounded > 0 ? ("lime" as const) : ("rose" as const),
  };
}

function ActiveDot({ cx: x, cy: y }: { cx?: number; cy?: number }) {
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

export interface CdnActivityChartCardProps {
  timeline?: CdnTimelinePoint[];
  title?: string;
  className?: string;
}

export function CdnActivityChartCard({
  timeline = DEFAULT_TIMELINE,
  title = "Storage & Request Activity",
  className,
}: CdnActivityChartCardProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const storageGradientId = useId();
  const requestGradientId = useId();

  const data = useMemo(() => {
    const source = !timeline || timeline.length === 0 ? DEFAULT_TIMELINE : timeline;
    return source.map((p) => ({
      date: p.date,
      storageBytes: p.storageBytes ?? p.bytes ?? 0,
      requests: p.requests ?? p.count ?? 0,
      formattedStorage: p.formattedStorage,
    }));
  }, [timeline]);

  const totalStorage = useMemo(
    () => data[data.length - 1]?.storageBytes || 0,
    [data]
  );
  const prevStorage = useMemo(
    () => data[0]?.storageBytes || 0,
    [data]
  );

  const hovering = activeIndex !== null && activeIndex < data.length;
  const point = hovering ? data[activeIndex] : null;

  const headlineValue = point ? point.storageBytes : totalStorage;
  const comparison = point ? point.requests : prevStorage;
  const delta = describeDelta(headlineValue, prevStorage);
  const display = useCountUp(Math.round(headlineValue / (1024 * 1024)));

  const maxStorage = Math.max(...data.map((d) => d.storageBytes), 1024 * 1024);

  return (
    <section
      className={cx(
        "flex h-[360px] min-w-0 flex-1 flex-col gap-6 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs",
        className
      )}
    >
      {/* Header */}
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-body-medium text-text-secondary">
            {point ? `Date: ${point.date}` : title}
          </p>
          <div className="flex items-center gap-2">
            <p
              key={activeIndex ?? "total"}
              className="animate-number-fade text-title-1-bold whitespace-nowrap text-text-primary tabular-nums font-mono"
            >
              {point ? formatBytes(point.storageBytes) : `${display} MB`}
            </p>
            <Chip variant="bold" color={delta.color}>
              {delta.label}
            </Chip>
          </div>
          <p className="text-body-2-medium text-text-tertiary tabular-nums">
            {point
              ? `${point.requests.toLocaleString()} CDN requests on this date`
              : "Active throughput & edge volume"}
          </p>
        </div>

        <dl className="flex shrink-0 items-center gap-4 text-body-2-medium text-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-2-active" aria-hidden />
            <dt>Storage Volume</dt>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-6-active" aria-hidden />
            <dt>CDN Requests</dt>
          </div>
        </dl>
      </div>

      {/* Chart Canvas */}
      <div className="min-h-0 w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            onMouseMove={(state) => {
              const index = Number(state?.activeTooltipIndex);
              if (state?.isTooltipActive && Number.isFinite(index)) setActiveIndex(index);
            }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient id={storageGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id={requestGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-6)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-chart-6)" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <YAxis
              width={56}
              domain={[0, maxStorage * 1.15]}
              tickCount={4}
              tickFormatter={(val) => formatBytes(val)}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              interval="preserveStartEnd"
              tick={{ fontSize: 12, fill: "var(--color-text-tertiary)" }}
            />
            <Tooltip
              content={() => null}
              cursor={{
                stroke: "var(--color-chart-cursor)",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />

            <Area
              type="monotone"
              dataKey="storageBytes"
              stroke="none"
              fill={`url(#${storageGradientId})`}
              isAnimationActive
              animationDuration={450}
            />
            <Line
              type="monotone"
              dataKey="storageBytes"
              stroke="var(--color-chart-2-active)"
              strokeWidth={2.5}
              dot={false}
              activeDot={<ActiveDot />}
              isAnimationActive
              animationDuration={450}
            />
            <Line
              type="monotone"
              dataKey="requests"
              stroke="var(--color-chart-6-active)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive
              animationDuration={450}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
