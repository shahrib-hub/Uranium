// src/events/starboardReactionAdd.js
const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getStarboardConfig, getStarboardMessage, saveStarboardMessage } = require('../utils/starboardStorage');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user, client) {
    if (user.bot) return;

    try {
      // 1. Fetch partials
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

      // 2. Check if channel is ignored or is the starboard channel itself
      if (message.channel.id === config.channelId) return;
      if (Array.isArray(config.ignoredChannels) && config.ignoredChannels.includes(message.channel.id)) return;

      // 3. Match emoji
      const targetEmoji = config.emoji || '⭐';
      const reactionName = reaction.emoji.name;
      const reactionIdentifier = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
      const matches = reactionName === targetEmoji || reactionIdentifier === targetEmoji || reaction.emoji.toString() === targetEmoji;
      if (!matches) return;

      // 4. Check self-starring
      if (!config.selfStar && message.author && message.author.id === user.id) {
        return; // Disallow author from starring their own message
      }

      // 5. Calculate star count (excluding bot reactions & self-stars if disallowed)
      const users = await reaction.users.fetch();
      const validUsers = users.filter(u => {
        if (u.bot) return false;
        if (!config.selfStar && u.id === message.author.id) return false;
        return true;
      });

      const starCount = validUsers.size;
      const threshold = config.threshold || 3;
      if (starCount < threshold) return;

      // 6. Fetch starboard channel
      const starboardChannel = message.guild.channels.cache.get(config.channelId) || await message.guild.channels.fetch(config.channelId).catch(() => null);
      if (!starboardChannel || !starboardChannel.isTextBased()) return;

      const existingRecord = await getStarboardMessage(guildId, message.id);
      const starText = `${targetEmoji} **${starCount}** | <#${message.channel.id}>`;

      // Build Jump button
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Jump to Message')
          .setStyle(ButtonStyle.Link)
          .setURL(message.url)
      );

      // Build Starboard Embed
      const embed = new EmbedBuilder()
        .setAuthor({
          name: message.author.tag || message.author.username,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setDescription(message.content || '*[Attachment only]*')
        .setColor(0xFFAC33)
        .setFooter({ text: `Message ID: ${message.id}` })
        .setTimestamp(message.createdAt);

      // Attachment image check
      const imageAttachment = message.attachments.find(a => a.contentType?.startsWith('image/'));
      if (imageAttachment) {
        embed.setImage(imageAttachment.url);
      }

      if (existingRecord && existingRecord.starboardMessageId) {
        // Update existing starboard message
        const starboardMsg = await starboardChannel.messages.fetch(existingRecord.starboardMessageId).catch(() => null);
        if (starboardMsg) {
          await starboardMsg.edit({
            content: starText,
            embeds: [embed],
            components: [row]
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
          return;
        }
      }

      // Create new starboard message
      const sentMsg = await starboardChannel.send({
        content: starText,
        embeds: [embed],
        components: [row]
      });

      await saveStarboardMessage({
        guildId,
        originalMessageId: message.id,
        originalChannelId: message.channel.id,
        starboardMessageId: sentMsg.id,
        authorId: message.author.id,
        starCount,
        starredUsers: Array.from(validUsers.keys())
      });

    } catch (err) {
      console.error('[Starboard] ReactionAdd error:', err);
    }
  }
};
