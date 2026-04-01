import { sql } from "@vercel/postgres";
import { ensureDbSchema } from "@/lib/db";

export type AppSettings = {
  threshold: number;
  timezone: string;
  cutoff_time: string;
  paused: boolean;
  tweet_template: string;
  shame_asset_id: number | null;
  oura_access_token: string | null;
};

export type DailyState = {
  date: string;
  latest_steps: number;
  last_checked_at: string;
  posted: boolean;
};

export type ShameAsset = {
  id: number;
  asset_url: string | null;
  storage_key: string | null;
  content_type: string;
  original_filename: string | null;
  created_at: string;
};

export async function readSettings(): Promise<AppSettings> {
  await ensureDbSchema();

  const result = await sql<{
    threshold: number;
    timezone: string;
    cutoff_time: string;
    paused: boolean;
    tweet_template: string;
    shame_asset_id: number | null;
    oura_access_token: string | null;
  }>`
    SELECT threshold, timezone, cutoff_time, paused, tweet_template, shame_asset_id, oura_access_token
    FROM settings
    WHERE id = 1
  `;

  const row = result.rows[0];

  if (!row) {
    return {
      threshold: 10000,
      timezone: "UTC",
      cutoff_time: "21:00",
      paused: false,
      tweet_template: "",
      shame_asset_id: null,
      oura_access_token: null,
    };
  }

  return row;
}

export async function updateSettings(settings: {
  threshold: number;
  timezone: string;
  cutoff_time: string;
  paused: boolean;
  tweet_template: string;
}): Promise<void> {
  await ensureDbSchema();

  await sql`
    UPDATE settings
    SET
      threshold = ${settings.threshold},
      timezone = ${settings.timezone},
      cutoff_time = ${settings.cutoff_time},
      paused = ${settings.paused},
      tweet_template = ${settings.tweet_template}
    WHERE id = 1
  `;
}

export async function upsertDailyState(state: DailyState): Promise<void> {
  await ensureDbSchema();

  await sql`
    INSERT INTO daily_state (date, latest_steps, last_checked_at, posted)
    VALUES (${state.date}, ${state.latest_steps}, ${state.last_checked_at}, ${state.posted})
    ON CONFLICT(date)
    DO UPDATE SET
      latest_steps = excluded.latest_steps,
      last_checked_at = excluded.last_checked_at,
      posted = excluded.posted
  `;
}

export async function readLatestDailyState(): Promise<DailyState | null> {
  await ensureDbSchema();

  const result = await sql<{
    date: string;
    latest_steps: number;
    last_checked_at: string;
    posted: boolean;
  }>`
    SELECT date::text AS date, latest_steps, last_checked_at::text AS last_checked_at, posted
    FROM daily_state
    ORDER BY date DESC
    LIMIT 1
  `;

  return result.rows[0] ?? null;
}

export async function createShameAsset(params: {
  asset_url?: string;
  storage_key?: string;
  content_type: string;
  original_filename?: string;
}): Promise<number> {
  await ensureDbSchema();

  const result = await sql<{ id: number }>`
    INSERT INTO shame_asset (asset_url, storage_key, content_type, original_filename)
    VALUES (${params.asset_url ?? null}, ${params.storage_key ?? null}, ${params.content_type}, ${
    params.original_filename ?? null
  })
    RETURNING id
  `;

  const row = result.rows[0];

  if (!row) {
    throw new Error("Failed to create shame asset record.");
  }

  return row.id;
}

export async function readShameAssetById(id: number): Promise<ShameAsset | null> {
  await ensureDbSchema();

  const result = await sql<ShameAsset>`
    SELECT id, asset_url, storage_key, content_type, original_filename, created_at::text AS created_at
    FROM shame_asset
    WHERE id = ${id}
  `;

  return result.rows[0] ?? null;
}

export async function setCurrentShameAssetId(shameAssetId: number | null): Promise<void> {
  await ensureDbSchema();
  await sql`UPDATE settings SET shame_asset_id = ${shameAssetId} WHERE id = 1`;
}

export async function listShameAssets(): Promise<ShameAsset[]> {
  await ensureDbSchema();

  const result = await sql<ShameAsset>`
    SELECT id, asset_url, storage_key, content_type, original_filename, created_at::text AS created_at
    FROM shame_asset
    ORDER BY created_at DESC
  `;

  return result.rows;
}

export async function readPersistedOuraAccessToken(): Promise<string | null> {
  const settings = await readSettings();
  return settings.oura_access_token;
}

export async function writePersistedOuraAccessToken(accessToken: string): Promise<void> {
  await ensureDbSchema();
  await sql`UPDATE settings SET oura_access_token = ${accessToken} WHERE id = 1`;
}
