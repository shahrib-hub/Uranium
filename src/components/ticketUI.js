// src/components/ticketUI.js
const { EmbedBuilder } = require('discord.js');

const TICKET_COLORS = {
  PRIMARY: 0x5865f2, // blurple
  SUCCESS: 0x57f287,
  DANGER: 0xed4245,
  WARNING: 0xfee75c,
  MUTED: 0x2b2d31,
  INFO: 0x3498db,
  GOLD: 0xFFD700
};

const TICKET_EMOJI = {
  PANEL: '🎫',
  SUPPORT: '🛟',
  BILLING: '💳',
  REPORT: '🚨',
  PARTNER: '🤝',
  OTHER: '❓',
  PREMIUM: '💎'
};

function ticketFooter(premium = false) {
  return {
    text: premium ? 'MULTi-Bot • Premium Ticket System' : 'MULTi-Bot • Ticket System'
  };
}

function createTicketEmbed({ color = TICKET_COLORS.PRIMARY, premium = false, title, description } = {}) {
  const e = new EmbedBuilder().setColor(color).setFooter(ticketFooter(premium));
  if (title) e.setTitle(title);
  if (description) e.setDescription(description);
  return e;
}

function premiumRequiredEmbed(featureName = 'this feature') {
  return createTicketEmbed({
    color: TICKET_COLORS.DANGER,
    premium: true,
    title: `${TICKET_EMOJI.PREMIUM} Premium Required`,
    description:
      `**${featureName}** is available only to **premium servers**.\n\n` +
      'You can:\n' +
      '• Use `/premium buy` to purchase premium\n' +
      '• Use `/premium redeem` to activate a code\n' +
      '• Use `/premium support` to get help or ask questions\n\n' +
      '💖 Thank you for supporting the project!'
  });
}

module.exports = {
  TICKET_COLORS,
  TICKET_EMOJI,
  createTicketEmbed,
  premiumRequiredEmbed,
  ticketFooter
};
