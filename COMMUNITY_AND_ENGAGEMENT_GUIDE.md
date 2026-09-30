# 👥 Uranium Bot • Community, Economy & Engagement Guide

A complete operational guide for community managers, server staff, and server owners on deploying **Ticket Desks**, **Virtual Economies**, **Chat Automation**, **Join-to-Create Voice Channels**, and **AI Assistant Studio** with Uranium.

---

## 📑 Table of Contents
1. [🎫 Ticket Support Desk & Workflow](#1--ticket-support-desk--workflow)
2. [🪙 Virtual Economy & Community Atoms](#2--virtual-economy--community-atoms)
3. [⚡ Auto-Responder & Chat Intelligence](#3--auto-responder--chat-intelligence)
4. [🎙️ Join-to-Create (JTC) Voice Rooms](#4-️-join-to-create-jtc-voice-rooms)
5. [📌 Sticky Notices, Ghostpings & Birthdays](#5--sticky-notices-ghostpings--birthdays)
6. [🤖 AI Assistant Studio (Premium)](#6--ai-assistant-studio-premium)
7. [📺 YouTube Subscriber Verification (Premium)](#7--youtube-subscriber-verification-premium)

---

## 1. 🎫 Ticket Support Desk & Workflow

The Uranium Ticket Support Desk replaces chaotic support inquiries with structured, private communication channels.

### Setup Step-by-Step:
1. **Create Discord Categories**:
   - Create a category called `🎫 OPEN TICKETS`.
   - Create a category called `📁 CLOSED TICKETS`.
   - Create a channel called `#ticket-transcripts` (restrict view permissions to your staff role).
2. **Configure via Dashboard or Slash Command**:
   - In `/dashboard/tickets` or via `/ticket setup`:
     - Select your target support channel (e.g. `#create-ticket`).
     - Choose your Support Staff role (`@Support Staff`).
     - Select your open/closed categories and transcript channel.
3. **Deploy the Interactive Panel**:
   - Use `/ticket panel name:"Community Support Desk" types:"General Inquiries,Billing,Player Reports"` or deploy it directly from the web dashboard.
   - Uranium sends an interactive embed containing styled buttons for each ticket department.

### Staff Daily Workflow:
1. **User Opens a Ticket**: Uranium spins up `#ticket-0042` with private permissions for the member and `@Support Staff`.
2. **Claiming**: A support agent uses `/ticket claim` or clicks the in-channel **Claim** button. The bot updates the channel topic to show who is handling the issue.
3. **Adding Users**: If a witness or developer needs to join the conversation, use `/ticket add-user user:@Developer`.
4. **Closing**: Once resolved, click **Close Ticket** or run `/ticket close`.
   - Uranium generates an interactive, searchable HTML transcript.
   - The transcript is sent to `#ticket-transcripts`.
   - A copy of the transcript is direct-messaged to the ticket author.
   - The channel is deleted or moved to the closed category.

---

## 2. 🪙 Virtual Economy & Community Atoms

Uranium includes a fully-featured virtual economy game centered around **Atoms** (customizable to Coins, Credits, Gems, etc.) to drive chat activity and community engagement.

### Earning Activities:
- `/eco earn daily`: Daily login reward with escalating 7-day streak multipliers.
- `/eco earn work`: Complete job shifts for steady wages.
- `/eco earn mine`: Search subterranean shafts for rare minerals (Coal, Iron, Gold, Uranium, Diamonds).
- `/eco earn chop`: Harvest timber from the communal lumber forest.
- `/eco earn crime`: High-risk street heists (carries a risk of fines and jail time!).
- `/eco earn reactor`: Calibrate the nuclear reactor core for high energy rewards.

### Banking & Robbery Mechanics:
- **Wallet vs. Bank**: Money in a member's wallet can be pickpocketed by other members using `/eco bank rob user:@Target`.
- **Bank Vault Immunity**: Money deposited using `/eco bank deposit amount:all` is 100% immune to robberies.
- **Defense Items**: Members can buy **Padlocks** and **Alarm Systems** from the shop to catch thieves red-handed.

### Server Role Shop & Economy Admin:
Server administrators can create vanity perks:
- Use `/eco-admin item add` to sell server roles (e.g., `@VIP`, `@High Roller`, `@Server Legend`) for Atoms.
- Use `/eco info leaderboard type:net` to highlight the wealthiest community members on an automated leaderboard.

---

## 3. ⚡ Auto-Responder & Chat Intelligence

Cut down on repetitive moderator explanations with automated responses to frequently asked community questions.

### Triggers & Matching Modes:
- **Exact**: Triggers only when the message matches precisely (e.g. `!rules`).
- **Contains**: Triggers if the trigger phrase is found anywhere in the sentence (e.g. `how do i get verified`).
- **Starts With**: Triggers if the sentence begins with the phrase (e.g. `ip address`).
- **Regex**: Advanced patterns for complex filtering.

### Supported Template Variables:
- `{user}` — Mentions the triggering member (`<@123456789>`).
- `{username}` — Plain username (`alex_dev`).
- `{server}` — Current server name.
- `{count}` — Total server member count.
- `{channel}` — Channel mention where the message occurred.

### Best Practice Example:
- **Trigger**: `how to verify` (Contains)
- **Response**: `Hey {user}! Head over to <#verify-channel> and click the green **Verify** button to unlock all community channels!`

---

## 4. 🎙️ Join-to-Create (JTC) Voice Rooms

Join-to-Create keeps your server's voice channel list clean by generating channels dynamically on demand.

### How It Operates:
1. Admin creates a single voice channel named `➕ Create Voice Room`.
2. When a user enters the channel, Uranium immediately creates a private temporary channel (e.g., `Alex's Voice Room`), moves the user into it, and grants them ownership.
3. The creator can adjust user limits, lock the room, or invite specific friends.
4. When all users leave the room, Uranium instantly deletes the channel.

### Setup Command:
```bash
/join-to-create setup voice_channel:#Create-Room category:Voice-Lobbies limit:4
```

---

## 5. 📌 Sticky Notices, Ghostpings & Birthdays

### Sticky Notices (`/stickymessage`)
In busy channels (like `#trading` or `#giveaways`), important guidelines get buried instantly. Sticky messages automatically repost themselves to the very bottom of the chat every time members send messages, ensuring rules are always visible.

### Anti-Ghostping Shield (`/anti-ghostping`)
Ghostpinging occurs when someone mentions a user and immediately deletes the message to harass them with phantom notifications.
- When enabled, Uranium instantly detects deleted mentions and alerts the channel with the culprit's username, what was said, and the exact timestamp.
- Optionally applies automatic timeouts for repeat ghostping offenders.

### Automated Birthday Celebrations (`/birthday`)
Members can register their birth month and day with `/birthday set month:8 day:24`. On their birthday:
- Uranium posts a celebration announcement card in your announcements channel.
- Optionally assigns a temporary `@Birthday Star` role for 24 hours.

---

## 6. 🤖 AI Assistant Studio (Premium)

Powered by **Groq Llama 3.3**, Uranium's AI Assistant Studio brings an intelligent conversational bot to your server.

### Configuration Highlights:
- **Tone Presets**: Friendly, Casual, Sarcastic, Formal, or Poetic.
- **Custom System Persona**: Give the bot a detailed backstory (e.g. *"You are the chief AI operator of an orbital space station, speaking in technical sci-fi jargon."*).
- **Dedicated Auto-Reply Channel**: Set `/ai setup channel:#ask-ai` so every message in that channel is answered automatically without needing prefixes or mentions.
- **Temperature & Memory**: Adjust creativity levels and conversation history depth.

---

## 7. 📺 YouTube Subscriber Verification (Premium)

Transform your YouTube subscribers into active Discord community members!

### Flow:
1. Connect your YouTube Channel ID via `/ytverify setup` or `/dashboard/verification`.
2. Choose your subscriber reward role (e.g. `@YouTube Subscriber`).
3. Members use `/ytverify` and complete a secure, official Google OAuth2 verification check.
4. If they are actively subscribed to your channel, Uranium automatically awards the role, unlocking exclusive subscriber-only channels!
