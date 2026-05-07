// src/events/afkMessageHandler.js
const afkStorage = require('../utils/afkStorage');
const { makeAfkEmbed, humanizeDuration } = require('../utils/afkHelpers');

module.exports = {
  name: 'messageCreate',
  once: false,

  async execute(message) {
    try {
      if (!message.guild || message.author.bot) return;

      const guildId = message.guild.id;
      const authorId = message.author.id;

      // Remove AFK if author is AFK
      const authorAfk = await afkStorage.getAfk(guildId, authorId);
      if (authorAfk) {
        const durationMs = Date.now() - authorAfk.startTimestamp;
        const notifiedCount = authorAfk.notifiedCount || 0;
        await afkStorage.removeAfk(guildId, authorId);

        const ack = `Welcome back, <@${authorId}> — you were AFK for ${humanizeDuration(durationMs)} and notified ${notifiedCount} user(s).`;
        await message.channel.send({ content: ack }).catch(() => {});
      }

      // Check guild config
      const config = await afkStorage.getGuildConfig(guildId);
      if (!config.enabled) return;

      // Ignore channels
      const ignored = await afkStorage.listIgnoredChannels(guildId);
      if (ignored.includes(message.channel.id)) return;

      // Mentions
      const mentions = new Set();
      for (const user of message.mentions.users.values()) {
        if (user.bot) continue;
        mentions.add(user.id);
      }
      if (!mentions.size) return;

      const cooldownSeconds = config.cooldownSeconds || 30;
      const now = Date.now();

      for (const mentionedId of mentions) {
        const afk = await afkStorage.getAfk(guildId, mentionedId);
        if (!afk) continue;

        const lastTs = await afkStorage.getLastNotified(guildId, mentionedId, authorId);
        if (lastTs && now - Number(lastTs) < cooldownSeconds * 1000) {
          continue;
        }

        const embed = makeAfkEmbed({
          afkUserId: mentionedId,
          reason: afk.reason,
          startTimestamp: afk.startTimestamp,
          notifierId: authorId
        });
        await message.channel.send({ embeds: [embed] }).catch(() => {});
        await afkStorage.updateLastNotified(guildId, mentionedId, authorId, now);
      }
    } catch (err) {
      console.error('[AFK message handler error]', err);
    }
  }
};
