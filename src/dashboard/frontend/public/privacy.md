# Uranium Privacy Notice

**Effective date: September 26, 2026**

Uranium is a Discord bot and optional web dashboard. This notice describes the data
the application processes to provide its server-management features.

## Data processed

Uranium processes Discord identifiers and server configuration needed for enabled
features: user, server, channel, role, message, and interaction IDs; server
configuration; moderation case information; economy, ranking, playlist, giveaway,
verification, ticket, and reaction-role records; and content supplied to features
such as custom commands, sticky messages, tickets, AI prompts, and logging.

The dashboard uses Discord OAuth with only the `identify` and `guilds` scopes. OAuth
access and refresh tokens are used only during sign-in and are not saved. The
dashboard keeps a signed, HTTP-only session cookie for up to seven days.

## Why and how long

Data is used only to operate the feature that created it, secure the dashboard,
moderate the server when configured by its administrators, and troubleshoot the
service. Data remains until the relevant feature, server configuration, or account
record is deleted, or until it is no longer needed to operate that feature. Temporary
verification codes and rate-limit records are short-lived.

## Sharing and third parties

Uranium does not sell Discord data. Data is sent to Discord to operate the bot. A
server administrator may enable third-party integrations (for example music,
translation, AI, RSS, or Twitch); use of those features may send the input necessary
for that feature to the selected provider. Do not submit sensitive personal data to
optional integrations.

## Your choices and deletion requests

Server administrators can disable modules and delete many feature records from bot
commands or the dashboard. To request deletion of personal data that is not exposed
by a feature, contact the bot operator through the support/contact method listed on
the bot's Discord application profile. Include your Discord user ID and the relevant
server ID. Requests are verified before deletion and completed subject to legal and
security obligations.

## Security

Runtime databases and environment files are excluded from source control. Dashboard
sessions are signed, HTTP-only, and restricted to configured origins. Operators must
set a strong `SESSION_SECRET` and protect the host and database backups.
