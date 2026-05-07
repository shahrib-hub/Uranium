// src/events/joinPingHandler.js
const joinPingStorage = require('../utils/joinPingStorage');
const { PermissionsBitField, EmbedBuilder, Events } = require('discord.js');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    try {
      await joinPingStorage.init?.();
    } catch (err) {
      console.error('[joinPing] storage init failed', err);
    }

    client.on('guildMemberAdd', async (member) => {
      try {
        const guildId = member.guild.id;
        const rows = await joinPingStorage.listChannels(guildId);
        if (!rows.length) return;

        // small embed template used with ping
        const baseEmbed = new EmbedBuilder()
          .setTitle('Member Joined')
          .setColor(0x57F287)
          .setTimestamp()
          .setFooter({ text: `Member: ${member.user.id}` });

        for (const row of rows) {
          try {
            const ch = member.guild.channels.cache.get(row.channelId);
            if (!ch) {
              // channel removed — cleanup
              await joinPingStorage.removeChannel(guildId, row.channelId);
              continue;
            }

            // ensure textual
            if (!ch.isTextBased?.()) {
              await joinPingStorage.removeChannel(guildId, row.channelId);
              continue;
            }

            // ensure permission to send
            const me = member.guild.members.me;
            if (!me) continue;
            if (!me.permissionsIn(ch).has(PermissionsBitField.Flags.SendMessages)) {
              // cannot send — cleanup so we won't keep failing
              console.warn(`[joinPing] missing send permission in ${row.channelId} for guild ${guildId}; removing config`);
              await joinPingStorage.removeChannel(guildId, row.channelId);
              continue;
            }

            // craft a short ping + embed (keeps UI nice)
            const mention = `<@${member.id}>`;
            const embed = baseEmbed.setDescription(`${mention} Welcome to **${member.guild.name}**!`);
            await ch.send({ content: mention, embeds: [embed] }).catch(async (err) => {
              // if sending fails (permissions/gone) remove the config to avoid spam
              console.warn(`[joinPing] failed to send to ${row.channelId} in guild ${guildId}:`, err?.message || err);
              await joinPingStorage.removeChannel(guildId, row.channelId).catch(()=>{});
            });
          } catch (innerErr) {
            console.error('[joinPing] per-channel handler error', innerErr);
          }
        }
      } catch (err) {
        console.error('[joinPing] guildMemberAdd handler error', err);
      }
    });

    // also cleanup when channel is deleted in guild: remove any matching config rows
    client.on('channelDelete', async (channel) => {
      try {
        if (!channel.guild) return;
        const guildId = channel.guild.id;
        const rows = await joinPingStorage.listChannels(guildId);
        const matched = rows.filter(r => String(r.channelId) === String(channel.id));
        if (matched.length) {
          await joinPingStorage.removeChannel(guildId, channel.id);
          // minimal log for admin debugging
          console.log(`[joinPing] removed join-ping config for deleted channel ${channel.id} in guild ${guildId}`);
        }
      } catch (err) {
        console.error('[joinPing] channelDelete handler error', err);
      }
    });

    // ready registered
    // console.log('[joinPing] handlers registered');
  }
};