// src/events/guildLogs.js
const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
  // We use ClientReady once, then attach guildCreate + guildDelete listeners here
  name: 'clientReady',
  once: true,

  /**
   * Fired once when the client is ready; we then hook guildCreate & guildDelete
   * @param {import('discord.js').Client} readyClient
   * @param {import('discord.js').Client} clientFromLoader
   */
  async execute(readyClient, clientFromLoader) {
    // Your event loader passes (..args, client), so we support both forms
    const client = clientFromLoader || readyClient;

    const devChannelId = process.env.DEV_LOG_CHANNEL_ID;
    if (!devChannelId) {
      console.warn('[guildLogs] DEV_LOG_CHANNEL_ID not set in .env, skipping dev logs.');
      return;
    }

    async function getDevChannel() {
      let channel = client.channels.cache.get(devChannelId);
      if (!channel) {
        channel = await client.channels.fetch(devChannelId).catch(() => null);
      }
      if (!channel || !channel.isTextBased()) {
        console.warn('[guildLogs] Dev log channel not found or not text-based.');
        return null;
      }
      return channel;
    }

    // Helper to format owner info
    async function resolveOwner(guild) {
      let ownerTag = 'Unknown';
      let ownerId = guild.ownerId || 'Unknown';

      try {
        if (guild.ownerId) {
          const owner = await client.users.fetch(guild.ownerId).catch(() => null);
          if (owner) {
            ownerTag = owner.tag;
            ownerId = owner.id;
          }
        }
      } catch {
        // ignore, fall back to Unknown
      }

      return { ownerTag, ownerId };
    }

    // 📥 JOIN LOG
    client.on(Events.GuildCreate, async (guild) => {
      try {
        const channel = await getDevChannel();
        if (!channel) return;

        const { ownerTag, ownerId } = await resolveOwner(guild);
        const memberCount = guild.memberCount ?? 'Unknown';

        const embed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle('🆕 Joined a new server')
          .setDescription('I have been **added** to a new guild!')
          .addFields(
            {
              name: '🏷️ Guild',
              value: `**${guild.name}**\n\`${guild.id}\``,
              inline: false
            },
            {
              name: '👑 Owner',
              value:
                ownerId === 'Unknown'
                  ? 'Unknown'
                  : `${ownerTag}\n\`${ownerId}\``,
              inline: false
            },
            {
              name: '👥 Members',
              value: `${memberCount}`,
              inline: true
            },
            {
              name: '📅 Created',
              value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
              inline: true
            }
          )
          .setFooter({ text: 'MULTi-Bot • Guild Join Log' })
          .setTimestamp();

        if (guild.iconURL()) {
          embed.setThumbnail(guild.iconURL({ size: 256 }));
        }

        await channel.send({ embeds: [embed] });
      } catch (err) {
        console.error('[guildLogs] Failed to send guild join log:', err);
      }
    });

    // 📤 LEAVE LOG
    client.on(Events.GuildDelete, async (guild) => {
      try {
        const channel = await getDevChannel();
        if (!channel) return;

        const { ownerTag, ownerId } = await resolveOwner(guild);
        const memberCount = guild.memberCount ?? 'Unknown';

        const embed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle('👋 Left a server')
          .setDescription('I have been **removed** from a guild.')
          .addFields(
            {
              name: '🏷️ Guild',
              value: `**${guild.name}**\n\`${guild.id}\``,
              inline: false
            },
            {
              name: '👑 Owner (cached)',
              value:
                ownerId === 'Unknown'
                  ? 'Unknown'
                  : `${ownerTag}\n\`${ownerId}\``,
              inline: false
            },
            {
              name: '👥 Members (last known)',
              value: `${memberCount}`,
              inline: true
            },
            {
              name: '📅 Created',
              value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
              inline: true
            }
          )
          .setFooter({ text: 'MULTi-Bot • Guild Leave Log' })
          .setTimestamp();

        if (guild.iconURL()) {
          embed.setThumbnail(guild.iconURL({ size: 256 }));
        }

        await channel.send({ embeds: [embed] });
      } catch (err) {
        console.error('[guildLogs] Failed to send guild leave log:', err);
      }
    });

    console.log('[guildLogs] Guild join/leave logging initialized.');
  }
};