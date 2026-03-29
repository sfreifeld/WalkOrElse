import { readLatestDailyState, upsertDailyState } from "@/lib/persistence";

export type OuraPersistedState = {
  date?: string;
  latest_steps: number;
  last_checked_at: string;
  posted?: boolean;
};

export async function readOuraState(): Promise<OuraPersistedState | null> {
  const state = readLatestDailyState();

  if (!state) {
    return null;
  }

  return state;
}

export async function writeOuraState(state: OuraPersistedState): Promise<void> {
  const isoDate = state.date ?? new Date().toISOString().slice(0, 10);

  upsertDailyState({
    date: isoDate,
    latest_steps: state.latest_steps,
    last_checked_at: state.last_checked_at,
    posted: state.posted ?? false,
  });
}
