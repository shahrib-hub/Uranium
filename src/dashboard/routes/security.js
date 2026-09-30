// src/dashboard/routes/security.js — Anti-Nuke & Server Shield API
const { Router } = require('express');
const { ChannelType } = require('discord.js');
const antinukeDb = require('../../utils/antinukeDb');

const DEFAULT_FEATURES = [
  { id: 'antichannel', alias: 'channel_delete', name: 'Channel Protection Shield', description: 'Triggers when unauthorized channels are deleted or created' },
  { id: 'antirole', alias: 'role_delete', name: 'Role Protection Shield', description: 'Protects critical server roles from deletion or tampering' },
  { id: 'antiban', alias: 'ban', name: 'Mass Ban Shield', description: 'Prevents rogue admins from mass banning members' },
  { id: 'antikick', alias: 'kick', name: 'Mass Kick Shield', description: 'Prevents rogue admins from mass kicking members' },
  { id: 'antibot', alias: 'bot_add', name: 'Rogue Bot Shield', description: 'Blocks unauthorized bot additions without admin whitelist' },
  { id: 'antiwebhook', alias: 'webhook_create', name: 'Webhook Creation Shield', description: 'Blocks unauthorized webhook spams' },
  { id: 'antiemoji', alias: 'emoji_delete', name: 'Emoji Shield', description: 'Protects server emojis and stickers from mass deletion' },
  { id: 'antiprune', alias: 'prune', name: 'Prune Shield', description: 'Blocks unauthorized mass member pruning' }
];

function resolveFeatureId(input) {
  if (!input) return null;
  const match = DEFAULT_FEATURES.find(f => f.id === input || f.alias === input);
  return match ? match.id : null;
}

module.exports = function createSecurityRouter(client, { requireGuildAccess, requireGuildAdmin, requireGuildMod }) {
  const router = Router();

  // 1. GET Anti-Nuke Configuration & Shield Status
  router.get('/guild/:guildId/security', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { guild } = req;
      const config = (await antinukeDb.getFullConfig(guild.id)) || {
        enabled: 0,
        punishment: 'ban',
        action_limit: 3,
        autorecovery: 1,
        log_channel: null
      };

      const whitelist = (await antinukeDb.listWhitelist(guild.id)) || [];
      const recoveryLogs = (await antinukeDb.getRecoveryLogs(guild.id, 25)) || [];

      // Enrich whitelist members with Discord details (ensuring id is strictly a string)
      const enrichedWhitelist = await Promise.all(
        whitelist.map(async (item) => {
          const rawId = typeof item === 'string' ? item : (item?.user_id || item?.userId || item?.id);
          const userId = rawId ? String(rawId) : null;
          if (!userId) return null;

          try {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
              return {
                id: userId,
                username: member.user.username,
                displayName: member.displayName || member.user.username,
                avatar: member.user.displayAvatarURL({ dynamic: true, size: 64 })
              };
            }
          } catch {}
          return { id: userId, username: `User (${userId})`, displayName: `User (${userId})`, avatar: null };
        })
      );

      // Text channels for log channel selection
      const textChannels = guild.channels.cache
        .filter(c => c.type === ChannelType.GuildText)
        .map(c => ({ id: c.id, name: c.name }));

      // Map feature states
      const featureMap = {};
      for (const feat of DEFAULT_FEATURES) {
        const val = config[feat.id] !== undefined ? config[feat.id] : (config[feat.alias] !== undefined ? config[feat.alias] : 0);
        featureMap[feat.id] = (val === 1 || val === true) ? 1 : 0;
        featureMap[feat.alias] = featureMap[feat.id]; // keep alias populated for frontend compatibility
      }

      res.json({
        config: {
          enabled: !!config.enabled,
          punishment: config.punishment || 'ban',
          action_limit: config.action_limit || 3,
          autorecovery: !!config.autorecovery,
          log_channel: config.log_channel || null,
          features: featureMap
        },
        availableFeatures: DEFAULT_FEATURES,
        whitelist: enrichedWhitelist.filter(Boolean),
        recoveryLogs: Array.isArray(recoveryLogs) ? recoveryLogs : [],
        textChannels
      });
    } catch (err) {
      console.error('[Security API] GET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. POST Update Main Anti-Nuke Settings
  router.post('/guild/:guildId/security/settings', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const { enabled, punishment, action_limit, autorecovery, log_channel } = req.body;

      if (enabled !== undefined) {
        await antinukeDb.setEnabled(guild.id, enabled ? 1 : 0);
      }
      if (punishment && ['ban', 'kick', 'strip_roles', 'striproles'].includes(punishment)) {
        await antinukeDb.setPunishment(guild.id, punishment === 'strip_roles' ? 'striproles' : punishment);
      }
      if (action_limit !== undefined) {
        const limit = Math.max(1, Math.min(20, parseInt(action_limit, 10) || 3));
        await antinukeDb.setActionLimit(guild.id, limit);
      }
      if (autorecovery !== undefined) {
        await antinukeDb.setAutoRecovery(guild.id, autorecovery ? 1 : 0);
      }
      if (log_channel !== undefined) {
        await antinukeDb.setLogChannel(guild.id, log_channel || null);
      }

      res.json({ success: true, message: 'Anti-Nuke settings saved successfully.' });
    } catch (err) {
      console.error('[Security API] SETTINGS error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. POST Toggle Individual Feature Shield
  router.post('/guild/:guildId/security/feature', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const { feature, enabled } = req.body;

      const canonicalId = resolveFeatureId(feature);
      if (!canonicalId) {
        return res.status(400).json({ error: 'Unknown shield feature.' });
      }

      await antinukeDb.setFeature(guild.id, canonicalId, enabled ? 1 : 0);
      res.json({ success: true, message: `Shield ${canonicalId} ${enabled ? 'enabled' : 'disabled'}.` });
    } catch (err) {
      console.error('[Security API] FEATURE toggle error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. POST Add Whitelist Member
  router.post('/guild/:guildId/security/whitelist', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const { userId } = req.body;

      if (!userId || !/^\d{17,20}$/.test(String(userId).trim())) {
        return res.status(400).json({ error: 'Please enter a valid 17-20 digit Discord User ID.' });
      }

      const cleanId = String(userId).trim();
      await antinukeDb.addWhitelist(guild.id, cleanId);
      res.json({ success: true, message: `User ${cleanId} added to Anti-Nuke whitelist.` });
    } catch (err) {
      console.error('[Security API] WHITELIST ADD error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. DELETE Remove Whitelist Member
  router.delete('/guild/:guildId/security/whitelist/:userId', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: 'User ID required.' });
      }

      const cleanId = String(userId).trim();
      await antinukeDb.removeWhitelist(guild.id, cleanId);
      res.json({ success: true, message: `User ${cleanId} removed from Anti-Nuke whitelist.` });
    } catch (err) {
      console.error('[Security API] WHITELIST REMOVE error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
