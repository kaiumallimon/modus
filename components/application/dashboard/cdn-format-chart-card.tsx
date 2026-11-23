"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Chip } from "@/components/base/badges/chip";
import { useCountUp } from "@/hooks/use-count-up";
import { cx } from "@/utils/cx";

export type FormatItem = {
  category: string;
  count: number;
  percentage: number;
  color?: string;
};

const DEFAULT_FORMATS: FormatItem[] = [
  { category: "Images", count: 24, percentage: 65, color: "var(--color-chart-2)" },
  { category: "Documents", count: 8, percentage: 20, color: "var(--color-chart-6)" },
  { category: "Media", count: 3, percentage: 10, color: "var(--color-chart-5)" },
  { category: "Data", count: 2, percentage: 5, color: "var(--color-chart-8)" },
];

export interface CdnFormatChartCardProps {
  formats?: FormatItem[];
  title?: string;
  className?: string;
}

export function CdnFormatChartCard({
  formats = DEFAULT_FORMATS,
  title = "Format Breakdown",
  className,
}: CdnFormatChartCardProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    if (!formats || formats.length === 0) return DEFAULT_FORMATS;
    return formats.map((item, idx) => ({
      ...item,
      color:
        item.color ||
        (idx === 0
          ? "var(--color-chart-2)"
          : idx === 1
          ? "var(--color-chart-6)"
          : idx === 2
          ? "var(--color-chart-5)"
          : "var(--color-chart-8)"),
    }));
  }, [formats]);

  const totalFiles = useMemo(() => data.reduce((sum, f) => sum + f.count, 0), [data]);
  const hovering = activeIndex !== null && activeIndex < data.length;
  const point = hovering ? data[activeIndex] : null;

  const headlineValue = point ? point.count : totalFiles;
  const display = useCountUp(headlineValue);

  return (
    <section
      className={cx(
        "flex h-[360px] min-w-0 flex-1 flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs",
        className
      )}
    >
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-body-medium text-text-secondary">
            {point ? point.category : title}
          </p>
          <Chip variant="bold" color="lime">
            {point ? `${point.percentage}%` : `${totalFiles} total`}
          </Chip>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <p
            key={activeIndex ?? "total"}
            className="animate-number-fade text-title-1-bold whitespace-nowrap text-text-primary tabular-nums font-mono"
          >
            {display} {point ? "files" : "objects"}
          </p>
        </div>
        <p className="text-caption-1-regular text-text-tertiary mt-0.5">
          {point
            ? `${point.percentage}% of all stored assets in bucket`
            : "Distribution across asset file formats"}
        </p>
      </div>

      {/* Mini Bar Chart */}
      <div className="h-28 w-full my-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            onMouseMove={(state) => {
              const index = Number(state?.activeTooltipIndex);
              if (state?.isTooltipActive && Number.isFinite(index)) setActiveIndex(index);
            }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <XAxis
              dataKey="category"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
            />
            <YAxis hide domain={[0, "auto"]} />
            <Tooltip
              content={() => null}
              cursor={{
                fill: "var(--color-chart-track)",
                opacity: 0.15,
                radius: 4,
              }}
            />
            <Bar
              dataKey="count"
              radius={[6, 6, 0, 0]}
              fill="var(--color-chart-2)"
              isAnimationActive
              animationDuration={450}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Categories Detail List */}
      <div className="space-y-1.5 border-t border-border-button-default pt-3">
        {data.map((item, idx) => (
          <div
            key={idx}
            onMouseEnter={() => setActiveIndex(idx)}
            onMouseLeave={() => setActiveIndex(null)}
            className={cx(
              "flex items-center justify-between text-caption-1-medium py-1 px-1.5 rounded-lg transition-colors cursor-pointer",
              activeIndex === idx
                ? "bg-background-secondary-default text-text-primary font-semibold"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.category}</span>
            </span>
            <span className="font-mono text-text-primary tabular-nums shrink-0">
              {item.count} ({item.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
