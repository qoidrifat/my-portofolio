import { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { SkeletonLine } from './Skeleton';
import {
  HEATMAP_CELL, HEATMAP_GAP, HEATMAP_RADIUS, HEATMAP_LEVELS,
  generateContributionData, getHeatmapLevel, fmt, formatDate, pluralize,
} from './utils';

export default function ContributionHeatmap({ repos, eventsCount, isLoading, isInView, shouldReduceMotion }) {
  const heatmapData = useMemo(() => {
    if (!repos || repos.length === 0) return null;
    return generateContributionData(repos, eventsCount);
  }, [repos, eventsCount]);

  const [tooltip, setTooltip] = useState(null);
  const tooltipRef = useRef(null);

  const monthLabels = useMemo(() => {
    const labels = [];
    const today = new Date();
    for (let m = 11; m >= 0; m--) {
      const d = new Date(today.getFullYear(), today.getMonth() - m, 1);
      labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
    }
    return labels;
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        <SkeletonLine width="140px" height="18px" className="mb-4" />
        <SkeletonLine width="100%" height="120px" />
      </div>
    );
  }

  if (!heatmapData) return null;

  const { weeks, totalContributions } = heatmapData;
  const cellStep = HEATMAP_CELL + HEATMAP_GAP;
  const svgWidth = weeks.length * cellStep + 40;
  const svgHeight = 7 * cellStep + 30;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="p-5 md:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Contributions</h3>
            <p className="text-[10px] text-zinc-500 font-medium">
              {fmt(totalContributions)} contributions in the last year
            </p>
          </div>
        </div>
      </div>

      {/* Heatmap SVG */}
      <div className="overflow-x-auto -mx-2 px-2 pb-2">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="min-w-[600px]"
          aria-label="Contribution heatmap"
          role="img"
        >
          {/* Month labels */}
          {monthLabels.map((label, i) => {
            const x = 14 + i * (cellStep * 4.4);
            return (
              <text
                key={label}
                x={x}
                y={12}
                className="fill-zinc-600 text-[9px] font-medium"
              >
                {label}
              </text>
            );
          })}

          {/* Day labels */}
          {['Sun', 'Mon', '', 'Wed', '', 'Fri', ''].map((day, i) => (
            <text
              key={day || i}
              x={2}
              y={30 + i * cellStep + cellStep / 2 + 3}
              className="fill-zinc-600 text-[8px] font-medium"
              textAnchor="end"
            >
              {day}
            </text>
          ))}

          {/* Cells */}
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              const level = getHeatmapLevel(day.count);
              const x = 14 + wi * cellStep;
              const y = 22 + di * cellStep;
              return (
                <rect
                  key={`${wi}-${di}`}
                  x={x}
                  y={y}
                  width={HEATMAP_CELL}
                  height={HEATMAP_CELL}
                  rx={HEATMAP_RADIUS}
                  ry={HEATMAP_RADIUS}
                  fill={level.fill}
                  className="transition-colors duration-200 hover:brightness-125 cursor-pointer"
                  aria-label={`${day.count} contributions on ${formatDate(day.date)}`}
                  tabIndex={-1}
                  onMouseEnter={(e) => {
                    const rect = e.target.getBoundingClientRect();
                    setTooltip({
                      x: rect.left + rect.width / 2,
                      y: rect.top - 8,
                      count: day.count,
                      date: day.date,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          )}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            ref={tooltipRef}
            className="fixed z-50 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl pointer-events-none transition-opacity duration-150"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <p className="text-white text-xs font-semibold whitespace-nowrap">
              {pluralize(tooltip.count, 'contribution')} on {formatDate(tooltip.date)}
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 justify-end">
          <span className="text-[9px] text-zinc-600 font-medium mr-1">Less</span>
          {HEATMAP_LEVELS.map((level, i) => (
            <svg key={i} width={12} height={12} className="rounded-sm">
              <rect width={12} height={12} rx={2} fill={level.fill} />
            </svg>
          ))}
          <span className="text-[9px] text-zinc-600 font-medium ml-0.5">More</span>
        </div>
      </div>
    </motion.div>
  );
}
