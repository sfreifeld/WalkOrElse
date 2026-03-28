import { promises as fs } from "node:fs";
import path from "node:path";

type OuraTokenState = {
  access_token: string;
};

const TOKEN_FILE = process.env.OURA_TOKEN_FILE_PATH
  ? path.resolve(process.env.OURA_TOKEN_FILE_PATH)
  : path.join(process.cwd(), "data", "oura-token.json");

export async function readOuraAccessToken(): Promise<string | null> {
  try {
    const raw = await fs.readFile(TOKEN_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<OuraTokenState>;

    return typeof parsed.access_token === "string" ? parsed.access_token : null;
  } catch {
    return null;
  }
}

export async function writeOuraAccessToken(accessToken: string): Promise<void> {
  await fs.mkdir(path.dirname(TOKEN_FILE), { recursive: true });
  await fs.writeFile(
    TOKEN_FILE,
    JSON.stringify({ access_token: accessToken }, null, 2),
    "utf8"
  );
}

export function getOuraTokenFilePath(): string {
  return TOKEN_FILE;
}
