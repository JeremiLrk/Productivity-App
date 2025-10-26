import Database from "@tauri-apps/plugin-sql";
import { appDataDir, join } from "@tauri-apps/api/path";

let _db: Database | null = null;

export async function getDb() {
  if (_db) return _db;

  const dir = await appDataDir();
  const file = await join(dir, "productivity.sqlite");
  const db = await Database.load(`sqlite:${file}`);

  // wipe any old table and create fresh
  await db.execute(`DROP TABLE IF EXISTS tasks;`);

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

  _db = db;
  return db;
}
