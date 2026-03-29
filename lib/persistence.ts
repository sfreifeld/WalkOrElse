import { getDb } from "@/lib/db";

export type AppSettings = {
  threshold: number;
  timezone: string;
  cutoff_time: string;
  paused: boolean;
  tweet_template: string;
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

export function readSettings(): AppSettings {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT threshold, timezone, cutoff_time, paused, tweet_template
       FROM settings
       WHERE id = 1`
    )
    .get() as
    | {
        threshold: number;
        timezone: string;
        cutoff_time: string;
        paused: number;
        tweet_template: string;
      }
    | undefined;

  if (!row) {
    return {
      threshold: 10000,
      timezone: "UTC",
      cutoff_time: "21:00",
      paused: false,
      tweet_template: "",
    };
  }

  return {
    threshold: row.threshold,
    timezone: row.timezone,
    cutoff_time: row.cutoff_time,
    paused: row.paused === 1,
    tweet_template: row.tweet_template,
  };
}

export function upsertDailyState(state: DailyState): void {
  const db = getDb();

  db.prepare(
    `INSERT INTO daily_state (date, latest_steps, last_checked_at, posted)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(date)
     DO UPDATE SET
       latest_steps = excluded.latest_steps,
       last_checked_at = excluded.last_checked_at,
       posted = excluded.posted`
  ).run(
    state.date,
    state.latest_steps,
    state.last_checked_at,
    state.posted ? 1 : 0
  );
}

export function readLatestDailyState(): DailyState | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT date, latest_steps, last_checked_at, posted
       FROM daily_state
       ORDER BY date DESC
       LIMIT 1`
    )
    .get() as
    | {
        date: string;
        latest_steps: number;
        last_checked_at: string;
        posted: number;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    date: row.date,
    latest_steps: row.latest_steps,
    last_checked_at: row.last_checked_at,
    posted: row.posted === 1,
  };
}

export function createShameAsset(params: {
  asset_url?: string;
  storage_key?: string;
  content_type: string;
  original_filename?: string;
}): number {
  const db = getDb();

  const result = db
    .prepare(
      `INSERT INTO shame_asset (asset_url, storage_key, content_type, original_filename)
       VALUES (?, ?, ?, ?)`
    )
    .run(
      params.asset_url ?? null,
      params.storage_key ?? null,
      params.content_type,
      params.original_filename ?? null
    );

  return Number(result.lastInsertRowid);
}

export function listShameAssets(): ShameAsset[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, asset_url, storage_key, content_type, original_filename, created_at
       FROM shame_asset
       ORDER BY created_at DESC`
    )
    .all() as Array<ShameAsset>;

  return rows;
}
