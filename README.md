# Walk Or Else

Single-user MVP for checking Oura steps, storing state in hosted Postgres, and uploading shame images to Vercel Blob.

## Why this changed

Vercel serverless functions cannot rely on a writable local SQLite file. Persistence now uses Postgres (`@vercel/postgres`) so production state survives deploys/restarts.

## Required environment variables

### Database (required)

Use **one** of:

- `POSTGRES_URL` (recommended for Vercel Postgres / Marketplace)
- `DATABASE_URL` (works with Neon and most hosted Postgres providers)

### Oura OAuth (required for `/api/oura/callback`)

- `OURA_CLIENT_ID`
- `OURA_CLIENT_SECRET`

### Oura API token

- `OURA_ACCESS_TOKEN` (optional fallback)
  - If OAuth callback succeeded, the stored token in Postgres is used first.

### App URL / OAuth redirect

Use one of:

- `OURA_REDIRECT_URI` (recommended explicit redirect URI)
- `NEXT_PUBLIC_APP_URL` (used to derive `${NEXT_PUBLIC_APP_URL}/api/oura/callback`)

### Optional

- `OURA_USER_TIMEZONE` (defaults to `UTC`)
- `BLOB_READ_WRITE_TOKEN` (required for shame image upload)

## Oura setup (single-user MVP)

1. In Oura Cloud **My Applications**, configure redirect URI to match what app will send:
   - If `OURA_REDIRECT_URI` is set, use that exact value.
   - Otherwise use `${NEXT_PUBLIC_APP_URL}/api/oura/callback`.
2. Set env vars in Vercel Project Settings.
3. Trigger OAuth by visiting Oura authorize URL with that same redirect URI.
4. After approval, callback stores access token in Postgres `settings.oura_access_token`.

## Vercel deployment setup

1. Add **Vercel Postgres** from Marketplace (or create Neon DB and copy `DATABASE_URL`).
2. Set env vars:
   - `POSTGRES_URL` (or `DATABASE_URL`)
   - `OURA_CLIENT_ID`
   - `OURA_CLIENT_SECRET`
   - `OURA_REDIRECT_URI` (or `NEXT_PUBLIC_APP_URL`)
   - `BLOB_READ_WRITE_TOKEN` (if using uploads)
3. Redeploy.
4. Call `GET /api/oura/daily-activity` once; schema is auto-created on first DB access.

## Local development

```bash
npm install
npm run dev
```

Then verify:

```bash
curl http://localhost:3000/api/oura/daily-activity
```

Expected: JSON response (`ok: true` or `ok: false`) and never HTML error pages from route-level failures.

## Daily enforcement engine

Use `/api/enforcement` to inspect or evaluate pass/fail/skip state for a day.

- `GET /api/enforcement` → inspect today's enforcement record in settings timezone.
- `GET /api/enforcement?evaluate=1` → evaluate and persist for today.
- `GET /api/enforcement?evaluate=1&dry_run=1` → evaluate without persistence.
- `GET /api/enforcement?date=YYYY-MM-DD&evaluate=1` → evaluate a specific day.
- `POST /api/enforcement` with JSON body `{ "date": "YYYY-MM-DD", "dry_run": true, "force": false }`.

Behavior:
- Uses `threshold`, `timezone`, `cutoff_time`, and `paused` from settings.
- Finalizes pass/fail only after cutoff.
- If paused, records `skip` and finalizes immediately.
- If Oura data is unavailable or fetch fails, outcome is explicit `pending` with reason and never defaults to 0 steps.
- Repeated runs are idempotent: finalized days are reused unless `force=true`.
