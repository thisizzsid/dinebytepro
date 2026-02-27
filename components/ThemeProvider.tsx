"use client";

import React, { createContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

export const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "light",
  setTheme: () => {},
});

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("dinebyte_theme");
      if (saved === "dark" || saved === "light") return saved as Theme;
      if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    } catch {}
    return "light";
  });

  useEffect(() => {
    try {
      localStorage.setItem("dinebyte_theme", theme);
    } catch {}
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
