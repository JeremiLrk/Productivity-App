import { getDb } from "./db";

export type DailyFocus = {
  date: string;
  minutesCompleted: number;
  goalMinutes: number;
};

type DailyFocusRow = {
  date: string;
  minutes_completed: number;
  goal_minutes: number;
};

type SettingRow = {
  value: string;
};

const DAILY_GOAL_KEY = "daily_goal_minutes";
const DEFAULT_DAILY_GOAL = 120;

function clampGoal(minutes: number) {
  if (!Number.isFinite(minutes)) return DEFAULT_DAILY_GOAL;
  return Math.min(1440, Math.max(1, Math.floor(minutes)));
}

function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayLocalDateString() {
  return toLocalDateString(new Date());
}

function rowToDailyFocus(row: DailyFocusRow): DailyFocus {
  return {
    date: row.date,
    minutesCompleted: row.minutes_completed,
    goalMinutes: row.goal_minutes,
  };
}

export async function getDailyGoal(): Promise<number> {
  const db = await getDb();
  const rows = await db.select<SettingRow[]>(
    `SELECT value FROM app_settings WHERE key = ? LIMIT 1`,
    [DAILY_GOAL_KEY]
  );

  if (!rows[0]) {
    await setDailyGoal(DEFAULT_DAILY_GOAL);
    return DEFAULT_DAILY_GOAL;
  }

  return clampGoal(Number(rows[0].value));
}

export async function setDailyGoal(minutes: number): Promise<void> {
  const next = clampGoal(minutes);
  const today = todayLocalDateString();
  const db = await getDb();

  await db.execute(
    `INSERT INTO app_settings (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [DAILY_GOAL_KEY, String(next)]
  );

  await db.execute(
    `INSERT INTO daily_focus (date, minutes_completed, goal_minutes)
     VALUES (?, 0, ?)
     ON CONFLICT(date) DO UPDATE SET goal_minutes = excluded.goal_minutes`,
    [today, next]
  );
}

export async function getTodayFocus(): Promise<DailyFocus> {
  const db = await getDb();
  const today = todayLocalDateString();
  const goal = await getDailyGoal();

  await db.execute(
    `INSERT INTO daily_focus (date, minutes_completed, goal_minutes)
     VALUES (?, 0, ?)
     ON CONFLICT(date) DO NOTHING`,
    [today, goal]
  );

  const rows = await db.select<DailyFocusRow[]>(
    `SELECT date, minutes_completed, goal_minutes
     FROM daily_focus
     WHERE date = ?
     LIMIT 1`,
    [today]
  );

  return rows[0] ? rowToDailyFocus(rows[0]) : { date: today, minutesCompleted: 0, goalMinutes: goal };
}

export async function addFocusMinutesForToday(minutes: number): Promise<void> {
  const amount = Math.max(0, Math.floor(minutes));
  if (amount === 0) return;

  const db = await getDb();
  const today = todayLocalDateString();
  const goal = await getDailyGoal();

  await db.execute(
    `INSERT INTO daily_focus (date, minutes_completed, goal_minutes)
     VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       minutes_completed = minutes_completed + excluded.minutes_completed`,
    [today, amount, goal]
  );
}

export async function getFocusDaysSince(date: string): Promise<DailyFocus[]> {
  const db = await getDb();
  const rows = await db.select<DailyFocusRow[]>(
    `SELECT date, minutes_completed, goal_minutes
     FROM daily_focus
     WHERE date >= ?
     ORDER BY date ASC`,
    [date]
  );

  return rows.map(rowToDailyFocus);
}
