// src/events/stickyDeleteHandler.js
const stickyStorage = require('../utils/stickyStorage');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'messageDelete',
  once: false,

  async execute(message) {
    try {
      if (!message.guild || !message.id || message.author?.bot) return;

      const guildId = message.guild.id;
      const channelId = message.channel.id;

      const stickies = await stickyStorage.listStickiesInChannel(guildId, channelId);
      if (!stickies.length) return;

      for (const sticky of stickies) {
        if (!sticky.enabled || sticky.type !== 'bottom') continue;
        if (sticky.lastMessageId !== message.id) continue;

        // Re-send the sticky
        const content = sticky.content.slice(0, 4000);
        const sent = sticky.embedFlag
          ? await message.channel.send({
              embeds: [new EmbedBuilder().setDescription(content).setColor(0x5865F2)]
            })
          : await message.channel.send({ content });

        // Update lastMessageId
        await stickyStorage.setLastMessageId(sticky.id, sent.id);
      }
    } catch (err) {
      console.error('[Sticky] messageDelete error:', err);
    }
  }
};