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

async function getOuraAccessToken(): Promise<string> {
  const envToken = process.env.OURA_ACCESS_TOKEN;
  if (envToken) {
    return envToken;
  }

  const persistedToken = await readOuraAccessToken();
  if (persistedToken) {
    return persistedToken;
  }

  throw new Error(
    "Missing Oura access token. Set OURA_ACCESS_TOKEN or complete OAuth callback first."
  );
}

export async function fetchOuraDailyActivityForToday(params?: {
  timeZone?: string;
}): Promise<{ date: string; activity: OuraDailyActivity | null }> {
  const token = await getOuraAccessToken();

  const timeZone = params?.timeZone ?? process.env.OURA_USER_TIMEZONE ?? "UTC";
  const date = getDateInTimeZone(timeZone);

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

  return { date, activity };
}
