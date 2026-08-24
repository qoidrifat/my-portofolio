/**
 * TechGroups — shared grouped tech-stack renderer.
 *
 * Consumed by ProjectModal (compact chip size) and ProjectCaseStudy (default
 * chip size) so grouped technologies stay visually and behaviorally identical
 * everywhere they appear.
 *
 * Props:
 *   groups   — [{ label: string, items: string[] }]
 *   compact  — smaller chips for tight spaces (modal)
 */
export default function TechGroups({ groups, compact = false }) {
  if (!Array.isArray(groups) || groups.length === 0) return null;

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-2.5">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.items.map((tech) => (
              <span
                key={tech}
                className={
                  compact
                    ? 'px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[11px] font-bold text-zinc-300 hover:bg-white/10 hover:border-accent-web/30 hover:text-accent-web transition-all duration-300'
                    : 'px-3.5 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs font-semibold text-zinc-300 hover:bg-white/[0.06] hover:border-accent-web/30 hover:text-accent-web transition-all duration-300'
                }
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
