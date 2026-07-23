import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';

/**
 * ThemeContext — provides accent color theming for the portfolio.
 *
 * Available themes:
 *   blue    → Ocean (blue/emerald) — default
 *   purple  → Royal (purple/pink)
 *   amber   → Sunset (amber/red)
 *   emerald → Forest (emerald/blue)
 *   rose    → Bloom (rose/purple)
 *
 * Each theme sets CSS custom properties via [data-accent] on <html>,
 * which the CSS in index.css uses to override accent-web, accent-ai,
 * glow-web, and glow-ai values.
 */

export const THEMES = [
  { id: 'blue',    label: 'Ocean',   primary: '#3b82f6', secondary: '#10b981' },
  { id: 'purple',  label: 'Royal',   primary: '#8b5cf6', secondary: '#ec4899' },
  { id: 'amber',   label: 'Sunset',  primary: '#f59e0b', secondary: '#ef4444' },
  { id: 'emerald', label: 'Forest',  primary: '#10b981', secondary: '#3b82f6' },
  { id: 'rose',    label: 'Bloom',   primary: '#f43f5e', secondary: '#a855f7' },
];

const THEME_STORAGE_KEY = 'portfolio-accent-theme';
const DEFAULT_THEME = 'blue';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  const currentTheme = useMemo(
    () => THEMES.find(t => t.id === themeId) || THEMES[0],
    [themeId],
  );

  // ── Track previous theme — only show toast on actual changes, not initial mount ──
  const prevThemeRef = useRef(themeId);

  // Apply data attribute to <html> whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', themeId);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
      /* private browsing */
    }

    // Show toast only when theme actually changes (not on initial mount)
    if (prevThemeRef.current !== themeId) {
      const theme = currentTheme;
      toast({
        title: (
          <span className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: theme.primary }}
            />
            <span>{theme.label}</span>
            <span className="text-zinc-500 font-normal">theme</span>
          </span>
        ),
        duration: 2500,
      });
    }
    prevThemeRef.current = themeId;
  }, [themeId, currentTheme]);

  const setTheme = useCallback((id) => {
    if (THEMES.find(t => t.id === id)) {
      setThemeId(id);
    }
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeId((prev) => {
      const idx = THEMES.findIndex(t => t.id === prev);
      return THEMES[(idx + 1) % THEMES.length].id;
    });
  }, []);

  // ── Keyboard shortcut: Ctrl+Shift+T / Cmd+Shift+T ──
  const cycleRef = useRef(cycleTheme);
  useEffect(() => { cycleRef.current = cycleTheme; }, [cycleTheme]);

  useEffect(() => {
    const onKeyDown = (e) => {
      // Ignore when typing in input fields
      if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        cycleRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      theme: themeId,
      currentTheme,
      themes: THEMES,
      setTheme,
      cycleTheme,
    }),
    [themeId, currentTheme, setTheme, cycleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
