// src/utils/logFormatter.js
const { EmbedBuilder } = require('discord.js');

function shortId(str = '') {
  return String(str).slice(0, 8);
}

function formatMember(member) {
  if (!member) return 'Unknown';
  return `${member.user?.tag ?? member.user ?? member.id} (${member.id})`;
}
function formatChannel(channel) {
  if (!channel) return 'Unknown';
  return `#${channel.name ?? channel.id} (${channel.id})`;
}
function formatRole(role) {
  if (!role) return 'Unknown';
  return `${role.name} (${role.id})`;
}

function makeBaseEmbed({ guild, event }) {
  return new EmbedBuilder()
    .setTitle(`${event}`)
    .setTimestamp()
    .setFooter({ text: `Guild: ${guild?.id ?? 'unknown'} • ${event}` });
}

function makeCreateEmbed({ guild, event, actor, target, fields = [] }) {
  const e = makeBaseEmbed({ guild, event });
  e.setColor(0x57F287);
  if (actor) e.addFields({ name: 'By', value: actor, inline: true });
  if (target) e.addFields({ name: 'Target', value: target, inline: true });
  for (const f of fields) e.addFields(f);
  return e;
}
function makeDeleteEmbed({ guild, event, actor, target, fields = [] }) {
  const e = makeBaseEmbed({ guild, event });
  e.setColor(0xED4245);
  if (actor) e.addFields({ name: 'By', value: actor, inline: true });
  if (target) e.addFields({ name: 'Target', value: target, inline: true });
  for (const f of fields) e.addFields(f);
  return e;
}
function makeUpdateEmbed({ guild, event, actor, target, beforeText, afterText, fields = [] }) {
  const e = makeBaseEmbed({ guild, event });
  e.setColor(0xFAA61A);
  if (actor) e.addFields({ name: 'By', value: actor, inline: true });
  if (target) e.addFields({ name: 'Target', value: target, inline: true });
  if (beforeText || afterText) {
    e.addFields({ name: 'Before', value: beforeText || '—', inline: false });
    e.addFields({ name: 'After', value: afterText || '—', inline: false });
  }
  for (const f of fields) e.addFields(f);
  return e;
}

module.exports = {
  shortId,
  formatMember,
  formatChannel,
  formatRole,
  makeBaseEmbed,
  makeCreateEmbed,
  makeDeleteEmbed,
  makeUpdateEmbed
};