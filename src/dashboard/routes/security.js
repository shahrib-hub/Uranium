// src/dashboard/routes/security.js — Anti-Nuke & Server Shield API
const { Router } = require('express');
const { ChannelType } = require('discord.js');
const antinukeDb = require('../../utils/antinukeDb');

const DEFAULT_FEATURES = [
  { id: 'channel_delete', name: 'Channel Deletion Shield', description: 'Triggers when unauthorized channels are deleted' },
  { id: 'channel_create', name: 'Channel Mass-Create Shield', description: 'Triggers on channel spam creation' },
  { id: 'role_delete', name: 'Role Deletion Shield', description: 'Protects critical server roles from deletion' },
  { id: 'role_create', name: 'Role Spam Creation Shield', description: 'Prevents mass unauthorized role creation' },
  { id: 'ban', name: 'Mass Ban Shield', description: 'Prevents rogue admins from mass banning members' },
  { id: 'kick', name: 'Mass Kick Shield', description: 'Prevents rogue admins from mass kicking members' },
  { id: 'bot_add', name: 'Rogue Bot Shield', description: 'Blocks unauthorized bot additions without admin whitelist' },
  { id: 'webhook_create', name: 'Webhook Creation Shield', description: 'Blocks unauthorized webhook spams' }
];

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
        log_channel: null,
        features: {}
      };

      const whitelist = (await antinukeDb.listWhitelist(guild.id)) || [];
      const recoveryLogs = (await antinukeDb.getRecoveryLogs(guild.id, 25)) || [];

      // Enrich whitelist members with Discord details
      const enrichedWhitelist = await Promise.all(
        whitelist.map(async (userId) => {
          try {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
              return {
                id: userId,
                username: member.user.username,
                displayName: member.displayName,
                avatar: member.user.displayAvatarURL({ dynamic: true, size: 64 })
              };
            }
          } catch {}
          return { id: userId, username: `User (${userId})`, displayName: userId, avatar: null };
        })
      );

      // Text channels for log channel selection
      const textChannels = guild.channels.cache
        .filter(c => c.type === ChannelType.GuildText)
        .map(c => ({ id: c.id, name: c.name }));

      res.json({
        config: {
          enabled: !!config.enabled,
          punishment: config.punishment || 'ban',
          action_limit: config.action_limit || 3,
          autorecovery: !!config.autorecovery,
          log_channel: config.log_channel || null,
          features: config.features || {}
        },
        availableFeatures: DEFAULT_FEATURES,
        whitelist: enrichedWhitelist,
        recoveryLogs,
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
      if (punishment && ['ban', 'kick', 'strip_roles'].includes(punishment)) {
        await antinukeDb.setPunishment(guild.id, punishment);
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

      const validFeature = DEFAULT_FEATURES.find(f => f.id === feature);
      if (!validFeature) {
        return res.status(400).json({ error: 'Unknown shield feature.' });
      }

      await antinukeDb.setFeature(guild.id, feature, enabled ? 1 : 0);
      res.json({ success: true, message: `${validFeature.name} ${enabled ? 'enabled' : 'disabled'}.` });
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

      if (!userId || !/^\d{17,20}$/.test(userId)) {
        return res.status(400).json({ error: 'Invalid Discord User ID.' });
      }

      await antinukeDb.addWhitelist(guild.id, userId);
      res.json({ success: true, message: `User ${userId} added to Anti-Nuke whitelist.` });
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

      await antinukeDb.removeWhitelist(guild.id, userId);
      res.json({ success: true, message: `User ${userId} removed from Anti-Nuke whitelist.` });
    } catch (err) {
      console.error('[Security API] WHITELIST REMOVE error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
