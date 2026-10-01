import { useCallback, useEffect, useState } from "react";
import { emitTo } from "@tauri-apps/api/event";
import { getThemePreference, setThemePreference, type AppTheme } from "@/lib/appSettings";

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);

  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
  document.body.style.background = isDark ? "#101010" : "#ffffff";
  document.body.style.color = isDark ? "#fafafa" : "#111111";
}

export function useThemePreference() {
  const [theme, setThemeState] = useState<AppTheme>("system");

  useEffect(() => {
    void getThemePreference().then((storedTheme) => {
      setThemeState(storedTheme);
      applyTheme(storedTheme);
    });
  }, []);

  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyTheme("system");
      void emitTo("timer-popout", "theme-changed", "system").catch(() => undefined);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = useCallback(async (nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
    await setThemePreference(nextTheme);
    void emitTo("timer-popout", "theme-changed", nextTheme).catch(() => undefined);
  }, []);

  return { theme, setTheme };
}
