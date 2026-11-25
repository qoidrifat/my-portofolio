// @ts-check
// SectionErrorBoundary — isolates a non-critical widget (NARA, easter eggs) so
// a render crash or a failed lazy chunk never takes the page down.

import { Component } from 'react';
import { logError } from '@/lib/errors';

export default class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logError(this.props.scope ?? 'Section', error, { extra: { componentStack: errorInfo?.componentStack } });
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
