import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { fetchOuraDailyActivityForToday } from "@/lib/oura-client";
import { readOuraState, writeOuraState } from "@/lib/oura-state";

export async function GET() {
  try {
    const previousState = await readOuraState();
    const requestHeaders = await headers();
    const timeZone =
      requestHeaders.get("x-user-timezone") ?? process.env.OURA_USER_TIMEZONE;

    const { date, activity } = await fetchOuraDailyActivityForToday({
      timeZone: timeZone ?? undefined,
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
      date,
      time_zone_used: timeZone ?? "UTC",
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
