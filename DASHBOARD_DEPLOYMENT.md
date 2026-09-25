# Vercel Dashboard + VisiHost Bot Deployment Guide

This guide details how **Uranium Bot** runs on **VisiHost** (`noida.visihost.in:25634`) and connects seamlessly to the **Vercel Web Dashboard** (`https://uraniumbot.vercel.app`).

---

## 1. Architecture Overview

```
 [User Browser]
       │
       ▼ (HTTPS)
 [Vercel Dashboard: https://uraniumbot.vercel.app]
       │
       ├─ /api/*       ──(Server-side Proxy Rewrite)──► http://noida.visihost.in:25634/api/*
       ├─ /auth/*      ──(Server-side Proxy Rewrite)──► http://noida.visihost.in:25634/auth/*
       └─ /socket.io/* ──(Server-side Polling Proxy)──► http://noida.visihost.in:25634/socket.io/*
                                                                  ▲
                                                                  │
                                                       [VisiHost Node Container]
                                                       (Uranium Discord Bot Process)
```

1. **Static / Next.js Pages**: Served by Vercel edge CDN.
2. **API & Auth (`/api/*`, `/auth/*`)**: Vercel acts as a reverse proxy, rewriting requests to `http://noida.visihost.in:25634`.
3. **Realtime Socket.IO**:
   - **Default (Zero Setup)**: The dashboard falls back to polling via `/socket.io/` proxied through Vercel, combined with the automatic 3-second REST player sync in `layout.js`.
   - **Optimal Realtime (WebSocket)**: If you provide an HTTPS tunnel or subdomain (e.g. via Cloudflare Tunnel or reverse proxy), set `NEXT_PUBLIC_SOCKET_URL=https://your-tunnel-domain.com` in Vercel to get direct `wss://` streaming.

---

## 2. VisiHost Setup & Environment Variables

In your **VisiHost Pterodactyl Panel**:

### A. Startup Command
Make sure the Startup configuration runs:
```bash
node src/index.js
```
or
```bash
npm start
```
Make sure Node.js version is **Node 20** or **Node 22**.

### B. Environment Variables (`.env`)
Create or edit your `.env` file in the root directory of your VisiHost server (or under the "Startup" tab):

```dotenv
# Discord Bot Credentials
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here

# Dashboard Configuration
DASHBOARD_PORT=25634
DASHBOARD_HOST=0.0.0.0
DASHBOARD_URL=https://uraniumbot.vercel.app
SESSION_SECRET=create_a_long_random_secret_here

# Database (MongoDB Atlas)
USE_MONGODB=true
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/multibot?retryWrites=true&w=majority
MONGODB_FORCE_IPV4=true
MONGODB_TIMEOUT_MS=15000

# Lavalink
LAVALINK_HOST=your_lavalink_host
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false

# Bot Owner & Server Settings
BOT_OWNER_IDS=your_user_id
DEV_GUILD_ID=your_test_guild_id
```

> **Note:** The bot automatically reads `DASHBOARD_PORT`, `PORT`, or `SERVER_PORT` (allocated by VisiHost). It defaults to `25634` if not specified.

---

## 3. MongoDB Atlas IP Whitelist (Important!)

Because the host machine IP changed from Wispbyte to VisiHost (`201.7.16.8`):
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Navigate to **Security** → **Network Access**.
3. Ensure **`0.0.0.0/0`** (Allow access from anywhere) is added to the IP Access List, OR add VisiHost's node IP **`201.7.16.8/32`**.
4. Without this, MongoDB connection will time out on startup.

---

## 4. Transferring Existing Bot Data (`data/*.db`)

Uranium Bot stores local server settings, moderation logs, reaction roles, and economy data in SQLite files under `data/`:
* `data/afk_storage.db`
* `data/antinuke.db`
* `data/automod.db`
* `data/autorole.db`
* `data/economy.db`
* `data/mod_storage.db`
* `data/music.db`
* `data/welcome.db`
* `data/reaction_roles.db`

**Migration Step:**
1. Download the `data/` folder from your old Wispbyte server using SFTP or File Manager.
2. Upload the `data/` folder into your VisiHost server files under the `data/` directory.

---

## 5. Discord Developer Portal OAuth2 Redirect URI

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select your Uranium Bot application.
3. Go to **OAuth2** → **General**.
4. In **Redirects**, ensure the following URL is present:
   ```
   https://uraniumbot.vercel.app/auth/callback
   ```
5. Click **Save Changes**.

---

## 6. Vercel Configuration & Deployment

1. The project's `vercel.json` and `src/dashboard/frontend/vercel.json` are pre-configured to route to:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "rewrites": [
       {
         "source": "/auth/(.*)",
         "destination": "http://noida.visihost.in:25634/auth/$1"
       },
       {
         "source": "/api/(.*)",
         "destination": "http://noida.visihost.in:25634/api/$1"
       },
       {
         "source": "/socket.io/(.*)",
         "destination": "http://noida.visihost.in:25634/socket.io/$1"
       }
     ]
   }
   ```
2. Commit and push changes to GitHub (`master` branch).
3. If Vercel auto-deploys from GitHub, wait for the build to finish.
4. If setting up a direct HTTPS Socket.IO tunnel (optional):
   - In Vercel Project Settings → **Environment Variables**, set:
     `NEXT_PUBLIC_SOCKET_URL=https://your-tunnel-subdomain.com`
   - Trigger a redeploy.

---

## 7. Verification Checklist

- [ ] **Bot Online**: Start the bot in VisiHost panel. Check console logs for:
  ```
  🌐 Dashboard backend running at http://0.0.0.0:25634
  📡 Vercel Proxy Destination configured to: http://noida.visihost.in:25634
  ```
- [ ] **API Reachability**: Open `https://uraniumbot.vercel.app/api/me` in your browser.
  - Expected response: `{"authenticated":false}` (HTTP 401).
  - If you see a Vercel 502/504 error, make sure the bot server on VisiHost is started and port `25634` is listening.
- [ ] **Discord Login**: Go to `https://uraniumbot.vercel.app/`, click **Login with Discord**. Confirm it redirects to Discord and returns to `/servers`.
- [ ] **Music & Settings**: Open a server dashboard. Change a setting or control music. All controls should update live.
