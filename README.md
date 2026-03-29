# Walk Or Else

Single-user MVP for checking Oura steps and persisting state in a local SQLite database.

## Oura setup (single-user MVP)

This project intentionally keeps Oura auth simple: it reads a single bearer token from `OURA_ACCESS_TOKEN` and uses that token for API calls.

The steps below show exactly how to obtain that token **after** you already have an Oura OAuth `client_id` and `client_secret`.

### 1) Create/update your OAuth app redirect URI

In Oura Cloud **My Applications**, make sure your OAuth app includes a redirect URI you can use locally, for example:

- `http://localhost:3000/oura/callback`

> The redirect URI used in authorization and token exchange must match exactly.

### 2) Send yourself through Oura authorization

Use your real client ID and open this URL in your browser (replace placeholders):

```text
https://cloud.ouraring.com/oauth/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Foura%2Fcallback&scope=daily%20personal%20email&state=walkorelse-local
```

- Sign in to Oura.
- Approve access.
- After redirect, copy the `code` from the URL query string:
  - `http://localhost:3000/oura/callback?code=...&scope=...&state=...`

### 3) Exchange `code` for access token

Run this in your terminal (replace placeholders):

```bash
curl --request POST 'https://api.ouraring.com/oauth/token' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=authorization_code' \
  --data-urlencode 'code=PASTE_CODE_FROM_REDIRECT' \
  --data-urlencode 'redirect_uri=http://localhost:3000/oura/callback' \
  --data-urlencode 'client_id=YOUR_CLIENT_ID' \
  --data-urlencode 'client_secret=YOUR_CLIENT_SECRET'
```

The JSON response includes `access_token`, `refresh_token`, and `expires_in`.

### 4) Configure local env vars

Create `.env.local` in the repo root:

```bash
cp .env.example .env.local
```

Then set:

- `OURA_ACCESS_TOKEN` to the `access_token` from step 3.
- (Optional) `OURA_USER_TIMEZONE`, for example `America/Los_Angeles`.
- (Optional) `DATABASE_FILE_PATH` if you do not want default `./data/walkorelse.db`.

### 5) Run and verify

```bash
npm install
npm run dev
```

Then in another terminal:

```bash
curl http://localhost:3000/api/oura/daily-activity
```

Expected: JSON with `ok: true`, plus Oura activity payload and persisted state.


## Persistence (MVP database layer)

This app uses **SQLite** via Node's built-in `node:sqlite` module:

- No external database service required for MVP development.
- Free-tier friendly (single file in `./data`).
- Minimal schema for a single-user app (no user/account table).

Tables created automatically on first server call:

- `settings`: `threshold`, `timezone`, `cutoff_time`, `paused`, `tweet_template`
- `daily_state`: `date`, `latest_steps`, `last_checked_at`, `posted`
- `shame_asset`: `asset_url`/`storage_key`, `content_type`, `original_filename`, `created_at`

## Token lifecycle notes for this MVP

- This MVP uses a single static `OURA_ACCESS_TOKEN`.
- When the token expires, repeat steps 2–4 (or refresh using `refresh_token`) and update `.env.local`.
- Do **not** commit `.env.local` or any tokens/secrets.

## Relevant environment variables

- `OURA_ACCESS_TOKEN` (required)
- `OURA_USER_TIMEZONE` (optional, defaults to `UTC`)
- `DATABASE_FILE_PATH` (optional)
