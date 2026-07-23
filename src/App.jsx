import { useState, useEffect, useCallback, useRef } from 'react';
import { MotionConfig } from 'framer-motion';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-clients';
import NavigationTracker from '@/lib/NavigationTracker';
import { pagesConfig } from './pages.config';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ProjectCaseStudy from './pages/ProjectCaseStudy';
import PortfolioIntro, {
  hasIntroPlayed,
  INTRO_MAX_MS,
} from './components/PortfolioIntro';
import IntroErrorBoundary from './components/IntroErrorBoundary';
import AppErrorBoundary from './components/AppErrorBoundary';
import { ThemeProvider } from '@/lib/ThemeContext';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = (mainPageKey && Pages[mainPageKey]) || PageNotFound;

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? (
    <Layout currentPageName={currentPageName}>{children}</Layout>
  ) : (
    <>{children}</>
  );

// ── Page transition variants ────────────────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

const pageTransition = {
  duration: 0.35,
  ease: [0.16, 1, 0.3, 1],
};

// ── AnimatedRoutes — wraps Routes with AnimatePresence for smooth transitions ──
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
      >
        <Routes location={location}>
          <Route
            path="/"
            element={
              <LayoutWrapper currentPageName={mainPageKey}>
                <MainPage />
              </LayoutWrapper>
            }
          />
          <Route path="/projects/:slug" element={<ProjectCaseStudy />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

// ── App ──
function App() {
  // Auto-skip: intro plays once per tab session. On revisit the app
  // renders immediately with no overlay at all.
  const [introDone, setIntroDone] = useState(() => hasIntroPlayed());
  const [appRevealing, setAppRevealing] = useState(() => hasIntroPlayed());
  // NOTE: The wrapper div that fades in the app uses ONLY `opacity` — never
  // `transform` or `filter`. A non-none transform/filter on an ancestor makes
  // it the containing block for every position:fixed descendant (the navbar,
  // command palette, scroll-to-top button, etc.), pinning them to the page
  // instead of the viewport. Using opacity alone avoids this CSS spec trap.
  const safetyTimerRef = useRef(null);

  const handleIntroExitStart = useCallback(() => {
    setAppRevealing(true);
  }, []);

  const handleIntroError = useCallback(
    (error, errorInfo) => {
      if (introDone) return;
      setAppRevealing(true);
      setIntroDone(true);
    },
    [introDone]
  );

  // ── SAFETY TIMEOUT: Nuclear fail-safe ──
  useEffect(() => {
    if (introDone) return;

    safetyTimerRef.current = setTimeout(() => {
      setAppRevealing(true);
      setIntroDone(true);
      if (import.meta.env.DEV) {
        console.warn(
          `%c[App] ⛑️ Safety timeout: intro did not complete within ${INTRO_MAX_MS + 1000}ms — forcing homepage`,
          'color: #10b981; font-weight: bold;'
        );
      }
    }, INTRO_MAX_MS + 1000);

    return () => {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    };
  }, [introDone]);

  // ── Restore body scrolling + move focus to content after intro ──
  useEffect(() => {
    if (!introDone) return;

    const restoreScrolling = () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.position = '';
      document.documentElement.style.height = '';
    };

    // Try 1: Immediate restore
    restoreScrolling();

    // Try 2: After React finishes batching effects
    const t1 = setTimeout(restoreScrolling, 100);

    // Try 3: After all pending timeouts
    const t2 = setTimeout(restoreScrolling, 600);

    // Try 4: Safety net
    const t3 = setTimeout(restoreScrolling, 1500);
    const t4 = setTimeout(restoreScrolling, 3000);

    // Focus management
    const main = document.querySelector('main');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
    }

    if (import.meta.env.DEV) {
      console.log(
        '%c[App] ✅ Body scrolling restored after intro',
        'color: #10b981; font-weight: bold;'
      );
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [introDone]);

  return (
    <QueryClientProvider client={queryClientInstance}>
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          {/* Intro overlay */}
          {!introDone && (
            <IntroErrorBoundary onError={handleIntroError}>
              <PortfolioIntro
                onFinish={() => setIntroDone(true)}
                onExitStart={handleIntroExitStart}
              />
            </IntroErrorBoundary>
          )}

          {/* Router content — fades up after intro.
              IMPORTANT: Only `opacity` is animated here. Never add `transform`
              or `filter` — a non-none value on any ancestor makes it the
              containing block for every position:fixed descendant. */}
          <div
            style={{
              opacity: appRevealing ? 1 : 0,
              transition: appRevealing
                ? 'opacity 800ms cubic-bezier(0.22, 1, 0.36, 1)'
                : 'none',
            }}
          >
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <NavigationTracker />
              <AppErrorBoundary>
                <AnimatedRoutes />
              </AppErrorBoundary>
            </BrowserRouter>
          </div>

          <Toaster />
        </ThemeProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}

export default App;
