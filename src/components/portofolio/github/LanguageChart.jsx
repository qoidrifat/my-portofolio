import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Code2 } from 'lucide-react';
import { SkeletonLine } from './Skeleton';
import { computeLanguageData } from './utils';

export default function LanguageChart({ repos, isLoading, isInView, shouldReduceMotion }) {
  const langData = useMemo(() => computeLanguageData(repos), [repos]);

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        <SkeletonLine width="140px" height="18px" className="mb-4" />
        <SkeletonLine width="100%" height="140px" />
      </div>
    );
  }

  if (!langData || langData.length === 0) return null;

  const total = langData.reduce((s, l) => s + l.count, 0);
  const top5 = langData.slice(0, 5);
  const others = langData.slice(5);
  const othersCount = others.reduce((s, l) => s + l.count, 0);

  // Donut chart params
  const cx = 60;
  const cy = 60;
  const r = 44;
  const strokeWidth = 18;
  const normalizedR = r - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedR;

  let cumulativePercent = 0;
  const segments = top5.map(lang => {
    const percent = lang.count / total;
    const offset = cumulativePercent * circumference;
    const length = percent * circumference;
    cumulativePercent += percent;
    return { ...lang, offset, length, percent };
  });

  if (othersCount > 0) {
    const percent = othersCount / total;
    segments.push({
      name: 'Others',
      count: othersCount,
      percentage: Math.round(percent * 100),
      color: '#52525b',
      offset: cumulativePercent * circumference,
      length: percent * circumference,
      percent,
    });
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="p-5 md:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Code2 className="w-4 h-4 text-violet-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Languages</h3>
          <p className="text-[10px] text-zinc-500 font-medium">{total} repos total</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        {/* Donut */}
        <div className="shrink-0">
          <svg width={120} height={120} viewBox="0 0 120 120">
            <circle
              cx={cx}
              cy={cy}
              r={normalizedR}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={strokeWidth}
            />
            {segments.map((seg, i) => {
              const rotation = -90;
              return (
                <circle
                  key={seg.name}
                  cx={cx}
                  cy={cy}
                  r={normalizedR}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${seg.length} ${circumference - seg.length}`}
                  strokeDashoffset={-seg.offset}
                  transform={`rotate(${rotation} ${cx} ${cy})`}
                  className="transition-opacity duration-200 hover:opacity-80"
                  style={{ opacity: 0.9 - i * 0.05 }}
                />
              );
            })}
            {/* Center text */}
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              className="fill-white text-lg font-black"
            >
              {langData[0]?.percentage}%
            </text>
            <text
              x={cx}
              y={cy + 12}
              textAnchor="middle"
              className="fill-zinc-500 text-[8px] font-medium uppercase"
            >
              {langData[0]?.name}
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-1.5">
          {top5.map(lang => (
            <div key={lang.name} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: lang.color }}
              />
              <span className="text-xs text-zinc-400 flex-1 truncate">{lang.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 md:w-24 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${lang.percentage}%`,
                      backgroundColor: lang.color,
                    }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-zinc-500 tabular-nums w-8 text-right shrink-0">
                  {lang.percentage}%
                </span>
              </div>
            </div>
          ))}
          {othersCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-zinc-600" />
              <span className="text-xs text-zinc-500 flex-1">Others</span>
              <div className="flex items-center gap-2">
                <div className="w-16 md:w-24 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-zinc-600"
                    style={{ width: `${Math.round((othersCount / total) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-zinc-500 tabular-nums w-8 text-right">
                  {Math.round((othersCount / total) * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
