import { NextResponse } from "next/server";
import { writeOuraAccessToken } from "@/lib/oura-token-state";

type OuraTokenResponse = {
  access_token?: string;
};

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

function resolveRedirectUri(): string {
  if (process.env.OURA_REDIRECT_URI) {
    return process.env.OURA_REDIRECT_URI;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/oura/callback`;
  }

  return "http://localhost:3000/api/oura/callback";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return jsonError(400, "Missing OAuth code.");
    }

    const clientId = process.env.OURA_CLIENT_ID;
    const clientSecret = process.env.OURA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      const missing: string[] = [];
      if (!clientId) missing.push("OURA_CLIENT_ID");
      if (!clientSecret) missing.push("OURA_CLIENT_SECRET");
      return jsonError(
        500,
        `Missing env vars for OAuth callback: ${missing.join(", ")}.`
      );
    }

    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: resolveRedirectUri(),
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenResponse = await fetch("https://api.ouraring.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenBody.toString(),
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text();
      return jsonError(502, `Token exchange failed (${tokenResponse.status}).`, body);
    }

    const tokenPayload = (await tokenResponse.json()) as OuraTokenResponse;
    const accessToken = tokenPayload.access_token;

    if (!accessToken) {
      return jsonError(502, "Token exchange succeeded but no access token was returned.");
    }

    await writeOuraAccessToken(accessToken);

    return NextResponse.json({
      ok: true,
      message: "Oura OAuth successful. Access token stored server-side.",
    });
  } catch (error) {
    return jsonError(
      500,
      "OAuth callback error.",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
