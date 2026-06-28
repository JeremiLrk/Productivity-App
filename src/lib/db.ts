import Database from "@tauri-apps/plugin-sql";
import { appDataDir, join } from "@tauri-apps/api/path";

let _db: Database | null = null;

export async function getDb() {
  if (_db) return _db;

  const dir = await appDataDir();
  const file = await join(dir, "productivity.sqlite");
  const db = await Database.load(`sqlite:${file}`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      title     TEXT NOT NULL,
      done      BOOLEAN DEFAULT 0,
      priority  TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low','medium','high')),
      status    TEXT NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo','in_progress','finished'))
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS daily_focus (
      date              TEXT PRIMARY KEY,
      minutes_completed INTEGER NOT NULL DEFAULT 0,
      goal_minutes      INTEGER NOT NULL
    );
  `);

  await db.execute(
    `INSERT OR IGNORE INTO app_settings (key, value) VALUES ('daily_goal_minutes', '120');`
  );

  _db = db;
  return db;
}
