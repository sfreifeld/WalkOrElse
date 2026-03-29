import { writeOuraAccessToken } from "@/lib/oura-token-state";

const LOCAL_REDIRECT_URI = "http://localhost:3000/api/oura/callback";

type OuraTokenResponse = {
  access_token?: string;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return new Response("Missing OAuth code.", { status: 400 });
    }

    const clientId = process.env.OURA_CLIENT_ID;
    const clientSecret = process.env.OURA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      const missing: string[] = [];
      if (!clientId) missing.push("OURA_CLIENT_ID");
      if (!clientSecret) missing.push("OURA_CLIENT_SECRET");
      return new Response(
        `Missing env: ${missing.join(", ")}. In .env.local use the exact names OURA_CLIENT_ID and OURA_CLIENT_SECRET (not OURA_SECRET). Restart npm run dev after editing, then try OAuth again.`,
        { status: 500 }
      );
    }

    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: LOCAL_REDIRECT_URI,
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
      return new Response(`Token exchange failed (${tokenResponse.status}): ${body}`, {
        status: 502,
      });
    }

    const tokenPayload = (await tokenResponse.json()) as OuraTokenResponse;
    const accessToken = tokenPayload.access_token;

    if (!accessToken) {
      return new Response("Token exchange succeeded but no access token was returned.", {
        status: 502,
      });
    }

    await writeOuraAccessToken(accessToken);

    return new Response("Oura OAuth successful. Access token stored server-side.", {
      status: 200,
    });
  } catch (error) {
    return new Response(
      `OAuth callback error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}
