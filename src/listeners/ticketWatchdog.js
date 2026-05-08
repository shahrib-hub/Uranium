// src/listeners/ticketWatchdog.js
const { getTicket, updateTicket, getConfig } = require('../utils/ticketDb');
const { generateTranscriptBuffer } = require('./transcript');
const { AttachmentBuilder } = require('discord.js');
const { ticketClosedEmbed } = require('../components/ticketEmbeds');

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

      const ticket = await getTicket(guildId, ticketId);
      if (!ticket || ticket.status !== 'open') return;

      const config = await getConfig(guildId);
      if (!config) return;

      const transcriptChannel = await channel.guild.channels.fetch(config.transcript_channel_id).catch(() => null);
      if (!transcriptChannel) return;

      const buffer = await generateTranscriptBuffer(channel);
      const file = new AttachmentBuilder(buffer, { name: `ticket-${ticket.id}.html` });

      await updateTicket(guildId, ticketId, { status: 'closed', closed_at: Date.now() });

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
      await updateTicket(guildId, ticketId, { 
        description: msg.content ? msg.content.slice(0, 1000) : '' 
      });
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
