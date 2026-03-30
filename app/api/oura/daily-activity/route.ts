import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { fetchOuraDailyActivityForToday } from "@/lib/oura-client";
import { readOuraState, writeOuraState } from "@/lib/oura-state";

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

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
      date,
      latest_steps: latestSteps,
      last_checked_at: lastCheckedAt,
      posted: previousState?.posted ?? false,
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
    return jsonError(
      500,
      "Failed to fetch and persist Oura daily activity.",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
