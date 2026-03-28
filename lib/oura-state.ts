import { promises as fs } from "node:fs";
import path from "node:path";

export type OuraPersistedState = {
  latest_steps: number;
  last_checked_at: string;
};

const STATE_FILE = process.env.OURA_STATE_FILE_PATH
  ? path.resolve(process.env.OURA_STATE_FILE_PATH)
  : path.join(process.cwd(), "data", "oura-state.json");

export async function readOuraState(): Promise<OuraPersistedState | null> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<OuraPersistedState>;

    if (
      typeof parsed.latest_steps !== "number" ||
      typeof parsed.last_checked_at !== "string"
    ) {
      return null;
    }

    return {
      latest_steps: parsed.latest_steps,
      last_checked_at: parsed.last_checked_at,
    };
  } catch {
    return null;
  }
}

export async function writeOuraState(state: OuraPersistedState): Promise<void> {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

export function getOuraStateFilePath(): string {
  return STATE_FILE;
}
