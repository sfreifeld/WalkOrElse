import { fetchOuraDailyActivityForDate } from "@/lib/oura-client";
import {
  DailyEnforcementState,
  readDailyEnforcementByDate,
  readSettings,
  upsertDailyEnforcement,
} from "@/lib/persistence";

type EvaluateParams = {
  date?: string;
  dryRun?: boolean;
  force?: boolean;
};

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  const y = get("year");
  const m = get("month");
  const d = get("day");
  const hour = Number(get("hour") || "0");
  const minute = Number(get("minute") || "0");

  return {
    date: `${y}-${m}-${d}`,
    minutesOfDay: hour * 60 + minute,
  };
}

function parseCutoffMinutes(cutoff: string): number {
  const [hh, mm] = cutoff.split(":").map(Number);
  return hh * 60 + mm;
}

export async function evaluateDailyEnforcement(params: EvaluateParams = {}) {
  const settings = await readSettings();
  const now = new Date();
  const nowInTz = getDatePartsInTimeZone(now, settings.timezone);
  const targetDate = params.date ?? nowInTz.date;
  const existing = await readDailyEnforcementByDate(targetDate);

  if (existing?.finalized && !params.force && !params.dryRun) {
    return {
      ok: true,
      reused_finalized: true,
      persisted: true,
      result: existing,
    };
  }

  const cutoffMinutes = parseCutoffMinutes(settings.cutoff_time);
  const isTodayInTz = targetDate === nowInTz.date;
  const isAfterCutoff = !isTodayInTz || nowInTz.minutesOfDay >= cutoffMinutes;

  let outcome: DailyEnforcementState["outcome"] = "pending";
  let reason = "waiting_for_cutoff";
  let finalized = false;
  let steps: number | null = null;
  let ouraDataStatus: DailyEnforcementState["oura_data_status"] = "unavailable";
  let ouraDataDate: string | null = null;

  if (settings.paused) {
    outcome = "skip";
    reason = "paused";
    finalized = true;
  } else if (!isAfterCutoff) {
    outcome = "pending";
    reason = "before_cutoff";
    finalized = false;
  } else {
    try {
      const { date, activity } = await fetchOuraDailyActivityForDate(targetDate);
      ouraDataDate = date;

      if (activity && typeof activity.steps === "number") {
        ouraDataStatus = "available";
        steps = activity.steps;
        outcome = steps >= settings.threshold ? "pass" : "fail";
        reason = outcome === "pass" ? "met_threshold" : "below_threshold";
        finalized = true;
      } else {
        ouraDataStatus = "unavailable";
        outcome = "pending";
        reason = "oura_data_unavailable";
        finalized = false;
      }
    } catch (error) {
      ouraDataStatus = "unavailable";
      outcome = "pending";
      reason = "oura_fetch_error";
      finalized = false;

      const fallback: DailyEnforcementState = {
        date: targetDate,
        outcome,
        reason,
        finalized,
        threshold: settings.threshold,
        timezone: settings.timezone,
        cutoff_time: settings.cutoff_time,
        steps,
        oura_data_status: ouraDataStatus,
        oura_data_date: ouraDataDate,
        evaluated_at: now.toISOString(),
        details_json: {
          dry_run: params.dryRun ?? false,
          now_in_timezone_date: nowInTz.date,
          now_in_timezone_minutes: nowInTz.minutesOfDay,
          fetch_error: error instanceof Error ? error.message : "Unknown error",
        },
      };

      if (!params.dryRun) {
        await upsertDailyEnforcement(fallback);
      }

      return {
        ok: true,
        reused_finalized: false,
        persisted: !params.dryRun,
        result: fallback,
      };
    }
  }

  const result: DailyEnforcementState = {
    date: targetDate,
    outcome,
    reason,
    finalized,
    threshold: settings.threshold,
    timezone: settings.timezone,
    cutoff_time: settings.cutoff_time,
    steps,
    oura_data_status: ouraDataStatus,
    oura_data_date: ouraDataDate,
    evaluated_at: now.toISOString(),
    details_json: {
      dry_run: params.dryRun ?? false,
      now_in_timezone_date: nowInTz.date,
      now_in_timezone_minutes: nowInTz.minutesOfDay,
      cutoff_minutes: cutoffMinutes,
      is_today_in_timezone: isTodayInTz,
    },
  };

  if (!params.dryRun) {
    await upsertDailyEnforcement(result);
  }

  return {
    ok: true,
    reused_finalized: false,
    persisted: !params.dryRun,
    result,
  };
}

export async function inspectDailyEnforcement(date?: string) {
  const settings = await readSettings();
  const nowInTz = getDatePartsInTimeZone(new Date(), settings.timezone);
  const targetDate = date ?? nowInTz.date;
  const existing = await readDailyEnforcementByDate(targetDate);

  return {
    ok: true,
    date: targetDate,
    settings_snapshot: settings,
    existing,
  };
}
