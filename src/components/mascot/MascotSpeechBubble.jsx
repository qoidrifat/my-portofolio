import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Code2, FileText, Mail } from 'lucide-react';
import { MASCOT_COPY } from './mascot.constants';
import { useLanguage } from '@/lib/LanguageContext';

const ACTIONS = [
  { id: 'projects', href: '#projects', icon: Code2, accent: 'text-accent-web' },
  { id: 'about', href: '#about', icon: FileText, accent: 'text-accent-ai' },
  { id: 'contact', href: '#contact', icon: Mail, accent: 'text-accent-web' },
];

const bubbleVariants = {
  hidden: { opacity: 0, scale: 0.9, y: -8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 24, stiffness: 340 } },
  exit: { opacity: 0, scale: 0.92, y: -6, transition: { duration: 0.15 } },
};

export default function MascotSpeechBubble({
  isOpen,
  onClose,
  onActionSelect,
  isReduced = false,
}) {
  const { lang } = useLanguage();
  const copy = MASCOT_COPY[lang] || MASCOT_COPY.en;
  const bubbleRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleAction = (href) => {
    onActionSelect?.(href);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: isReduced ? 'auto' : 'smooth' });
    }
    onClose?.();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={bubbleRef}
          role="dialog"
          aria-label={copy.greeting}
          variants={isReduced ? {} : bubbleVariants}
          initial={isReduced ? false : 'hidden'}
          animate={isReduced ? {} : 'visible'}
          exit={isReduced ? {} : 'exit'}
          className="absolute z-40 top-[calc(100%+14px)] left-1/2 -translate-x-1/2 w-[calc(100vw-32px)] max-w-[320px] p-4 rounded-2xl bg-zinc-900/95 backdrop-blur-md border border-white/10 shadow-2xl text-left"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider uppercase bg-accent-web/10 text-accent-web border border-accent-web/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-web animate-pulse" />
              Q-Companion
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={copy.closeLabel}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs font-semibold text-white mb-0.5">{copy.greeting}</p>
          <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">{copy.prompt}</p>

          <div className="flex flex-col gap-1.5">
            {ACTIONS.map(({ id, href, icon: Icon, accent }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleAction(href)}
                className="group flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium text-zinc-200 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white border border-white/5 hover:border-accent-web/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web"
              >
                <span className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${accent}`} />
                  {copy.actions[id]}
                </span>
                <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-accent-web group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>

          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-900 border-l border-t border-white/10 rotate-45"
            aria-hidden="true"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
