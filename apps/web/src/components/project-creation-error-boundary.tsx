"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ProjectCreationErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ProjectCreationErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

export class ProjectCreationErrorBoundary extends React.Component<
  ProjectCreationErrorBoundaryProps,
  ProjectCreationErrorBoundaryState
> {
  constructor(props: ProjectCreationErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ProjectCreationErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("🚨 [PROJECT ERROR BOUNDARY] Project creation failed:", {
      error,
      errorInfo,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Project Creation Failed</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Something went wrong while creating your project. This might be due to storage issues or state management problems.
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
            <Button onClick={this.handleRetry}>
              Try Again
            </Button>
          </div>
          {this.state.error && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Technical Details
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-w-md">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}