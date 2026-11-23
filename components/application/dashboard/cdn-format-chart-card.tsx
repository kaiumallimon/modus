"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Chip } from "@/components/base/badges/chip";
import { useCountUp } from "@/hooks/use-count-up";
import { cx } from "@/utils/cx";

export type FormatItem = {
  category: string;
  count: number;
  percentage: number;
  color?: string;
  activeColor?: string;
};

const DEFAULT_FORMATS: FormatItem[] = [
  { category: "Images", count: 24, percentage: 65, color: "var(--color-chart-2)", activeColor: "var(--color-chart-2-active)" },
  { category: "Documents", count: 8, percentage: 20, color: "var(--color-chart-6)", activeColor: "var(--color-chart-6-active)" },
  { category: "Media", count: 3, percentage: 10, color: "var(--color-chart-5)", activeColor: "var(--color-chart-5-active)" },
  { category: "Data", count: 2, percentage: 5, color: "var(--color-chart-8)", activeColor: "var(--color-chart-8-active)" },
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
    return formats.map((item, idx) => {
      const defaultColors = [
        { color: "var(--color-chart-2)", active: "var(--color-chart-2-active)" },
        { color: "var(--color-chart-6)", active: "var(--color-chart-6-active)" },
        { color: "var(--color-chart-5)", active: "var(--color-chart-5-active)" },
        { color: "var(--color-chart-8)", active: "var(--color-chart-8-active)" },
        { color: "var(--color-chart-4)", active: "var(--color-chart-4-active)" },
      ];
      const fallback = defaultColors[idx % defaultColors.length];
      return {
        ...item,
        color: item.color || fallback.color,
        activeColor: item.activeColor || fallback.active,
      };
    });
  }, [formats]);

  const totalFiles = useMemo(() => data.reduce((sum, f) => sum + f.count, 0), [data]);
  const hovering = activeIndex !== null && activeIndex >= 0 && activeIndex < data.length;
  const point = hovering ? data[activeIndex] : null;

  const headlineValue = point ? point.count : totalFiles;
  const display = useCountUp(headlineValue);

  // Pie chart data: if all items are 0, provide placeholder so ring renders
  const hasData = totalFiles > 0;
  const pieData = useMemo(() => {
    if (!hasData) {
      return [{ category: "Empty", count: 1, percentage: 100, color: "var(--color-chart-track)" }];
    }
    return data;
  }, [data, hasData]);

  const activeSlicesCount = data.filter((d) => d.count > 0).length;

  return (
    <section
      className={cx(
        "flex h-[360px] min-w-0 flex-1 flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs select-none",
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
            {display} {point ? (point.count === 1 ? "file" : "files") : (totalFiles === 1 ? "object" : "objects")}
          </p>
        </div>
        <p className="text-caption-1-regular text-text-tertiary mt-0.5 truncate">
          {point
            ? `${point.percentage}% of all stored assets in bucket`
            : "Distribution across asset file formats"}
        </p>
      </div>

      {/* Donut Pie Chart Container with centered readout */}
      <div className="relative my-1 flex h-36 w-full items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={pieData}
              dataKey="count"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={58}
              paddingAngle={hasData && activeSlicesCount > 1 ? 4 : 0}
              cornerRadius={hasData && activeSlicesCount > 1 ? 3 : 0}
              stroke="none"
              isAnimationActive
              animationDuration={500}
              onMouseEnter={(_, index) => {
                if (hasData) setActiveIndex(index);
              }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {pieData.map((entry, index) => {
                const isHovered = activeIndex === index;
                const fillColor = isHovered && entry.activeColor ? entry.activeColor : entry.color;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={fillColor}
                    className="cursor-pointer transition-all duration-200 outline-none"
                    opacity={hovering && !isHovered ? 0.35 : 1}
                    stroke={isHovered ? "var(--color-background-primary-default)" : "none"}
                    strokeWidth={isHovered ? 2 : 0}
                  />
                );
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Floating Center Stat */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-body-1-bold font-mono text-text-primary tracking-tight">
            {point ? `${point.percentage}%` : totalFiles}
          </span>
          <span className="text-[10px] uppercase font-semibold text-text-tertiary tracking-wider truncate max-w-[70px]">
            {point ? point.category : "Total"}
          </span>
        </div>
      </div>

      {/* Categories Detail Rows */}
      <div className="space-y-1 border-t border-border-button-default pt-2.5">
        {data.map((item, idx) => {
          const isSelected = activeIndex === idx;
          return (
            <div
              key={idx}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
              className={cx(
                "flex items-center justify-between text-caption-1-medium py-1 px-2 rounded-lg transition-colors cursor-pointer",
                isSelected
                  ? "bg-background-secondary-default text-text-primary font-semibold shadow-2xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default/50"
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className={cx(
                    "size-2 rounded-full shrink-0 transition-transform duration-200",
                    isSelected && "scale-125"
                  )}
                  style={{ backgroundColor: isSelected && item.activeColor ? item.activeColor : item.color }}
                />
                <span className="truncate">{item.category}</span>
              </span>
              <span className="font-mono text-text-tertiary tabular-nums shrink-0 text-caption-2-medium">
                {item.count} <span className="opacity-60">({item.percentage}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
