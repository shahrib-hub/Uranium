# Discord Bot Verification & Developer Policy Compliance Guide

This guide details how **Uranium Bot** complies with the **Discord Developer Terms of Service** and **Discord Developer Policy**, and provides exact answers and steps for your Discord App Verification and Privileged Gateway Intent application.

---

## 1. Quick Checklist for the Discord Developer Portal

Before submitting your verification request under the **"App Verification"** tab:

1. **Owner Identity Verification**:
   - The team owner / account owner applying must complete Stripe identity verification (must be 16 years of age or older).
2. **Terms of Service & Privacy Policy URLs**:
   - **Terms of Service URL:** `https://uraniumbot.vercel.app/tos`
   - **Privacy Policy URL:** `https://uraniumbot.vercel.app/privacy`
   *(Ensure both are filled out under General Information in the Developer Portal)*.
3. **App Icon & Description**:
   - Provide a clean, high-resolution app icon.
   - Add a clear, professional description (e.g. *"Uranium is an all-in-one Discord companion featuring advanced moderation, automod, music playback, reaction roles, tickets, and interactive utility tools."*).
4. **Support Server & Server Invite**:
   - Ensure your support server link (`https://discord.gg/26ThFyckFX`) is active and accessible.

---

## 2. Privileged Gateway Intents Justification

When your bot requests **Message Content** or **Guild Members** privileged intents, Discord's review team asks specific questions. Use the prepared responses below:

### Intent 1: Message Content Intent (`GatewayIntentBits.MessageContent`)

* **Question: What features in your application require the Message Content intent?**
  > **Answer:**
  > Uranium Bot utilizes the Message Content intent strictly to operate real-time server security and chat automation features:
  > 1. **AutoMod Content Filtering:** Inspecting incoming chat messages for prohibited keywords, anti-invite links, phishing domains, and high-frequency spam to protect server communities.
  > 2. **Custom Prefix Commands & Auto-Responders:** Checking community-defined trigger phrases configured by server administrators.
  > 3. **Anti-Ghostping Detection:** Tracking deleted messages that mention members within a 30-second window to alert moderators of harassment.
  > 4. **AFK Mention Notifications:** Detecting when members mention an AFK user to notify the channel of their unavailable status.
  > 5. **Chat XP / Ranking System:** Incrementing activity counters when users chat in non-blacklisted channels.

* **Question: Why can't these features be accomplished using Slash Commands or Interaction Components?**
  > **Answer:**
  > AutoMod content filtering, anti-ghostping detection, anti-spam heuristics, and AFK mention alerts must inspect normal chat messages passively as members communicate. Slash commands and interaction components require explicit user invocation and cannot proactively protect channels from incoming malicious links, spam, or harassment.

* **Question: Does your application store or log message content? If so, where and for how long?**
  > **Answer:**
  > No. Uranium Bot processes message content ephemerally in-memory and does not permanently store raw user message content in any database. Moderation audit logs (message edits/deletions) are delivered directly as Discord embeds to the server's own designated moderation channel within that same guild and are never retained on our central servers.

---

### Intent 2: Server Members Intent (`GatewayIntentBits.GuildMembers`)

* **Question: What features require the Server Members intent?**
  > **Answer:**
  > Uranium Bot uses the Server Members intent for:
  > 1. **Automated Welcome & Goodbye:** Greeting incoming members and sending configured welcome embeds/roles upon joining.
  > 2. **Auto-Role System:** Instantly assigning initial member or bot roles to newcomers.
  > 3. **Anti-Raid / Anti-Nuke Security:** Detecting abnormal join bursts or unauthorized mass administrative actions to protect community integrity.
  > 4. **Verification Gates (OTP & Role Gates):** Verifying and granting verified member roles.
  > 5. **Moderation:** Allowing moderators to look up and apply timeout/warn/kick/ban actions accurately.

* **Question: Why can't this be done without the intent?**
  > **Answer:**
  > The `guildMemberAdd` and `guildMemberRemove` gateway events require the Server Members intent to detect joins and leaves in real-time. Without this intent, the bot cannot assign autoroles upon join, welcome new members, or activate anti-raid defenses.

---

## 3. How Uranium Bot Complies with Developer Terms & Policy

| Policy Requirement | How Uranium Bot Complies | Relevant File(s) |
| :--- | :--- | :--- |
| **Mandatory Privacy Policy & ToS** | Publicly accessible web pages and direct in-bot command `/privacy policy` with clickable links. | [`src/commands/Information/privacy.js`](file:///c:/Coding%20Stuff/Uranium%20Bot/src/commands/Information/privacy.js) |
| **User Data Deletion ("Right to Erasure")** | Interactive `/privacy delete-my-data` slash command wipes economy, ranking, AFK, birthday, and social records across MongoDB & SQLite. | [`src/utils/userDataManager.js`](file:///c:/Coding%20Stuff/Uranium%20Bot/src/utils/userDataManager.js), [`src/buttons/privacyButtons.js`](file:///c:/Coding%20Stuff/Uranium%20Bot/src/buttons/privacyButtons.js) |
| **Guild Data Deletion** | Admin command `/privacy delete-server-data` wipes all guild settings, logs, automod rules, tickets, and backups. | [`src/commands/Information/privacy.js`](file:///c:/Coding%20Stuff/Uranium%20Bot/src/commands/Information/privacy.js) |
| **No Credential Harvesting or Simulation** | Removed simulated password discovery and token strings; password generator made strictly ephemeral. | [`src/commands/Tools/tools.js`](file:///c:/Coding%20Stuff/Uranium%20Bot/src/commands/Tools/tools.js), [`src/commands/Fun/fun.js`](file:///c:/Coding%20Stuff/Uranium%20Bot/src/commands/Fun/fun.js) |
| **No Commercialization / Selling of Data** | Zero third-party tracking, zero sale of user or guild data. | Explicitly stated in ToS & Privacy Policy |
| **No Unsolicited DMs / Spam** | DMs are only sent in response to explicit actions (moderation warnings, OTP verification, or admin-configured welcome DMs with error handlers). | [`src/events/welcomeHandler.js`](file:///c:/Coding%20Stuff/Uranium%20Bot/src/events/welcomeHandler.js), [`src/utils/automodActions.js`](file:///c:/Coding%20Stuff/Uranium%20Bot/src/utils/automodActions.js) |
| **AI Safety & Discord Guidelines** | System prompt instructs Groq AI to adhere strictly to Discord Community Guidelines (no NSFW, harassment, hate speech, or malicious output). | [`src/utils/groq.js`](file:///c:/Coding%20Stuff/Uranium%20Bot/src/utils/groq.js) |
| **Server Administrative Security** | All destructive commands (restore backups, antinuke, purge, server data wipe) require native Discord Administrator permission. | [`src/commands/Utility/backup.js`](file:///c:/Coding%20Stuff/Uranium%20Bot/src/commands/Utility/backup.js), [`src/commands/Security/antinuke.js`](file:///c:/Coding%20Stuff/Uranium%20Bot/src/commands/Security/antinuke.js) |
