'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  Shield,
  Music,
  Gift,
  CheckCircle2,
  Sliders,
  ExternalLink,
  ChevronRight,
  Terminal,
  ArrowRight,
  Sparkles,
  Zap,
  Lock,
  Copy,
  Check,
  AlertTriangle,
  Crown,
  ShieldCheck,
  UserPlus,
  Palette,
  Settings,
  Headphones,
  MessageSquare,
  Ticket,
  Database,
  ShieldAlert,
  Wrench,
  Coins,
  Bot,
  Radio,
  Pin,
  Ghost,
  Calendar
} from 'lucide-react';

const DOCS_SECTIONS = [
  {
    id: 'getting-started',
    category: 'Getting Started',
    icon: Zap,
    items: [
      {
        id: 'intro',
        title: 'Introduction to Uranium',
        description: 'Learn about Uranium, its capabilities, and why Discord communities rely on it.',
        content: `
**Uranium** is a high-performance, all-in-one Discord bot engineered for modern communities, gaming squads, and content creators. It combines lossless 320kbps audio streaming, zero-latency AutoMod security, self-assignable reaction roles, interactive giveaways, server verification gates, and canvas welcome cards into a single unified platform.

### Why Choose Uranium?
- **All-in-One Powerhouse**: Replace 5+ separate bots with one reliable, zero-latency solution.
- **Generous Free Core Features**: Audio playback, server verification, AutoMod, reaction roles, and welcome card customizations are 100% free with zero paywalls.
- **Enterprise-Grade Uptime**: Hosted on multi-cluster infrastructure with 99.98% monitored reliability.
- **Live Two-Way Dashboard Sync**: Manage your server seamlessly from Discord slash commands or the rich web dashboard with real-time synchronization.

### Recommended First Steps:
1. [Invite Uranium to your server](#invite-bot) with Administrator or Manage Channels permissions.
2. Set up [Server Verification](#verification-overview) to prevent raid accounts from joining.
3. Configure your [AutoMod & Anti-Raid Defense](#automod).
4. Customize your [Welcome & Goodbye Suite](#welcome-setup).
5. Open the [Music Studio & Web Player](#music-streaming) for 320kbps lossless streaming.
`
      },
      {
        id: 'invite-bot',
        title: 'Inviting Uranium & Permissions',
        description: 'How to add Uranium to your Discord server and set up the correct role hierarchy.',
        content: `
Adding Uranium to your server takes under 30 seconds. Follow this guide to ensure all permissions and role hierarchies are configured correctly.

### Step 1: Authorize the Bot
Click the link below to invite Uranium via the official Discord OAuth2 authorization URL:
- [Add Uranium to Discord](https://discord.com/oauth2/authorize?client_id=932136827605905489&permissions=8&scope=bot%20applications.commands)

### Step 2: Role Hierarchy Placement
For moderation commands (ban, kick, timeout), autoroles, and verification to function correctly:
1. Open **Server Settings** > **Roles**.
2. Drag the **Uranium** bot role **above** any roles you want the bot to manage or assign (such as \`@Verified\`, \`@Member\`, \`@Unverified\`).
3. Ensure Uranium has **Manage Roles**, **Manage Channels**, and **Send Messages** permissions enabled.

> [!IMPORTANT]
> Discord security rules strictly prevent any bot from assigning, removing, or moderating roles placed higher than the bot's own highest role. Always place the Uranium bot role near the top of your server roles list!
`
      }
    ]
  },
  {
    id: 'verification',
    category: 'Server Verification',
    icon: ShieldCheck,
    items: [
      {
        id: 'verification-overview',
        title: 'Verification Setup & Discord Gate',
        description: 'How to set up an automated verification gate in your Discord server with custom embeds and buttons.',
        content: `
Uranium's **Server Verification Center** safeguards your server from automated self-bots, token raids, and malicious spam accounts by requiring new members to complete a verification step before unlocking access to your channels.

### How to Configure Verification
1. Navigate to the [Server Verification Center](/dashboard/verification) in your dashboard.
2. Choose your **Security Method**:
   - **One-Click Button**: Fast single-click button for rapid, user-friendly onboarding.
   - **2FA Direct Message OTP**: Generates a random 5-character security code sent to user DMs, entered in a modal to stop self-bots.
3. Select your **Verification Channel** (e.g. \`#verify\` or \`#rules\`).
4. Select your **Verified Role** (the role granted upon passing).
5. (Optional) Select an **Unverified Role** to automatically strip from members once verified.
6. Customize your **Embed Appearance** (title, description, accent hex color, optional banner image, and footer).
7. Customize your **Action Button** (label, color style, and custom emoji).
8. Click **Publish to Discord** — Uranium will immediately dispatch the interactive verification gate to your designated channel!

### Practical Community Use Cases
- **Anti-Raid Quarantine**: Restrict all new joins to a single read-only \`#verify\` channel until verified.
- **Rule Agreement Check**: Pair the verification embed with community guidelines so members acknowledge server rules before joining conversations.
- **Bot Farm Deterrence**: The 2FA OTP challenge stops token accounts because automated scripts cannot easily read DMs and complete custom modal challenges.
`
      },
      {
        id: 'verification-modes',
        title: 'One-Click vs. 2FA Direct Message OTP',
        description: 'Understand the differences between instant button verification and two-factor OTP challenges.',
        content: `
Uranium offers two distinct verification modes tailored to your server's security posture:

### 1. One-Click Button Verification
- **Mechanism**: Members click the designated button (e.g. \`✅ Verify\`) in the verification channel.
- **Security Level**: Low to Medium.
- **User Friction**: Zero. Instant 1-second role assignment.
- **Best For**: Gaming communities, friendly hangout servers, and public servers with minimal raid risk.

### 2. 2FA Direct Message OTP Challenge
- **Mechanism**: 
  1. Member clicks the verification button.
  2. Uranium sends a private direct message (DM) containing a 5-character alphanumeric one-time password (e.g. \`K9X4B\`).
  3. The member clicks **Enter OTP** in the channel, submits the code into a native Discord modal popup, and is verified.
- **Security Level**: High / Raid-Proof.
- **User Friction**: Minimal (takes ~10 seconds).
- **Best For**: Large public servers, NFT/crypto communities, partnered servers, and servers experiencing frequent bot attacks.

> [!TIP]
> Both verification modes are 100% unlocked in the free tier for all servers!
`
      },
      {
        id: 'role-isolation',
        title: 'Channel Lockdown & Unverified Role Strategy',
        description: 'How to structure channel permissions so unverified members only see the verification channel.',
        content: `
To create an airtight verification gate, configure your Discord channel permission overrides using the **Role Isolation Strategy**:

### Step 1: Default Role (@everyone) Permissions
1. Go to **Server Settings** > **Roles** > **@everyone**.
2. Turn **OFF** \`View Channels\` for \`@everyone\`.
3. Now all server channels are hidden by default from unverified members.

### Step 2: Verification Channel Permissions
1. Open the settings for your \`#verify\` channel.
2. Under **Permissions**, add **@everyone** and set \`View Channel: ALLOW\` and \`Read Message History: ALLOW\`. Set \`Send Messages: DENY\`.
3. Ensure **Uranium** has \`View Channel\`, \`Send Messages\`, \`Embed Links\`, and \`Use External Emojis\` set to **ALLOW**.

### Step 3: Verified Member Role
1. Create a role called \`@Member\` or \`@Verified\`.
2. For all your community channels (e.g. \`#general\`, \`#gaming\`, \`#voice\`), grant \`View Channel: ALLOW\` to your \`@Member\` role.
3. In Uranium's dashboard, set **Verified Role** to \`@Member\`.

Once a user clicks verify, Uranium gives them \`@Member\` and the entire server unlocks for them seamlessly!
`
      }
    ]
  },
  {
    id: 'welcome-goodbye',
    category: 'Welcome & Goodbye',
    icon: UserPlus,
    items: [
      {
        id: 'welcome-setup',
        title: 'Welcome & Departure Messages',
        description: 'Automatically greet newcomers and announce departures with text or rich embeds.',
        content: `
The **Welcome & Goodbye Suite** ([/dashboard/welcome](/dashboard/welcome)) helps create memorable first impressions for every new member joining your server.

### Key Capabilities
- **Join Channel Messages**: Dispatch rich welcome text or embeds into your designated welcome channel.
- **Dynamic Variable Tags**:
  - \`{user}\` — Mentions the member (e.g. <@123456789>)
  - \`{username}\` — Member username (e.g. shahrib)
  - \`{server}\` / \`{guild}\` — Server name
  - \`{server.member_count}\` / \`{count}\` — Total server members after join
- **Direct Message Greetings**: Send private welcome messages and onboarding guides directly to newcomers.
- **Departure Notices**: Automatically announce departures in your log channel to track member exits.

### How to Enable:
1. Open [Welcome & Goodbye](/dashboard/welcome).
2. Toggle the master **Active** switch to **ON**.
3. Under **Send a message when a user joins**, select your welcome channel.
4. Choose **Text message** or **Embed message** mode and write your greeting.
5. Click **Save Changes** and test using the **Send Test Message** button!
`
      },
      {
        id: 'welcome-cards',
        title: 'Custom Canvas Welcome Cards',
        description: 'Fine-tune fonts, color palettes, background themes, opacity, and template titles.',
        content: `
Uranium features an advanced high-resolution (1024x500) canvas rendering engine that produces studio-quality graphic welcome cards with zero lag.

### 6 Curated Theme Presets
- **Modern Obsidian**: Deep obsidian blacks with glowing rose accents.
- **Cyberpunk Neon**: High-contrast purple and cyan synthwave grid.
- **Cosmic Aurora**: Deep space violet nebulae and celestial starlight.
- **Minimal Frosted**: Sleek modern glassmorphism with subtle borders.
- **Golden Royale**: Elegant bronze-gold trim for luxury and gaming clubs.
- **Emerald Horizon**: Clean, vivid emerald greens for modern tech communities.

### Card Customizations
- **Font Styling**: Modern Sans, Outfit, Editorial Serif, and Terminal Mono.
- **Color Palettes**: Primary text colors and background overlay tints.
- **Overlay Opacity**: Adjust transparency from 0% to 100% to blend background artwork.
- **Custom Background URLs**: Upload or link direct PNG/JPG/WEBP images to use as the card background.
- **Dynamic Title & Subtitle**: Format card headers with \`{user}\`, \`{username}\`, and \`{count}\`.
`
      },
      {
        id: 'autoroles-dms',
        title: 'Autoroles & Private DM Onboarding',
        description: 'Instantly assign community roles and deliver private welcome guides.',
        content: `
### Automatic Role Assignment (Autoroles)
Automatically assign roles to new members the second they join your server:
1. Scroll to **Give a role to new users (Autoroles)** on [/dashboard/welcome](/dashboard/welcome).
2. Use the searchable multi-select picker to choose one or more roles.
3. Save settings.

> [!NOTE]
> Make sure the **Uranium** bot role is placed higher than your autoroles in Discord Server Settings > Roles!

### Private Direct Message (DM) Greetings
Deliver custom onboarding links, server rules, or getting-started FAQs directly into member DMs:
- Toggle **Send a private message to new users (DM)**.
- Choose between plain text or rich embeds with custom colors.
- Attach the rendered welcome card directly to their DM for a personalized touch!
`
      }
    ]
  },
  {
    id: 'security-defense',
    category: 'Moderation & AutoMod',
    icon: Shield,
    items: [
      {
        id: 'automod',
        title: 'Intelligent AutoMod Engine',
        description: 'Protect your community against spam, discord invite leaks, mass mentions, and toxic words.',
        content: `
Uranium features a comprehensive zero-delay moderation defense system that operates 24/7 without requiring manual staff intervention.

### AutoMod Protection Modules
1. **Anti-Spam**: Flags and mutes accounts sending more than 5 messages per 3 seconds.
2. **Anti-Invite & Domain Filter**: Automatically detects and deletes unauthorized Discord server invites (\`discord.gg/...\`) and raw domain links.
3. **Mass Mention Protection**: Restricts mentions to a maximum of 4 per message to stop mention raids.
4. **Banned Words & Regex Filter**: Custom dictionary of prohibited phrases that are immediately purged.
5. **Whitelist System**: Safelist trusted roles (e.g. \`@Moderator\`, \`@VIP\`) and channels from AutoMod inspection.

### Moderation Slash Commands
\`\`\`bash
/mute <@user> <duration> [reason]    # Timeout a member
/unmute <@user>                      # Remove timeout
/ban <@user> [reason]                # Permanently ban a rulebreaker
/unban <user_id>                     # Unban a user
/clear <amount>                      # Bulk delete up to 100 messages
/lock [channel]                      # Emergency channel lockdown
/unlock [channel]                    # Lift channel lockdown
\`\`\`
`
      }
    ]
  },
  {
    id: 'music-audio',
    category: 'Music & Audio Engine',
    icon: Music,
    items: [
      {
        id: 'music-streaming',
        title: 'Lossless Audio & Commands',
        description: 'Stream lossless 320kbps music from YouTube, Spotify, and SoundCloud with zero lag.',
        content: `
Uranium utilizes a high-performance audio engine to deliver lossless 320kbps audio with zero stutter and minimal latency.

### Core Music Commands
| Command | Description | Example |
| :--- | :--- | :--- |
| \`/play <query>\` | Search and play a track or playlist URL | \`/play lofi hip hop\` |
| \`/pause\` | Pause the currently playing song | \`/pause\` |
| \`/resume\` | Resume playback | \`/resume\` |
| \`/skip\` | Vote or instantly skip the active track | \`/skip\` |
| \`/previous\` | Jump back to the previously played song | \`/previous\` |
| \`/stop\` | Stop music, clear queue, and leave voice | \`/stop\` |
| \`/queue\` | View upcoming tracks in the server queue | \`/queue\` |
| \`/volume <1-100>\` | Adjust master playback volume | \`/volume 75\` |

### Supported Audio Sources
- **Spotify**: Tracks, Albums, Playlists
- **SoundCloud**: Tracks, Artist Playlists
- **Direct Web Streams**: Lossless audio streams and internet radio stations
`
      },
      {
        id: 'audio-filters',
        title: 'DSP Filters (BassBoost, 8D, Nightcore)',
        description: 'Apply studio-grade digital signal processing filters to any audio stream in real-time.',
        content: `
Transform your listening experience with real-time audio filters that can be toggled on the fly.

### Available Audio Filters
- **Bass Boost**: Amplifies low-end frequencies (+12dB) with zero distortion.
- **Nightcore**: Increases playback speed and pitch for an energetic feel.
- **8D Audio**: Simulates rotational binaural 360° surround audio across stereo channels.
- **Vaporwave**: Slows down tempo and deepens pitch for relaxed, nostalgic vibes.
- **Karaoke**: Filters out center-channel vocals for sing-along sessions.

### How to Toggle Filters
You can apply filters via slash command:
\`\`\`bash
/filter set type:bassboost
/filter clear
\`\`\`
Or use the interactive buttons on the Discord player embed and the web dashboard!
`
      },
      {
        id: 'web-player-playlists',
        title: 'Full Web Music Player & Playlists',
        description: 'Spotify-style web player with queue management, personal playlists, and voice synchronization.',
        content: `
Uranium includes a dedicated full-screen Web Music Player ([/dashboard/music/player](/dashboard/music/player)) that brings desktop streaming software directly to your browser.

### Web Player Features
- **Real-Time Voice Channel Sync**: View active channels, ping latency, and track progress live.
- **Interactive Queue Management**: Drag, reorder, remove, or jump to any track in queue.
- **Personal Playlists**: Create custom playlists, add your favorite tracks, and load entire collections into Discord with one click.
- **Continuous Autoplay**: Intelligent music recommendations keep the music going even after the queue finishes.
`
      }
    ]
  },
  {
    id: 'reaction-roles',
    category: 'Reaction Roles',
    icon: Sliders,
    items: [
      {
        id: 'reaction-roles-setup',
        title: 'Reaction Roles & Self-Assignment',
        description: 'Set up self-assignable role menus with buttons, dropdowns, and live activity tracking.',
        content: `
Allow members to self-assign notification, gaming, and color roles using modern Discord interactive buttons and dropdown menus.

### Key Features
- **Button Menus**: Fast, mobile-friendly buttons with custom emojis and labels.
- **Dropdown Menus**: Compact single or multi-select dropdowns for servers with dozens of roles.
- **Item Reordering**: Move role items up or down directly in the dashboard.
- **24-Hour Analytics**: Track member engagement and popular role claims over time.

### How to Create a Menu
1. Open the [Uranium Dashboard](/dashboard/rr).
2. Select your server and click **+ Create Menu**.
3. Choose the target channel, message title, and embed color.
4. Add roles with custom emojis and labels.
5. Click **Publish Menu** — Uranium will immediately post the interactive role panel into Discord!
`
      }
    ]
  },
  {
    id: 'giveaways',
    category: 'Giveaways System',
    icon: Gift,
    items: [
      {
        id: 'giveaways-guide',
        title: 'Custom Giveaways & Role Gating',
        description: 'Launch professional giveaways with custom embed colors, banners, role gating, and live counters.',
        content: `
Uranium giveaway system is built for high community engagement with total visual customization.

### Customization Capabilities
- **Role Gating**: Restrict entry to specific Discord roles (e.g. \`@Booster\`, \`@Subscriber\`). Members without the required role receive an informative alert.
- **Live Discord Button Counters**: Interactive buttons display real-time entry counts (e.g. \`🎉 Enter (48)\`).
- **Visual Branding**: Custom accent colors, thumbnail icons, and banner images.
- **Winner Announcements**: Automatic random winner selection with winner mentions and direct jump links back to the giveaway post.
- **Reroll System**: Instantly draw new winners with one click from Discord or the Dashboard.

### Discord Command Usage
\`\`\`bash
/giveaway start duration:1d winners:1 prize:Discord Nitro channel:#giveaways
/giveaway end message_id:123456789
/giveaway reroll message_id:123456789
/giveaway list
\`\`\`
`
      }
    ]
  },
  {
    id: 'personalize',
    category: 'Bot Personalizer',
    icon: Palette,
    items: [
      {
        id: 'personalize-guide',
        title: 'Per-Server Bot Identity Customization',
        description: 'Customize Uranium display name, animated avatars, banners, and bios strictly per-server.',
        content: `
The **Bot Personalizer** ([/dashboard/personalize](/dashboard/personalize)) allows servers to customize Uranium's appearance specifically inside their server.

### Free vs. Premium Features:
- **Bot Nickname (100% Free)**:
  - Custom display name strictly inside your server.
  - Unlocked for all servers with no restrictions.
  - Leave blank to reset to default bot username.
- **Server Bot Avatar (Premium)**:
  - Custom static PNG/JPG or animated GIF avatar.
  - Updates the bot's server profile via Discord's \`PATCH /guilds/{guildId}/members/@me\`.
- **Server Profile Banner (Premium)**:
  - Custom static or animated profile banner displayed in the bot's user popout.
- **Server About Me / Bio (Premium)**:
  - Up to 190 characters of custom backstory or server description.

### Live Discord Previews
The personalizer includes a real-time reactive Discord preview showing:
1. **Member List Preview**: How Uranium looks in your server member sidebar with the \`APP\` badge.
2. **Full Profile Card Preview**: Protruding circular avatar, banner header, username, and About Me bio.
`
      }
    ]
  },
  {
    id: 'settings-system',
    category: 'Settings & Diagnostics',
    icon: Settings,
    items: [
      {
        id: 'server-configuration',
        title: 'Server Settings & Prefix Setup',
        description: 'Configure bot prefixes, primary language, log channels, and monitor system diagnostics.',
        content: `
Configure core bot operations via the [Bot Settings](/dashboard/settings) module:

### Configuration Options
- **Command Prefix**: Set custom prefixes (e.g. \`!\`, \`?\`, \`.\`) alongside standard Discord slash commands.
- **Primary Language**: English, Spanish, French, German, or Portuguese for bot system responses and embeds.
- **Audit Log Channel**: Dedicated channel where bot events, errors, and system notices are recorded.

### Diagnostics & Monitoring
The dashboard overview displays live server health metrics:
- **Connected Shard**: Shard cluster identifier.
- **Gateway Ping**: Real-time Discord WebSocket latency.
- **Node.js Runtime & RAM**: Live memory usage tracking.
`
      }
    ]
  },
  {
    id: 'premium-perks',
    category: 'Premium & Perks',
    icon: Crown,
    items: [
      {
        id: 'premium-overview',
        title: 'Premium Features & Upgrades',
        description: 'Discover all exclusive features, expanded limits, and perks unlocked with Uranium Premium.',
        content: `
Uranium provides powerful core functionality for any community, alongside an optional **Premium Tier** designed for large communities, gaming hubs, and creator servers that need expanded limits and advanced tools.

### Current Premium Perks & Features
- **🎨 Bot Personalizer**: Custom per-server animated GIF/image avatar, profile banner, and custom server bio.
- **🎵 20 User Playlists**: Save and load up to 20 personal playlists across web and Discord (Free tier: 1).
- **📻 Continuous Autoplay**: Uninterrupted audio recommendations when queue completes.
- **✨ YouTube Verification**: Automate role granting for verified YouTube channel subscribers with \`/ytverify\`.
- **🗃️ Expanded Server Backups**: Unlock +2 extra backup slots, instant restores, and a 24-hour reduced cooldown.
- **🎨 Embed Template Vault**: Save and load up to 20 custom embed templates (Free limit: 3).

### Managing Your Premium Subscription
You can view, redeem, and manage your server's premium status directly on Discord:
| Command | Action |
| :--- | :--- |
| \`/premium status\` | View active premium status and expiration date |
| \`/premium redeem <code>\` | Activate a premium code for the current server |
| \`/premium buy\` | Access our official store and purchase links |
| \`/premium support\` | Connect with dedicated premium support staff |

> [!IMPORTANT]
> To purchase or inquire about Premium for your server, visit our official [Support & Premium Portal](https://discord.gg/26ThFyckFX).
`
      }
    ]
  },
  {
    id: 'tickets-support',
    category: 'Ticket Support System',
    icon: Ticket,
    items: [
      {
        id: 'tickets-overview',
        title: 'Ticket System Setup & Custom Panels',
        description: 'Create multi-category support desks with interactive buttons, modal forms, and staff assignment.',
        content: `
Uranium's **Ticket Support Desk** ([/dashboard/tickets](/dashboard/tickets)) provides an enterprise-grade customer support and issue resolution platform directly inside Discord.

### Key Capabilities
- **Multi-Category Panels**: Route tickets to specialized departments (e.g. \`General Support\`, \`Billing Inquiries\`, \`Player Reports\`).
- **Interactive Modals**: Collect crucial context (e.g. in-game username, order number, proof link) before the ticket channel is even opened.
- **Dedicated Role Assignment**: Only assigned support staff and the ticket creator can view the channel.
- **HTML Transcripts**: Complete, browsable chat logs automatically uploaded to your log channel upon ticket closure.

### How to Deploy a Ticket Panel:
1. Open the [Ticket Support System](/dashboard/tickets) in your dashboard.
2. Select or create your **Open Tickets Category** (e.g. \`🎫 TICKETS\`).
3. Select your **Closed Tickets Category** (e.g. \`📁 ARCHIVED TICKETS\`).
4. Select your **Transcript Channel** (e.g. \`#ticket-logs\`).
5. Choose your **Support Staff Roles** that should have full permission to respond to and manage tickets.
6. Design your **Ticket Panel Embed** with a title, description, custom accent color, and action button.
7. Click **Deploy Ticket Panel** — Uranium will immediately post the interactive panel into your designated channel!
`
      },
      {
        id: 'tickets-lifecycle',
        title: 'Ticket Lifecycle & Slash Commands',
        description: 'Manage open tickets, claim staff ownership, add collaborators, and export transcripts.',
        content: `
Once a user clicks to open a ticket, Uranium provisions a private text channel with custom permission overwrites so only the user and support staff can participate.

### Ticket Lifecycle Controls
- **Claiming Tickets**: Staff can click the **Claim Ticket** button or use \`/ticket claim\` to assign ownership, notifying other staff members that the inquiry is being addressed.
- **Adding / Removing Users**: Invite witnesses or co-op members into the ticket using \`/ticket add-user <user>\`.
- **Closing with Confirmation**: Staff or the creator can click **Close Ticket**. Uranium prompts with a confirmation dialog to prevent accidental closures.
- **Automatic Archival & Logging**: When closed, Uranium generates a searchable HTML transcript, sends it to the transcript channel, DMs a copy to the user, and archives or deletes the channel according to your settings.

### Essential Ticket Slash Commands
\`\`\`bash
/ticket setup channel:#support transcript_channel:#logs open_category:Tickets closed_category:Closed archive_category:Archive support_role:@Support
/ticket panel channel:#support name:"Billing Support" types:"Billing,Report,General"
/ticket claim                         # Claim ownership of the active ticket
/ticket unclaim                       # Release ownership
/ticket add-user user:@Member         # Add collaborator to ticket channel
/ticket remove-user user:@Member      # Remove collaborator
/ticket close                         # Close ticket & export transcript
/ticket information                   # View ticket status, creator, and claimed staff
\`\`\`
`
      }
    ]
  },
  {
    id: 'server-backups',
    category: 'Server Backups & Recovery',
    icon: Database,
    items: [
      {
        id: 'backups-overview',
        title: 'Disaster Recovery & Snapshots',
        description: 'Capture complete snapshots of server channels, permissions, roles, and settings for instant rollback.',
        content: `
Uranium's **Server Backup & Disaster Recovery Suite** ([/dashboard/backups](/dashboard/backups)) protects your community from rogue administrators, compromised accounts, or accidental deletions.

### What is Preserved in a Backup?
- **Channels & Categories**: Complete structure, topic descriptions, bitrates, slowmodes, and positional ordering.
- **Permission Overwrites**: Every granular role and member permission overwrite for each channel.
- **Server Roles**: Role names, hex colors, hoisted display status, and exact permission bitfields.
- **Server Meta & Visuals**: Server name, verification tier, default notification levels, AFK channels, and icon settings.
- **Custom Emojis & Stickers**: Server custom emoji and sticker asset references.

> [!WARNING]
> Discord Developer API privacy policies strictly prohibit bots from capturing member chat message history in backups. Backups preserve server infrastructure, roles, permissions, and channels.
`
      },
      {
        id: 'backups-tiers',
        title: 'Backup Quotas: Free vs. Premium',
        description: 'Understand snapshot slot allocations, cooldown timers, and restoration safety guarantees.',
        content: `
To ensure fair cloud storage and prevent abuse of intensive Discord channel-creation APIs, backup quotas are structured as follows:

| Feature | Free Tier | Premium Tier |
| :--- | :--- | :--- |
| **Active Backup Slots** | **1 Slot** | **3 Slots** |
| **Creation Cooldown** | **7 Days** | **24 Hours (1 Day)** |
| **Restoration Speed** | High-Priority API Rate Limiting | VIP Rapid Rebuilding Engine |
| **Cloud Storage** | Secure Cloud Storage | Persistent Multi-Region Cloud Storage |
| **Direct Web Restores** | Available | Available |

### Backup Slash Commands
\`\`\`bash
/backup info                          # Check current tier, remaining slots, and cooldown
/backup create [name]                 # Capture a fresh snapshot (e.g. "Pre-Raid Backup")
/backup restore slot:<1-3>            # Deep-restore server layout (Administrator only)
/backup delete slot:<1-3>             # Free up a slot for a new backup
\`\`\`

> [!CAUTION]
> Performing a **Deep Restore** will recreate your channels, permissions, and roles to match the snapshot. Always verify with other server owners before initiating a restore!
`
      }
    ]
  },
  {
    id: 'security-shield',
    category: 'Anti-Nuke & Server Shield',
    icon: ShieldAlert,
    items: [
      {
        id: 'antinuke-overview',
        title: 'Real-Time Audit Log Defense',
        description: 'Detect and neutralize rogue administrators, hacked bot tokens, and mass-destruction attempts in milliseconds.',
        content: `
Uranium's **Anti-Nuke & Server Shield** ([/dashboard/security](/dashboard/security)) acts as an automated 24/7 internal affairs officer for your server, continuously inspecting Discord audit logs for rapid destructive activity.

### Threat Vectors Monitored:
1. **Mass Channel Deletion**: Halts attempts to delete multiple text or voice channels.
2. **Mass Role Deletion**: Prevents malicious removal of community and staff roles.
3. **Mass Member Bans & Kicks**: Intercepts rogue staff members purging your member list.
4. **Rogue Bot Infiltration**: Flags and removes unauthorized bot additions made without owner clearance.
5. **Webhook Poisoning**: Blocks mass webhook creation used for spam raids.
6. **Mass Member Pruning**: Detects and aborts unauthorized server prunes.

### Automated Punishment Protocols:
When an unauthorized administrator or compromised account breaches your action limits, Uranium strikes instantly:
- **Ban User**: Immediately issues a permanent ban to the attacker.
- **Kick User**: Evicts the attacker from the server.
- **Strip Administrative Roles**: Instantly removes all roles containing Administrator, Manage Channels, or Manage Roles permissions, neutralizing the threat while keeping the account present for investigation.
`
      },
      {
        id: 'antinuke-config',
        title: 'Shield Configuration & Safe Whitelist',
        description: 'Set custom action thresholds, enable auto-recovery, and whitelist trusted co-owners.',
        content: `
### Step 1: Configure Action Thresholds
In [/dashboard/security](/dashboard/security) or via slash commands, establish your sensitivity:
- **Action Limits**: Number of sensitive actions allowed within a rolling 10-second window (e.g., 3 actions).
- **Auto-Recovery**: When enabled, Uranium will automatically recreate deleted channels or roles with their original names and settings!

### Step 2: Establish the Whitelist
Add trusted bot partners and co-owners to the Anti-Nuke Whitelist so routine maintenance is never falsely flagged:
\`\`\`bash
/antinuke enable                      # Activate master anti-nuke defense
/antinuke punishment type:ban         # Set punishment to Ban (or kick/striproles)
/antinuke limits actions:3            # Trigger defense if >3 actions occur in seconds
/antinuke autorecovery enabled:true   # Automatically restore deleted channels/roles
/antinuke whitelist add user:@CoOwner # Exempt trusted admin from anti-nuke checks
/antinuke whitelist list              # Review all currently whitelisted accounts
\`\`\`

> [!IMPORTANT]
> The Uranium bot role must be positioned **at the very top** of your server role hierarchy in Discord Server Settings > Roles so it can ban or strip permissions from malicious administrators.
`
      }
    ]
  },
  {
    id: 'autoresponder',
    category: 'Auto-Responder & Automation',
    icon: MessageSquare,
    items: [
      {
        id: 'autoresponder-overview',
        title: 'Chat Triggers & Dynamic Placeholders',
        description: 'Configure automated instant replies for frequent questions, rules, links, and community keywords.',
        content: `
The **Auto-Responder Suite** ([/dashboard/autoresponder](/dashboard/autoresponder)) eliminates repetitive moderator questions by responding instantly whenever members mention specific keywords or phrases.

### Trigger Matching Modes:
- **Exact Match**: Fires only when the message exactly matches the trigger (case-insensitive).
- **Contains Word**: Fires whenever the trigger phrase appears anywhere inside the message.
- **Starts With**: Triggers if the message begins with the designated phrase.
- **Regex / Wildcard**: Advanced pattern matching for power users.

### Dynamic Template Variables:
Personalize your auto-replies with dynamic variables:
- \`{user}\` — Mentions the member who triggered the response (e.g. <@123456789>).
- \`{username}\` — Member's Discord username (e.g. \`alex_dev\`).
- \`{server}\` — Name of the Discord server.
- \`{memberCount}\` — Current total server members.
- \`{channel}\` — Channel mention where the response is posted.
`
      },
      {
        id: 'autoresponder-embeds',
        title: 'Rich Embeds & Channel Scoping',
        description: 'Deliver responses as studio-grade embeds, restrict triggers to specific channels, and slash commands.',
        content: `
### Plain Text vs. Rich Embed Responses
- **Plain Text**: Clean, casual replies that blend into conversation naturally.
- **Rich Embeds**: Professional boxed cards with custom accent hex colors, headers, thumbnail graphics, and footer timestamps.

### Scoping & Whitelisting:
Prevent spam by restricting auto-responders:
- **Allowed Channels**: Only trigger inside specific channels (e.g. \`#faq\`, \`#help\`).
- **Ignored Channels**: Mute triggers in high-speed channels (e.g. \`#general\`, \`#spam\`).
- **Ignored Roles**: Allow moderators or staff to type trigger words without firing bot replies.

### Auto-Response Slash Commands:
\`\`\`bash
/autoresponse list                    # View all active triggers in your server
/autoresponse add                     # Launch interactive setup wizard
/autoresponse remove trigger:"!faq"   # Delete an existing auto-response trigger
\`\`\`
`
      }
    ]
  },
  {
    id: 'ai-studio',
    category: 'AI Assistant Studio',
    icon: Bot,
    items: [
      {
        id: 'ai-overview',
        title: 'Groq Llama 3.3 Engine & Personalities',
        description: 'Integrate conversational artificial intelligence powered by ultra-fast Groq Llama 3.3 inference (Premium).',
        content: `
The **AI Assistant Studio** ([/dashboard/ai](/dashboard/ai)) turns Uranium into an intelligent, witty conversationalist for your community, powered by state-of-the-art Groq Llama 3.3 models with sub-second response times.

> [!NOTE]
> AI Assistant Studio is an exclusive **Premium Feature**. Free tier servers can upgrade anytime with \`/premium buy\` or \`/premium redeem\`.

### Core Capabilities:
- **Sub-Second Groq Inference**: Blazing-fast response speeds feel like a real human typing.
- **Custom System Personalities**: Tailor the bot to speak like a fantasy RPG NPC, a sarcastic cyberpunk droid, a helpful gaming tutor, or a formal company representative.
- **Conversation Memory Window**: Retains recent conversational turns so members can have natural, multi-part discussions.
- **Creativity (Temperature) Slider**: Adjust between precise, factual responses (0.2) or whimsical, creative banter (0.9).
`
      },
      {
        id: 'ai-channels',
        title: 'Dedicated AI Channels & Direct Mentions',
        description: 'Configure automated auto-reply channels or summon the AI anywhere via mentions.',
        content: `
### Interaction Modes:
1. **Dedicated AI Channels**: Bind the AI to a channel like \`#ask-ai\` or \`#bot-chat\`. Uranium will automatically converse with any message sent in that channel with zero prefix required!
2. **Direct Mentions (@Uranium)**: Mention \`@Uranium <question>\` in any allowed server channel to get an immediate AI response.
3. **Slash Command**: Use \`/ai chat prompt:<message>\` for private or ephemeral answers.

### AI Slash Commands:
\`\`\`bash
/ai chat prompt:"Explain quantum entanglement in 2 sentences"
/ai setup channel:#ask-ai             # Enable automatic AI chat in dedicated channel
/ai disable channel:#ask-ai           # Disable automatic AI in that channel
/ai style style:sarcastic             # Choose preset tone (casual, sarcastic, poetic, formal)
/ai stats                             # View server AI message counters and tokens used
/ai status                            # Check if AI is active in the current channel
\`\`\`
`
      }
    ]
  },
  {
    id: 'yt-verification',
    category: 'YouTube Verification',
    icon: Sparkles,
    items: [
      {
        id: 'yt-verify-overview',
        title: 'Automated YouTube Subscriber Roles',
        description: 'Verify members who subscribe to your YouTube channel and grant them exclusive roles (Premium).',
        content: `
The **YouTube Subscriber Verification System** ([/dashboard/verification](/dashboard/verification)) bridges your YouTube creator channel with your Discord community, rewarding real subscribers with special VIP roles.

> [!NOTE]
> YouTube Subscriber Verification is an exclusive **Premium Feature** designed for content creators and streamers.

### How the Verification Flow Works:
1. **Admin Setup**: Configure your YouTube Channel ID and select the target Discord reward role (e.g. \`@YouTube Subscriber\`).
2. **Member Initiation**: A member types \`/ytverify\` in your server or clicks the interactive verification embed button.
3. **Google OAuth Authorization**: Uranium provides a secure, official Google OAuth2 login link.
4. **Subscription Validation**: The bot queries the YouTube Data API v3 to confirm the user is actively subscribed to your channel.
5. **Instant Role Grant**: If verified, Uranium immediately assigns the reward role and logs the event!

### Slash Commands:
\`\`\`bash
/ytverify setup                       # Interactive YouTube channel & role configuration
/ytverify status                      # Check active YouTube verification settings
/ytverify disable                     # Deactivate YouTube subscriber verification
\`\`\`
`
      }
    ]
  },
  {
    id: 'utilities-tools',
    category: 'Server Utilities & Tools',
    icon: Wrench,
    items: [
      {
        id: 'jtc-voice',
        title: 'Join-to-Create Temporary Voice Channels',
        description: 'Clean, dynamic voice channels created on demand when members join, auto-deleted when empty.',
        content: `
Say goodbye to cluttered voice channel lists! **Join-to-Create (JTC)** allows members to spin up their own private voice channels on demand.

### How It Works:
1. You designate a primary "Hub" voice channel (e.g. \`➕ Click to Create\`).
2. When a member joins the Hub, Uranium instantly generates a new voice channel (e.g. \`Alex's Channel\`) and moves the member into it.
3. The channel owner has full control over room permissions.
4. When the last person leaves the room, Uranium immediately deletes the temporary channel to keep your server immaculate!

### Setup Command:
\`\`\`bash
/join-to-create setup voice_channel:#Click-To-Create category:Voice-Rooms limit:5
/join-to-create disable               # Turn off Join-to-Create voice system
\`\`\`
`
      },
      {
        id: 'sticky-messages',
        title: 'Sticky Messages & Channel Rules',
        description: 'Pin persistent notices, guidelines, or announcements at the bottom of active chat channels.',
        content: `
**Sticky Messages** stick to the bottom of your chat channel! Whenever new messages are sent, Uranium automatically reposts the sticky notice so it is never lost in chat history.

### Use Cases:
- **Trading Channels**: Remind users of anti-scam rules and official trade formats.
- **Help Channels**: Remind members to fill out support templates before asking questions.
- **Announcement Channels**: Keep event dates or stream schedules persistently in view.

### Sticky Slash Commands:
\`\`\`bash
/stickymessage create content:"⚠️ Follow Discord TOS" type:bottom channel:#general embed:true
/stickymessage list                   # View all active sticky notices
/stickymessage remove id:<id>         # Remove a sticky message
\`\`\`
`
      },
      {
        id: 'anti-ghostping-tools',
        title: 'Anti-Ghostping, Join-Pings & Birthdays',
        description: 'Detect deleted mention alerts, grab newcomer attention with ephemeral pings, and celebrate birthdays.',
        content: `
### Anti-Ghostping Shield
Catches members who mention a user or role and quickly delete their message:
- **Notification**: Uranium alerts the victim with who pinged them, what was said, and the timestamp.
- **Optional Timeouts**: Automatically timeout repeat offenders for 5 to 60 minutes.
- **Command**: \`/anti-ghostping setup\` | \`/anti-ghostping config action:notify\`

### Ephemeral Join-Pings
Sends an instant ping in a welcome or rules channel when a member joins, then automatically deletes it 5 seconds later. This guarantees the newcomer receives a notification indicator on the channel without leaving clutter!
- **Command**: \`/join-ping enable channel:#rules\` | \`/join-ping disable\`

### Automated Birthday Celebrations
Collect member birthdays and celebrate them automatically with an announcement card and custom celebratory role on their special day!
- **Command**: \`/birthday set month:5 day:14\` | \`/birthday next\` | \`/birthday celebrate\`
`
      }
    ]
  },
  {
    id: 'economy-system',
    category: 'Economy & Virtual Bank',
    icon: Coins,
    items: [
      {
        id: 'economy-overview',
        title: 'Server Currency (Atoms), Jobs & Mining',
        description: 'Engage your community with a full virtual economy featuring custom currency, daily rewards, and mining.',
        content: `
Uranium features a comprehensive virtual economy centered around **Atoms** (or your server's customized currency name and symbol).

### How Members Earn Atoms:
- \`/eco earn daily\`: Daily login rewards with recurring streak multipliers.
- \`/eco earn work\`: Work various community jobs for paychecks.
- \`/eco earn mine\`: Mine for rare ores (Iron, Gold, Uranium, Diamonds).
- \`/eco earn chop\`: Chop timber in the community forest.
- \`/eco earn crime\`: High-risk, high-reward criminal heists with potential fines!
- \`/eco earn scavenge\`: Search abandoned sectors for valuable scrap and relics.
- \`/eco earn reactor\`: Operate the nuclear reactor for massive energy payouts.
`
      },
      {
        id: 'economy-bank-shop',
        title: 'Banking, Robbing, Gambling & Shop',
        description: 'Protect wealth in the bank vault, rob careless members, gamble in dice games, and purchase server roles.',
        content: `
### Banking & Security:
Cash held in members' wallets can be stolen by other members using \`/eco bank rob <user>\`! 
- Members can deposit their cash into the Bank Vault using \`/eco bank deposit <amount>\`.
- Wealth stored in the Bank Vault is 100% immune to robberies.
- Purchase **Padlocks** and **Security Alarms** from the shop to defend your wallet.

### Gambling & Games:
Multiply your fortunes or lose it all in fair community games:
- Coin Flips, Dice Rolls, Slots, and Blackjack tables.

### Server Role Shop & Net Worth:
Server administrators can configure custom shop items and roles using \`/eco-admin\`. Members can spend their hard-earned Atoms to unlock prestigious Discord roles and vanity perks!

### Economy Slash Commands:
\`\`\`bash
/eco info balance [user]              # Check wallet & bank balance
/eco info leaderboard type:net        # View richest members by net worth
/eco bank deposit amount:all          # Secure all wallet cash into bank vault
/eco bank transfer user:@Friend amount:500  # Send cash to another member
/eco earn daily                       # Claim your daily login streak bonus
/eco earn work                        # Complete a shift for Atoms
\`\`\`
`
      }
    ]
  }
];

