// src/events/stickyMessageHandler.js
const stickyStorage = require('../utils/stickyStorage');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

const cooldowns = new Map(); // channelId => timeout

module.exports = {
  name: 'messageCreate',
  once: false,

  async execute(message) {
    try {
      if (!message.guild || message.author.bot) return;

      const guildId = message.guild.id;
      const channelId = message.channel.id;

      // Check for active sticky in this channel
      const stickies = await stickyStorage.listStickiesInChannel(guildId, channelId);
      if (!stickies.length) return;

      const config = await stickyStorage.getGuildConfig(guildId);
      const delay = Math.max(1, config.repostDelaySeconds || 1) * 1000;

      // Only handle bottom-type stickies
      const bottomStickies = stickies.filter(s => s.type === 'bottom' && s.enabled);
      if (!bottomStickies.length) return;

      // Avoid reposting if cooldown active
      if (cooldowns.has(channelId)) return;

      // Queue repost after delay
      cooldowns.set(channelId, true);
      setTimeout(async () => {
        for (const sticky of bottomStickies) {
          try {
            // Delete previous sticky message if exists
            if (sticky.lastMessageId) {
              const oldMsg = await message.channel.messages.fetch(sticky.lastMessageId).catch(() => null);
              if (oldMsg && oldMsg.deletable) await oldMsg.delete().catch(() => {});
            }

            // Send new sticky message
            const content = sticky.content.slice(0, 4000);
            const sent = sticky.embedFlag
              ? await message.channel.send({
                  embeds: [new EmbedBuilder().setDescription(content).setColor(0x5865F2)]
                })
              : await message.channel.send({ content });

            // Update lastMessageId atomically
            await stickyStorage.setLastMessageId(sticky.id, sent.id);
          } catch (err) {
            console.warn(`[Sticky] Failed to repost sticky ID ${sticky.id}:`, err);
          }
        }

        cooldowns.delete(channelId);
      }, delay);
    } catch (err) {
      console.error('[Sticky] messageCreate error:', err);
    }
  }
};