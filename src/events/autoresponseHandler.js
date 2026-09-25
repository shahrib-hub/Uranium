// src/events/autoresponseHandler.js
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getAutoResponses } = require('../utils/autoresponse');
const pluginStorage = require('../utils/pluginStorage');

// Cache triggers for 30 seconds per guild to ensure lightning-fast message processing
const cache = new Map(); // guildId -> { timestamp, responses }
const CACHE_TTL = 30000;

async function getCachedResponses(guildId) {
  const now = Date.now();
  const cached = cache.get(guildId);
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.responses;
  }
  try {
    const responses = await getAutoResponses(guildId);
    cache.set(guildId, { timestamp: now, responses: responses || [] });
    return responses || [];
  } catch (err) {
    console.error('[autoresponseHandler] Error fetching responses:', err);
    return [];
  }
}

function invalidateCache(guildId) {
  if (guildId) cache.delete(guildId);
}

module.exports = {
  name: 'messageCreate',
  invalidateCache,
  async execute(message, client) {
    try {
      if (!message.guild || message.author.bot || !message.content) return;

      const guildId = message.guild.id;

      // Check if autoresponse plugin is enabled for this guild
      if (pluginStorage && typeof pluginStorage.isPluginEnabled === 'function') {
        const enabled = await pluginStorage.isPluginEnabled(guildId, 'autoresponse');
        if (!enabled) return;
      }

      // Check permissions
      const botMember = message.guild.members.me || await message.guild.members.fetchMe().catch(() => null);
      if (!botMember) return;
      const perms = message.channel.permissionsFor(botMember);
      if (!perms || !perms.has(PermissionFlagsBits.SendMessages)) return;

      const rawContent = message.content.trim();
      const lowerContent = rawContent.toLowerCase();

      const responses = await getCachedResponses(guildId);
      if (!responses || responses.length === 0) return;

      // Find matching trigger:
      // Priority 1: Exact case-insensitive match
      // Priority 2: Message starts with trigger or contains trigger as distinct phrase
      const matched = responses.find(r => {
        if (!r.trigger) return false;
        const trigger = r.trigger.trim().toLowerCase();
        if (lowerContent === trigger) return true;
        // Word boundary match
        const regex = new RegExp(`(^|\\s)${trigger.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}($|\\s|[.,!?])`, 'i');
        return regex.test(lowerContent);
      });

      if (!matched || !matched.response) return;

      // Format placeholders
      const formatPlaceholders = (text) => {
        if (!text) return '';
        return text
          .replace(/{user}/gi, `<@${message.author.id}>`)
          .replace(/{mention}/gi, `<@${message.author.id}>`)
          .replace(/{username}/gi, message.author.username)
          .replace(/{user\.tag}/gi, message.author.tag || message.author.username)
          .replace(/{user\.id}/gi, message.author.id)
          .replace(/{server}/gi, message.guild.name)
          .replace(/{guild}/gi, message.guild.name)
          .replace(/{membercount}/gi, String(message.guild.memberCount || 1))
          .replace(/{count}/gi, String(message.guild.memberCount || 1))
          .replace(/{channel}/gi, `<#${message.channel.id}>`);
      };

      const replyContent = formatPlaceholders(matched.response);

      if (matched.embed) {
        if (!perms.has(PermissionFlagsBits.EmbedLinks)) {
          return message.reply({ content: replyContent }).catch(() => {});
        }
        const embed = new EmbedBuilder()
          .setDescription(replyContent)
          .setColor(0x5865F2)
          .setTimestamp();
        return message.reply({ embeds: [embed] }).catch(() => {});
      } else {
        return message.reply({ content: replyContent }).catch(() => {});
      }
    } catch (err) {
      console.error('[autoresponseHandler] Execution error:', err);
    }
  }
};
