import { useEffect, useState } from "react";
import AuthGate from "./components/AuthGate";
import Dashboard from "./Dashboard";
import { getCurrentUser, logout, type AuthUser } from "./lib/api";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

export default function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then(({ user }) => {
        setUser(user);
        setAuthStatus("authenticated");
      })
      .catch(() => setAuthStatus("unauthenticated"));
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
    return <AuthGate onAuthenticated={handleAuthenticated} />;
  }

  // key={user.id} forces a full remount of Dashboard (and everything it
  // owns - watchlist, prices, error/alert toasts) whenever a different
  // user signs in, instead of that state quietly carrying over from
  // whoever was signed in before.
  return <Dashboard key={user.id} user={user} onSignOut={handleSignOut} />;
}
