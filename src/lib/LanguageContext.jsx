import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * LanguageContext — EN (default, international) / ID (Indonesian recruiters).
 *
 * Copy lives next to the component that renders it as `{ en: {...}, id: {...} }`
 * and is selected with `useCopy(copy)`. Keeping dictionaries co-located keeps
 * lazy-section copy out of the entry chunk.
 *
 * Scope: UI copy only. Long-form content in src/lib/data.js (project case
 * studies, timeline narratives) stays English.
 */

export const LANGS = [
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'id', label: 'ID', name: 'Bahasa Indonesia' },
];

const STORAGE_KEY = 'portfolio-lang';
const isLang = (v) => LANGS.some((l) => l.id === v);

// Default value lets components render outside the provider (tests, isolated renders).
const LanguageContext = createContext({ lang: 'en', setLang: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return isLang(stored) ? stored : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* private browsing */ }
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/** Select the active-language entry from a `{ en, id }` copy map (falls back to `en`). */
export function useCopy(copy) {
  const { lang } = useContext(LanguageContext);
  return copy[lang] ?? copy.en;
}
