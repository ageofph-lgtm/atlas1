import { useState, useEffect, useCallback } from "react";

export const THEMES = ["still-light", "still-dark", "retro-light", "retro-dark"];
export const DEFAULT_THEME = "still-dark";
const STORAGE_KEY = "atlas-theme";

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(stored) ? stored : DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (_e) {}
  }, [theme]);

  const setTheme = useCallback((t) => {
    if (THEMES.includes(t)) setThemeState(t);
  }, []);

  return { theme, setTheme, themes: THEMES };
}