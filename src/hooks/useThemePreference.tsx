import { useCallback, useEffect, useState } from "react";
import { getThemePreference, setThemePreference, type AppTheme } from "@/lib/appSettings";

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.classList.toggle("dark", theme === "dark" || (theme === "system" && prefersDark));
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
    const handleChange = () => applyTheme("system");
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = useCallback(async (nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
    await setThemePreference(nextTheme);
  }, []);

  return { theme, setTheme };
}
