import { getDb } from "./db";

type TaskBackupRow = {
  id: number;
  title: string;
  done: number;
  priority: string;
  status: string;
};

type DailyFocusBackupRow = {
  date: string;
  minutes_completed: number;
  goal_minutes: number;
};

type AppSettingBackupRow = {
  key: string;
  value: string;
};

type AppBackup = {
  version: 1;
  exportedAt: string;
  tasks: TaskBackupRow[];
  dailyFocus: DailyFocusBackupRow[];
  appSettings: AppSettingBackupRow[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireArray(value: unknown, name: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  return value;
}

export async function exportAppData(): Promise<string> {
  const db = await getDb();
  const backup: AppBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks: await db.select<TaskBackupRow[]>("SELECT id, title, done, priority, status FROM tasks ORDER BY id"),
    dailyFocus: await db.select<DailyFocusBackupRow[]>(
      "SELECT date, minutes_completed, goal_minutes FROM daily_focus ORDER BY date"
    ),
    appSettings: await db.select<AppSettingBackupRow[]>("SELECT key, value FROM app_settings ORDER BY key"),
  };

  return JSON.stringify(backup, null, 2);
}

export async function importAppData(raw: string): Promise<void> {
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed) || parsed.version !== 1) {
    throw new Error("Unsupported backup file");
  }

  const tasks = requireArray(parsed.tasks, "tasks") as TaskBackupRow[];
  const dailyFocus = requireArray(parsed.dailyFocus, "dailyFocus") as DailyFocusBackupRow[];
  const appSettings = requireArray(parsed.appSettings, "appSettings") as AppSettingBackupRow[];
  const db = await getDb();

  await db.execute("DELETE FROM tasks");
  await db.execute("DELETE FROM daily_focus");
  await db.execute("DELETE FROM app_settings");

  for (const setting of appSettings) {
    await db.execute("INSERT INTO app_settings (key, value) VALUES ($1, $2)", [setting.key, setting.value]);
  }

  for (const day of dailyFocus) {
    await db.execute(
      "INSERT INTO daily_focus (date, minutes_completed, goal_minutes) VALUES ($1, $2, $3)",
      [day.date, day.minutes_completed, day.goal_minutes]
    );
  }

  for (const task of tasks) {
    await db.execute(
      "INSERT INTO tasks (id, title, done, priority, status) VALUES ($1, $2, $3, $4, $5)",
      [task.id, task.title, task.done ? 1 : 0, task.priority, task.status]
    );
  }
}

export async function resetLocalData(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM tasks");
  await db.execute("DELETE FROM daily_focus");
  await db.execute("DELETE FROM app_settings");
  await db.execute("INSERT INTO app_settings (key, value) VALUES ('daily_goal_minutes', '120')");
}
