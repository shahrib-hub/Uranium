// src/dashboard/middleware.js — Auth & permission middleware

/**
 * Requires an authenticated session. Returns 401 if not logged in.
 */
function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

/**
 * Requires the user to be a member of the guild specified by :guildId param,
 * AND that the guild has the bot present.
 */
function requireGuildAccess(client) {
  return (req, res, next) => {
    const guildId = req.params.guildId;
    if (!guildId) return res.status(400).json({ error: 'Missing guildId' });

    // Check bot is in this guild
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Bot is not in this server' });

    // Check user's guild list from session
    const userGuilds = req.session?.guilds || [];
    const userGuild = userGuilds.find(g => g.id === guildId);
    if (!userGuild) return res.status(403).json({ error: 'You are not a member of this server' });

    req.guild = guild;
    req.userGuild = userGuild;
    next();
  };
}

/**
 * Requires the user to have MANAGE_GUILD permission (admin-level actions).
 */
function requireGuildAdmin(req, res, next) {
  const perms = parseInt(req.userGuild?.permissions || '0');
  const MANAGE_GUILD = 0x20; // MANAGE_GUILD permission bit
  const ADMINISTRATOR = 0x8;

  if ((perms & ADMINISTRATOR) === ADMINISTRATOR || (perms & MANAGE_GUILD) === MANAGE_GUILD) {
    return next();
  }

  // Also allow bot owner
  const ownerIds = (process.env.BOT_OWNER_IDS || '').split(',').map(s => s.trim());
  if (ownerIds.includes(req.session?.user?.id)) return next();

  return res.status(403).json({ error: 'You need Manage Server permission' });
}

module.exports = { requireAuth, requireGuildAccess, requireGuildAdmin };
