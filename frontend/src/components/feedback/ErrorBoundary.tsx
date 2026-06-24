import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    // バックエンドにエラーを送信（監視用）
    fetch('/api/client-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level:     'error',
        message:   error.message,
        stack:     `${error.stack ?? ''}\n\nComponent: ${info.componentStack ?? ''}`,
        url:       window.location.href,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {});
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)]">
          <div className="max-w-sm w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30
                            flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-[18px] font-extrabold text-[var(--text-1)]">
                予期しないエラーが発生しました
              </h2>
              <p className="text-[13px] text-[var(--text-3)] leading-relaxed">
                画面を再読み込みするか、しばらく経ってからお試しください。
              </p>
              {import.meta.env.DEV && this.state.error && (
                <pre className="mt-3 p-3 rounded-xl bg-[var(--surface-2)] text-left
                                text-[10px] text-red-500 overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl
                           bg-[var(--surface-2)] text-[13px] font-semibold text-[var(--text-1)]
                           hover:bg-[var(--surface-3)] transition-colors active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                再試行
              </button>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl
                           bg-indigo-600 text-white text-[13px] font-semibold
                           hover:bg-indigo-700 transition-colors active:scale-95"
              >
                再読み込み
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
