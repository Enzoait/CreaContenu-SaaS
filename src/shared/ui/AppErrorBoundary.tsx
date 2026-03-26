import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppErrorFallback } from "./AppErrorFallback";

type Props = { children: ReactNode };

type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("AppErrorBoundary:", error, info);
  }

  render() {
    if (this.state.error) {
      return <AppErrorFallback />;
    }
    return this.props.children;
  }
}
