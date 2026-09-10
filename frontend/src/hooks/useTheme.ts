import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "stockpulse-theme";

// localStorage throws rather than returning null when site data is blocked —
// SecurityError in Safari's private mode, and in any browser where the user
// has blocked cookies for this origin. Both calls are wrapped because losing
// a colour preference is an acceptable outcome and crashing isn't: the read
// runs inside a useState initializer, so an uncaught throw comes out of the
// first render and takes the app down before anything is on screen.
function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "dark" ? "dark" : "light"; // light is the brand default
  } catch {
    return "light";
  }
}

function persistTheme(theme: Theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Nothing to do about it — the theme still applies for this session.
  }
}

// Reflects the theme onto <html data-theme="..."> (tokens.css keys its
// dark-mode overrides off that attribute) and persists the choice, rather
// than only following prefers-color-scheme - a user who explicitly picks a
// theme should keep it, not have it flip if their OS setting changes.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    persistTheme(theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return { theme, toggleTheme };
}
