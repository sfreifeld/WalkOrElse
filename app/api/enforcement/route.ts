import { NextResponse } from "next/server";
import { evaluateDailyEnforcement, inspectDailyEnforcement } from "@/lib/enforcement";

function parseBoolean(value: string | null): boolean {
  return value === "1" || value === "true";
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const evaluate = parseBoolean(url.searchParams.get("evaluate"));
    const dryRun = parseBoolean(url.searchParams.get("dry_run"));
    const force = parseBoolean(url.searchParams.get("force"));

    if (date && !isIsoDate(date)) {
      return NextResponse.json(
        { ok: false, error: "date must be YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (!evaluate) {
      const payload = await inspectDailyEnforcement(date ?? undefined);
      return NextResponse.json(payload);
    }

    const payload = await evaluateDailyEnforcement({
      date: date ?? undefined,
      dryRun,
      force,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to inspect/evaluate enforcement.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      date?: unknown;
      dry_run?: unknown;
      force?: unknown;
    };

    const date = typeof body.date === "string" ? body.date.trim() : undefined;
    const dryRun = body.dry_run === true;
    const force = body.force === true;

    if (date && !isIsoDate(date)) {
      return NextResponse.json(
        { ok: false, error: "date must be YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const payload = await evaluateDailyEnforcement({
      date,
      dryRun,
      force,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to evaluate enforcement.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
