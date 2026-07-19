import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Activity, FileText, Zap, BarChart3, Gauge, Box, Code2, AlertTriangle } from 'lucide-react';
import metrics from '@/data/performance-metrics.json';

// ── Helpers ─────────────────────────────────────────────────────────────────
function getScoreColor(score) {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 80) return 'text-blue-400';
  if (score >= 70) return 'text-amber-400';
  return 'text-red-400';
}

// ── Fade section wrapper ────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-blue-500/20 hover:bg-white/[0.04] transition-all duration-300">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-400" />
        </div>
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-black text-white mb-0.5">{value}</div>
      {sub && <div className="text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
}

// ── Score gauge ─────────────────────────────────────────────────────────────
function ScoreGauge({ label, score, delay }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <div ref={ref} className="text-center">
      <div className="relative w-24 h-24 mx-auto mb-3">
        {/* Background circle */}
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="42" fill="none"
            stroke="currentColor" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
            animate={isInView ? { strokeDashoffset: 2 * Math.PI * 42 * (1 - score / 100) } : {}}
            transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }}
            className={getScoreColor(score)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-black ${getScoreColor(score)}`}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ── Bundle bar ──────────────────────────────────────────────────────────────
function BundleBar({ bundle, maxSize, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const pct = (bundle.size / maxSize) * 100;
  return (
    <div ref={ref} className="flex items-center gap-3">
      <span className="w-28 text-[10px] font-medium text-zinc-400 truncate text-right shrink-0 leading-tight" title={bundle.name}>
        {bundle.name}
      </span>
      <div className="flex-1 h-5 rounded-lg bg-white/[0.04] overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={isInView ? { width: `${pct}%` } : {}}
          transition={{ duration: 0.8, delay: 0.1 + index * 0.05, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-lg ${
            bundle.size > 100000 ? 'bg-amber-500' : bundle.size > 50000 ? 'bg-blue-500' : 'bg-emerald-500'
          }`}
          style={{ opacity: 0.7 }}
        />
      </div>
      <span className="w-16 text-[10px] font-semibold text-zinc-300 text-right shrink-0">{bundle.sizeLabel}</span>
    </div>
  );
}

// ── Section ─────────────────────────────────────────────────────────────────
export default function PerformanceSection() {
  const sectionRef = useRef(null);
  const isSectionInView = useInView(sectionRef, { once: true, margin: '-100px' });
  const { summary, scores, bundles } = metrics;

  // Build a simple page load breakdown
  const loadBreakdown = [
    { label: 'JavaScript', size: summary.totalJsSize, color: 'bg-blue-500' },
    { label: 'CSS',        size: summary.totalCssSize, color: 'bg-emerald-500' },
  ];

  const maxBundleSize = Math.max(...bundles.map(b => b.size), 1);

  return (
    <section
      className="py-24 md:py-32 relative overflow-hidden scroll-mt-20"
      ref={sectionRef}
    >
      {/* Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.04),transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* ── Header ── */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 inline-flex items-center gap-2"
          >
            <Activity className="w-3.5 h-3.5" />
            Performance
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white mb-6"
          >
            Performance <span className="text-zinc-500">Dashboard</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-zinc-400 max-w-2xl mx-auto text-lg"
          >
            Build-time metrics and real-world performance indicators for this portfolio.
          </motion.p>
        </div>

        {/* ── Project Stats ── */}
        <FadeIn delay={0.25}>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-blue-400" />
            Project Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            <StatCard icon={FileText} label="Source Files" value={summary.totalSourceFiles} sub="JSX, JS & CSS" />
            <StatCard icon={Code2} label="Lines of Code" value={summary.totalLinesOfCode.toLocaleString()} sub="Across all components" />
            <StatCard icon={Box} label="JSX Components" value={summary.jsxComponents} sub="React components" />
            <StatCard icon={Zap} label="Build Time" value={metrics.buildTime} sub="Vite production build" />
          </div>
        </FadeIn>

        {/* ── Lighthouse Scores ── */}
        <FadeIn delay={0.35}>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-400" />
            Lighthouse Audit
          </h3>
          <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/[0.06] mb-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <ScoreGauge label="Performance" score={scores.performance} delay={0.1} />
              <ScoreGauge label="Accessibility" score={scores.accessibility} delay={0.2} />
              <ScoreGauge label="Best Practices" score={scores.bestPractices} delay={0.3} />
              <ScoreGauge label="SEO" score={scores.seo} delay={0.4} />
            </div>
          </div>
        </FadeIn>

        {/* ── Bundle Breakdown ── */}
        <FadeIn delay={0.45}>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            Bundle Breakdown
          </h3>
          <div className="p-6 md:p-8 rounded-[2rem] bg-white/[0.02] border border-white/[0.06] mb-16">
            {/* Size summary */}
            <div className="flex flex-wrap items-center gap-6 mb-8 pb-6 border-b border-white/[0.06]">
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Total JS</span>
                <span className="text-xl font-black text-white">{summary.totalJsSizeLabel}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Total CSS</span>
                <span className="text-xl font-black text-white">{summary.totalCssSizeLabel}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Page Total</span>
                <span className="text-xl font-black text-white">{summary.totalPageSizeLabel}</span>
              </div>
              <div className="flex-1">
                {/* Visual breakdown bar */}
                <div className="h-4 rounded-full bg-white/[0.04] overflow-hidden flex">
                  {loadBreakdown.map(item => (
                    <div
                      key={item.label}
                      className={`${item.color} h-full`}
                      style={{ width: `${(item.size / summary.totalPageSize) * 100}%`, opacity: 0.7 }}
                      title={`${item.label}: ${(item.size / 1024).toFixed(1)} KB`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-2">
                  {loadBreakdown.map(item => (
                    <span key={item.label} className="flex items-center gap-1.5 text-[9px] font-medium text-zinc-500">
                      <span className={`w-2 h-2 rounded-full ${item.color}`} style={{ opacity: 0.7 }} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bundle bars */}
            <div className="space-y-2">
              {bundles.map((bundle, i) => (
                <BundleBar key={bundle.name} bundle={bundle} maxSize={maxBundleSize} index={i} />
              ))}
            </div>
          </div>
        </FadeIn>

        {/* ── Footer note ── */}
        <FadeIn delay={0.6}>
          <div className="flex items-start gap-3 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 max-w-2xl mx-auto">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs text-zinc-400 leading-relaxed">
              <span className="font-bold text-zinc-300">Build-time metrics.</span> Bundle sizes are generated during each build.
              Lighthouse scores are estimated based on the current bundle structure. Run a real Lighthouse audit for accurate performance data.
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
