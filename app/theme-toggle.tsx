"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Theme = "light" | "dark" | "system";

const THEMES = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

const STORAGE_KEY = "hgiys-theme";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isTheme(saved)) setTheme(saved);
    } catch {
      // Keep the system default when storage is unavailable.
    }
  }, []);

  const selectTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // The selected theme still applies for the current page.
    }
  };

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="flex shrink-0 rounded-[9px] border border-line bg-bg-2 p-0.5 text-ink-3"
    >
      {THEMES.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={`${label} theme`}
          aria-pressed={theme === value}
          title={label}
          onClick={() => selectTheme(value)}
          className={`flex size-6 cursor-pointer items-center justify-center rounded-md border-0 transition-[color,background-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
            theme === value
              ? "bg-line-2 text-ink shadow-sm"
              : "bg-transparent text-ink-3 hover:text-ink-2"
          }`}
        >
          <Icon className="size-3" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
