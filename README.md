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

