// src/events/starboardReactionRemove.js
const { Events } = require('discord.js');
const { getStarboardConfig, getStarboardMessage, saveStarboardMessage, removeStarboardMessage } = require('../utils/starboardStorage');

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user, client) {
    if (user.bot) return;

    try {
      if (reaction.partial) {
        try { await reaction.fetch(); } catch { return; }
      }
      if (reaction.message.partial) {
        try { await reaction.message.fetch(); } catch { return; }
      }

      const message = reaction.message;
      if (!message.guild) return;

      const guildId = message.guild.id;
      const config = await getStarboardConfig(guildId);
      if (!config || !config.enabled || !config.channelId) return;

      const targetEmoji = config.emoji || '⭐';
      const reactionName = reaction.emoji.name;
      const reactionIdentifier = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
      const matches = reactionName === targetEmoji || reactionIdentifier === targetEmoji || reaction.emoji.toString() === targetEmoji;
      if (!matches) return;

      const existingRecord = await getStarboardMessage(guildId, message.id);
      if (!existingRecord || !existingRecord.starboardMessageId) return;

      const starboardChannel = message.guild.channels.cache.get(config.channelId) || await message.guild.channels.fetch(config.channelId).catch(() => null);
      if (!starboardChannel || !starboardChannel.isTextBased()) return;

      const users = await reaction.users.fetch();
      const validUsers = users.filter(u => {
        if (u.bot) return false;
        if (!config.selfStar && u.id === message.author.id) return false;
        return true;
      });

      const starCount = validUsers.size;
      const threshold = config.threshold || 3;

      const starboardMsg = await starboardChannel.messages.fetch(existingRecord.starboardMessageId).catch(() => null);

      if (starCount < threshold) {
        // Star count fell below threshold — remove from starboard
        if (starboardMsg) {
          await starboardMsg.delete().catch(() => {});
        }
        await removeStarboardMessage(guildId, message.id);
      } else {
        // Update starboard embed with reduced count
        if (starboardMsg) {
          const starText = `${targetEmoji} **${starCount}** | <#${message.channel.id}>`;
          await starboardMsg.edit({
            content: starText
          }).catch(() => {});

          await saveStarboardMessage({
            guildId,
            originalMessageId: message.id,
            originalChannelId: message.channel.id,
            starboardMessageId: existingRecord.starboardMessageId,
            authorId: message.author.id,
            starCount,
            starredUsers: Array.from(validUsers.keys())
          });
        }
      }
    } catch (err) {
      console.error('[Starboard] ReactionRemove error:', err);
    }
  }
};
