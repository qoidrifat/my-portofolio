import { useState, useRef, useMemo } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  FaPhp, FaLaravel, FaPython, FaGitAlt, FaJsSquare, FaHtml5, FaCss3Alt,
  FaBrain, FaNodeJs, FaMobileAlt, FaRobot,
} from "react-icons/fa";
import {
  SiTensorflow, SiTailwindcss, SiKeras, SiOpencv, SiScikitlearn,
  SiHuggingface, SiReact, SiSqlite,
} from "react-icons/si";
import { VscVscode } from "react-icons/vsc";
import { DiMysql } from "react-icons/di";
import { techCategories, projects } from "@/lib/data";

function getLevelLabel(v) {
  if (v >= 80) return "Expert";
  if (v >= 60) return "Advanced";
  if (v >= 40) return "Intermediate";
  return "Beginner";
}

function getLevelColor(v) {
  if (v >= 80) return "rgb(59, 130, 246)";
  if (v >= 60) return "rgb(52, 211, 153)";
  if (v >= 40) return "rgb(251, 191, 36)";
  return "rgb(161, 161, 170)";
}

const allTech = techCategories.flatMap(cat =>
  cat.items.map(item => ({ ...item, categoryId: cat.id, categoryLabel: cat.label, categoryAccent: cat.accent }))
);

function getProjectsForTech(ids) {
  return projects.filter(p => ids.includes(p.id));
}

function MarqueeRow({ items, direction, speed }) {
  const dir = direction || "left";
  const spd = speed || 40;
  return (
    <div className="flex overflow-hidden py-4 select-none group">
      <motion.div
        animate={{ x: dir === "left" ? ["0%", "-50%"] : ["-50%", "0%"] }}
        transition={{ duration: spd, repeat: Infinity, ease: "linear" }}
        className="flex flex-nowrap gap-4 min-w-full"
      >
        {[...items, ...items].map((t, i) => (
          <div key={t.name + i} className="flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300">
            <t.icon className="text-2xl text-zinc-400" aria-hidden="true" />
            <span className="text-sm font-bold text-zinc-300">{t.name}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function TechCard({ item, index, isExpanded, onToggle }) {
  const lc = getLevelColor(item.experience_level);
  const lp = getProjectsForTech(item.projectIds || []);
  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.35, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}>
      <button onClick={() => onToggle(item.name)} className={"w-full text-left rounded-2xl border transition-all duration-300 overflow-hidden group " + (isExpanded ? "border-blue-500/30 bg-blue-500/5" : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]")}>
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-blue-500/10 transition-all duration-300">
            <item.icon className="text-lg text-zinc-300 group-hover:text-blue-400 transition-colors duration-300" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white truncate">{item.name}</span>
              <span className="shrink-0 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[9px] font-medium text-zinc-500 uppercase tracking-wider">{item.categoryLabel}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: lc }} initial={{ width: 0 }} animate={{ width: item.experience_level + "%" }} transition={{ duration: 0.8, delay: 0.1 + index * 0.02, ease: [0.16, 1, 0.3, 1] }} />
              </div>
              <span className="shrink-0 text-[10px] font-semibold" style={{ color: lc }}>{getLevelLabel(item.experience_level)}</span>
            </div>
          </div>
          <div className={"shrink-0 w-6 h-6 rounded-full border border-white/[0.08] flex items-center justify-center transition-transform duration-300 " + (isExpanded ? "rotate-180" : "")}>
            <svg className="w-3 h-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
              <div className="px-5 pb-5 pt-1 border-t border-white/[0.06] mt-3 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Experience</span>
                  <span className="text-zinc-300 font-medium">{item.years} {item.years === 1 ? "year" : "years"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Proficiency</span>
                  <span className="text-zinc-300 font-medium">{item.experience_level}%</span>
                </div>
                {lp.length > 0 && (
                  <div>
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider block mb-2">Used in projects</span>
                    <div className="flex flex-wrap gap-1.5">
                      {lp.map(p => (
                        <span key={p.id} className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-medium text-zinc-400">
                          {p.title.length > 24 ? p.title.slice(0, 24) + "..." : p.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {lp.length === 0 && <div className="text-[10px] text-zinc-600 italic">No portfolio projects listed yet</div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  );
}

export default function TechStackSection() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [expandedItems, setExpandedItems] = useState(new Set());
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const filters = useMemo(() => {
    const cats = techCategories.map(c => ({ id: c.id, label: c.label, accent: c.accent }));
    return [{ id: "All", label: "All", accent: "web" }, ...cats];
  }, []);

  const filteredTech = useMemo(() => {
    if (activeFilter === "All") return allTech;
    return allTech.filter(t => t.categoryId === activeFilter);
  }, [activeFilter]);

  const toggleExpand = (name) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const marqueeRow1 = techCategories.slice(0, 3).flatMap(c => c.items);
  const marqueeRow2 = techCategories.slice(3).flatMap(c => c.items);

  return (
    <section id="skills" className="py-24 md:py-32 relative overflow-hidden scroll-mt-20" ref={ref}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <motion.span initial={{ opacity: 0, y: 10 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 inline-block">Capabilities</motion.span>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.1 }} className="text-4xl md:text-6xl font-black text-white mb-6">Tech Stack <span className="text-zinc-700">&amp;</span> Tools</motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.2 }} className="text-zinc-400 max-w-2xl mx-auto text-lg">The specialized tools and frameworks I use to architect robust, scalable, and intelligent digital products.</motion.p>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.25 }} className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {filters.map(f => (
            <button key={f.id} onClick={() => { setActiveFilter(f.id); setExpandedItems(new Set()); }} className={"relative px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 " + (activeFilter === f.id ? "text-white bg-blue-500/15 border border-blue-500/30 shadow-lg shadow-blue-500/10" : "text-zinc-400 bg-white/[0.04] border border-white/[0.06] hover:text-zinc-200 hover:bg-white/[0.08] hover:border-white/[0.12]")}>
              {f.label}
              {activeFilter === f.id && <motion.div layoutId="activeFilter" className="absolute inset-0 rounded-xl border border-blue-500/20" transition={{ type: "spring", bounce: 0.15, duration: 0.4 }} />}
            </button>
          ))}
        </motion.div>

        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-16">
          <AnimatePresence mode="popLayout">
            {filteredTech.map((item, idx) => (
              <TechCard key={item.name} item={item} index={idx} isExpanded={expandedItems.has(item.name)} onToggle={toggleExpand} />
            ))}
          </AnimatePresence>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 1, delay: 0.4 }} className="relative space-y-4">
          <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />
          <MarqueeRow items={marqueeRow1} direction="left" speed={55} />
          <MarqueeRow items={marqueeRow2} direction="right" speed={50} />
        </motion.div>
      </div>
    </section>
  );
}
