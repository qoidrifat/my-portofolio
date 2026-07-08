import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-clients'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ProjectCaseStudy from './pages/ProjectCaseStudy';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegistered.jsx';
import LoadingScreen from '@/components/LoadingScreen';

// ── Page transition variants ────────────────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 18, scale: 0.98 },
  animate: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0, y: -12, scale: 0.98,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  },
};

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const hasAppId = !!import.meta.env.VITE_BASE44_APP_ID;

  // Only enforce auth if appId is provided and we're not loading
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
      // For other errors, we'll log them but still try to render the app
      console.warn('Auth error encountered:', authError);
    }
  }

  // Render the main app with animated page transitions
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          </motion.div>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              </motion.div>
            }
          />
        ))}
        <Route path="/projects/:slug" element={
          <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <ProjectCaseStudy />
          </motion.div>
        } />
        <Route path="*" element={
          <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <PageNotFound />
          </motion.div>
        } />
      </Routes>
    </AnimatePresence>
  );
};


function App() {
  const [loadingDone, setLoadingDone] = useState(false);
  const [appVisible, setAppVisible] = useState(false);

  // Hooks before any conditional return — rules of hooks compliant
  useEffect(() => {
    if (loadingDone && !appVisible) {
      const t = setTimeout(() => setAppVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [loadingDone, appVisible]);

  if (!loadingDone) {
    return <LoadingScreen onFinish={() => setLoadingDone(true)} />;
  }

  return (
    <div
      style={{
        opacity: appVisible ? 1 : 0,
        transition: 'opacity 800ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </div>
  )
}

export default App
