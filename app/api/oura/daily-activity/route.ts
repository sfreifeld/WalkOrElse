import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { fetchOuraDailyActivityForToday } from "@/lib/oura-client";
import { readOuraState, writeOuraState } from "@/lib/oura-state";

export async function GET() {
  try {
    const previousState = await readOuraState();
    const requestHeaders = await headers();
    const headerTz = requestHeaders.get("x-user-timezone");
    const resolvedTimeZone =
      (headerTz?.trim() ? headerTz : null) ??
      process.env.OURA_USER_TIMEZONE ??
      "UTC";

    const { requested_date, date, activity } = await fetchOuraDailyActivityForToday({
      timeZone: resolvedTimeZone,
    });

    const latestSteps =
      typeof activity?.steps === "number"
        ? activity.steps
        : previousState?.latest_steps ?? 0;
    const lastCheckedAt = new Date().toISOString();

    await writeOuraState({
      latest_steps: latestSteps,
      last_checked_at: lastCheckedAt,
    });

    const persisted = await readOuraState();

    return NextResponse.json({
      ok: true,
      requested_date,
      date,
      time_zone_used: resolvedTimeZone,
      oura_activity: activity,
      persisted,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
