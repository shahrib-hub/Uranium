// src/utils/splitLogger.js — Granular Categorized Split Webhook Logging Engine
const { LogConfig } = require('../database/mongoose');
const { isMongoReady } = require('../database/dbUtils');
const webhookHelper = require('./webhookHelper');
const { PermissionsBitField } = require('discord.js');

// Fast in-memory cache of log configurations (guildId -> { config, expiry })
const logConfigCache = new Map();
const CACHE_TTL = 60000; // 1 minute

async function getLogConfig(guildId) {
  const cached = logConfigCache.get(guildId);
  if (cached && cached.expiry > Date.now()) {
    return cached.config;
  }

  if (!isMongoReady()) return null;

  try {
    const doc = await LogConfig.findOne({ guildId }).lean();
    logConfigCache.set(guildId, { config: doc, expiry: Date.now() + CACHE_TTL });
    return doc;
  } catch (err) {
    console.error('[splitLogger] getLogConfig error:', err.message);
    return null;
  }
}

async function setCategoryChannel(guildId, category, channelId) {
  if (!isMongoReady()) return null;
  try {
    const update = {};
    if (category === 'all' || category === 'general') {
      update.logChannel = channelId;
    } else {
      update[`channels.${category}`] = channelId;
    }

    const updated = await LogConfig.findOneAndUpdate(
      { guildId },
      { $set: update },
      { upsert: true, new: true }
    ).lean();

    logConfigCache.set(guildId, { config: updated, expiry: Date.now() + CACHE_TTL });
    return updated;
  } catch (err) {
    console.error('[splitLogger] setCategoryChannel error:', err.message);
    return null;
  }
}

/**
 * Send an embed to the specific split category channel or fallback channel
 * Categories: 'mod' | 'message' | 'voice' | 'member' | 'server'
 */
async function sendSplitLog(client, guildId, category, embed) {
  try {
    const pluginStorage = require('./pluginStorage');
    if (pluginStorage && !(await pluginStorage.isPluginEnabled(guildId, 'logging'))) {
      return false;
    }
  } catch {}

  const config = await getLogConfig(guildId);
  if (!config) return false;

  // Determine target channel (Category channel -> Fallback general logChannel)
  const targetChannelId = config.channels?.[category] || config.logChannel;
  if (!targetChannelId) return false;

  const guild = client.guilds.cache.get(String(guildId));
  if (!guild) return false;

  const channel = guild.channels.cache.get(String(targetChannelId)) || await guild.channels.fetch(String(targetChannelId)).catch(() => null);
  if (!channel || !channel.isTextBased()) return false;

  const me = guild.members.me;
  if (!me || !channel.permissionsFor(me).has(PermissionsBitField.Flags.SendMessages)) return false;

  try {
    // Try sending via webhook if configured
    if (webhookHelper) {
      const ok = await webhookHelper.sendViaWebhookIfConfigured(client, guildId, { embeds: [embed] }).catch(() => false);
      if (ok) return true;
    }

    await channel.send({ embeds: [embed] }).catch(() => {});
    return true;
  } catch (err) {
    console.warn('[splitLogger] failed to deliver log embed:', err.message);
    return false;
  }
}

module.exports = {
  getLogConfig,
  setCategoryChannel,
  sendSplitLog
};
