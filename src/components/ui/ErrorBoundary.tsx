import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Hando] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 16, padding: 32, background: '#09090e', color: '#f0efff',
          fontFamily: 'system-ui, sans-serif', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>Something went wrong</div>
          <div style={{ fontSize: '.875rem', color: '#8e8ea8', maxWidth: 400, lineHeight: 1.6 }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: '10px 24px', borderRadius: 12, border: 0,
              background: '#5b5ef4', color: '#fff', fontWeight: 600,
              fontSize: '.875rem', cursor: 'pointer',
            }}
          >
            Reload page
          </button>
          <div style={{ fontSize: '.75rem', color: '#55556a', marginTop: 4 }}>
            If this keeps happening, check your browser console for details.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
