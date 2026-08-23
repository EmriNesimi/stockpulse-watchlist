import { useEffect, useRef, useState } from "react";
import { ChartLineUp } from "@phosphor-icons/react";
import { login, requestPasswordReset, resetPassword, signup, type AuthUser } from "../lib/api";
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
  /** Present when the user arrived from a password-reset email link. */
  resetToken?: string | null;
}

// "reset" isn't reachable from the UI — it's entered only by arriving with a
// token in the URL, which App.tsx passes down.
type Mode = "login" | "signup" | "forgot" | "reset";

const TITLES: Record<Mode, string> = {
  login: "Welcome back",
  signup: "Join StockPulse",
  forgot: "Reset your password",
  reset: "Choose a new password",
};

const SUBTITLES: Record<Mode, string> = {
  login: "Log in to your dashboard",
  signup: "Create your account for free",
  forgot: "We'll email you a link if that address has an account",
  reset: "Pick something you haven't used here before",
};

// The form's accessible name describes the action, not the display heading —
// "Welcome back" tells a screen-reader user nothing about what the form does.
const FORM_LABELS: Record<Mode, string> = {
  login: "Log in",
  signup: "Sign up",
  forgot: "Reset your password",
  reset: "Choose a new password",
};

const SUBMIT_LABELS: Record<Mode, string> = {
  login: "Log in",
  signup: "Get started",
  forgot: "Send reset link",
  reset: "Update password",
};

export default function AuthGate({ onAuthenticated, theme, onToggleTheme, verifyEmailNotice, resetToken }: AuthGateProps) {
  const [mode, setMode] = useState<Mode>(resetToken ? "reset" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const initialMode = useRef(mode);

  // Switching mode swaps the whole form out from under the user, and the
  // control that triggered it is often inside the block being unmounted —
  // "Forgot your password?" only renders in login mode, so clicking it left
  // focus on a removed node and the browser fell back to <body>. Moving focus
  // to the new heading keeps the keyboard position sane and gives screen
  // readers something to announce, which nothing else here did.
  useEffect(() => {
    if (mode === initialMode.current) return; // don't steal focus on first paint
    headingRef.current?.focus();
  }, [mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPasswordMismatch(false);

    if ((mode === "signup" || mode === "reset") && password !== confirmPassword) {
      setError("Passwords don't match");
      setPasswordMismatch(true);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "forgot") {
        const { message } = await requestPasswordReset(email);
        setMode("login");
        setPassword("");
        setNotice(message);
      } else if (mode === "reset") {
        await resetPassword(resetToken!, password);
        // Reset doesn't sign you in, by design on the backend — so land on
        // the login form with the new password rather than pretending to.
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setNotice("Password updated. Log in with your new password.");
      } else if (mode === "login") {
        const { user } = await login(email, password);
        onAuthenticated(user);
      } else {
        // Signup never signs you in - the response is identical whether or
        // not the address already had an account, so there's nothing to log
        // in with. Drop the user on the login form with a neutral message.
        const { message } = await signup(email, password);
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setNotice(message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function goTo(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setPasswordMismatch(false);
    setPassword("");
    setConfirmPassword("");
  }

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login");
    setError(null);
    setNotice(null);
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

          {notice && (
            <div role="status" className={styles.verifySuccess}>
              {notice}
            </div>
          )}
          {verifyEmailNotice && (
            <div
              role={verifyEmailNotice.kind === "error" ? "alert" : "status"}
              className={verifyEmailNotice.kind === "error" ? styles.error : styles.verifySuccess}
            >
              {verifyEmailNotice.message}
            </div>
          )}

          <div className={styles.heading}>
            <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
              {TITLES[mode]}
            </h1>
            <p className={styles.subtitle}>{SUBTITLES[mode]}</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form} aria-label={FORM_LABELS[mode]}>
            {mode !== "reset" && (
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
            )}

            {mode !== "forgot" && (
            <div className={styles.field}>
              <label htmlFor="auth-password" className={styles.label}>
                {mode === "reset" ? "New password" : "Password"}
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="Password"
                required
                minLength={mode === "signup" || mode === "reset" ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
              />
            </div>
            )}

            {(mode === "signup" || mode === "reset") && (
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
              {SUBMIT_LABELS[mode]}
            </button>
          </form>

          {mode === "login" && (
            <div className={styles.toggle}>
              <button type="button" onClick={() => goTo("forgot")} className={styles.toggleButton}>
                Forgot your password?
              </button>
            </div>
          )}

          <div className={styles.toggle}>
            {mode === "login" && "New here? "}
            {mode === "signup" && "Already have an account? "}
            {(mode === "forgot" || mode === "reset") && "Remembered it? "}
            <button
              type="button"
              onClick={() => (mode === "login" || mode === "signup" ? switchMode() : goTo("login"))}
              className={styles.toggleButton}
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </div>
        </div>
      </div>

      {/* Only the chart is decorative — the copy underneath is real content
          and was being hidden from screen readers by sharing this wrapper. */}
      <div className={styles.showcase}>
        <svg className={styles.showcaseChart} viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
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
