'use client';
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info);
    // Track error
    if (typeof window !== 'undefined') {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ type: 'js_error', message: error.message, stack: error.stack?.slice(0, 500) })
      }).catch(() => {});
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '200px', padding: '32px', textAlign: 'center',
          background: 'rgba(239,68,68,0.05)', borderRadius: '12px', margin: '16px'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</div>
          <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>Xatolik yuz berdi</h3>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>Sahifani yangilang yoki qaytadan urinib ko&apos;ring</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{
              padding: '8px 20px', background: '#6366f1', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px'
            }}
          >
            Sahifani yangilash
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
