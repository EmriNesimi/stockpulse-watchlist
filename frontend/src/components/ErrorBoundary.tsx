import { Component, type ErrorInfo, type ReactNode } from "react";
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
    // No error-reporting service is wired up, so the console is the only sink.
    // Logged rather than swallowed so the stack stays recoverable in dev.
    console.error("Uncaught render error:", error, info.componentStack);
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
