// src/components/ticketEmbeds.js
const { createTicketEmbed, TICKET_COLORS, TICKET_EMOJI } = require('./ticketUI');

function ticketPanelEmbed({ premium = false, showTypes = true } = {}) {
  const embed = createTicketEmbed({
    color: TICKET_COLORS.PRIMARY,
    premium,
    title: `${TICKET_EMOJI.PANEL} Need Help?`,
    description:
      'Welcome to the support center. Click a button below to open a ticket. ' +
      'Choose the ticket type that best matches your issue.'
  });

  if (showTypes) {
    embed.addFields(
      { name: `${TICKET_EMOJI.SUPPORT} General Support`, value: 'Issues, questions, or account help.', inline: false },
      { name: `${TICKET_EMOJI.BILLING} Billing & Purchases`, value: 'Payment problems and invoices.', inline: false },
      { name: `${TICKET_EMOJI.REPORT} Reports`, value: 'Report a user, bug, or security issue.', inline: false },
      { name: `${TICKET_EMOJI.PARTNER} Partnerships`, value: 'Partnership or business inquiries.', inline: false }
    );
  }

  return embed;
}

function ticketCreatedEmbed(ticketId, userId, meta = {}) {
  const embed = createTicketEmbed({
    color: TICKET_COLORS.INFO,
    title: `Ticket #${ticketId}`,
    description:
      `Hello <@${userId}> — thanks for opening a ticket. Please describe your issue. ` +
      'Attach screenshots if relevant. A support staff will assist you soon.'
  });

  if (meta.type) embed.addFields({ name: 'Type', value: `${meta.type}`, inline: true });
  if (meta.formSummary) embed.addFields({ name: 'Form', value: meta.formSummary, inline: false });

  embed.addFields({
    name: 'Next steps',
    value:
      '• Explain your issue in one clear message.\n' +
      '• Attach screenshots or files if needed.\n' +
      '• Avoid pinging staff repeatedly.'
  });

  return embed;
}

function ticketClosedEmbed({ ticketId, openerId, closerId, claimedBy, status }) {
  const embed = createTicketEmbed({
    color: TICKET_COLORS.DANGER,
    title: `Ticket #${ticketId} Closed`
  });

  embed.addFields(
    { name: 'Ticket ID', value: `\`${ticketId}\``, inline: true },
    { name: 'Opened by', value: `<@${openerId}>`, inline: true },
    { name: 'Closed by', value: closerId === 'Auto-Close' ? '🤖 Auto-Close' : `<@${closerId}>`, inline: true },
    { name: 'Claimed by', value: claimedBy ? `<@${claimedBy}>` : '—', inline: true },
    { name: 'Status', value: status || 'Closed', inline: true }
  );

  return embed;
}

function ticketInfoEmbed({ ticketId, openerId, claimedBy, status, createdAt, description }) {
  const embed = createTicketEmbed({
    color: TICKET_COLORS.INFO,
    title: `📄 Ticket #${ticketId} Information`
  });

  embed.addFields(
    { name: 'Opened by', value: `<@${openerId}>`, inline: true },
    { name: 'Claimed by', value: claimedBy ? `<@${claimedBy}>` : '—', inline: true },
    { name: 'Status', value: status || 'Unknown', inline: true },
    { name: 'Created At', value: createdAt ? `<t:${Math.floor(createdAt / 1000)}:F>` : 'Unknown', inline: false },
    { name: 'Description', value: description && description.length ? description.slice(0, 1024) : 'No description provided.', inline: false }
  );

  return embed;
}

module.exports = {
  ticketPanelEmbed,
  ticketCreatedEmbed,
  ticketClosedEmbed,
  ticketInfoEmbed
};
