import { Component, type ErrorInfo, type ReactNode } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";

type FallbackProps = {
  error: Error;
  onRetry: () => void;
};

type InnerProps = {
  children: ReactNode;
  resetQuery: () => void;
  fallbackRender: (props: FallbackProps) => ReactNode;
};

type BoundaryState = { error: Error | null };

class InnerBoundary extends Component<InnerProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("QueryRouteErrorBoundary:", error, info);
  }

  handleRetry = () => {
    this.props.resetQuery();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      return this.props.fallbackRender({
        error,
        onRetry: this.handleRetry,
      });
    }
    return this.props.children;
  }
}

type QueryRouteErrorBoundaryProps = {
  children: ReactNode;
  fallbackRender: (props: FallbackProps) => ReactNode;
};

export function QueryRouteErrorBoundary({
  children,
  fallbackRender,
}: QueryRouteErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <InnerBoundary resetQuery={reset} fallbackRender={fallbackRender}>
          {children}
        </InnerBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
