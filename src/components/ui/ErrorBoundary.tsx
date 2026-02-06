'use client';

import { logger } from '@/lib/utils/logger';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertCircle, ChevronLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  /** 'page' = full-page centered error, 'inline' = compact card style */
  variant?: 'page' | 'inline';
}

interface State {
  hasError: boolean;
  error: Error | null;
  diagnosticId: string | null;
}

/**
 * Unified ErrorBoundary component with two display variants:
 * - 'page': Full-page centered error display (default)
 * - 'inline': Compact card-style for component-level errors
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    diagnosticId: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, diagnosticId: `ui-${Date.now().toString(36)}` };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null, diagnosticId: null });
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleBack = () => {
    window.history.back();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const variant = this.props.variant || 'page';

      if (variant === 'inline') {
        return (
          <div className="p-6 m-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={24} className="text-rose-600" />
            </div>
            <h4 className="text-sm font-black text-rose-800 uppercase tracking-widest mb-2">
              元件載入失敗
            </h4>
            <p className="text-xs font-bold text-rose-600 mb-4">
              元件載入失敗，請嘗試重新整理或返回上頁。
            </p>
            {this.state.diagnosticId && (
              <p className="text-[10px] font-mono text-rose-500 mb-3">
                診斷 ID: {this.state.diagnosticId}
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-colors active:scale-[0.98] min-h-[40px] flex items-center gap-2"
              >
                <RefreshCw size={14} />
                重試
              </button>
              <button
                onClick={this.handleBack}
                className="px-4 py-2 bg-white border border-rose-200 text-rose-700 text-xs font-bold rounded-xl hover:bg-rose-50 transition-colors active:scale-[0.98] min-h-[40px] flex items-center gap-2"
              >
                <ChevronLeft size={14} />
                返回
              </button>
            </div>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre className="mt-4 p-3 bg-rose-100/50 rounded-xl text-left text-[10px] font-mono text-rose-400 overflow-auto max-h-32 border border-rose-200">
                {this.state.error.message}
              </pre>
            )}
          </div>
        );
      }

      // Default: page variant
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-white">
          <div className="max-w-md w-full space-y-4 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">糟了！系統發生錯誤</h2>
            <p className="text-sm font-bold text-slate-500 leading-relaxed">
              我們在載入頁面時遇到了一些問題。請嘗試重新整理頁面。
            </p>
            {this.state.diagnosticId && (
              <p className="text-[10px] font-mono text-slate-400">
                診斷 ID: {this.state.diagnosticId}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRefresh}
                className="px-8 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm tracking-wide hover:bg-slate-800 transition-colors active:scale-[0.99] flex items-center gap-2"
              >
                <RefreshCw size={16} />
                重新整理
              </button>
              <button
                onClick={this.handleBack}
                className="px-6 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm tracking-wide hover:bg-slate-200 transition-colors active:scale-[0.99] flex items-center gap-2"
              >
                <ChevronLeft size={16} />
                返回
              </button>
            </div>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre className="mt-8 p-4 bg-slate-50 rounded-xl text-left text-[10px] font-mono text-slate-400 overflow-auto max-h-40 border border-slate-100">
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
