// src/utils/afkHelpers.js
const { EmbedBuilder } = require('discord.js');

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function humanizeDuration(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!parts.length) parts.push(`${sec}s`);
  return parts.join(' ');
}

function escapeTag(str) {
  if (!str) return '';
  return str.replace(/@/g, '@\u200b').replace(/`/g, 'ˋ');
}

function makeAfkEmbed({ afkUserId, reason, startTimestamp, notifierId }) {
  const sinceSeconds = Math.floor(startTimestamp / 1000);
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('AFK Notice')
    .setDescription(
      `**<@${afkUserId}>** is AFK.\n` +
      (reason ? `**Reason:** ${escapeTag(reason)}\n` : '') +
      `**Since:** <t:${sinceSeconds}:R>`
    )
    .setFooter({ text: `MULTi-Bot` });
  return embed;
}

function makeInfoEmbed({ afkUserId, reason, startTimestamp, notifiedCount }) {
  const sinceSeconds = Math.floor(startTimestamp / 1000);
  const embed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle('AFK Status')
    .setDescription(
      `**User:** <@${afkUserId}>\n` +
      (reason ? `**Reason:** ${escapeTag(reason)}\n` : '') +
      `**Since:** <t:${sinceSeconds}:R>\n` +
      `**Notified count:** ${notifiedCount ?? 0}`
    );
  return embed;
}

module.exports = {
  clamp,
  humanizeDuration,
  escapeTag,
  makeAfkEmbed,
  makeInfoEmbed
};
