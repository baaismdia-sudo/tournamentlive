import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Without this, any uncaught render-time exception anywhere in the tree
 * unmounts the entire app and leaves a blank, unrecoverable page — exactly
 * what happened when the cricket scorer hit a malformed live-score row.
 * This catches it, shows a real message, and offers a reload instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)] p-6 text-center">
          <AlertTriangle size={40} className="text-[var(--color-danger)]" />
          <h1 className="font-heading text-lg font-bold text-[var(--color-heading)]">Something went wrong</h1>
          <p className="max-w-sm text-sm text-[var(--color-muted)]">
            This page hit an unexpected error and couldn't continue. Reloading usually fixes it — if it keeps
            happening, use the thumbs-down button to report it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
