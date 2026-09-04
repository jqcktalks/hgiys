"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

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
      className="flex shrink-0 rounded-lg bg-line-2 p-0.5 text-[10px] font-semibold text-ink-3 sm:text-[11px]"
    >
      {THEMES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          onClick={() => selectTheme(value)}
          className={`cursor-pointer rounded-md border-0 px-1 py-1 leading-none transition-[color,background-color,box-shadow] sm:px-2 ${
            theme === value
              ? "bg-bg text-ink shadow-sm"
              : "bg-transparent text-ink-3 hover:text-ink-2"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
