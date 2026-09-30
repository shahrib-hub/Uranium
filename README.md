<div align="center">
  <img src="https://cdn.discordapp.com/attachments/938020057928302663/1442829606099882064/LogoMakerCa-1763789971628.png" width="120" height="120" alt="Uranium Bot Logo" />
  <h1>⚛️ Uranium Bot & Dashboard Suite</h1>
  <p><strong>The enterprise-grade, all-in-one Discord community engine, lossless audio streamer, and real-time management dashboard.</strong></p>

  <p>
    <a href="https://discord.com/oauth2/authorize?client_id=932136827605905489&permissions=8&scope=bot%20applications.commands"><img src="https://img.shields.io/badge/Discord-Invite%20Bot-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Invite Bot" /></a>
    <a href="https://discord.gg/26ThFyckFX"><img src="https://img.shields.io/badge/Support-Community%20Hub-emerald?style=for-the-badge&logo=discord&logoColor=white" alt="Discord Support" /></a>
    <img src="https://img.shields.io/badge/Node.js-v18%20%7C%20v20-brightgreen?style=for-the-badge&logo=node.js&logoColor=white" alt="Node Version" />
    <img src="https://img.shields.io/badge/Next.js-v16%20Turbopack-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  </p>
</div>

---

## 🚀 Overview

**Uranium** is an all-in-one Discord bot and web management platform engineered for high-traffic gaming communities, content creators, and enterprise servers. It replaces 5+ separate single-purpose bots with one unified, zero-latency system paired with a responsive Next.js web dashboard.

---

## 📚 Complete Documentation Index

We maintain an exhaustive collection of operational manuals, configuration guides, and architectural references:

| Documentation Guide | Primary Topics Covered | Intended Audience |
| :--- | :--- | :--- |
| [**📖 Modules & Setup Handbook**](./MODULES_AND_SETUP_GUIDE.md) | Exhaustive breakdown of all 18 bot plugins, full slash command matrix, required bot permissions, dynamic variables, and Free vs. Premium comparison. | Server Owners, Administrators |
| [**🛡️ Security & Disaster Recovery Manual**](./SECURITY_AND_DISASTER_RECOVERY_GUIDE.md) | Real-time Anti-Nuke audit defense, attack thresholds, automated punishments, Auto-Recovery engine, and Server Backups runbook. | Security Leads, Server Owners |
| [**👥 Community & Engagement Guide**](./COMMUNITY_AND_ENGAGEMENT_GUIDE.md) | Multi-category ticket support desks, virtual economy (Atoms, mining, jobs), Auto-Responder keywords, Join-to-Create voice channels, and Premium AI Studio. | Community Managers, Moderators |
| [**🚀 Dashboard Deployment & Architecture**](./DASHBOARD_DEPLOYMENT.md) | Next.js frontend, Express API gateway, WebSocket state synchronization, session security, and multi-host deployment (Vercel, Render, VPS). | Developers, DevOps |
| [**✅ Discord App Verification Guide**](./DISCORD_VERIFICATION_GUIDE.md) | Discord Developer Terms of Service and Developer Policy compliance audit, data retention policies, and verification submission answers. | Bot Owners, Developers |
| [**🎛️ Reaction Roles System Guide**](./REACTION_ROLES_REVAMP.md) | Modern interactive buttons, single/multi-select dropdown menus, engagement analytics, and live preview architecture. | Administrators |

---

## 🌟 Key Feature Highlights

### 🛡️ Safety & Gatekeeping
- **Server Verification Gate**: Prevent token raids and self-bots using instant 1-click verification or **2FA Direct Message OTP** modal challenges.
- **Anti-Nuke Defense Engine**: Monitors Discord Audit Logs 24/7 to catch and neutralize rogue administrators attempting mass channel deletions, mass bans, or rogue bot additions.
- **Auto-Recovery**: Automatically recreates deleted channels and roles with matching permissions in milliseconds.
- **AutoMod Engine**: Real-time zero-delay filtering for spam, discord invites, domain leaks, mass mentions, and prohibited words.

