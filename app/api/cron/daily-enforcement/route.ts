import { NextResponse } from "next/server";
import { runDailyEnforcementCron } from "@/lib/cron-daily-enforcement";

function parseBoolean(value: string | null): boolean {
  return value === "1" || value === "true";
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dryRunParam = url.searchParams.get("dryRun") ?? url.searchParams.get("dry_run");
    const dryRun = dryRunParam === null ? true : parseBoolean(dryRunParam);
    const date = url.searchParams.get("date") ?? undefined;

    if (date && !isIsoDate(date)) {
      return NextResponse.json(
        { ok: false, error: "date must be YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const payload = await runDailyEnforcementCron({
      dryRun,
      date,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to run cron daily enforcement.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
