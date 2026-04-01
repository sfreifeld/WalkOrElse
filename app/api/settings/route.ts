import { NextResponse } from "next/server";
import { readSettings, updateSettings } from "@/lib/persistence";

const CUTOFF_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function normalizeThreshold(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return null;
  }

  const rounded = Math.round(raw);
  if (rounded < 1 || rounded > 100_000) {
    return null;
  }

  return rounded;
}

export async function GET() {
  try {
    const settings = await readSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown settings read error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      threshold?: unknown;
      timezone?: unknown;
      cutoff_time?: unknown;
      paused?: unknown;
      tweet_template?: unknown;
    };

    const threshold = normalizeThreshold(body.threshold);
    const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "";
    const cutoffTime = typeof body.cutoff_time === "string" ? body.cutoff_time.trim() : "";
    const paused = typeof body.paused === "boolean" ? body.paused : null;
    const tweetTemplate =
      typeof body.tweet_template === "string" ? body.tweet_template.trim() : null;

    if (threshold === null) {
      return NextResponse.json(
        { ok: false, error: "Threshold must be a number from 1 to 100000." },
        { status: 400 }
      );
    }

    if (!timezone) {
      return NextResponse.json(
        { ok: false, error: "Timezone is required." },
        { status: 400 }
      );
    }

    if (!CUTOFF_RE.test(cutoffTime)) {
      return NextResponse.json(
        { ok: false, error: "Cutoff time must use 24h HH:MM format." },
        { status: 400 }
      );
    }

    if (paused === null) {
      return NextResponse.json(
        { ok: false, error: "Paused must be true or false." },
        { status: 400 }
      );
    }

    if (tweetTemplate === null) {
      return NextResponse.json(
        { ok: false, error: "Tweet template must be text." },
        { status: 400 }
      );
    }

    await updateSettings({
      threshold,
      timezone,
      cutoff_time: cutoffTime,
      paused,
      tweet_template: tweetTemplate.slice(0, 500),
    });

    const settings = await readSettings();

    return NextResponse.json({
      ok: true,
      message: "Settings updated.",
      settings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown settings write error",
      },
      { status: 500 }
    );
  }
}
