// src/dashboard/routes/ytVerify.js — YouTube Verification System API (Premium Exclusive)
const { Router } = require('express');
const { ChannelType } = require('discord.js');
const ytVerify = require('../../utils/ytVerify');
const { isPremiumGuild } = require('../../utils/premium');

module.exports = function createYtVerifyRouter(client, { requireGuildAccess, requireGuildAdmin, requireGuildMod }) {
  const router = Router();

  // 1. GET YouTube Verification Settings (Strictly Premium)
  router.get('/guild/:guildId/verification/yt', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { guild } = req;
      const isPremium = isPremiumGuild(guild.id);

      if (!isPremium) {
        return res.json({
          isPremium: false,
          locked: true,
          message: 'YouTube Verification System is exclusive to Uranium Bot Premium servers.'
        });
      }

      const settings = await new Promise(resolve => {
        ytVerify.getSettings(guild.id, (row) => resolve(row));
      });

      const roles = guild.roles.cache
        .filter(r => !r.managed && r.id !== guild.id)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));

      const channels = guild.channels.cache
        .filter(c => c.type === ChannelType.GuildText)
        .map(c => ({ id: c.id, name: c.name }));

      let grantRoles = [];
      if (settings?.grant_roles) {
        grantRoles = settings.grant_roles.split(',').filter(Boolean);
      }

      res.json({
        isPremium: true,
        locked: false,
        settings: {
          enabled: settings ? (settings.enabled === 1 || settings.enabled === true) : false,
          channel_name: settings?.channel_name || '',
          verify_channel_id: settings?.verify_channel_id || '',
          grant_roles: grantRoles
        },
        roles,
        channels
      });
    } catch (err) {
      console.error('[YT Verify API] GET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. POST Save YouTube Verification Settings (Strictly Premium)
  router.post('/guild/:guildId/verification/yt', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      if (!isPremiumGuild(guild.id)) {
        return res.status(403).json({
          error: 'YouTube Verification requires an active Premium subscription for this server.'
        });
      }

      const { channel_name, grant_roles, verify_channel_id } = req.body;

      if (!channel_name || !channel_name.trim()) {
        return res.status(400).json({ error: 'Target YouTube channel name or handle is required.' });
      }
      if (!verify_channel_id || !guild.channels.cache.has(verify_channel_id)) {
        return res.status(400).json({ error: 'A valid Discord verification text channel is required.' });
      }

      const rolesArray = Array.isArray(grant_roles) ? grant_roles : [grant_roles].filter(Boolean);

      await ytVerify.setSettings(guild.id, {
        channel_name: channel_name.trim(),
        grant_roles: rolesArray,
        verify_channel_id
      });

      res.json({
        success: true,
        message: 'YouTube Verification configuration saved successfully!'
      });
    } catch (err) {
      console.error('[YT Verify API] POST error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. POST Disable YouTube Verification (Strictly Premium)
  router.post('/guild/:guildId/verification/yt/disable', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      if (!isPremiumGuild(guild.id)) {
        return res.status(403).json({
          error: 'YouTube Verification requires an active Premium subscription for this server.'
        });
      }

      await ytVerify.disable(guild.id);
      res.json({ success: true, message: 'YouTube Verification disabled.' });
    } catch (err) {
      console.error('[YT Verify API] DISABLE error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
