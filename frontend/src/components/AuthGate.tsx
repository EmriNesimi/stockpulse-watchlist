import { useState } from "react";
import { login, signup, type AuthUser } from "../lib/api";
import styles from "./AuthGate.module.css";

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
      <div className={styles.card}>
        <span className={styles.brand}>StockPulse</span>
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
  );
}