// Helper: render inline markdown (bold, code, links, italic)
function renderInline(text, onSelectSection) {
  if (!text) return null;
  const regex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-extrabold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Inline code: `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded-md bg-white/10 text-rose-300 font-mono text-xs border border-white/10">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Link: [text](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      if (href.startsWith('#') && onSelectSection) {
        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelectSection(href.slice(1))}
            className="text-rose-400 hover:text-rose-300 underline font-semibold transition cursor-pointer"
          >
            {label}
          </button>
        );
      }
      return (
        <a
          key={index}
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="text-rose-400 hover:text-rose-300 underline font-semibold transition inline-flex items-center gap-1"
        >
          {label}
          {href.startsWith('http') && <ExternalLink size={11} className="inline opacity-70" />}
        </a>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-white/90">
          {part.slice(1, -1)}
        </em>
      );
    }

    return part;
  });
}

// Full Markdown Component Parser
function MarkdownViewer({ content, onSelectSection, onCopyCode, copiedId }) {
  if (!content) return null;

  const lines = content.trim().split('\n');
  const elements = [];
  let i = 0;
  let elementIndex = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Empty line
    if (!line) {
      i++;
      continue;
    }

    // Code block: ```
    if (line.startsWith('```')) {
      const lang = line.replace('```', '').trim() || 'bash';
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const fullCode = codeLines.join('\n');
      const blockId = elementIndex++;
      elements.push(
        <div key={blockId} className="relative rounded-xl bg-black/60 border border-white/10 p-4 font-mono text-xs text-rose-300 my-4 overflow-x-auto shadow-inner">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] text-white/40 uppercase tracking-widest font-sans font-bold">
            <span>{lang}</span>
            <button
              onClick={() => onCopyCode(fullCode, blockId)}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition cursor-pointer"
            >
              {copiedId === blockId ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="overflow-x-auto leading-relaxed">{fullCode}</pre>
        </div>
      );
      continue;
    }

    // Table: starts with |
    if (line.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const parseRow = (r) => r.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        const headers = parseRow(tableLines[0]);
        // line 1 is separator | :--- | :--- |
        const rows = tableLines.slice(2).map(parseRow);

        elements.push(
          <div key={elementIndex++} className="my-6 overflow-x-auto rounded-xl border border-white/10 bg-black/40 shadow-inner">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-4 py-3 font-bold text-white uppercase tracking-wider">
                      {renderInline(h, onSelectSection)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.02] transition">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-3 text-white/80">
                        {renderInline(cell, onSelectSection)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Callout alert: > [!IMPORTANT] or >
    if (line.startsWith('>')) {
      const alertLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        alertLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      const rawText = alertLines.join(' ').replace('[!IMPORTANT]', '').trim();
      elements.push(
        <div key={elementIndex++} className="my-5 flex items-start gap-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
          <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            {renderInline(rawText, onSelectSection)}
          </div>
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={elementIndex++} className="text-base font-bold text-white mt-7 mb-2 border-b border-white/5 pb-2">
          {renderInline(line.replace('### ', ''), onSelectSection)}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={elementIndex++} className="text-lg font-extrabold text-white mt-8 mb-3">
          {renderInline(line.replace('## ', ''), onSelectSection)}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      // Top level header: suppress if redundant with page header, or render cleanly
      i++;
      continue;
    }

    // Unordered list: starts with - or *
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={elementIndex++} className="my-3 space-y-2 pl-1">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="flex items-start gap-2.5 text-sm text-white/80 leading-relaxed">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0 mt-2" />
              <div className="flex-1">{renderInline(item, onSelectSection)}</div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list: starts with digit.
    if (/^\d+\.\s/.test(line)) {
      const orderedItems = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        orderedItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={elementIndex++} className="my-4 space-y-2.5 pl-1">
          {orderedItems.map((item, oIdx) => (
            <li key={oIdx} className="flex items-start gap-3 text-sm text-white/80 leading-relaxed">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[11px] font-bold text-rose-300">
                {oIdx + 1}
              </span>
              <div className="flex-1">{renderInline(item, onSelectSection)}</div>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Plain paragraph
    elements.push(
      <p key={elementIndex++} className="text-sm text-white/75 leading-relaxed my-3">
        {renderInline(line, onSelectSection)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}

export default function DocsPage() {
  const [selectedSection, setSelectedSection] = useState('intro');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Flatten items for easy searching
  const allItems = useMemo(() => {
    const list = [];
    DOCS_SECTIONS.forEach((cat) => {
      cat.items.forEach((item) => {
        list.push({ ...item, category: cat.category, catId: cat.id });
      });
    });
    return list;
  }, []);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return DOCS_SECTIONS;
    const q = searchQuery.toLowerCase();
    return DOCS_SECTIONS.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.description.toLowerCase().includes(q) ||
          it.content.toLowerCase().includes(q)
      )
    })).filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  const currentItem = useMemo(() => {
    return allItems.find((it) => it.id === selectedSection) || allItems[0];
  }, [allItems, selectedSection]);

  const handleCopyCode = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const selectTopic = (id) => {
    setSelectedSection(id);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0d0f17] text-white selection:bg-rose-500/30 selection:text-white max-w-full overflow-x-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0d0f17]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition">
                <Zap size={16} fill="currentColor" />
              </span>
              <span className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center">
                Uranium <span className="text-xs font-bold text-rose-400 tracking-wide ml-1.5 hidden xs:inline">/ Docs</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-5 text-xs font-semibold text-white/60">
              <Link href="/" className="hover:text-white transition">Home</Link>
              <Link href="/commands" className="hover:text-white transition">Commands</Link>
              <Link href="/status" className="hover:text-white transition flex items-center gap-1 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Status</span>
              </Link>
              <Link href="/servers" className="hover:text-white transition">Dashboard</Link>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="https://discord.com/oauth2/authorize?client_id=932136827605905489&permissions=8&scope=bot%20applications.commands"
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-xs font-bold text-white flex items-center gap-1.5 hover:brightness-110 transition shadow-md shadow-rose-500/20"
            >
              <span className="hidden xs:inline">Add to </span>Discord
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </header>

      {/* Docs Body Layout */}
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-6 sm:py-8">
        {/* Mobile Docs Navigation Trigger Button */}
        <div className="lg:hidden mb-4">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#141624] border border-white/10 text-xs font-bold text-white shadow-lg active:scale-98 transition"
          >
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen size={16} className="text-rose-400 shrink-0" />
              <span className="truncate">Topic: <span className="text-rose-300 font-semibold">{currentItem.title}</span></span>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 text-[10px] uppercase font-bold shrink-0 ml-2">
              Browse Topics
            </span>
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
            <div className="relative w-4/5 max-w-xs h-full bg-[#11121d] border-r border-white/10 p-4 overflow-y-auto space-y-5 z-10">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  <BookOpen size={16} className="text-rose-400" />
                  Documentation
                </span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1 rounded-lg text-white/50 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Search Box in drawer */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search docs..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white placeholder-white/30 outline-none"
                />
              </div>

              {/* Navigation List in drawer */}
              <nav className="space-y-5">
                {filteredSections.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div key={cat.id} className="space-y-1.5">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-rose-400/90 ml-1">
                        <Icon size={13} />
                        <span>{cat.category}</span>
                      </div>
                      <div className="space-y-1">
                        {cat.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => selectTopic(item.id)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                              selectedSection === item.id
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <span className="truncate">{item.title}</span>
                            {selectedSection === item.id && (
                              <ChevronRight size={13} className="text-rose-400 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
          
          {/* Desktop Left Sidebar Navigation */}
          <aside className="hidden lg:block sticky top-24 space-y-6">
            {/* Search Box */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50"
              />
            </div>

            {/* Navigation List */}
            <nav className="space-y-6">
              {filteredSections.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-rose-400/90 ml-1">
                      <Icon size={14} />
                      <span>{cat.category}</span>
                    </div>
                    <div className="space-y-1">
                      {cat.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedSection(item.id)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                            selectedSection === item.id
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                              : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <span className="truncate">{item.title}</span>
                          {selectedSection === item.id && (
                            <ChevronRight size={13} className="text-rose-400 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* Support Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles size={14} className="text-rose-400" /> Need Support?
              </span>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Join the official Uranium Community Discord server for 24/7 technical support.
              </p>
              <a
                href="https://discord.gg/26ThFyckFX"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition"
              >
                Join Support Server
              </a>
            </div>
          </aside>

          {/* Main Article Content */}
          <main className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#12141f] p-4 sm:p-7 lg:p-10 shadow-2xl space-y-6 min-h-[75vh] w-full max-w-full overflow-hidden">
            {/* Breadcrumb */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-white/40">
              <Link href="/docs" className="hover:text-white transition">Docs</Link>
              <span>/</span>
              <span className="text-rose-400 font-semibold">{currentItem.category}</span>
              <span>/</span>
              <span className="text-white/80 truncate max-w-[180px] sm:max-w-none">{currentItem.title}</span>
            </div>

            {/* Header */}
            <div className="space-y-2 border-b border-white/10 pb-5 sm:pb-6">
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                {currentItem.title}
              </h1>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-2xl">
                {currentItem.description}
              </p>
            </div>

            {/* Article Markdown Body with Full Bold, Link, List, Table Support */}
            <div className="text-xs sm:text-sm leading-relaxed text-white/80 max-w-full overflow-hidden">
              <MarkdownViewer
                content={currentItem.content}
                onSelectSection={setSelectedSection}
                onCopyCode={handleCopyCode}
                copiedId={copiedId}
              />
            </div>

            {/* Bottom Footer Navigation */}
            <div className="pt-6 sm:pt-8 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <Link
                href="/commands"
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-2 transition text-center"
              >
                <Terminal size={14} className="text-rose-400" />
                <span>View All Slash Commands</span>
              </Link>
              <a
                href="https://discord.com/oauth2/authorize?client_id=932136827605905489&permissions=8&scope=bot%20applications.commands"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-rose-500/20 hover:brightness-110 transition flex items-center justify-center gap-2 text-center"
              >
                <span>Invite Uranium</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}
