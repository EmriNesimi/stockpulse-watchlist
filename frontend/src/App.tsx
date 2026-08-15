import { useEffect, useState } from "react";
import AuthGate from "./components/AuthGate";
import Dashboard from "./Dashboard";
import { getCurrentUser, logout, verifyEmail, type AuthUser } from "./lib/api";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

export default function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [user, setUser] = useState<AuthUser | null>(null);
  // Set when the page loads with ?token=... (the link from the
  // verification email) - null the rest of the time. Doesn't require being
  // signed in as the account the link belongs to; it just confirms the
  // email and, if that happens to be the currently-signed-in user, flips
  // their emailVerified locally so the banner clears without a refetch.
  const [emailVerifyResult, setEmailVerifyResult] = useState<"success" | "error" | null>(null);
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
    const token = new URLSearchParams(window.location.search).get("token");
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

  async function handleSignOut() {
    await logout().catch(() => {
      /* cookie may already be gone server-side; clearing local state either way */
    });
    setUser(null);
    setAuthStatus("unauthenticated");
  }

  if (authStatus === "checking") {
    return null;
  }

  if (authStatus === "unauthenticated" || !user) {
    return (
      <AuthGate
        onAuthenticated={handleAuthenticated}
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
  return <Dashboard key={user.id} user={user} onSignOut={handleSignOut} />;
}
