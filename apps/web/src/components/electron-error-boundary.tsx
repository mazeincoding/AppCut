'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

// =================== PHASE 4: ERROR BOUNDARY IMPLEMENTATION ===================
// Custom error boundary for Electron hydration failures and React errors

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ElectronErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    console.error('🔥 [ERROR-BOUNDARY] React error caught:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: Date.now(),
      location: typeof window !== 'undefined' ? window.location.href : 'unknown'
    });
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ERROR BOUNDARY TRIGGERED:', {
      error: error.message,
      errorInfo: errorInfo,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: Date.now(),
      location: typeof window !== 'undefined' ? window.location.href : 'unknown'
    });
    
    // Store error info for display
    this.setState({
      error,
      errorInfo
    });
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Add verification print
    console.log('🔧 [ERROR-BOUNDARY] Error boundary activated for Electron compatibility');
  }

  private handleRetry = () => {
    console.log('🔄 ERROR BOUNDARY RECOVERY ATTEMPT:', {
      action: 'retry',
      timestamp: Date.now()
    });
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReload = () => {
    console.log('🔄 ERROR BOUNDARY RECOVERY ATTEMPT:', {
      action: 'reload',
      timestamp: Date.now()
    });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleNavigateHome = () => {
    console.log('🏠 [ERROR-BOUNDARY] Navigating to home...');
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  private handleNavigateProjects = () => {
    console.log('📁 [ERROR-BOUNDARY] Navigating to projects...');
    if (typeof window !== 'undefined') {
      window.location.href = '/projects';
    }
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI for Electron
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default Electron-optimized error UI
      return (
        <div className="min-h-screen bg-background px-5 flex items-center justify-center">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                🔧 Electron Error Recovery
              </h1>
              <p className="text-muted-foreground">
                React hydration failed, but the app is still functional
              </p>
            </div>
            
            {/* Error details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="text-left bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  Error Details:
                </h3>
                <pre className="text-xs text-red-700 dark:text-red-300 overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </div>
            )}
            
            {/* Recovery actions */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={this.handleRetry}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  🔄 Retry React
                </button>
                <button
                  onClick={this.handleReload}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  🔄 Reload Page
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={this.handleNavigateProjects}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  📁 Projects
                </button>
                <button
                  onClick={this.handleNavigateHome}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  🏠 Home
                </button>
              </div>
            </div>
            
            {/* Electron-specific help */}
            <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg">
              <p>
                <strong>Electron Safe Mode:</strong> Core functionality is available even when React fails to hydrate properly.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// =================== VERIFICATION PRINTS ===================
// console.log('🎯 [ERROR-BOUNDARY] ElectronErrorBoundary component loaded');
// console.log('- React error catching: ENABLED');
// console.log('- Electron-specific recovery: ENABLED');
// console.log('- Fallback UI with navigation: ENABLED');
// console.log('- Development error details: ENABLED');