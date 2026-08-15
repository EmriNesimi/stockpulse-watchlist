import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "stockpulse-theme";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" ? "light" : "dark"; // dark is the brand default
}

// Reflects the theme onto <html data-theme="..."> (tokens.css keys its
// light-mode overrides off that attribute) and persists the choice, rather
// than only following prefers-color-scheme - a user who explicitly picks a
// theme should keep it, not have it flip if their OS setting changes.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return { theme, toggleTheme };
}
