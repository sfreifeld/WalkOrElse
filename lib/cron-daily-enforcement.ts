import { evaluateDailyEnforcement } from "@/lib/enforcement";
import { readSettings } from "@/lib/persistence";

type CronStatus =
  | "before_cutoff"
  | "skipped_paused"
  | "missing_data"
  | "passed"
  | "failed";

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  const year = get("year");
  const month = get("month");
  const day = get("day");

  return {
    date: `${year}-${month}-${day}`,
    time: `${get("hour")}:${get("minute")}:${get("second")}`,
  };
}

function toCronStatus(params: {
  outcome: "pass" | "fail" | "skip" | "pending";
  reason: string;
}): CronStatus {
  if (params.outcome === "pass") {
    return "passed";
  }

  if (params.outcome === "fail") {
    return "failed";
  }

  if (params.outcome === "skip" || params.reason === "paused") {
    return "skipped_paused";
  }

  if (params.reason === "before_cutoff") {
    return "before_cutoff";
  }

  return "missing_data";
}

function buildSummary(params: {
  status: CronStatus;
  date: string;
  threshold: number;
  steps: number | null;
  cutoffTime: string;
  timezone: string;
  reason: string;
  dryRun: boolean;
}): string {
  const modePrefix = params.dryRun ? "[dry-run] " : "";

  switch (params.status) {
    case "passed":
      return `${modePrefix}Passed for ${params.date}: ${params.steps ?? "unknown"} >= ${params.threshold} before ${params.cutoffTime} (${params.timezone}).`;
    case "failed":
      return `${modePrefix}Failed for ${params.date}: ${params.steps ?? "unknown"} < ${params.threshold} at cutoff ${params.cutoffTime} (${params.timezone}).`;
    case "skipped_paused":
      return `${modePrefix}Skipped for ${params.date} because enforcement is paused.`;
    case "before_cutoff":
      return `${modePrefix}No decision for ${params.date}: current time is still before cutoff ${params.cutoffTime} (${params.timezone}).`;
    case "missing_data":
      return `${modePrefix}No decision for ${params.date}: missing Oura data (${params.reason}).`;
    default:
      return `${modePrefix}No decision for ${params.date}.`;
  }
}

export async function runDailyEnforcementCron(params: { dryRun?: boolean; date?: string } = {}) {
  const dryRun = params.dryRun ?? true;
  const settings = await readSettings();
  const now = new Date();
  const nowInTimezone = getDatePartsInTimeZone(now, settings.timezone);
  const targetDate = params.date ?? nowInTimezone.date;

  const evaluation = await evaluateDailyEnforcement({
    date: targetDate,
    dryRun,
    force: false,
  });

  const result = evaluation.result;
  const status = toCronStatus({ outcome: result.outcome, reason: result.reason });
  const wouldPost = status === "failed";

  return {
    ok: true,
    mode: dryRun ? "dry_run" : "live",
    route: "cron_daily_enforcement",
    status,
    would_post: wouldPost,
    summary: buildSummary({
      status,
      date: targetDate,
      threshold: result.threshold,
      steps: result.steps,
      cutoffTime: result.cutoff_time,
      timezone: result.timezone,
      reason: result.reason,
      dryRun,
    }),
    reason: result.reason,
    date: targetDate,
    inputs: {
      timezone: result.timezone,
      date: targetDate,
      threshold: result.threshold,
      steps: result.steps,
      cutoff_time: result.cutoff_time,
      paused: result.reason === "paused",
      now_in_timezone_date: nowInTimezone.date,
      now_in_timezone_time: nowInTimezone.time,
      oura_data_status: result.oura_data_status,
      oura_data_date: result.oura_data_date,
    },
    safety: {
      dry_run: dryRun,
      writes_daily_enforcement: evaluation.persisted,
      writes_daily_state_posted_flag: false,
      posts_to_x: false,
      reused_finalized: evaluation.reused_finalized,
    },
    evaluation,
  };
}
