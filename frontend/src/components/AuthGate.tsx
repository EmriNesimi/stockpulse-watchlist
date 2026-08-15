import { useState } from "react";
import { ChartLineUp } from "@phosphor-icons/react";
import { login, signup, type AuthUser } from "../lib/api";
import styles from "./AuthGate.module.css";

// A hand-authored, deterministic "line chart" motif for the auth screen's
// decorative panel - not real market data, just visual texture. Two paths
// so it reads as a chart (a pair of diverging series) rather than a single
// squiggle.
const SHOWCASE_PATH_BULLISH =
  "M0,220 L60,205 L120,230 L180,180 L240,195 L300,140 L360,160 L420,95 L480,120 L540,60 L600,80";
const SHOWCASE_PATH_BEARISH =
  "M0,120 L60,140 L120,110 L180,150 L240,130 L300,175 L360,150 L420,190 L480,165 L540,205 L600,185";

interface AuthGateProps {
  onAuthenticated: (user: AuthUser) => void;
}

type Mode = "login" | "signup";

export default function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPasswordMismatch(false);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords don't match");
      setPasswordMismatch(true);
      return;
    }

    setSubmitting(true);
    try {
      const { user } = mode === "login" ? await login(email, password) : await signup(email, password);
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login");
    setError(null);
    setPasswordMismatch(false);
    setConfirmPassword("");
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.formSide}>
        <div className={styles.card}>
          <div className={styles.brandRow}>
            <span className={styles.brandMark}>
              <ChartLineUp size={18} weight="bold" aria-hidden />
            </span>
            <span className={styles.brand}>StockPulse</span>
          </div>
          <div className={styles.heading}>
            <h1 className={styles.title}>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className={styles.subtitle}>
              {mode === "login"
                ? "Log in to see your live watchlist and alerts."
                : "Track tickers and price alerts in real time."}
            </p>
          </div>
          <form onSubmit={handleSubmit} className={styles.form} aria-label={mode === "login" ? "Log in" : "Sign up"}>
            <div className={styles.field}>
              <label htmlFor="auth-email" className={styles.label}>
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="auth-password" className={styles.label}>
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={mode === "signup" ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
              />
            </div>
            {mode === "signup" && (
              <div className={styles.field}>
                <label htmlFor="auth-confirm-password" className={styles.label}>
                  Confirm password
                </label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  aria-invalid={passwordMismatch}
                  aria-describedby={passwordMismatch ? "auth-error" : undefined}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={styles.input}
                />
              </div>
            )}
            {error && (
              <div id="auth-error" role="alert" className={styles.error}>
                {error}
              </div>
            )}
            <button type="submit" disabled={submitting} className={styles.submitButton}>
              {mode === "login" ? "Log in" : "Sign up"}
            </button>
          </form>
          <div className={styles.toggle}>
            {mode === "login" ? "New here? " : "Already have an account? "}
            <button type="button" onClick={switchMode} className={styles.toggleButton}>
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.showcase} aria-hidden="true">
        <svg className={styles.showcaseChart} viewBox="0 0 600 320" preserveAspectRatio="none">
          <path d={SHOWCASE_PATH_BULLISH} className={styles.showcaseLine} stroke="var(--color-bullish)" opacity="0.8" />
          <path d={SHOWCASE_PATH_BEARISH} className={styles.showcaseLine} stroke="var(--color-bearish)" opacity="0.5" />
        </svg>
        <div className={styles.showcaseContent}>
          <span className={styles.showcaseTitle}>Real-time prices. Zero noise.</span>
          <p className={styles.showcaseBody}>
            Live ticks over WebSocket, price alerts the moment they fire, and a candlestick view for every
            symbol you're tracking.
          </p>
        </div>
      </div>
    </div>
  );
}
