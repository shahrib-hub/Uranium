// src/utils/ticketService.js
const { run, get, nextTicketId } = require('./ticketDb');
const { useMongoDB } = require('../config/database');
const { Ticket } = require('../database/mongoose');
const { ticketCreatedEmbed } = require('../components/ticketEmbeds');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function createTicket({ client, guild, openerId, type = 'Support', form = null, config }) {
  // generate id
  const ticketId = await nextTicketId(guild.id);
  const ticketName = `ticket-${ticketId}`;

  const ticketChannel = await guild.channels.create({
    name: ticketName,
    type: 0, // ChannelType.GuildText numeric (v14 exports allowed either; if ChannelType used elsewhere, it's fine)
    parent: config.open_category_id,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny: ['ViewChannel'] },
      { id: openerId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
      { id: config.support_role_id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
    ]
  });

  const formResponsesStr = form ? JSON.stringify(form) : null;
  const createdAt = Date.now();

  if (useMongoDB) {
    await Ticket.create({
      guildId: guild.id,
      ticketId,
      openerId,
      channelId: ticketChannel.id,
      type,
      status: 'open',
      createdAt,
      formResponses: formResponsesStr
    });
  } else {
    await run(
      `INSERT INTO tickets (id, guild_id, opener_id, channel_id, type, status, created_at, form_responses)
       VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`,
      [ticketId, guild.id, openerId, ticketChannel.id, type, createdAt, formResponsesStr]
    );
  }

  const panel = ticketCreatedEmbed(ticketId, openerId, {
    type,
    formSummary: form ? Object.entries(form).map(([k, v]) => `**${k}:** ${v}`).join('\n') : null
  });

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('🛠️ Claim').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ticket_unclaim').setLabel('❎ Unclaim').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('🔒 Close').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_info').setLabel('ℹ️ Info').setStyle(ButtonStyle.Primary)
  );

  await ticketChannel.send({
    content: `<@${openerId}> <@&${config.support_role_id}>`,
    embeds: [panel],
    components: [buttons]
  });

  return { ticketId, ticketChannel };
}

async function closeTicket({ guild, ticket, closerId, channel, config }) {
  const closedAt = Date.now();

  if (useMongoDB) {
    await Ticket.findOneAndUpdate({ guildId: guild.id, ticketId: ticket.id }, { status: 'closed', closedAt });
  } else {
    await run(`UPDATE tickets SET status = 'closed', closed_at = ? WHERE guild_id = ? AND id = ?`, [closedAt, guild.id, ticket.id]);
  }

  const embed = require('../components/ticketEmbeds').ticketClosedEmbed({
    ticketId: ticket.id,
    openerId: ticket.opener_id || ticket.openerId,
    closerId,
    claimedBy: ticket.claim_user_id || ticket.claimUserId,
    status: 'Closed'
  });

  const transcriptChannel = await guild.channels.fetch(config.transcript_channel_id || config.transcriptChannelId).catch(() => null);
  const buffer = null; // let caller attach transcript if needed

  if (transcriptChannel) {
    await transcriptChannel.send({ embeds: [embed] }).catch(() => {});
  }

  await channel.send({ embeds: [embed] }).catch(() => {});
  await channel.permissionOverwrites.edit(ticket.opener_id || ticket.openerId, { ViewChannel: false }).catch(() => {});
  await channel.setParent(config.closed_category_id || config.closedCategoryId).catch(() => {});
}

module.exports = {
  createTicket,
  closeTicket
};
