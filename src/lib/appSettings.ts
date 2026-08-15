import { getDb } from "./db";

export type AppTheme = "system" | "light" | "dark";

export type PomodoroSettings = {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  cyclesBeforeLongBreak: number;
};

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  cyclesBeforeLongBreak: 4,
};

export const DEFAULT_THEME: AppTheme = "system";

type SettingRow = {
  value: string;
};

function clampInteger(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<SettingRow[]>("SELECT value FROM app_settings WHERE key = $1", [key]);
  return rows[0]?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value]
  );
}

export async function getPomodoroSettings(): Promise<PomodoroSettings> {
  const raw = await getSetting("pomodoro_settings");
  if (!raw) return DEFAULT_POMODORO_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<PomodoroSettings>;
    return normalizePomodoroSettings(parsed);
  } catch {
    return DEFAULT_POMODORO_SETTINGS;
  }
}

export async function setPomodoroSettings(settings: PomodoroSettings): Promise<void> {
  await setSetting("pomodoro_settings", JSON.stringify(normalizePomodoroSettings(settings)));
}

export function normalizePomodoroSettings(settings: Partial<PomodoroSettings>): PomodoroSettings {
  return {
    focusMin: clampInteger(settings.focusMin ?? DEFAULT_POMODORO_SETTINGS.focusMin, 1, 180, 25),
    shortBreakMin: clampInteger(settings.shortBreakMin ?? DEFAULT_POMODORO_SETTINGS.shortBreakMin, 1, 60, 5),
    longBreakMin: clampInteger(settings.longBreakMin ?? DEFAULT_POMODORO_SETTINGS.longBreakMin, 1, 90, 15),
    cyclesBeforeLongBreak: clampInteger(
      settings.cyclesBeforeLongBreak ?? DEFAULT_POMODORO_SETTINGS.cyclesBeforeLongBreak,
      1,
      12,
      4
    ),
  };
}

export async function getThemePreference(): Promise<AppTheme> {
  const value = await getSetting("theme");
  if (value === "light" || value === "dark" || value === "system") return value;
  return DEFAULT_THEME;
}

export async function setThemePreference(theme: AppTheme): Promise<void> {
  await setSetting("theme", theme);
}
