# Vercel dashboard + Wispbyte bot deployment

The browser can use the Vercel rewrite for ordinary HTTP routes (`/api` and
`/auth`), but it **cannot use that rewrite for Socket.IO WebSockets**. A Vercel
rewrite is an HTTP proxy and does not pass the connection-upgrade required by a
WebSocket. This was the source of the broken dashboard realtime connection.

## Required configuration

1. Give the dashboard process on Wispbyte a public HTTPS hostname, for example
   `https://bot-api.example.com`. Do not use an IP address in the browser: an
   HTTPS Vercel page cannot open an insecure `ws://` connection.
2. Configure the Wispbyte reverse proxy to forward WebSocket upgrades to the
   dashboard port (`10857` in `vercel.json`). For nginx, the location needs
   `proxy_http_version 1.1`, plus `Upgrade` and `Connection "upgrade"` headers.
3. Set these Wispbyte environment variables and restart the bot:

   ```dotenv
   DASHBOARD_PORT=10857
   DASHBOARD_URL=https://uraniumbot.vercel.app
   SESSION_SECRET=<a-long-random-secret>
   ```

   `DASHBOARD_URL` must be the public Vercel URL and must exactly match the
   Discord Developer Portal OAuth2 redirect URI:
   `https://uraniumbot.vercel.app/auth/callback`.
4. In Vercel, set `NEXT_PUBLIC_SOCKET_URL=https://bot-api.example.com` and
   redeploy. This value is intentionally public; it is only the socket origin.
   Authentication uses a one-minute signed token obtained through `/api`.
5. Keep the `/api` and `/auth` rewrite destinations pointed at the reachable
   Wispbyte HTTP endpoint. If Wispbyte changes the allocated IP or port, update
   both destinations and redeploy Vercel. Prefer a stable hostname over a raw
   IP address.

## Verification

* Visit `https://uraniumbot.vercel.app/api/me`; it should return `401` JSON
  before login, not a Vercel 404/502 page.
* Complete Discord login and confirm the browser returns to `/servers`.
* In browser DevTools, the Socket.IO request should connect to
  `https://bot-api.example.com/socket.io/`, not to `uraniumbot.vercel.app`.
* Ensure Wispbyte allows inbound HTTPS (443) and that its proxy forwards the
  WebSocket upgrade headers.
