"use client";

import * as React from "react";
import { ThemeContext, THEME_STORAGE_KEY } from "@/lib/theme";
import type { Theme } from "@/lib/theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">(
    "dark"
  );

  // On mount: read persisted preference, apply it
  React.useEffect(() => {
    const stored = (localStorage.getItem(THEME_STORAGE_KEY) as Theme) ?? "system";
    setThemeState(stored);
    const resolved = stored === "system" ? getSystemTheme() : stored;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Listen for OS preference changes when theme === "system"
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setThemeState((current) => {
        if (current === "system") {
          const resolved = e.matches ? "dark" : "light";
          setResolvedTheme(resolved);
          applyTheme(resolved);
        }
        return current;
      });
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setTheme = React.useCallback((next: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setThemeState(next);
    const resolved = next === "system" ? getSystemTheme() : next;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
