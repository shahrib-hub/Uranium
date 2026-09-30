// src/dashboard/routes/ai.js — AI Assistant API (Premium Exclusive)
const { Router } = require('express');
const { ChannelType } = require('discord.js');
const ai = require('../../utils/ai');
const { isPremiumGuild } = require('../../utils/premium');

module.exports = function createAiRouter(client, { requireGuildAccess, requireGuildAdmin, requireGuildMod }) {
  const router = Router();

  // 1. GET AI Configuration & Status (Requires Premium)
  router.get('/guild/:guildId/ai', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { guild } = req;
      const isPremium = isPremiumGuild(guild.id);

      if (!isPremium) {
        return res.json({
          isPremium: false,
          locked: true,
          message: 'AI Assistant Studio is exclusive to Uranium Bot Premium servers.'
        });
      }

      // Fetch AI settings via Promise wrapper
      const settings = await new Promise(resolve => {
        ai.getSettings(guild.id, (row) => resolve(row));
      });

      const stats = await new Promise(resolve => {
        ai.getStats(guild.id, (row) => resolve(row || { prompts: 0 }));
      });

      const enabledChannels = await ai.getChannels(guild.id);

      // List of text channels in the guild for dropdowns
      const textChannels = guild.channels.cache
        .filter(c => c.type === ChannelType.GuildText)
        .map(c => ({ id: c.id, name: c.name }));

      res.json({
        isPremium: true,
        locked: false,
        settings: {
          model: settings?.model || 'llama-3.1-8b-instant',
          style: settings?.style || 'default',
          auto_reply: settings?.auto_reply === 1 || settings?.auto_reply === true
        },
        stats: {
          prompts: stats?.prompts || 0
        },
        enabledChannels,
        textChannels
      });
    } catch (err) {
      console.error('[AI API] GET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. POST Update AI Settings (Strictly Premium)
  router.post('/guild/:guildId/ai/settings', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      if (!isPremiumGuild(guild.id)) {
        return res.status(403).json({
          error: 'AI Assistant requires an active Premium subscription for this server.'
        });
      }

      const { model, style, auto_reply } = req.body;
      const updates = {};

      if (model) updates.model = String(model).trim();
      if (style) updates.style = String(style).trim();
      if (auto_reply !== undefined) updates.auto_reply = auto_reply ? 1 : 0;

      ai.setSettings(guild.id, updates);

      res.json({ success: true, message: 'AI Assistant settings updated successfully.' });
    } catch (err) {
      console.error('[AI API] SETTINGS error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. POST Add AI Channel (Strictly Premium)
  router.post('/guild/:guildId/ai/channel', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      if (!isPremiumGuild(guild.id)) {
        return res.status(403).json({
          error: 'AI Assistant requires an active Premium subscription for this server.'
        });
      }

      const { channelId } = req.body;
      if (!channelId || !guild.channels.cache.has(channelId)) {
        return res.status(400).json({ error: 'Valid guild text channel ID required.' });
      }

      ai.addChannel(guild.id, channelId);
      res.json({ success: true, message: 'AI channel added.' });
    } catch (err) {
      console.error('[AI API] ADD CHANNEL error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. DELETE Remove AI Channel (Strictly Premium)
  router.delete('/guild/:guildId/ai/channel/:channelId', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      if (!isPremiumGuild(guild.id)) {
        return res.status(403).json({
          error: 'AI Assistant requires an active Premium subscription for this server.'
        });
      }

      const { channelId } = req.params;
      ai.removeChannel(guild.id, channelId);
      res.json({ success: true, message: 'AI channel removed.' });
    } catch (err) {
      console.error('[AI API] REMOVE CHANNEL error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
