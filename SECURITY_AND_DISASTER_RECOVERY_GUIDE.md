# 🛡️ Uranium Bot • Security, Anti-Nuke & Disaster Recovery Manual

This manual provides an in-depth operational guide for Discord server owners, administrators, and security leads on configuring **Anti-Nuke**, **Audit-Log Defense**, **AutoMod Hardening**, and **Server Disaster Recovery (Backups)** with Uranium.

---

## 📑 Table of Contents
1. [Threat Modeling in Discord Servers](#-1-threat-modeling-in-discord-servers)
2. [Anti-Nuke Defense Engine](#-2-anti-nuke-defense-engine)
   - [Monitored Attack Vectors](#monitored-attack-vectors)
   - [Punishment Protocols](#punishment-protocols)
   - [Auto-Recovery Architecture](#auto-recovery-architecture)
   - [Whitelist Best Practices](#whitelist-best-practices)
3. [Server Backups & Instant Rollback](#-3-server-backups--instant-rollback)
   - [Snapshot Architecture](#snapshot-architecture)
   - [Free vs. Premium Quotas](#free-vs-premium-quotas)
   - [Disaster Recovery Runbook](#disaster-recovery-runbook)
4. [AutoMod & Raid Prevention](#-4-automod--raid-prevention)
5. [Server Owner Security Checklist](#-5-server-owner-security-checklist)

---

## ⚠️ 1. Threat Modeling in Discord Servers

Most catastrophic Discord server incidents are not caused by external hackers guessing passwords; they result from:
1. **Compromised Staff Accounts**: A moderator falls for a phishing scam or malware, granting attackers full access to their token.
2. **Rogue Administrators**: A trusted staff member turns malicious and attempts to wipe all channels and ban everyone.
3. **Malicious / Compromised Bot Tokens**: A third-party utility bot in your server gets compromised or goes rogue with administrator permissions.
4. **Token Raids**: Automated bots flooding the server to spam invite links and mass-ping members.

Uranium provides multi-layer active defense against every single one of these attack vectors.

---

## 🛡️ 2. Anti-Nuke Defense Engine

The Uranium Anti-Nuke engine ([/dashboard/security](/dashboard/security)) functions as an autonomous, real-time security monitor that connects directly to the Discord Gateway and Audit Logs.

### Monitored Attack Vectors

| Attack Vector | Detection Trigger | Default Limit | Automated Action |
| :--- | :--- | :--- | :--- |
| **Mass Channel Deletion** | Rapid deletion of text, voice, or category channels | 3 deletions / 10s | Attacker Punished + Auto-Recovery |
| **Mass Role Deletion** | Rapid deletion of server roles | 3 deletions / 10s | Attacker Punished + Auto-Recovery |
| **Mass Member Bans** | Unauthorized mass banning of server members | 3 bans / 10s | Attacker Punished |
| **Mass Member Kicks** | Unauthorized mass kicking of members | 3 kicks / 10s | Attacker Punished |
| **Rogue Bot Infiltration** | Adding unapproved bot accounts to the server | 1 unauthorized bot | Bot Kicked + Inviter Punished |
| **Webhook Flooding** | Rapid creation of webhooks used for spamming | 3 webhooks / 10s | Webhooks Purged + Creator Punished |
| **Member Pruning** | Initiating unauthorized mass prune | 1 prune event | Attacker Punished |

### Punishment Protocols

You can configure what action Uranium executes when an administrator breaches the threshold:

1. **`ban` (Recommended)**:
   - Permanently bans the offender immediately.
   - Clears their recent messages.
   - Best for maximum security.
2. **`kick`**:
   - Evicts the offender from the guild.
   - Useful for test environments or lower-risk communities.
3. **`striproles`**:
   - Instantly strips all roles containing `Administrator`, `Manage Guild`, `Manage Channels`, or `Manage Roles`.
   - Neutralizes all destructive permissions while keeping the user account in the server for interrogation and audit review.

### Auto-Recovery Architecture

When `autorecovery` is enabled:
- If an attacker successfully deletes channels before the ban triggers, Uranium immediately detects the missing channel data from memory and **recreates the deleted channels and categories with their original names, positions, and permission overwrites**.
- If roles are deleted, Uranium recreates them with matching colors and permissions.

### Whitelist Best Practices

> [!CAUTION]
> Never whitelist accounts unless they are 100% verified co-owners who have hardware-key 2FA enabled on their Discord accounts.
> 
> Whitelisted accounts are completely exempt from Anti-Nuke restrictions. If a whitelisted account gets token-compromised, Uranium will not intervene against their actions!

To manage the whitelist:
```bash
/antinuke whitelist add user:@CoOwner
/antinuke whitelist remove user:@FormerAdmin
/antinuke whitelist list
```

---

## 📦 3. Server Backups & Instant Rollback

Uranium's backup subsystem ([/dashboard/backups](/dashboard/backups)) provides a bulletproof safety net in case of emergency.

### Snapshot Architecture

When you execute `/backup create`, Uranium performs a comprehensive recursive serialization of your server:
- **Server Identity**: Name, verification level, default notifications, AFK timeout, AFK channel.
- **Role Hierarchy**: All server roles (excluding managed bot integration roles), permission bitmasks, hex colors, and hoist/mentionable flags.
- **Channel Hierarchy**: Categories, text channels, announcement channels, voice channels, and forum channels.
- **Granular Permission Overwrites**: Complete role and member permission overrides for every single channel.
- **Custom Emojis & Stickers**: Names and asset URLs.

> [!NOTE]
> Discord Developer API privacy policies strictly prevent bots from archiving user chat messages. Backups preserve server infrastructure, roles, permissions, and layout.

### Free vs. Premium Quotas

| Quota | Free Tier | Premium Tier |
| :--- | :--- | :--- |
| **Available Slots** | 1 Active Snapshot | 3 Active Snapshots |
| **Creation Cooldown** | 7 Days | 24 Hours (1 Day) |
| **Restoration Priority** | Standard Rate Limiting | VIP Rapid Channel Creation |
| **Cloud Retention** | Persistent | Multi-Region Encrypted Cloud |

### Disaster Recovery Runbook

If your server suffers a catastrophic event (e.g. an owner account was hijacked or an external bot deleted channels):

1. **Lock Down the Guild**:
   - Kick or ban the compromised account immediately.
   - In Discord Server Settings, toggle **2FA Requirement for Moderation** to ON.
2. **Review Available Backups**:
   - Run `/backup info` or open the [Server Backups Dashboard](/dashboard/backups).
   - Check the creation timestamp and label of your stored snapshots.
3. **Execute the Deep Restore**:
   - Run `/backup restore slot:1` (or click **Restore** on the dashboard).
   - Confirm the safety prompt.
   - Uranium will sequentially rebuild categories, recreate text/voice channels, assign permission overrides, and restore server roles.
4. **Re-verify Member Roles**:
   - Check your autorole and verification gate settings to resume normal onboarding.

---

## 🛑 4. AutoMod & Raid Prevention

To stop incoming token raids and spam waves before they start:

1. **Deploy Server Verification**:
   - Go to `/dashboard/verification` and enable **2FA Direct Message OTP**.
   - Because token raid accounts run on automated scripts that do not parse DMs and Discord modal forms, 100% of automated token raids fail at the gate.
2. **Enable Anti-Spam & Mass Mentions**:
   - In `/dashboard/moderation`, toggle Anti-Spam (5 messages / 3s) and limit mentions to 4 per message.
   - Set punishment to **Timeout for 1 Hour**.
3. **Enable Anti-Invite**:
   - Block unauthorized `discord.gg` invite codes in public chat channels.

---

## ✅ 5. Server Owner Security Checklist

- [ ] **Uranium Role Placement**: Is the Uranium bot role placed at the top of Server Settings > Roles?
- [ ] **Audit-Log Shield**: Is `/antinuke enable` active with punishment set to `ban`?
- [ ] **Auto-Recovery**: Is `/antinuke autorecovery enabled:true` active?
- [ ] **Fresh Backup**: Have you created a baseline backup with `/backup create name:"Production Baseline"`?
- [ ] **Verification Gate**: Is `#verify` isolated from `@everyone` with permissions locked down?
- [ ] **Message Content Intent**: Is the Message Content Intent enabled in the Discord Developer Portal so AutoMod can inspect chat?
- [ ] **Staff 2FA**: Is Discord Server Settings > Moderation > 2FA Requirement enabled?
