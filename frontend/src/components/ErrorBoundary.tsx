import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportClientError } from "../lib/api";
import styles from "./ErrorBoundary.module.css";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Without this, any uncaught render error unmounts the whole tree and leaves a
// blank white page with nothing but a console trace - exactly what happened
// during the React 19 upgrade. A blank page tells the user nothing and gives
// them no way out.
//
// Has to be a class: there is still no hook equivalent of componentDidCatch.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Still logged, because in development the console is where you're
    // already looking and the reporting round trip is pointless there.
    console.error("Uncaught render error:", error, info.componentStack);

    // And sent, because in production this was the end of the road: the user
    // saw a broken screen and nobody else ever knew. Truncated here as well as
    // server-side — a component stack can run to thousands of lines, and the
    // useful part is the top.
    reportClientError({
      message: error.message || "Unknown render error",
      stack: error.stack?.slice(0, 4000),
      componentStack: info.componentStack?.slice(0, 4000) ?? undefined,
      url: window.location.pathname,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className={styles.wrapper} role="alert">
        <div className={styles.card}>
          <h1 className={styles.title}>Something broke</h1>
          <p className={styles.body}>
            The page hit an unexpected error and couldn't finish rendering. Reloading usually clears it — your
            watchlist and holdings are stored server-side, so nothing is lost.
          </p>
          <button type="button" onClick={this.handleReload} className={styles.button}>
            Reload the page
          </button>
          {/* Shown rather than hidden: this is a portfolio app, and a visible
              message beats asking someone to open devtools. */}
          <p className={styles.detail}>{error.message}</p>
        </div>
      </div>
    );
  }
}
