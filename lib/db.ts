import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { mkdirSync } from "node:fs";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "walkorelse.db");
const configuredPath = process.env.DATABASE_FILE_PATH
  ? path.resolve(process.env.DATABASE_FILE_PATH)
  : DEFAULT_DB_PATH;

mkdirSync(path.dirname(configuredPath), { recursive: true });

const db = new DatabaseSync(configuredPath);
db.exec("PRAGMA journal_mode = WAL;");

let schemaReady = false;

export function ensureDbSchema(): void {
  if (schemaReady) {
    return;
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      threshold INTEGER NOT NULL DEFAULT 10000,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      cutoff_time TEXT NOT NULL DEFAULT '21:00',
      paused INTEGER NOT NULL DEFAULT 0,
      tweet_template TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS daily_state (
      date TEXT PRIMARY KEY,
      latest_steps INTEGER NOT NULL,
      last_checked_at TEXT NOT NULL,
      posted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS shame_asset (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_url TEXT,
      storage_key TEXT,
      content_type TEXT NOT NULL,
      original_filename TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (asset_url IS NOT NULL OR storage_key IS NOT NULL)
    );
  `);

  db.exec(
    `INSERT INTO settings (id) VALUES (1) ON CONFLICT(id) DO NOTHING;`
  );

  schemaReady = true;
}

export function getDb(): DatabaseSync {
  ensureDbSchema();
  return db;
}

export function getDatabaseFilePath(): string {
  return configuredPath;
}
