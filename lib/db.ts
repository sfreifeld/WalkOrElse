import { sql } from "@vercel/postgres";

let schemaReady = false;
let schemaPromise: Promise<void> | null = null;

function getDatabaseUrl(): string {
  const value =
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.DATABASE_URL;

  if (!value) {
    throw new Error(
      "Missing hosted Postgres connection string. Set POSTGRES_URL (Vercel Postgres) or DATABASE_URL (Neon)."
    );
  }

  return value;
}

async function ensureSettingsColumns(): Promise<void> {
  await sql`
    ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS shame_asset_id INTEGER;
  `;

  await sql`
    ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS oura_access_token TEXT;
  `;
}

export async function ensureDbSchema(): Promise<void> {
  if (schemaReady) {
    return;
  }

  if (!schemaPromise) {
    schemaPromise = (async () => {
      // Ensure this throws a clear message before any SQL is attempted.
      getDatabaseUrl();

      await sql`
        CREATE TABLE IF NOT EXISTS shame_asset (
          id SERIAL PRIMARY KEY,
          asset_url TEXT,
          storage_key TEXT,
          content_type TEXT NOT NULL,
          original_filename TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CHECK (asset_url IS NOT NULL OR storage_key IS NOT NULL)
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          threshold INTEGER NOT NULL DEFAULT 10000,
          timezone TEXT NOT NULL DEFAULT 'UTC',
          cutoff_time TEXT NOT NULL DEFAULT '21:00',
          paused BOOLEAN NOT NULL DEFAULT FALSE,
          tweet_template TEXT NOT NULL DEFAULT '',
          shame_asset_id INTEGER REFERENCES shame_asset(id) ON DELETE SET NULL,
          oura_access_token TEXT
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS daily_state (
          date DATE PRIMARY KEY,
          latest_steps INTEGER NOT NULL,
          last_checked_at TIMESTAMPTZ NOT NULL,
          posted BOOLEAN NOT NULL DEFAULT FALSE
        );
      `;

      await ensureSettingsColumns();

      await sql`
        INSERT INTO settings (id)
        VALUES (1)
        ON CONFLICT (id) DO NOTHING;
      `;

      schemaReady = true;
    })();
  }

  await schemaPromise;
}

export function getDatabaseConnectionString(): string {
  return getDatabaseUrl();
}
