// src/listeners/ticketWatchdog.js
const { run, get } = require('../utils/ticketDb');
const { generateTranscriptBuffer } = require('./transcript');
const { AttachmentBuilder } = require('discord.js');
const { ticketClosedEmbed } = require('../components/ticketEmbeds');
const { getConfig } = require('../utils/ticketHelpers');

const watchdogs = new Map();

/**
 * Start a watchdog for a ticket.
 *
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {number|string} ticketId
 * @param {string} channelId
 * @param {string} openerId
 * @param {number} timeoutSeconds
 */
function startTicketWatchdog(client, guildId, ticketId, channelId, openerId, timeoutSeconds = 24 * 60 * 60) {
  const key = `${guildId}-${ticketId}`;
  if (watchdogs.has(key)) return;

  const timeout = setTimeout(async () => {
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return;

      const ticket = await get(`SELECT * FROM tickets WHERE guild_id = ? AND id = ?`, [guildId, ticketId]);
      if (!ticket || ticket.status !== 'open') return;

      const config = await getConfig(guildId);
      if (!config) return;

      const transcriptChannel = await channel.guild.channels.fetch(config.transcript_channel_id).catch(() => null);
      if (!transcriptChannel) return;

      const buffer = await generateTranscriptBuffer(channel);
      const file = new AttachmentBuilder(buffer, { name: `ticket-${ticket.id}.html` });

      await run(`UPDATE tickets SET status = 'closed', closed_at = ? WHERE guild_id = ? AND id = ?`, [
        Date.now(),
        guildId,
        ticketId
      ]);

      const embed = ticketClosedEmbed({
        ticketId,
        openerId: ticket.opener_id,
        closerId: 'Auto-Close',
        claimedBy: ticket.claim_user_id,
        status: 'Auto-Closed (No Response)'
      });

      await transcriptChannel.send({ embeds: [embed], files: [file] }).catch(() => {});
      await channel.send({ embeds: [embed], files: [file] }).catch(() => {});
      await channel.permissionOverwrites.edit(ticket.opener_id, { ViewChannel: false }).catch(() => {});
      await channel.setParent(config.closed_category_id).catch(() => {});
    } catch (err) {
      console.error('[ticketWatchdog] error:', err);
    } finally {
      watchdogs.delete(key);
    }
  }, timeoutSeconds * 1000);

  const messageListener = async (msg) => {
    if (msg.channel.id !== channelId) return;
    if (msg.author.id !== openerId) return;

    try {
      await run(`UPDATE tickets SET description = ? WHERE guild_id = ? AND id = ?`, [
        msg.content ? msg.content.slice(0, 1000) : '',
        guildId,
        ticketId
      ]);
    } catch (e) {
      console.error('[ticketWatchdog] save description error', e);
    } finally {
      clearTimeout(timeout);
      client.removeListener('messageCreate', messageListener);
      watchdogs.delete(key);
    }
  };

  client.on('messageCreate', messageListener);
  watchdogs.set(key, { timeout, listener: messageListener });
}

function stopAllWatchdogs() {
  for (const [key, data] of watchdogs.entries()) {
    clearTimeout(data.timeout);
    try {
      if (data.listener) global.client?.removeListener('messageCreate', data.listener);
    } catch {}
    watchdogs.delete(key);
  }
}

module.exports = { startTicketWatchdog, stopAllWatchdogs };
