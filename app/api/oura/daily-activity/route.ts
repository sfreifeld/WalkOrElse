import { NextResponse } from "next/server";
import { fetchOuraDailyActivityForToday } from "@/lib/oura-client";
import { readOuraState, writeOuraState } from "@/lib/oura-state";

export async function GET() {
  try {
    const { date, activity } = await fetchOuraDailyActivityForToday();
    const latestSteps = activity?.steps ?? 0;
    const lastCheckedAt = new Date().toISOString();

    await writeOuraState({
      latest_steps: latestSteps,
      last_checked_at: lastCheckedAt,
    });

    const persisted = await readOuraState();

    return NextResponse.json({
      ok: true,
      date,
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
