import { Component } from 'react';

/**
 * AppErrorBoundary — catches render errors in the page content so a single
 * broken section degrades to a friendly message instead of a white screen.
 * (IntroErrorBoundary only covers the intro overlay.)
 */
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[AppErrorBoundary] Render error:', error, errorInfo?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-center px-6">
          <h1 className="text-2xl font-black text-white mb-3">Something went wrong</h1>
          <p className="text-zinc-400 mb-8 max-w-md">
            An unexpected error occurred while rendering this page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm font-bold transition-colors"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
