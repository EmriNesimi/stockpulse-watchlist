import { useEffect, useState } from "react";
import AuthGate from "./components/AuthGate";
import Dashboard from "./Dashboard";
import { useTheme } from "./hooks/useTheme";
import { getCurrentUser, logout, verifyEmail, type AuthUser } from "./lib/api";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

export default function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [user, setUser] = useState<AuthUser | null>(null);
  const { theme, toggleTheme } = useTheme();
  // Set when the page loads with ?token=... (the link from the
  // verification email) - null the rest of the time. Doesn't require being
  // signed in as the account the link belongs to; it just confirms the
  // email and, if that happens to be the currently-signed-in user, flips
  // their emailVerified locally so the banner clears without a refetch.
  const [emailVerifyResult, setEmailVerifyResult] = useState<"success" | "error" | null>(null);
  // Read once at mount, before the effect below strips the query string.
  // ?reset= rather than ?token= because there's no router to tell the two
  // email links apart by path — the parameter name is what distinguishes them.
  const [resetToken] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("reset")
  );
  const [emailVerifyMessage, setEmailVerifyMessage] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then(({ user }) => {
        setUser(user);
        setAuthStatus("authenticated");
      })
      .catch(() => setAuthStatus("unauthenticated"));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // A reset link also needs the URL cleaned up, but it's handled by
    // AuthGate rather than consumed here.
    if (params.get("reset")) {
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    const token = params.get("token");
    if (!token) return;
    // Strip the token from the URL immediately so a refresh doesn't
    // re-consume it (it's single-use server-side anyway, but a stale
    // link sitting in the address bar is still worth cleaning up).
    window.history.replaceState({}, "", window.location.pathname);

    verifyEmail(token)
      .then(({ user: verifiedUser }) => {
        setEmailVerifyResult("success");
        setUser((prev) => (prev && prev.id === verifiedUser.id ? verifiedUser : prev));
      })
      .catch((err) => {
        setEmailVerifyResult("error");
        setEmailVerifyMessage(err instanceof Error ? err.message : "Verification failed");
      });
  }, []);

  function handleAuthenticated(authenticatedUser: AuthUser) {
    setUser(authenticatedUser);
    setAuthStatus("authenticated");
  }

  // Split from handleSignOut because signing out everywhere has already ended
  // the session server-side — calling logout again afterwards would be a
  // pointless request against a cookie that's already dead.
  function handleSessionEnded() {
    setUser(null);
    setAuthStatus("unauthenticated");
  }

  async function handleSignOut() {
    await logout().catch(() => {
      /* cookie may already be gone server-side; clearing local state either way */
    });
    handleSessionEnded();
  }

  if (authStatus === "checking") {
    return null;
  }

  if (authStatus === "unauthenticated" || !user) {
    return (
      <AuthGate
        resetToken={resetToken}
        onAuthenticated={handleAuthenticated}
        theme={theme}
        onToggleTheme={toggleTheme}
        verifyEmailNotice={
          emailVerifyResult === "success"
            ? { kind: "success", message: "Email verified — you can log in now." }
            : emailVerifyResult === "error"
              ? { kind: "error", message: emailVerifyMessage ?? "Verification failed" }
              : null
        }
      />
    );
  }

  // key={user.id} forces a full remount of Dashboard (and everything it
  // owns - watchlist, prices, error/alert toasts) whenever a different
  // user signs in, instead of that state quietly carrying over from
  // whoever was signed in before.
  return (
    <Dashboard
        onSignedOutEverywhere={handleSessionEnded} key={user.id} user={user} onSignOut={handleSignOut} theme={theme} onToggleTheme={toggleTheme} />
  );
}
