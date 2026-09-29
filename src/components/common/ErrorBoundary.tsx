import React, { ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleResetCacheAndReload = () => {
    try {
      const keysToPreserve = ['user_session', 'jr_portal_user', 'jr_vip_session'];
      const preserved: Record<string, string> = {};
      for (const k of keysToPreserve) {
        const val = localStorage.getItem(k);
        if (val) preserved[k] = val;
      }
      localStorage.clear();
      for (const [k, v] of Object.entries(preserved)) {
        localStorage.setItem(k, v);
      }
    } catch (e) {
      console.warn('Error clearing localStorage', e);
    }
    if (this.props.onReset) {
      this.props.onReset();
    }
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[360px] p-6 sm:p-8 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-rose-200 shadow-sm my-6 max-w-xl mx-auto animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5">
            {this.props.fallbackTitle || 'Gagal memuat modul ini.'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
            Terjadi kendala saat merender modul ini karena struktur data anggaran akun belum tersinkronisasi. Silakan reset cache lokal atau muat ulang aplikasi.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleResetCacheAndReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-[#1D6E66] hover:bg-[#15534D] text-white shadow-sm transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Cache & Muat Ulang</span>
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Segarkan Halaman</span>
            </button>
          </div>
          {this.state.error && (
            <div className="mt-4 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-400 font-mono max-w-md overflow-x-auto text-left">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
