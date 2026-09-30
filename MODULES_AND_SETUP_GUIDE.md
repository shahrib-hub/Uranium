# 📖 Uranium Bot • Complete Modules & Setup Handbook

Welcome to the definitive handbook for **Uranium**, the high-performance, all-in-one Discord bot and web management platform. This guide covers setup instructions, role hierarchy rules, configuration options, slash commands, and tier limits for all bot plugins and dashboard modules.

---

## 📑 Table of Contents
1. [Prerequisites & Role Hierarchy](#-1-prerequisites--role-hierarchy)
2. [Feature & Module Directory](#-2-feature--module-directory)
   - [🛡️ Safety & Gatekeeping](#1-safety--gatekeeping)
   - [⚙️ Administration & Management](#2-administration--management)
   - [👥 Community & Engagement](#3-community--engagement)
   - [🎮 Entertainment & Economy](#4-entertainment--economy)
   - [⚡ Advanced & Utilities](#5-advanced--utilities)
   - [💎 Premium Exclusives](#6-premium-exclusives)
3. [Master Slash Command Reference](#-3-master-slash-command-reference)
4. [Dynamic Template Variables](#-4-dynamic-template-variables)
5. [Free vs. Premium Tier Comparison](#-5-free-vs-premium-tier-comparison)
6. [Troubleshooting & Support](#-6-troubleshooting--support)

---

## 🔑 1. Prerequisites & Role Hierarchy

### Discord Bot Invitation & OAuth2 Scopes
To invite Uranium with all required privileges:
- **Authorization URL**: [Add Uranium to Discord](https://discord.com/oauth2/authorize?client_id=932136827605905489&permissions=8&scope=bot%20applications.commands)
- **Required Gateway Intents**:
  - `Server Members Intent` (Privileged) — Required for verification gates, autoroles, welcome cards, and member tracking.
  - `Message Content Intent` (Privileged) — Required for AutoMod keyword inspection, chat auto-responses, and sticky messages.

### Critical Role Hierarchy Rule
> [!IMPORTANT]
> Discord security rules strictly forbid bots from modifying, moderating, or assigning roles that are positioned **above** the bot's own highest role in your server's role list.
> 
> **Action Required**: Open **Server Settings** > **Roles**, and drag the **Uranium** bot role to the **very top** (or just below your server owner role). This allows Uranium to:
> - Assign `@Verified` and remove `@Unverified` roles during member verification.
> - Assign `@Member` autoroles upon join.
> - Strip administrative roles during Anti-Nuke attack interventions.
> - Timeout, kick, or ban rogue members and raiders.

---

## 📂 2. Feature & Module Directory

### 1. Safety & Gatekeeping

#### 🛡️ Server Verification Gate (`/dashboard/verification`)
Prevents automated self-bots, token accounts, and raid brigades from accessing community channels.
- **One-Click Button**: Users click a customizable button to instantly receive the verified role.
- **2FA Direct Message OTP**: The bot DMs a secure 5-character one-time passcode to the member, which they must enter into a native Discord modal popup. Stops automated raid bots dead in their tracks.
- **Role Isolation Strategy**:
  1. Revoke `View Channel` on `@everyone` for all normal channels.
  2. Allow `View Channel` only in `#verify`.
  3. Grant `View Channel` across your server to your `@Verified` role.

#### 🚨 Anti-Nuke & Server Shield (`/dashboard/security`)
24/7 audit-log watcher that neutralizes rogue administrators or compromised staff accounts in real-time.
- **Destructive Actions Guarded**: Mass Channel Deletions, Mass Role Deletions, Mass Bans, Mass Kicks, Unauthorized Bot Infiltration, Webhook Creation, and Member Pruning.
- **Action Thresholds**: Configurable rate limit (e.g. max 3 actions in 10 seconds).
- **Punishment Options**:
  - `ban`: Immediately ban the attacker.
  - `kick`: Evict the attacker.
  - `striproles`: Strip all administrative roles from the attacker.
- **Auto-Recovery**: Automatically recreates deleted channels or roles with original names and permissions.
- **Whitelist**: Exempt trusted co-owners or bot partners from anti-nuke triggers.

#### 🛡️ AutoMod & Content Filter (`/dashboard/moderation`)
- **Anti-Spam**: Flags and mutes members sending >5 messages in 3 seconds.
- **Anti-Invite & Domain Blocker**: Deletes unauthorized `discord.gg` invites and raw URLs.
- **Mass Mention Protection**: Restricts mentions to a maximum of 4 per message.
- **Banned Words & Regex Filter**: Custom dictionary of disallowed terms.
- **Whitelist**: Safelist moderator roles and announcement channels.

---

### 2. Administration & Management

#### 🎫 Ticket Support Desk (`/dashboard/tickets`)
Enterprise-grade support and issue-resolution system.
- **Multi-Category Panels**: Route inquiries to separate departments (e.g., Billing, Technical Support, Player Reports).
- **Pre-Ticket Modals**: Gather critical details (order ID, in-game name, issue description) before provisioning the ticket channel.
- **Channel Isolation**: Private channel visible only to the ticket author and assigned support staff.
- **Staff Controls**: Claim/unclaim ownership, add/remove collaborators, and close tickets with confirmation dialogs.
- **HTML Transcripts**: Complete, beautifully styled, searchable chat transcripts generated upon ticket closure and delivered to your logging channel and user DM.

#### 📦 Server Backups & Recovery (`/dashboard/backups`)
Instant snapshots of server infrastructure for rollbacks and disaster recovery.
- **What is Saved**: Categories, text/voice channels, permission overwrites, server roles, hoist status, color codes, server meta, and emoji references.
- **1-Click Restore**: Cleanly restores channel structures and roles with safety confirmations.
- **Tier Quotas**:
  - **Free Tier**: 1 active backup slot, 7-day creation cooldown.
  - **Premium Tier**: 3 active backup slots, 24-hour creation cooldown, VIP high-priority restoration.

#### ⚡ Auto-Responder & Automation (`/dashboard/autoresponder`)
Eliminate repetitive staff questions with instant automated chat responses.
- **Matching Modes**: `Exact Match`, `Contains Word`, `Starts With`, or `Regex / Wildcard`.
- **Response Modes**: Clean plain text or rich studio-grade embeds with custom colors, thumbnail graphics, and footers.
- **Channel Scoping**: Restrict triggers to specific FAQ or help channels, and ignore moderator roles.

---

### 3. Community & Engagement

#### 👋 Welcome & Departure Suite (`/dashboard/welcome`)
- **Join Channel Greetings**: Send rich text or embed welcome greetings into your welcome channel.
- **Canvas Graphic Welcome Cards**: 1024x500 high-resolution canvas cards rendered in sub-seconds with avatar cutout, custom background, and personalized greeting text.
- **6 Theme Presets**: Modern Obsidian, Cyberpunk Neon, Cosmic Aurora, Minimal Frosted, Golden Royale, and Emerald Horizon.
- **Autoroles**: Automatically assign one or multiple community roles the instant a new member joins.
- **Private DM Onboarding**: Send rules, guides, and server links directly to member DMs.

#### 🎉 Giveaways System (`/dashboard/giveaways`)
- **Live Button Counters**: Interactive entry buttons display live participant counts (`🎉 Enter (42)`).
- **Role Gating**: Restrict entry to specific roles (e.g. `@Booster`, `@VIP`, `@Subscriber`).
- **Custom Visuals**: Accent colors, banner image headers, and customizable prize descriptions.
- **Reroll & Management**: Draw new winners with one click from Discord or the dashboard.

#### 🎛️ Reaction Roles (`/dashboard/rr`)
- **Interactive Button Menus**: Instant, mobile-friendly one-tap role assignment.
- **Dropdown Select Menus**: Compact single or multi-select dropdowns for servers with dozens of self-assignable roles.
- **Analytics & Drag-and-Drop**: Monitor role popularity and drag items to reorder them directly from the dashboard.

---

### 4. Entertainment & Economy

#### 🎵 Lossless Music Studio (`/dashboard/music` & `/dashboard/music/player`)
- **Lossless 320kbps Audio**: Stream high-fidelity audio from Spotify, SoundCloud, and web streams.
- **Real-Time DSP Filters**: Bass Boost, 8D Audio, Nightcore, Vaporwave, and Karaoke vocal removal.
- **Web Music Player**: Full-screen Spotify-style player with queue reordering, track scrubbing, and voice channel sync.
- **Playlists & Autoplay**: Save up to 20 custom playlists (Premium) and toggle intelligent autoplay recommendations.

#### 🪙 Virtual Economy & Atoms Bank (`/dashboard/economy`)
- **Server Currency**: Default "Atoms" or custom currency name and symbol (e.g., 🪙 Gold, 💎 Gems).
- **Earning Channels**:
  - `/eco earn daily`: Daily login rewards with recurring streak multipliers.
  - `/eco earn work`: Complete job shifts for paychecks.
  - `/eco earn mine`: Dig for rare ores (Iron, Gold, Uranium, Diamonds).
  - `/eco earn chop`: Harvest timber in community forests.
  - `/eco earn crime`: High-risk, high-reward criminal heists.
  - `/eco earn reactor`: Power the nuclear reactor for massive energy payouts.
- **Bank Vault & Robberies**: Cash in wallets can be robbed by other users; cash in the Bank Vault is 100% protected.
- **Server Role Shop**: Server owners can list Discord roles for sale using virtual currency.

---

### 5. Advanced & Utilities

#### 🎙️ Join-to-Create (JTC) Voice Rooms (`/dashboard/utilities`)
- Dynamic, temporary voice channels generated when members join a designated "Hub" channel.
- Automatically deleted when the last person leaves to prevent channel clutter.

#### 📌 Sticky Messages (`/dashboard/utilities`)
- Pins persistent guidelines, notices, or trade rules at the bottom of active chat channels.
- Automatically reposted whenever chat activity moves the notice out of view.

#### 👻 Anti-Ghostping Shield (`/dashboard/utilities`)
- Catches members who mention a user or role and quickly delete their message.
- Alerts the victim with the author's tag, message snippet, and timestamp, with optional automatic timeouts.

#### 🔔 Ephemeral Join-Pings (`/dashboard/utilities`)
- Sends an instant ping in a welcome or rules channel when a member joins, then auto-deletes it after 5 seconds to notify the member without cluttering channel history.

#### 🎂 Birthday Celebrations (`/dashboard/utilities`)
- Tracks member birthdays and automatically announces them with a celebratory card and temporary role on their special day.

---

### 6. Premium Exclusives

#### 🤖 AI Assistant Studio (`/dashboard/ai`)
- **High-Speed Groq Llama 3.3**: Sub-second conversational AI response times.
- **Custom Bot Persona**: Set custom backstories, system prompts, and behavioral instructions.
- **Dedicated Auto-Reply Channels**: Bind the AI to channels like `#ask-ai` for seamless, prefix-free conversations.
- **Direct Mention Mode**: Mention `@Uranium` anywhere to get intelligent answers.

#### 📺 YouTube Subscriber Verification (`/dashboard/verification`)
- Link your official YouTube Creator Channel ID.
- Members authenticate via Google OAuth2; the bot verifies their active subscription status via YouTube API.
- Automatically awards custom Discord roles (e.g. `@Subscriber`, `@VIP`).

#### 🎨 Per-Server Bot Personalizer (`/dashboard/personalize`)
- **Server Avatar**: Custom static PNG or animated GIF avatar specifically inside your server.
- **Server Profile Banner**: Custom banner displayed in the bot's user popout.
- **Server About Me Bio**: Up to 190 characters of custom backstory or server description.

---

## ⚡ 3. Master Slash Command Reference

| Command | Subcommands & Options | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `/ticket` | `setup`, `panel`, `close`, `claim`, `unclaim`, `add-user`, `remove-user`, `archive`, `information` | Manage Server (Admin) / Send Messages | Configure support desk, spawn panels, and manage active tickets |
| `/backup` | `info`, `create [name]`, `restore <slot>`, `delete <slot>` | Administrator | Capture snapshots or deep-restore server layout |
| `/antinuke` | `enable`, `disable`, `punishment <type>`, `limits <actions>`, `autorecovery <enabled>`, `whitelist` | Administrator | Real-time audit-log defense against rogue administrators |
| `/autoresponse` | `add`, `remove <trigger>`, `list` | Manage Server | Create, view, and delete automated chat replies |
| `/ai` | `chat <prompt>`, `setup <channel>`, `disable <channel>`, `style <tone>`, `status`, `stats` | Manage Server (setup) / Everyone (chat) | Conversational AI powered by Groq Llama 3.3 (Premium) |
| `/ytverify` | `setup`, `disable`, `status` | Manage Server | YouTube subscriber verification gate (Premium) |
| `/join-to-create` | `setup <voice_channel> <category> <limit>`, `disable` | Manage Channels | Dynamic temporary voice channel generator |
| `/stickymessage` | `create <content> <type> [channel]`, `list`, `remove <id>` | Manage Messages | Pin persistent messages at the bottom of channels |
| `/anti-ghostping` | `setup`, `disable`, `config <action> [timeout]`, `number-reset` | Manage Server | Detect and punish deleted mention messages |
| `/join-ping` | `enable <channel>`, `disable`, `status` | Manage Server | Ephemeral notification ping for newcomers |
| `/birthday` | `set <month> <day>`, `next`, `celebrate` | Everyone | Birthday announcements and celebratory roles |
| `/eco` | `info balance`, `info leaderboard`, `bank deposit`, `bank rob`, `earn daily`, `earn work`, `earn mine` | Everyone | Virtual economy, mining, jobs, and banking |
| `/eco-admin` | `balance add/remove`, `reset`, `multiplier`, `item add` | Administrator | Economy bank vault and server currency management |
| `/music` / `/play` | `play <query>`, `pause`, `resume`, `skip`, `queue`, `stop`, `volume`, `filter` | Everyone / Connect | 320kbps lossless streaming audio player |
| `/giveaway` | `start <duration> <winners> <prize>`, `end`, `reroll`, `list` | Manage Server | Interactive giveaways with role gating |
| `/rr` | `create`, `list`, `delete` | Manage Roles | Self-assignable button and dropdown role menus |
| `/premium` | `status`, `redeem <code>`, `buy`, `support` | Everyone (status) / Admin (redeem) | View and activate Uranium Premium perks |

---

## 🏷️ 4. Dynamic Template Variables

You can use the following variables in Welcome Messages, Departure Alerts, Auto-Responders, and Ticket Panels:

| Variable | Output Example | Compatible Modules |
| :--- | :--- | :--- |
| `{user}` | `<@932136827605905489>` (User Mention) | Welcome, Auto-Responder, Tickets, Leave |
| `{username}` | `alex_dev` (Raw Username) | Welcome, Auto-Responder, Canvas Cards |
| `{server}` / `{guild}` | `Celestial Gaming Hub` (Server Name) | All Modules |
| `{server.member_count}` / `{count}` | `1,420` (Total Server Members) | Welcome, Auto-Responder, Canvas Cards |
| `{channel}` | `<#123456789>` (Channel Mention) | Auto-Responder, Welcome |
| `{user.id}` | `932136827605905489` (Discord User Snowflake) | Welcome, Tickets, Auto-Responder |

---

## 💎 5. Free vs. Premium Tier Comparison

| Feature | Free Tier | Premium Tier |
| :--- | :--- | :--- |
| **Server Verification Gate** | ✅ 100% Unlocked (1-Click & 2FA OTP) | ✅ Included |
| **AutoMod & Anti-Raid** | ✅ Full Protection Suite | ✅ Included |
| **Ticket Support System** | ✅ 1 Ticket Panel Included | ✅ Unlimited Ticket Panels |
| **Server Backups** | 1 Active Slot • 7-Day Cooldown | 3 Active Slots • 24-Hour Cooldown |
| **Music Streaming & Filters** | ✅ 320kbps Lossless & All DSP Filters | ✅ 320kbps Lossless + Autoplay |
| **Saved Playlists** | 1 Custom Playlist | Up to 20 Custom Playlists |
| **Welcome & Goodbye Cards** | ✅ All 6 Canvas Card Presets | ✅ Included |
| **Reaction Roles & Giveaways** | ✅ Unlimited Menus & Role Gating | ✅ Included |
| **Virtual Economy & Games** | ✅ Full Economy, Mining & Bank | ✅ Multipliers & Custom Roles |
| **AI Assistant Studio** | ❌ Premium Only | ✅ Groq Llama 3.3 Sub-Second AI |
| **YouTube Verification** | ❌ Premium Only | ✅ Automated Subscriber Roles |
| **Bot Personalizer** | Nickname Customization | Custom Server Avatar, Banner & Bio |

---

## 🛠️ 6. Troubleshooting & Support

### "Bot cannot assign roles or ban members"
- **Solution**: Discord requires the bot's role to be higher than the target member and higher than the role being assigned. Go to **Server Settings** > **Roles** and drag **Uranium** to the top of the list.

### "Auto-responder or AutoMod isn't seeing messages"
- **Solution**: Ensure the **Message Content Intent** is enabled in the Discord Developer Portal under your application settings.

### "Backup restore didn't restore chat history"
- **Reason**: Discord Developer API policies strictly forbid storing user chat logs in server backups. Backups preserve server infrastructure, channels, categories, permissions, roles, and server meta.

### "Need Help or Have Feature Requests?"
- Join our official community: [Discord Support & Community Hub](https://discord.gg/26ThFyckFX)
- Issue reporting: Open an issue on our official GitHub repository.
