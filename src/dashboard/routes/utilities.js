// src/dashboard/routes/utilities.js — Utilities System API (JTC, Sticky, GhostPing, JoinPing, AutoRole, Birthdays)
const { Router } = require('express');
const { ChannelType } = require('discord.js');
const jtcService = require('../../listeners/joinToCreateServices');
const stickyStorage = require('../../utils/stickyStorage');
const ghostStorage = require('../../utils/ghostStorage');
const joinPingStorage = require('../../utils/joinPingStorage');
const autoroleStorage = require('../../utils/autoroleStorage');
const birthdayStorage = require('../../utils/birthdayStorage');

module.exports = function createUtilitiesRouter(client, { requireGuildAccess, requireGuildAdmin, requireGuildMod }) {
  const router = Router();

  // Common metadata helper for channels, categories, and roles
  const getGuildMetadata = (guild) => {
    const textChannels = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildText)
      .map(c => ({ id: c.id, name: c.name, parentId: c.parentId }));

    const voiceChannels = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildVoice)
      .map(c => ({ id: c.id, name: c.name, parentId: c.parentId }));

    const categories = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildCategory)
      .map(c => ({ id: c.id, name: c.name }));

    const roles = guild.roles.cache
      .filter(r => !r.managed && r.id !== guild.id)
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));

    return { textChannels, voiceChannels, categories, roles };
  };

  // ─────────────────────────────────────────────────────────────
  // 1. JOIN TO CREATE (JTC)
  // ─────────────────────────────────────────────────────────────
  router.get('/guild/:guildId/utilities/jtc', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { guild } = req;
      const setup = await jtcService.getSetup(guild.id);
      const metadata = getGuildMetadata(guild);
      res.json({ setup, ...metadata });
    } catch (err) {
      console.error('[JTC API] GET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/utilities/jtc', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const { triggerVoiceId, targetCategoryId, userLimit } = req.body;

      if (!triggerVoiceId || !targetCategoryId) {
        return res.status(400).json({ error: 'Trigger voice channel and target category are required.' });
      }

      await jtcService.deleteSetup(guild.id).catch(() => {});
      await jtcService.createSetup({
        guildId: guild.id,
        triggerVoiceId,
        targetCategoryId,
        userLimit: parseInt(userLimit, 10) || 0,
        createdBy: req.user?.id || 'Dashboard'
      });

      res.json({ success: true, message: 'Join-to-Create setup created!' });
    } catch (err) {
      console.error('[JTC API] POST error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/guild/:guildId/utilities/jtc', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      await jtcService.deleteSetup(guild.id);
      res.json({ success: true, message: 'Join-to-Create setup removed.' });
    } catch (err) {
      console.error('[JTC API] DELETE error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 2. STICKY MESSAGES
  // ─────────────────────────────────────────────────────────────
  router.get('/guild/:guildId/utilities/sticky', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { guild } = req;
      const stickies = (await stickyStorage.listStickies(guild.id)) || [];
      const config = (await stickyStorage.getGuildConfig(guild.id)) || {
        repostDelaySeconds: 5,
        autoPinOnCreate: false,
        webhookName: null
      };
      const metadata = getGuildMetadata(guild);
      res.json({ stickies, config, ...metadata });
    } catch (err) {
      console.error('[Sticky API] GET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/utilities/sticky', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const { channelId, content, embedFlag } = req.body;

      if (!channelId || !content || !content.trim()) {
        return res.status(400).json({ error: 'Channel and content are required.' });
      }

      const id = await stickyStorage.createSticky({
        guildId: guild.id,
        channelId,
        content: content.trim(),
        embedFlag: !!embedFlag,
        createdBy: req.user?.id || 'Dashboard'
      });

      res.json({ success: true, message: 'Sticky message created!', id });
    } catch (err) {
      console.error('[Sticky API] CREATE error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/guild/:guildId/utilities/sticky/:id', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await stickyStorage.removeSticky(id);
      res.json({ success: true, message: 'Sticky message removed.' });
    } catch (err) {
      console.error('[Sticky API] DELETE error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/utilities/sticky/config', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const { repostDelaySeconds, autoPinOnCreate } = req.body;
      await stickyStorage.setGuildConfig(guild.id, {
        repostDelaySeconds: Math.max(1, parseInt(repostDelaySeconds, 10) || 5),
        autoPinOnCreate: !!autoPinOnCreate
      });
      res.json({ success: true, message: 'Sticky configuration updated.' });
    } catch (err) {
      console.error('[Sticky API] CONFIG error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 3. GHOST PING PROTECTION
  // ─────────────────────────────────────────────────────────────
  router.get('/guild/:guildId/utilities/ghostping', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { guild } = req;
      const settings = (await ghostStorage.getSettings(guild.id)) || {
        enabled: 0,
        action: 'notify',
        timeoutSeconds: 300
      };
      res.json({
        settings: {
          enabled: settings.enabled === 1 || settings.enabled === true,
          action: settings.action || 'notify',
          timeoutSeconds: settings.timeoutSeconds || 300
        }
      });
    } catch (err) {
      console.error('[GhostPing API] GET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/utilities/ghostping', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const { enabled, action, timeoutSeconds } = req.body;

      await ghostStorage.setSettings(guild.id, {
        enabled: enabled ? 1 : 0,
        action: ['notify', 'timeout', 'none'].includes(action) ? action : 'notify',
        timeoutSeconds: Math.max(10, Math.min(86400, parseInt(timeoutSeconds, 10) || 300))
      });

      res.json({ success: true, message: 'Anti-Ghostping settings saved!' });
    } catch (err) {
      console.error('[GhostPing API] POST error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 4. JOIN PINGS
  // ─────────────────────────────────────────────────────────────
  router.get('/guild/:guildId/utilities/joinping', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { guild } = req;
      const channels = (await joinPingStorage.listChannels(guild.id)) || [];
      const metadata = getGuildMetadata(guild);
      res.json({ channels, ...metadata });
    } catch (err) {
      console.error('[JoinPing API] GET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/utilities/joinping', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const { channelId } = req.body;
      if (!channelId || !guild.channels.cache.has(channelId)) {
        return res.status(400).json({ error: 'Valid channel ID required.' });
      }

      await joinPingStorage.addChannel(guild.id, channelId);
      res.json({ success: true, message: 'Join-ping channel added!' });
    } catch (err) {
      console.error('[JoinPing API] POST error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/guild/:guildId/utilities/joinping/:channelId', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const { channelId } = req.params;
      await joinPingStorage.removeChannel(guild.id, channelId);
      res.json({ success: true, message: 'Join-ping channel removed.' });
    } catch (err) {
      console.error('[JoinPing API] DELETE error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 5. BIRTHDAYS
  // ─────────────────────────────────────────────────────────────
  router.get('/guild/:guildId/utilities/birthdays', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { guild } = req;
      const birthdays = (await birthdayStorage.listBirthdaysForGuild(guild.id)) || [];
      const upcoming = (await birthdayStorage.upcomingBirthdays(guild.id, 14)) || [];

      // Enrich with username
      const enrichedBirthdays = await Promise.all(
        birthdays.map(async (b) => {
          const member = await guild.members.fetch(b.user_id).catch(() => null);
          return {
            id: b.id,
            userId: b.user_id,
            username: member?.user?.username || `User (${b.user_id})`,
            month: b.month,
            day: b.day,
            year: b.year,
            note: b.note
          };
        })
      );

      res.json({ birthdays: enrichedBirthdays, upcomingCount: upcoming.length });
    } catch (err) {
      console.error('[Birthdays API] GET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/guild/:guildId/utilities/birthdays/:userId', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const { userId } = req.params;
      await birthdayStorage.removeBirthday(guild.id, userId);
      res.json({ success: true, message: 'Birthday record removed.' });
    } catch (err) {
      console.error('[Birthdays API] DELETE error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 6. AUTO-ROLES
  // ─────────────────────────────────────────────────────────────
  router.get('/guild/:guildId/utilities/autoroles', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { guild } = req;
      const rawSets = (await autoroleStorage.listSetsForGuild(guild.id)) || [];

      // Fetch items for each set
      const sets = await Promise.all(
        rawSets.map(async (s) => {
          const items = (await autoroleStorage.listItemsForSet(s.id)) || [];
          return {
            id: s.id,
            name: s.name || `Role Set #${s.id}`,
            enabled: !!s.enabled,
            delay_seconds: s.delay_seconds || 0,
            welcome_message: s.welcome_message,
            is_default: !!s.is_default,
            items: items.map(item => ({
              id: item.id,
              role_id: item.role_id,
              roleName: guild.roles.cache.get(item.role_id)?.name || 'Deleted Role',
              roleColor: guild.roles.cache.get(item.role_id)?.hexColor || '#99aab5'
            }))
          };
        })
      );

      const metadata = getGuildMetadata(guild);
      res.json({ sets, ...metadata });
    } catch (err) {
      console.error('[AutoRoles API] GET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/utilities/autoroles/set', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const { name, delay_seconds, welcome_message, roleIds } = req.body;

      const setId = await autoroleStorage.createSet({
        guildId: guild.id,
        name: name || 'New Auto-Role Set',
        delaySeconds: parseInt(delay_seconds, 10) || 0,
        welcomeMessage: welcome_message || null,
        creatorId: req.user?.id || 'Dashboard'
      });

      if (Array.isArray(roleIds)) {
        for (const roleId of roleIds) {
          if (guild.roles.cache.has(roleId)) {
            await autoroleStorage.addRoleToSet({ setId, roleId });
          }
        }
      }

      res.json({ success: true, message: 'Auto-role set created!', setId });
    } catch (err) {
      console.error('[AutoRoles API] CREATE SET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/guild/:guildId/utilities/autoroles/set/:setId', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { setId } = req.params;
      await autoroleStorage.deleteSet(setId);
      res.json({ success: true, message: 'Auto-role set deleted.' });
    } catch (err) {
      console.error('[AutoRoles API] DELETE SET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
