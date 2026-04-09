# MovieDekhi

## Run Locally

1. Install dependencies:
   - `npm install`
2. Copy env template:
   - Windows PowerShell: `Copy-Item .env.example .env`
   - macOS/Linux: `cp .env.example .env`
3. Set a strong `SESSION_SECRET` in `.env`.
4. Start server:
   - `npm start`
5. Open `http://localhost:3000`.

## Production Notes

- Always set `NODE_ENV=production`.
- Always set a long random `SESSION_SECRET`.
- If behind a proxy/load balancer, set `TRUST_PROXY=true`.
- Use HTTPS in production and set `COOKIE_SECURE=true`.
- Do not commit `.env` or `data/` files.

## Vercel Deployment

- This project uses `server.js` as a serverless handler on Vercel (`vercel.json` included).
- Required Vercel environment variables:
  - `NODE_ENV=production`
  - `SESSION_SECRET=<long-random-secret>`
  - `COOKIE_SECURE=true`
  - `TRUST_PROXY=true`
  - `COOKIE_SAME_SITE=lax`
  - `SUPABASE_DB_URL=<Supabase Postgres connection string>`
- Redeploy after setting environment variables.
- If `SUPABASE_DB_URL` is set, user accounts are stored persistently in Supabase Postgres.
- If `SUPABASE_DB_URL` is not set, app falls back to local file storage (`data/users.json` or `/tmp` on serverless).
- Health endpoint for quick checks:
  - `GET /api/health`
  - Shows whether Supabase is configured and connected (`usingSupabase`, `dbConnected`, `dbState`).

