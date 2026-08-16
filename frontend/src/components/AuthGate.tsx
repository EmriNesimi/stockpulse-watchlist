import { useState } from "react";
import { ChartLineUp } from "@phosphor-icons/react";
import { login, signup, type AuthUser } from "../lib/api";
import type { Theme } from "../hooks/useTheme";
import ThemeToggle from "./ThemeToggle";
import styles from "./AuthGate.module.css";

// Hand-authored curves for the hero panel's chart motif - deliberately smooth
// and decorative rather than plotted from data, since nothing real is being
// shown here. Three overlapping series read as a market visualisation without
// pretending to be one.
const HERO_TEAL = "M-20,620 C80,600 140,420 240,432 C330,443 360,300 460,250 C540,210 580,262 620,238";
const HERO_AMBER = "M-20,430 C60,472 130,300 210,232 C280,172 330,300 400,380 C470,456 540,420 620,470";
const HERO_CYAN = "M-20,762 C90,730 150,662 260,650 C370,638 420,560 520,540 C570,530 600,546 620,538";

interface VerifyEmailNotice {
  kind: "success" | "error";
  message: string;
}

interface AuthGateProps {
  onAuthenticated: (user: AuthUser) => void;
  theme: Theme;
  onToggleTheme: () => void;
  verifyEmailNotice?: VerifyEmailNotice | null;
}

type Mode = "login" | "signup";

export default function AuthGate({ onAuthenticated, theme, onToggleTheme, verifyEmailNotice }: AuthGateProps) {
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
              <ChartLineUp size={19} weight="bold" aria-hidden />
            </span>
            <span className={styles.brand}>StockPulse</span>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>

          {verifyEmailNotice && (
            <div
              role={verifyEmailNotice.kind === "error" ? "alert" : "status"}
              className={verifyEmailNotice.kind === "error" ? styles.error : styles.verifySuccess}
            >
              {verifyEmailNotice.message}
            </div>
          )}

          <div className={styles.heading}>
            <h1 className={styles.title}>
              {mode === "login" ? "Welcome back" : "Join StockPulse"}
            </h1>
            <p className={styles.subtitle}>
              {mode === "login" ? "Log in to your dashboard" : "Create your account for free"}
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
                placeholder="you@example.com"
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
                placeholder="Password"
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
                  placeholder="Password"
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
              {mode === "login" ? "Log in" : "Get started"}
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
        <svg className={styles.showcaseChart} viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="heroGlow" cx="30%" cy="20%" r="70%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </radialGradient>
            <pattern id="heroDots" width="26" height="26" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#ffffff" fillOpacity="0.07" />
            </pattern>
          </defs>

          <rect width="600" height="900" fill="url(#heroDots)" />
          <rect width="600" height="900" fill="url(#heroGlow)" />

          <path d={HERO_CYAN} fill="none" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
          <path d={HERO_AMBER} fill="none" stroke="#f59e0b" strokeOpacity="0.75" strokeWidth="3" strokeLinecap="round" />
          <path d={HERO_TEAL} fill="none" stroke="#2dd4bf" strokeWidth="3.5" strokeLinecap="round" />
        </svg>

        <div className={styles.showcaseContent}>
          <span className={styles.showcaseTitle}>Real-time prices. Zero noise.</span>
          <p className={styles.showcaseBody}>
            Live ticks over WebSocket, price alerts the moment they fire, and a candlestick view for every symbol
            you're tracking.
          </p>
        </div>
      </div>
    </div>
  );
}
