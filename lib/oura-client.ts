import { readOuraAccessToken } from "@/lib/oura-token-state";

export type OuraDailyActivity = {
  day?: string;
  steps?: number;
};

type OuraDailyActivityResponse = {
  data?: OuraDailyActivity[];
};

function getDateInTimeZone(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

/** Civil YYYY-MM-DD minus N calendar days (no TZ conversion; safe for ISO date strings). */
function subtractCalendarDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Oura often has no `daily_activity` row for "today" yet (data lags vs the live app).
 * Prefer today's document; otherwise the latest day on or before today in the range.
 */
function pickDailyActivityForDisplay(
  rows: OuraDailyActivity[] | undefined,
  today: string
): OuraDailyActivity | null {
  if (!rows?.length) return null;

  const exact = rows.find((r) => r.day === today);
  if (exact) return exact;

  const candidates = rows.filter((r) => r.day && r.day <= today);
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => (b.day ?? "").localeCompare(a.day ?? ""));
  return candidates[0];
}

async function getOuraAccessToken(): Promise<string> {
  // Prefer token persisted by the OAuth callback so a stale OURA_ACCESS_TOKEN
  // does not override a freshly stored token.
  const persistedToken = await readOuraAccessToken();
  if (persistedToken) {
    return persistedToken;
  }

  const envToken = process.env.OURA_ACCESS_TOKEN;
  if (envToken) {
    return envToken;
  }

  throw new Error(
    "Missing Oura access token. Complete OAuth callback first or set OURA_ACCESS_TOKEN."
  );
}

export async function fetchOuraDailyActivityForToday(params?: {
  timeZone?: string;
}): Promise<{
  requested_date: string;
  date: string;
  activity: OuraDailyActivity | null;
}> {
  const token = await getOuraAccessToken();

  const timeZone = params?.timeZone ?? process.env.OURA_USER_TIMEZONE ?? "UTC";
  const today = getDateInTimeZone(timeZone);
  const lookbackDays = 7;
  const startDate = subtractCalendarDays(today, lookbackDays - 1);

  const url = new URL("https://api.ouraring.com/v2/usercollection/daily_activity");
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", today);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Oura API error (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as OuraDailyActivityResponse;
  const activity = pickDailyActivityForDisplay(payload.data, today);
  const date = activity?.day ?? today;

  return { requested_date: today, date, activity };
}

export async function fetchOuraDailyActivityForDate(date: string): Promise<{
  requested_date: string;
  date: string;
  activity: OuraDailyActivity | null;
}> {
  const token = await getOuraAccessToken();

  const url = new URL("https://api.ouraring.com/v2/usercollection/daily_activity");
  url.searchParams.set("start_date", date);
  url.searchParams.set("end_date", date);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Oura API error (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as OuraDailyActivityResponse;
  const activity = payload.data?.[0] ?? null;

  return {
    requested_date: date,
    date: activity?.day ?? date,
    activity,
  };
}
