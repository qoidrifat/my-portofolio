import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-clients'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
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

// ── Root layout — wraps all routes, renders NavigationTracker inside router tree ──
function RootLayout() {
  return (
    <>
      <NavigationTracker />
      <Outlet />
    </>
  );
}

// ── App ──
function App() {
  // ── Router definition (useMemo avoids module-level TDZ issues by deferring creation) ──
  const router = useMemo(() => createBrowserRouter([
    {
      element: <RootLayout />,
      children: [
        {
          path: "/",
          element: (
            <RouteGuard>
              <LayoutWrapper currentPageName={mainPageKey}>
                <MainPage />
              </LayoutWrapper>
            </RouteGuard>
          ),
        },
        {
          path: "/projects/:slug",
          element: (
            <RouteGuard>
              <ProjectCaseStudy />
            </RouteGuard>
          ),
        },
        {
          path: "*",
          element: (
            <RouteGuard>
              <PageNotFound />
            </RouteGuard>
          ),
        },
      ],
    },
  ]), []);

  const [introDone, setIntroDone] = useState(false);
  const [appRevealing, setAppRevealing] = useState(false);
  const [appVisible, setAppVisible] = useState(false);
  const safetyTimerRef = useRef(null);

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
          <RouterProvider router={router} />
        </div>

        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
