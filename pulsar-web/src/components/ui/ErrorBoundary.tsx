import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-primary)' }}>
          <div className="glass-card max-w-md w-full p-8 text-center" style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-pulsar-50 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Algo deu errado
            </h2>
            <p className="text-sm text-pulsar-200 mb-6 font-mono">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-gradient px-6 py-2.5 text-sm"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
