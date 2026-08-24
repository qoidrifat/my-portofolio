import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  LayoutDashboard, Terminal, Server, Workflow, CalendarClock, Globe,
  ShieldAlert, Bug, Store, KeyRound, Lock, Database, Archive,
  Download, Gauge, MonitorCheck, FlaskConical, Boxes,
} from 'lucide-react';

// ── Icon registry — maps data string keys to lucide components ─────────────
const ICONS = {
  layout: LayoutDashboard,
  terminal: Terminal,
  server: Server,
  workflow: Workflow,
  calendar: CalendarClock,
  browser: Globe,
  breaker: ShieldAlert,
  globe: Globe,
  bug: Bug,
  store: Store,
  key: KeyRound,
  lock: Lock,
  database: Database,
  archive: Archive,
  download: Download,
  gauge: Gauge,
  monitor: MonitorCheck,
  flask: FlaskConical,
  default: Boxes,
};

// ── Node chip ───────────────────────────────────────────────────────────────
function ArchNode({ node, index, isInView, shouldReduceMotion }) {
  const Icon = ICONS[node.icon] || ICONS.default;
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group relative p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-accent-web/30 transition-all duration-300"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent-web/10 border border-accent-web/20 flex items-center justify-center shrink-0 group-hover:bg-accent-web/20 group-hover:scale-105 transition-all duration-300">
          <Icon className="w-4 h-4 text-accent-web" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-white leading-tight truncate">{node.label}</p>
          <p className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.08em] mt-0.5 truncate">
            {node.sub}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Connector — animated flow line between lanes ────────────────────────────
// compact (modal): vertical connector at every breakpoint.
// non-compact (case study): vertical on mobile, horizontal on desktop.
// Pulses only animate while the viewer is in view — avoids off-screen work.
function FlowConnector({ compact = false, shouldReduceMotion, isInView }) {
  return (
    <div className="flex items-center justify-center shrink-0" aria-hidden="true">
      {/* Vertical connector — always in compact mode, mobile-only otherwise */}
      <div className={`flex flex-col items-center py-1 ${compact ? '' : 'lg:hidden'}`}>
        <div className="h-6 w-px bg-gradient-to-b from-accent-web/0 via-accent-web/50 to-accent-web/0 relative overflow-visible">
          {!shouldReduceMotion && (
            <motion.span
              className="absolute left-1/2 -translate-x-1/2 top-0 w-1.5 h-1.5 rounded-full bg-accent-web shadow-[0_0_8px_hsl(var(--accent-web)/0.8)]"
              animate={isInView ? { y: [0, 20, 0], opacity: [0, 1, 0] } : { opacity: 0 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>
      </div>
      {/* Horizontal connector — desktop only, non-compact mode */}
      {!compact && (
        <div className="hidden lg:flex items-center w-8">
          <div className="h-px w-full bg-gradient-to-r from-accent-web/0 via-accent-web/50 to-accent-web/0 relative overflow-visible">
            {!shouldReduceMotion && (
              <motion.span
                className="absolute top-1/2 -translate-y-1/2 left-0 w-1.5 h-1.5 rounded-full bg-accent-web shadow-[0_0_8px_hsl(var(--accent-web)/0.8)]"
                animate={isInView ? { x: [0, 26, 0], opacity: [0, 1, 0] } : { opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lane wrapper ────────────────────────────────────────────────────────────
function Lane({ lane, index, isInView, shouldReduceMotion, compact = false }) {
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={compact ? 'w-full shrink-0' : 'grow min-w-[120px] max-w-[220px] shrink-0'}
    >
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <span className="w-5 h-5 rounded-md bg-accent-web/10 border border-accent-web/20 flex items-center justify-center shrink-0">
          <span className="text-[9px] font-black text-accent-web">{index + 1}</span>
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500 truncate">
          {lane.label}
        </span>
      </div>
      <div className="space-y-2.5">
        {lane.nodes.map((node, i) => (
          <ArchNode key={node.id} node={node} index={i} isInView={isInView} shouldReduceMotion={shouldReduceMotion} />
        ))}
      </div>
    </motion.div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────
export default function ArchitectureViewer({ architecture, compact = false }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const shouldReduceMotion = useReducedMotion();

  if (!architecture) return null;
  const { lanes = [], foot = [], summary } = architecture;

  return (
    <div ref={ref}>
      {summary && (
        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-3xl"
        >
          {summary}
        </motion.p>
      )}

      {/* Flow — vertical always in compact (modal) mode; horizontal pipeline on
          desktop otherwise. Flex-1 lanes prevent overflow at any viewport. */}
      <div className={`${compact ? 'flex flex-col' : 'flex flex-col lg:flex-row lg:items-stretch'} gap-0`}>
        {lanes.map((lane, i) => (
          <React.Fragment key={lane.id}>
            {i > 0 && (
              <FlowConnector compact={compact} shouldReduceMotion={shouldReduceMotion} isInView={isInView} />
            )}
            <Lane lane={lane} index={i} isInView={isInView} shouldReduceMotion={shouldReduceMotion} compact={compact} />
          </React.Fragment>
        ))}
      </div>

      {/* Foot strip — observability / testing */}
      {foot.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">
              Observability · Testing · Quality
            </span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
          <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-3">
            {foot.map((node, i) => (
              <ArchNode key={node.id} node={node} index={i} isInView={isInView} shouldReduceMotion={shouldReduceMotion} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
