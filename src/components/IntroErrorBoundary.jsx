import { Component } from 'react';

/**
 * IntroErrorBoundary — catches rendering errors inside the intro sequence.
 * 
 * Behavior:
 * - On error: logs detailed info, notifies parent via onError callback
 * - Renders nothing on error (parent's fail-safe timeout takes over)
 * - Supports recovery: parent sets introDone = true → ErrorBoundary unmounts
 * 
 * Usage: wrap <PortfolioIntro> inside this boundary in App.jsx
 */
export default class IntroErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // ── Detailed error logging ─────────────────────────────────
    const logPayload = {
      type: 'INTRO_RENDER_ERROR',
      message: error?.message ?? 'Unknown error',
      stack: error?.stack ?? 'No stack trace',
      componentStack: errorInfo?.componentStack ?? 'No component stack',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    if (import.meta.env.DEV) {
      // Development mode: detailed console logging
      console.warn(
        `%c[IntroErrorBoundary] ⚠️ Intro render failed — starting recovery...`,
        'color: #f59e0b; font-weight: bold; font-size: 12px;'
      );
      console.groupCollapsed('%c[IntroErrorBoundary] Error Details', 'color: #ef4444;');
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo?.componentStack);
      console.groupEnd();
    } else {
      // Production mode: minimal structured log
      console.warn('[IntroErrorBoundary]', logPayload);
    }

    // Notify parent to force-skip intro
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render nothing — parent's fail-safe timeout in App.jsx
      // will force introDone = true, which unmounts this boundary entirely
      return null;
    }
    return this.props.children;
  }
}
