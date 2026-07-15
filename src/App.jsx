import { useState, useEffect, useCallback, useRef } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-clients'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ProjectCaseStudy from './pages/ProjectCaseStudy';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegistered.jsx';
import PortfolioIntro from './components/PortfolioIntro';
import IntroErrorBoundary from './components/IntroErrorBoundary';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// ── Auth guard wrapper — works inside RouterProvider because AuthProvider is above it ──
function RouteGuard({ children }) {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const hasAppId = !!import.meta.env.VITE_BASE44_APP_ID;

  if (hasAppId) {
    if (isLoadingPublicSettings || isLoadingAuth) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-zinc-950">
          <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      );
    }
    if (authError) {
      if (authError.type === 'user_not_registered') {
        return <UserNotRegisteredError />;
      } else if (authError.type === 'auth_required') {
        navigateToLogin();
        return null;
      }
      console.warn('Auth error encountered:', authError);
    }
  }

  return <>{children}</>;
}

// ── App ──
function App() {

  const [introDone, setIntroDone] = useState(false);
  const [appRevealing, setAppRevealing] = useState(false);
  const [appVisible, setAppVisible] = useState(false);
  const safetyTimerRef = useRef(null);

  // ── Service Worker Cache Cleanup ─────────────────────────────────
  // Users who visited during the broken build have stale, error-causing
  // JS bundles cached by the old Service Worker. On mount, this effect:
  //  1. Deletes all old Workbox precache caches
  //  2. Unregisters any stale service workers
  //  3. Forces a page reload to ensure fresh JS bundles are served
  // Uses sessionStorage flag to prevent infinite reload loops.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Prevent infinite reload: only reload once per session
    const SW_RELOAD_KEY = '__sw_cache_cleaned';
    if (sessionStorage.getItem(SW_RELOAD_KEY)) return;

    let needsReload = false;

    // ── Step 1: Clear all stale Workbox caches ──
    const clearCaches = 'caches' in window
      ? caches.keys().then((names) => {
          const deletePromises = [];
          const WORKBOX_PREFIX = 'workbox-';
          names.forEach((name) => {
            if (name.startsWith(WORKBOX_PREFIX) || name === 'unsplash-images') {
              deletePromises.push(
                caches.delete(name).then(() => {
                  if (import.meta.env.DEV) {
                    console.log('%c[SW Cleanup] Deleted cache:', 'color: #10b981; font-weight: bold;', name);
                  }
                })
              );
            }
          });
          return Promise.all(deletePromises);
        })
      : Promise.resolve();

    // ── Step 2: Unregister stale SWs & force fresh activation ──
    const handleServiceWorkers = 'serviceWorker' in navigator
      ? navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            if (reg.waiting) {
              // New SW is waiting to activate — tell it to take over
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
              needsReload = true;
              // Don't unregister — the newly activated SW is the fixed build
            } else if (reg.active) {
              // Old stale SW with no update — unregister and reload
              reg.unregister();
              needsReload = true;
            }
          }
        })
      : Promise.resolve();

    // ── Step 3: Wait for both, then reload once ──
    Promise.all([clearCaches, handleServiceWorkers]).then(() => {
      if (needsReload) {
        sessionStorage.setItem(SW_RELOAD_KEY, '1');
        if (import.meta.env.DEV) {
          console.warn(
            '%c[SW Cleanup] Reloading page to serve fresh JS bundles...',
            'color: #f59e0b; font-weight: bold;'
          );
        }
        window.location.reload();
      }
    });
  }, []);

  const handleIntroExitStart = useCallback(() => {
    setAppRevealing(true);
  }, []);

  const handleIntroError = useCallback((error, errorInfo) => {
    if (introDone) return;
    // ErrorBoundary already logged details; reveal app + force-complete
    setAppRevealing(true);
    setIntroDone(true);
  }, [introDone]);

  // ── SAFETY TIMEOUT: Nuclear fail-safe ──
  // If PortfolioIntro never calls onFinish within 7.5s (due to crash,
  // deadlock, or any unexpected failure), force introDone = true.
  // This is the last line of defense — it always works.
  useEffect(() => {
    if (introDone) return;

    safetyTimerRef.current = setTimeout(() => {
      // Must reveal app BEFORE forcing introDone to prevent black screen
      setAppRevealing(true);
      setIntroDone(true);
      if (import.meta.env.DEV) {
        console.warn(
          '%c[App] ⛑️ Safety timeout: intro did not complete within 7.5s — forcing homepage',
          'color: #10b981; font-weight: bold;'
        );
      }
    }, 13500);

    return () => {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    };
  }, [introDone]);

  // ── Restore body scrolling after intro completes ──
  useEffect(() => {
    if (!introDone) return;

    // Explicitly restore scrolling on body and html
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.documentElement.style.overflow = '';
    document.documentElement.style.position = '';

    if (import.meta.env.DEV) {
      console.log('%c[App] ✅ Body scrolling restored after intro', 'color: #10b981; font-weight: bold;');
    }
  }, [introDone]);

  useEffect(() => {
    if (introDone && !appVisible) {
      const t = setTimeout(() => setAppVisible(true), 60);
      return () => clearTimeout(t);
    }
  }, [introDone, appVisible]);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        {/* Intro overlay — wrapped in ErrorBoundary for crash recovery */}
        {!introDone && (
          <IntroErrorBoundary onError={handleIntroError}>
            <PortfolioIntro 
              onFinish={() => setIntroDone(true)}
              onExitStart={handleIntroExitStart}
            />
          </IntroErrorBoundary>
        )}

        {/* Router content — fades up after intro */}
        <div
          style={{
            opacity: appRevealing ? 1 : 0,
            filter: appRevealing ? 'blur(0px)' : 'blur(8px)',
            transform: appRevealing ? 'translateY(0)' : 'translateY(12px)',
            transition: appRevealing
              ? 'opacity 800ms cubic-bezier(0.22, 1, 0.36, 1), filter 800ms cubic-bezier(0.22, 1, 0.36, 1), transform 800ms cubic-bezier(0.22, 1, 0.36, 1)'
              : 'none',
          }}
        >
          <BrowserRouter>
            <NavigationTracker />
            <Routes>
              <Route path="/" element={
                <RouteGuard>
                  <LayoutWrapper currentPageName={mainPageKey}>
                    <MainPage />
                  </LayoutWrapper>
                </RouteGuard>
              } />
              <Route path="/projects/:slug" element={
                <RouteGuard>
                  <ProjectCaseStudy />
                </RouteGuard>
              } />
              <Route path="*" element={
                <RouteGuard>
                  <PageNotFound />
                </RouteGuard>
              } />
            </Routes>
          </BrowserRouter>
        </div>

        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
