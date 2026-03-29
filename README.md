# Walk Or Else

Single-user MVP for checking Oura steps and persisting state in a local SQLite database.

## Oura setup (single-user MVP)

Oura calls use a bearer access token. You can either let this app exchange an OAuth `code` automatically (**recommended**), or paste a token you obtained manually.

### A) Automatic token exchange (uses `/api/oura/callback`)

1. In Oura Cloud **My Applications**, set the redirect URI to match the app exactly:

   - `http://localhost:3000/api/oura/callback`

2. Create `.env.local` in the repo root (`cp .env.example .env.local`) and set:

   - `OURA_CLIENT_ID` and `OURA_CLIENT_SECRET` from your Oura OAuth app.

3. Start the dev server (`npm run dev`). **Restart it after any change to `.env.local`.**

4. Open an authorize URL in your browser (use your real `client_id`; `redirect_uri` must be URL-encoded and match step 1):

```text
https://cloud.ouraring.com/oauth/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Foura%2Fcallback&scope=daily&state=walkorelse-local
```

After you approve, Oura redirects to this app, which exchanges the `code` and stores the access token in `data/oura-token.json` (by default).

**If you also set `OURA_ACCESS_TOKEN` in `.env.local`:** the app **uses the OAuth token file first**, then falls back to env. You can remove `OURA_ACCESS_TOKEN` after a successful callback so you are not carrying an old manual token by mistake.

### B) Manual token (curl), no callback route

If you prefer not to put `client_secret` in `.env.local`, keep the same redirect URI registered in Oura, complete authorization, copy the `code` from the redirect URL, then exchange it yourself:

```bash
curl --request POST 'https://api.ouraring.com/oauth/token' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=authorization_code' \
  --data-urlencode 'code=PASTE_CODE_FROM_REDIRECT' \
  --data-urlencode 'redirect_uri=http://localhost:3000/api/oura/callback' \
  --data-urlencode 'client_id=YOUR_CLIENT_ID' \
  --data-urlencode 'client_secret=YOUR_CLIENT_SECRET'
```

Put the `access_token` from the JSON response into `OURA_ACCESS_TOKEN` in `.env.local`.

### Configure other env vars

- (Optional) `OURA_USER_TIMEZONE`, for example `America/Los_Angeles`.
- (Optional) `OURA_STATE_FILE_PATH` if you do not want default `./data/oura-state.json`.

### Run and verify

```bash
npm install
npm run dev
```

Then in another terminal:

```bash
curl http://localhost:3000/api/oura/daily-activity
```

Expected: JSON with `ok: true`, plus Oura activity payload and persisted state.


## Shame image upload (MVP)

Server route: `POST /api/shame-image/upload` (multipart/form-data).

- Field name: `image`
- Allowed MIME types: `image/png`, `image/jpeg`, `image/webp`
- Max upload size: `4 MB`
- File bytes are stored in Vercel Blob
- File metadata is stored in SQLite `shame_asset` and linked from `settings.shame_asset_id`
- Uploading a new image updates the active linked image and attempts to delete the previous blob file

Example:

```bash
curl -X POST http://localhost:3000/api/shame-image/upload \
  -F "image=@/absolute/path/to/shame-image.png"
```

Required env var:

- `BLOB_READ_WRITE_TOKEN`

## Token lifecycle notes for this MVP

- Access tokens can come from `OURA_ACCESS_TOKEN` or from the OAuth callback (stored under `data/oura-token.json` by default).
- When the token expires, run OAuth again (section A) or exchange a new code manually (section B), then update env or let the callback rewrite the token file.
- Do **not** commit `.env.local` or any tokens/secrets.

## Relevant environment variables

- `OURA_CLIENT_ID` / `OURA_CLIENT_SECRET` (required for automatic OAuth callback token exchange)
- `OURA_ACCESS_TOKEN` (optional fallback when no token file exists yet, e.g. manual curl flow; OAuth-stored file wins when present)
- `OURA_USER_TIMEZONE` (optional, defaults to `UTC`)
- `OURA_STATE_FILE_PATH` (optional)
