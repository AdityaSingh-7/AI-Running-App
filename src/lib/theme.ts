"use client";

import { createContext, useContext } from "react";

export type Theme = "light" | "dark" | "system";

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** The actual applied theme after resolving "system" */
  resolvedTheme: "light" | "dark";
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "dark",
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export const THEME_STORAGE_KEY = "runcoach-theme";
