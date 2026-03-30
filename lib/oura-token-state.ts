import {
  readPersistedOuraAccessToken,
  writePersistedOuraAccessToken,
} from "@/lib/persistence";

export async function readOuraAccessToken(): Promise<string | null> {
  try {
    return await readPersistedOuraAccessToken();
  } catch {
    return null;
  }
}

export async function writeOuraAccessToken(accessToken: string): Promise<void> {
  await writePersistedOuraAccessToken(accessToken);
}
