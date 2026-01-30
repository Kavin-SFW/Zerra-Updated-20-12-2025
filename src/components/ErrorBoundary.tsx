import React, { Component, ErrorInfo, ReactNode } from "react";
import LoggerService from "@/services/LoggerService";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    LoggerService.error('Global', 'REACT_RENDER_ERROR', `Uncaught React error: ${error.message}`, error, { 
      componentStack: errorInfo.componentStack 
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A0E27] text-white p-6">
          <div className="glass-card p-8 rounded-2xl max-w-2xl w-full border border-red-500/20 bg-red-500/5 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6 text-red-400">
              <AlertCircle className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Application Error</h1>
            </div>
            
            <div className="bg-black/40 rounded-lg p-4 mb-6 font-mono text-sm overflow-auto max-h-[300px] border border-white/10">
              <p className="text-red-400 font-bold mb-2">{this.state.error?.name}: {this.state.error?.message}</p>
              {this.state.error?.stack && (
                <pre className="text-gray-500 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Reload Application
              </Button>
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