### ⚙️ Administration & Productivity
- **Ticket Support Desk**: Multi-department support panels with interactive modal forms, staff claiming, collaborator management, and downloadable HTML chat transcripts.
- **Server Backups & Recovery**: 1-click infrastructure snapshots saving categories, channels, permissions, roles, and server meta (Free: 1 slot/7d; Premium: 3 slots/24h).
- **Auto-Responder**: Instant automated answers for community questions using exact match, word contains, or regex patterns with dynamic variables.

### 👥 Community & Customization
- **Canvas Welcome & Goodbye Cards**: High-resolution (1024x500) canvas cards rendered instantly with 6 modern theme presets (Modern Obsidian, Cyberpunk, Cosmic Aurora, etc.).
- **Interactive Giveaways**: Role-gated giveaways with live in-button entry counters (`🎉 Enter (48)`) and instant winner rerolls.
- **Reaction Roles**: Sleek Discord button and dropdown menus with drag-and-drop ordering and 24-hour engagement tracking.

### 🎮 Entertainment, Economy & Utilities
- **Lossless 320kbps Music**: High-fidelity streaming from Spotify, SoundCloud, and direct web sources with real-time DSP filters (BassBoost, Nightcore, 8D Audio, Vaporwave, Karaoke).
- **Full Web Music Player**: Spotify-style web interface with interactive queue drag-and-drop, track progress scrubbing, and voice channel sync.
- **Virtual Economy & Atoms**: Server jobs, rare ore mining, communal woodchopping, nuclear reactor operation, bank vaults, robberies, and role shops.
- **Server Utilities Suite**: Join-to-Create dynamic voice channels, persistent sticky messages, anti-ghostping alerts with automatic timeouts, ephemeral join-pings, and birthday celebrations.

### 💎 Premium Exclusives
- **🤖 AI Assistant Studio**: Conversational intelligence powered by **Groq Llama 3.3** with custom backstories, temperature controls, and dedicated auto-reply channel binding.
- **📺 YouTube Subscriber Verification**: Automate role granting for verified YouTube channel subscribers via Google OAuth2.
- **🎨 Per-Server Bot Personalizer**: Custom animated GIF avatars, banners, and bios strictly customized per server.

---

## 🛠️ Tech Stack & Architecture

- **Bot Engine**: [Discord.js v14](https://discord.js.org/) (Node.js runtime)
- **Web Dashboard**: [Next.js v16](https://nextjs.org/) (App Router, Turbopack, Tailwind CSS)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Icons**: [Lucide React](https://lucide.dev/)
- **API & Synchronization**: Express.js REST API + [Socket.IO](https://socket.io/) bi-directional WebSocket gateway
- **AI Engine**: [Groq](https://groq.com/) Cloud Inference (Llama 3.3 70B & 8B)
- **Database**: SQLite / PostgreSQL with custom high-concurrency wrappers

---

## 🚀 Quick Setup & Local Development

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/shahrib-hub/Uranium.git
cd Uranium
npm install
cd src/dashboard/frontend
npm install
cd ../../..
```

### 2. Environment Variables Configuration
Create a `.env` file in the project root:
```env
# Discord Bot Credentials
TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
CLIENT_SECRET=your_discord_client_secret_here

# Web Dashboard
DASHBOARD_URL=http://localhost:3000
API_PORT=3001
JWT_SECRET=your_secure_jwt_secret_phrase

# AI Studio (Premium)
GROQ_API_KEY=your_groq_api_key_here

# YouTube Verification (Premium)
YOUTUBE_API_KEY=your_google_youtube_api_key_here
```

### 3. Launch Bot & Web Dashboard
```bash
# Start Discord Bot Gateway & API Server
node index.js

# In a separate terminal, launch the Next.js Dashboard:
cd src/dashboard/frontend
npm run dev
```

---

## 📜 Discord Compliance & Terms of Service

Uranium strictly complies with the **Discord Developer Terms of Service** and **Developer Policy**:
- **Privacy Policy**: View our transparent data handling at `/privacy` on the web dashboard.
- **Terms of Service**: View our terms and user expectations at `/tos` on the web dashboard.
- **Data Deletion**: Server administrators can execute `/backup delete` or `/ticket delete` to purge data upon request.

---

## 🤝 Support & Community

- **Discord Community**: [Join our Discord Server](https://discord.gg/26ThFyckFX)
- **Documentation Portal**: Access interactive docs directly inside the dashboard at [`/docs`](http://localhost:3000/docs).
