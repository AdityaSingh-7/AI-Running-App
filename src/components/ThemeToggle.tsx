"use client";

import * as React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/lib/theme";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const CYCLE: Theme[] = ["light", "dark", "system"];

const icons: Record<Theme, React.ElementType> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const labels: Record<Theme, string> = {
  light: "Light mode",
  dark: "Dark mode",
  system: "System theme",
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  function cycle() {
    const current = CYCLE.indexOf(theme);
    const next = CYCLE[(current + 1) % CYCLE.length];
    setTheme(next);
  }

  const Icon = icons[theme];

  return (
    <button
      onClick={cycle}
      aria-label={labels[theme]}
      title={labels[theme]}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-2 transition-colors",
        "text-foreground/70 hover:text-foreground hover:bg-muted",
        className
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
