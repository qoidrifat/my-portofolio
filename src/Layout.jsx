import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Menu, X, ArrowUp, Search as SearchIcon, TerminalSquare, Palette } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring, useReducedMotion } from 'framer-motion';
import { navLinks, socials, profile } from '@/lib/data';
import OptimizedImage from '@/components/OptimizedImage';
import CommandPalette from '@/components/CommandPalette';
import SectionErrorBoundary from '@/components/SectionErrorBoundary';
const TerminalEasterEgg = lazy(() => import('@/components/TerminalEasterEgg'));
const NaraWidget = lazy(() => import('@/components/nara/NaraWidget'));
import { useTheme, THEMES } from '@/lib/ThemeContext';
import { useLanguage } from '@/lib/LanguageContext';

const NAV_TRANSLATIONS = {
  en: { Home: 'Home', About: 'About', Journey: 'Journey', Projects: 'Projects', Skills: 'Skills', Contact: 'Contact' },
  id: { Home: 'Beranda', About: 'Tentang', Journey: 'Jejak', Projects: 'Proyek', Skills: 'Keahlian', Contact: 'Kontak' },
};
export default function Layout({ children }) {
  const { cycleTheme, setTheme, currentTheme } = useTheme();
  const { lang, setLang } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  // After the entrance transition ends, transform/filter must be REMOVED:
  // a non-none transform/filter makes <main> the containing block for
  // position:fixed descendants (project modal, gallery lightbox), pinning
  // them to the page instead of the viewport.
  const [entranceSettled, setEntranceSettled] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Entrance animation — hanya opacity + blur + translateY pada <main>
  useEffect(() => {
    const t = setTimeout(() => setContentReady(true), 50);
    const settle = setTimeout(() => setEntranceSettled(true), 900); // 50ms + 800ms transition + margin
    return () => { clearTimeout(t); clearTimeout(settle); };
  }, []);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      setIsScrolled(scrollPos > 10);
      setShowScrollTop(scrollPos > 500);
      
      const sections = navLinks.map(link => link.href.replace('#', ''));
      const scrollMargin = 120;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const offsetTop = element.offsetTop - scrollMargin;
          const offsetBottom = offsetTop + element.offsetHeight;

          if (scrollPos >= offsetTop && scrollPos < offsetBottom) {
            setActiveSection(section);
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Sync immediately so the navbar/scroll-spy state is correct when the
    // page loads already scrolled (reload mid-page, anchor navigation)
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMobileMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileMenuOpen]);

  const scrollToSection = (href) => {
    const element = document.querySelector(href);
    if (element) {
      const offsetTop = element.offsetTop - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: shouldReduceMotion ? 'auto' : 'smooth'
      });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-inter">
      {/* Background gradient mesh — dual-accent system */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-web/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-ai/5 rounded-full blur-3xl" />
      </div>

      {/* Navbar — always visible, floating glass panel */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          transition: 'background 400ms cubic-bezier(0.22, 1, 0.36, 1), backdrop-filter 400ms cubic-bezier(0.22, 1, 0.36, 1), border-color 400ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 400ms cubic-bezier(0.22, 1, 0.36, 1), padding 400ms cubic-bezier(0.22, 1, 0.36, 1)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background: isScrolled ? 'rgba(9, 9, 11, 0.82)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(16px) saturate(180%)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(16px) saturate(180%)' : 'none',
          borderBottom: isScrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
          boxShadow: isScrolled ? '0 1px 40px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        {/* Scroll Progress Bar */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent-web to-transparent origin-left"
          style={{ scaleX }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="flex items-center justify-between"
            style={{
              height: isScrolled ? '56px' : '64px',
              transition: 'height 400ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {/* Logo */}
            <motion.a
              href="#hero"
              onClick={(e) => { e.preventDefault(); scrollToSection('#hero'); }}
              className="flex items-center gap-2 group"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
            >
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent-web to-accent-ai rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <OptimizedImage src={profile.logoUrl} alt={`${profile.name} Logo`} className="relative h-10 w-auto" />
              </div>
            </motion.a>

            {/* Desktop Navigation — lg+ only: below 1024px the full pill bar +
                Search + CTA cannot fit and clips off-screen (768–1023px), so
                tablets use the mobile menu instead */}
            <div className="hidden lg:flex items-center gap-1 bg-white/5 border border-border-soft-strong p-1 rounded-2xl backdrop-blur-md">
              {navLinks.map((link) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); scrollToSection(link.href); }}
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeSection === link.href.replace('#', '')
                      ? 'text-white'
                      : 'text-text-muted hover:text-white'
                  }`}
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                >
                  {activeSection === link.href.replace('#', '') && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-accent-web/20 border border-accent-web/20 rounded-xl z-[-1]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  {NAV_TRANSLATIONS[lang]?.[link.name] || link.name}
                </motion.a>
              ))}
            </div>

            {/* Search + Language + CTA */}
            <div className="hidden lg:flex items-center gap-2">
              {/* Language Selector */}
              <div className="flex items-center p-0.5 rounded-xl bg-white/5 border border-border-soft text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all ${
                    lang === 'en'
                      ? 'bg-accent-web text-accent-web-foreground font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  aria-label="Switch language to English"
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLang('id')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all ${
                    lang === 'id'
                      ? 'bg-accent-web text-accent-web-foreground font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  aria-label="Ganti bahasa ke Bahasa Indonesia"
                >
                  ID
                </button>
              </div>

              {/* Theme Toggle */}
              <motion.button
                onClick={cycleTheme}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 border border-border-soft text-text-muted hover:text-white hover:bg-white/10 transition-colors group relative"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                aria-label={`Current theme: ${currentTheme.label}. Click to cycle.`}
                title={`Theme: ${currentTheme.label}. Click to cycle.`}
              >
                <Palette className="w-4 h-4" aria-hidden="true" />
                <div className="flex -space-x-1">
                  {THEMES.slice(0, 3).map(t => (
                    <div
                      key={t.id}
                      className="w-2 h-2 rounded-full border border-zinc-800"
                      style={{ backgroundColor: t.primary }}
                    />
                  ))}
                </div>
              </motion.button>

              <motion.button
                onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-border-soft text-text-muted text-sm font-medium hover:bg-white/10 hover:text-white transition-colors"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                aria-label="Open command palette"
              >
                <SearchIcon className="w-4 h-4" aria-hidden="true" />
                <span>{lang === 'id' ? 'Cari' : 'Search'}</span>
                <kbd className="ml-1 px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-text-muted">⌘K</kbd>
              </motion.button>

              <motion.a
                href="#contact"
                onClick={(e) => { e.preventDefault(); scrollToSection('#contact'); }}
                className="relative inline-flex items-center justify-center px-6 py-2.5 overflow-hidden font-semibold text-white transition-all duration-300 bg-[hsl(var(--accent-web-btn))] rounded-xl hover:brightness-110 group"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
              >
                <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-white rounded-full group-hover:w-56 group-hover:h-56 opacity-10"></span>
                <span className="relative">{lang === 'id' ? 'Mari Bicara' : "Let's Talk"}</span>
              </motion.a>
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              className="lg:hidden min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-white/5 border border-border-soft hover:bg-white/10 transition-colors flex items-center justify-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
              aria-label="Toggle Menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              id="mobile-menu"
              initial={shouldReduceMotion ? false : { opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
              className="lg:hidden bg-zinc-950/95 backdrop-blur-2xl border-b border-border-soft"
            >
              <div className="px-4 py-6 space-y-2">
                {navLinks.map((link) => (
                  <motion.a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => { e.preventDefault(); scrollToSection(link.href); }}
                    className={`block px-4 py-3 rounded-2xl text-base font-medium transition-all ${
                      activeSection === link.href.replace('#', '')
                        ? 'text-accent-web bg-accent-web/10 border border-accent-web/20'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  >
                    {NAV_TRANSLATIONS[lang]?.[link.name] || link.name}
                  </motion.a>
                ))}

                {/* Theme toggle — mobile */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 text-text-muted text-sm">
                    <Palette className="w-4 h-4" aria-hidden="true" />
                    <span>Theme</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {THEMES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className="w-11 h-11 flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white"
                        aria-label={`Switch to ${t.label} theme`}
                        title={t.label}
                      >
                        <span
                          className={`w-7 h-7 rounded-full border-2 transition-all duration-300 block ${
                            currentTheme.id === t.id ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-80'
                          }`}
                          style={{ backgroundColor: t.primary }}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language switcher — mobile */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                  <span className="text-text-muted text-sm font-medium">
                    {lang === 'id' ? 'Bahasa' : 'Language'}
                  </span>
                  <div className="flex items-center p-0.5 rounded-xl bg-white/5 border border-border-soft text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setLang('en')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        lang === 'en'
                          ? 'bg-accent-web text-accent-web-foreground font-bold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => setLang('id')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        lang === 'id'
                          ? 'bg-accent-web text-accent-web-foreground font-bold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      ID
                    </button>
                  </div>
                </div>
                <motion.a
                  href="#contact"
                  onClick={(e) => { e.preventDefault(); scrollToSection('#contact'); }}
                  className="block mt-2 px-4 py-4 bg-gradient-to-r from-accent-web to-accent-web/80 rounded-2xl text-base font-bold text-center text-white shadow-lg shadow-glow-web"
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                >
                  {lang === 'id' ? 'Mari Bicara' : "Let's Talk"}
                </motion.a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>        </nav>

      {/* Main Content — entrance animasi tanpa memengaruhi navbar.
          Setelah settle, transform/filter dilepas agar fixed-position
          descendants (modal, lightbox) menempel ke viewport. */}
      <main
        style={entranceSettled ? undefined : {
          opacity: contentReady ? 1 : 0,
          filter: contentReady ? 'blur(0px)' : 'blur(6px)',
          transform: contentReady ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 800ms cubic-bezier(0.22, 1, 0.36, 1), filter 800ms cubic-bezier(0.22, 1, 0.36, 1), transform 800ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className="relative"
      >
        {children}
      </main>

      {/* Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: shouldReduceMotion ? 'auto' : 'smooth' })}
            // Positioned above the NARA avatar bubble (bottom-5 right-5, h-16/20) so
            // the two never overlap on mobile — the avatar sits at the same corner.
            className="fixed bottom-[8.5rem] right-4 z-40 p-4 rounded-2xl bg-accent-web text-white shadow-glow-web hover:brightness-110 transition-colors group sm:bottom-28 sm:right-7"
            aria-label="Scroll to top"
            whileHover={shouldReduceMotion ? undefined : { y: -5 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
          >
            <ArrowUp className="w-6 h-6 group-hover:animate-bounce" aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Footer */}
      {/* Command Palette */}
      <CommandPalette />

      {/* NARA — floating portfolio guide. Lazy: the widget chunk is fetched
          only after the intro completes and the widget is actually revealed.
          A failed chunk load degrades to nothing, never a white screen. */}
      <SectionErrorBoundary scope="NARA" fallback={null}>
        <Suspense fallback={null}>
          <NaraWidget />
        </Suspense>
      </SectionErrorBoundary>

      {/* Terminal Easter Egg — Ctrl+` / Cmd+` */}
      <Suspense fallback={null}>
        <TerminalEasterEgg />
      </Suspense>
      <footer className="relative border-t border-border-soft bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center text-center md:text-left">
            <div className="space-y-4">
              <motion.div 
                className="flex flex-col items-center md:items-start gap-2"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
              >
                <OptimizedImage src={profile.logoUrl} alt={`${profile.name} Logo`} className="h-10 w-auto" />
                <p className="text-text-body text-sm font-medium tracking-wide">{profile.role}</p>
              </motion.div>
              <p className="text-text-muted text-sm max-w-xs mx-auto md:mx-0">
                {lang === 'id'
                  ? 'Membangun aplikasi web end-to-end dan pengalaman digital yang cerdas.'
                  : 'Building end-to-end web applications and intelligent digital experiences.'}
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-6">
                {navLinks.slice(0, 3).map(link => (
                  <a key={link.name} href={link.href} onClick={(e) => { e.preventDefault(); scrollToSection(link.href); }} className="text-text-muted hover:text-white text-sm transition-colors">{link.name}</a>
                ))}
              </div>
              <p className="text-text-muted text-xs font-medium uppercase tracking-widest">
                © {new Date().getFullYear()} {profile.name}. {lang === 'id' ? 'Hak cipta dilindungi.' : 'All rights reserved.'}
              </p>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-6">
              {/* Social links + Terminal */}
              <div className="flex items-center gap-3">
                {socials.map((social) => (
                  <motion.a
                    key={social.name}
                    href={social.href}
                    aria-label={social.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-white/5 border border-border-soft text-text-muted hover:text-white hover:border-border-soft-strong transition-all"
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.1, y: -2 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                  >
                    <social.icon className="w-5 h-5" aria-hidden="true" />
                  </motion.a>
                ))}
                <motion.button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-terminal'))}
                  aria-label="Open interactive terminal (Ctrl+`)"
                  title="Interactive terminal — Ctrl+`"
                  className="p-3 rounded-xl bg-white/5 border border-border-soft text-text-muted hover:text-white hover:border-border-soft-strong transition-all"
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.1, y: -2 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                >
                  <TerminalSquare className="w-5 h-5" aria-hidden="true" />
                </motion.button>
              </div>

              {/* Theme picker — footer */}
              <div className="w-full pt-4 border-t border-white/[0.04]">
                <div className="flex flex-col items-center md:items-end gap-2.5">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em]">
                    Accent Theme
                  </span>
                  <div className="flex items-center gap-2">
                    {THEMES.map(t => (
                      <motion.button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className="w-11 h-11 flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white"
                        whileHover={shouldReduceMotion ? undefined : { scale: 1.15 }}
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                        aria-label={`Switch to ${t.label} theme`}
                        title={t.label}
                      >
                        <span
                          className={`relative rounded-full transition-all duration-300 block ${
                            currentTheme.id === t.id
                              ? 'w-7 h-7 shadow-lg'
                              : 'w-5 h-5 opacity-40 hover:opacity-80'
                          }`}
                          style={{ backgroundColor: t.primary }}
                        >
                          {currentTheme.id === t.id && (
                            <motion.span
                              layoutId="footerThemeDot"
                              className="absolute inset-0 rounded-full border border-white/40"
                              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                            />
                          )}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                  <span className="text-[9px] font-medium text-text-muted/50">
                    {currentTheme.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
