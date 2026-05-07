const { EmbedBuilder } = require('discord.js');

/* ───────────────────────────── */
/* COLORS */
/* ───────────────────────────── */
const COLORS = {
  enabled: 0x57F287,   // green
  disabled: 0xED4245,  // red
  warning: 0xFEE75C,   // yellow
  info: 0x5865F2       // blurple
};

/* ───────────────────────────── */
/* GENERIC SIMPLE EMBED */
/* ───────────────────────────── */
function simple(title, description, type = 'info') {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(COLORS[type] ?? COLORS.info)
    .setTimestamp();
}

/* ───────────────────────────── */
/* MAIN DASHBOARD */
/* ───────────────────────────── */
function dashboard(config) {
  return new EmbedBuilder()
    .setTitle('🛡️ Anti-Nuke Security Dashboard')
    .setColor(config.enabled ? COLORS.enabled : COLORS.disabled)
    .setDescription(
      `**Status:** ${config.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n\n` +
      `**Punishment:** \`${config.punishment.toUpperCase()}\`\n` +
      `**Action Limit:** \`${config.action_limit}\`\n` +
      `**Auto-Recovery:** ${config.autorecovery ? '✅ Enabled' : '❌ Disabled'}`
    )
    .addFields({
      name: '🚨 Protections',
      value: [
        `Anti Ban: ${icon(config.antiban)}`,
        `Anti Kick: ${icon(config.antikick)}`,
        `Anti Bot: ${icon(config.antibot)}`,
        `Anti Channel: ${icon(config.antichannel)}`,
        `Anti Role: ${icon(config.antirole)}`,
        `Anti Webhook: ${icon(config.antiwebhook)}`,
        `Anti Emoji: ${icon(config.antiemoji)}`,
        `Anti Prune: ${icon(config.antiprune)}`
      ].join('\n')
    })
    .setFooter({ text: 'Anti-Nuke protects your server from mass-destruction attacks' })
    .setTimestamp();
}

/* ───────────────────────────── */
/* WHITELIST EMBED */
/* ───────────────────────────── */
function whitelist(users) {
  if (!users || users.length === 0) {
    return new EmbedBuilder()
      .setTitle('📄 Anti-Nuke Whitelist')
      .setDescription('No users are currently whitelisted.')
      .setColor(COLORS.warning)
      .setTimestamp();
  }

  return new EmbedBuilder()
    .setTitle('📄 Anti-Nuke Whitelist')
    .setColor(COLORS.info)
    .setDescription(
      users
        .map((u, i) => `\`${i + 1}.\` <@${u.user_id ?? u}>`)
        .join('\n')
    )
    .setFooter({ text: `Total whitelisted users: ${users.length}` })
    .setTimestamp();
}

/* ───────────────────────────── */
/* ALERT LOG */
/* ───────────────────────────── */
function alert({ guild, executor, target, actionType, punishment }) {
  return new EmbedBuilder()
    .setTitle('🚨 Anti-Nuke Triggered')
    .setColor(COLORS.warning)
    .setDescription(
      `**Server:** ${guild.name}\n` +
      `**Action:** \`${actionType}\`\n` +
      `**Punishment:** \`${punishment.toUpperCase()}\``
    )
    .addFields(
      {
        name: '👤 Executor',
        value: `${executor.tag}\n\`${executor.id}\``,
        inline: true
      },
      {
        name: '🎯 Target',
        value: target?.name
          ? `${target.name}\n\`${target.id}\``
          : `\`${target?.id ?? 'Unknown'}\``,
        inline: true
      }
    )
    .setTimestamp();
}

/* ───────────────────────────── */
/* TOGGLE RESPONSE */
/* ───────────────────────────── */
function toggle(feature, state) {
  return new EmbedBuilder()
    .setTitle(`🧩 ${feature} Protection`)
    .setColor(state ? COLORS.enabled : COLORS.disabled)
    .setDescription(
      state
        ? `✅ **${feature}** has been enabled.`
        : `❌ **${feature}** has been disabled.`
    )
    .setTimestamp();
}

/* ───────────────────────────── */
/* SUCCESS / ERROR */
/* ───────────────────────────── */
function success(message) {
  return simple('✅ Success', message, 'enabled');
}

function error(message) {
  return simple('❌ Error', message, 'disabled');
}

/* ───────────────────────────── */
/* SMALL HELPER */
/* ───────────────────────────── */
function icon(value) {
  return value ? '🟢 Enabled' : '🔴 Disabled';
}

/* ───────────────────────────── */
/* EXPORT */
/* ───────────────────────────── */
module.exports = {
  simple,
  dashboard,
  whitelist,
  alert,
  toggle,
  success,
  error
};