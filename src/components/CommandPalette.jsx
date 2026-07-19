import { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import {
  Home,
  User,
  Code2,
  Image,
  Mail,
  Download,
  Github,
  Linkedin,
  MessageCircle,
  Brain,
} from 'lucide-react';
import { profile, navLinks, projects, socials } from '@/lib/data';

// ── Section actions ──────────────────────────────────
const sectionActions = navLinks.map(link => {
  const iconMap = {
    Home: Home,
    About: User,
    Skills: Code2,
    Projects: Brain,
    Gallery: Image,
    Contact: Mail,
  };
  return {
    id: `section-${link.name.toLowerCase()}`,
    label: link.name,
    description: `Scroll to ${link.name} section`,
    icon: iconMap[link.name] || Search,
    action: 'scroll',
    href: link.href,
  };
});

// ── Quick actions ────────────────────────────────────
const quickActions = [
  {
    id: 'download-resume',
    label: 'Download Resume',
    description: `Download ${profile.name}'s resume (PDF)`,
    icon: Download,
    action: 'link',
    href: profile.resumeUrl,
  },
  {
    id: 'open-github',
    label: 'Open GitHub',
    description: 'View source code and repositories',
    icon: Github,
    action: 'link',
    href: socials.find(s => s.name === 'GitHub')?.href || '#',
  },
  {
    id: 'open-linkedin',
    label: 'Open LinkedIn',
    description: 'Connect on LinkedIn',
    icon: Linkedin,
    action: 'link',
    href: socials.find(s => s.name === 'LinkedIn')?.href || '#',
  },
  {
    id: 'contact-whatsapp',
    label: 'Contact via WhatsApp',
    description: 'Send a message directly',
    icon: MessageCircle,
    action: 'link',
    href: 'https://wa.me/6282337753394',
  },
];

// ── Project actions ──────────────────────────────────
const projectActions = projects.map(p => ({
  id: `project-${p.id}`,
  label: p.title,
  description: p.category,
  icon: p.icon || Brain,
  action: 'project',
  project: p,
}));

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  // Mirror of `open` for global key handlers (avoids re-binding per toggle)
  const openRef = useRef(false);
  useEffect(() => { openRef.current = open; }, [open]);

  // ── Keyboard shortcut: Cmd+K / Ctrl+K ──
  useEffect(() => {
    const down = (e) => {
      // Ignore shortcuts while the intro overlay is up — the palette would
      // open invisibly underneath it (intro z-index 9999 > palette 9998)
      if (document.querySelector('[data-intro-overlay]')) return;
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      // Only consume Escape when the palette is actually open, so other
      // overlays (modal, lightbox, terminal) don't all close at once
      if (e.key === 'Escape' && openRef.current) {
        e.stopImmediatePropagation();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // ── External trigger — navbar Search button dispatches this event ──
  useEffect(() => {
    const openPalette = () => setOpen(true);
    window.addEventListener('open-command-palette', openPalette);
    return () => window.removeEventListener('open-command-palette', openPalette);
  }, []);

  // ── Handle item selection ──
  const handleSelect = useCallback((item) => {
    setOpen(false);

    if (item.action === 'scroll' && item.href) {
      const element = document.querySelector(item.href);
      if (element) {
        const offset = element.offsetTop - 80;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }
    } else if (item.action === 'link' && item.href) {
      if (item.id === 'download-resume') {
        // Trigger download
        const a = document.createElement('a');
        a.href = item.href;
        a.download = 'Qoid-Rifat-CV.pdf';
        a.click();
      } else {
        window.open(item.href, '_blank', 'noopener noreferrer');
      }
    } else if (item.action === 'project' && item.project) {
      // Scroll to projects section and store for modal
      const projectsSection = document.getElementById('projects');
      if (projectsSection) {
        const offset = projectsSection.offsetTop - 80;
        window.scrollTo({ top: offset, behavior: 'smooth' });
        // Brief delay then open project modal if available
        setTimeout(() => {
          // Dispatch a custom event that ProjectSection can listen for
          window.dispatchEvent(
            new CustomEvent('open-project', { detail: item.project })
          );
        }, 600);
      }
    }
  }, []);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9998]"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Command Dialog — centered floating card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-[12vh] left-1/2 -translate-x-1/2 w-full max-w-lg px-4"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Command palette"
                className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl"
                style={{
                  background: 'rgba(9, 9, 11, 0.92)',
                  backdropFilter: 'blur(32px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                }}
              >
                <CommandPrimitive className="bg-transparent">
                  <div className="flex items-center border-b border-white/[0.06] px-4">
                    <Search className="mr-3 h-4 w-4 shrink-0 text-zinc-500" />
                    <CommandPrimitive.Input
                      id="cmd-palette-search"
                      name="cmd-palette-search"
                      autoComplete="off"
                      autoFocus
                      placeholder="Search pages, projects, actions..."
                      className="flex h-14 w-full rounded-md bg-transparent py-3 text-base text-white outline-none placeholder:text-zinc-500"
                    />
                  </div>
                  <CommandPrimitive.List className="max-h-[360px] overflow-y-auto p-2">
                    <CommandPrimitive.Empty className="py-10 text-center text-sm text-zinc-500">
                      No results found.
                    </CommandPrimitive.Empty>

                    {/* Quick Actions */}
                    <CommandPrimitive.Group heading="Quick Actions">
                      {quickActions.map((item) => (
                        <CommandPrimitive.Item
                          key={item.id}
                          value={item.label}
                          onSelect={() => handleSelect(item)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer text-zinc-300 aria-selected:bg-white/[0.06] aria-selected:text-white data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-white transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.06] flex items-center justify-center shrink-0">
                            <item.icon className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-medium truncate">{item.label}</span>
                            <span className="text-xs text-zinc-400 truncate">{item.description}</span>
                          </div>
                        </CommandPrimitive.Item>
                      ))}
                    </CommandPrimitive.Group>

                    <CommandPrimitive.Separator className="h-px bg-white/[0.06] mx-2 my-1" />

                    {/* Sections */}
                    <CommandPrimitive.Group heading="Sections">
                      {sectionActions.map((item) => (
                        <CommandPrimitive.Item
                          key={item.id}
                          value={item.label}
                          onSelect={() => handleSelect(item)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer text-zinc-300 aria-selected:bg-white/[0.06] aria-selected:text-white data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-white transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.06] flex items-center justify-center shrink-0">
                            <item.icon className="w-4 h-4 text-zinc-400" />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-medium truncate">{item.label}</span>
                            <span className="text-xs text-zinc-400 truncate">{item.description}</span>
                          </div>
                        </CommandPrimitive.Item>
                      ))}
                    </CommandPrimitive.Group>

                    <CommandPrimitive.Separator className="h-px bg-white/[0.06] mx-2 my-1" />

                    {/* Projects */}
                    <CommandPrimitive.Group heading="Projects">
                      {projectActions.map((item) => (
                        <CommandPrimitive.Item
                          key={item.id}
                          value={item.label}
                          onSelect={() => handleSelect(item)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer text-zinc-300 aria-selected:bg-white/[0.06] aria-selected:text-white data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-white transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.06] flex items-center justify-center shrink-0">
                            <item.icon className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-medium truncate">{item.label}</span>
                            <span className="text-xs text-zinc-400 truncate">{item.description}</span>
                          </div>
                        </CommandPrimitive.Item>
                      ))}
                    </CommandPrimitive.Group>

                    {/* Footer hint */}
                    <div className="px-4 py-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400">
                      <div className="flex items-center gap-3">
                        <span><kbd className="px-1 py-0.5 rounded bg-white/[0.06] font-mono">↑↓</kbd> Navigate</span>
                        <span><kbd className="px-1 py-0.5 rounded bg-white/[0.06] font-mono">↵</kbd> Open</span>
                      </div>
                      <span><kbd className="px-1 py-0.5 rounded bg-white/[0.06] font-mono">Esc</kbd> Close</span>
                    </div>
                  </CommandPrimitive.List>
                </CommandPrimitive>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
