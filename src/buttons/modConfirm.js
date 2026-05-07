// src/buttons/modConfirm.js
const { EmbedBuilder } = require('discord.js');
const {
  getPendingModeration,
  deletePendingModeration
} = require('./modConfirmStore');

const {
  saveCase,
  saveScheduledTask,
  getLogChannel
} = require('../utils/modStorage');

function generateCaseId(guildId) {
  return `CASE-${guildId}-${Date.now().toString(36)}`;
}

function formatDuration(msValue) {
  if (!msValue || msValue <= 0) return '0s';
  const seconds = Math.floor(msValue / 1000);
  const parts = [];
  const units = [
    { label: 'w', value: 604800 },
    { label: 'd', value: 86400 },
    { label: 'h', value: 3600 },
    { label: 'm', value: 60 },
    { label: 's', value: 1 }
  ];
  let remaining = seconds;
  for (const { label, value } of units) {
    const amount = Math.floor(remaining / value);
    if (amount > 0) {
      parts.push(`${amount}${label}`);
      remaining %= value;
    }
  }
  return parts.join(' ') || '0s';
}

module.exports = async (interaction) => {
  const id = interaction.customId; // e.g. "mod:confirm:12345" or "mod:cancel:12345"
  const parts = id.split(':');
  if (parts.length !== 3) {
    return interaction.reply({ content: '❌ Invalid moderation button ID.', flags: 64 }).catch(() => {});
  }

  const [, decision, baseInteractionId] = parts;
  const payload = getPendingModeration(baseInteractionId);

  if (!payload) {
    return interaction.reply({
      content: '⌛ This moderation confirmation has expired or is invalid.',
      flags: 64
    }).catch(() => {});
  }

  const {
    action,
    guildId,
    targetId,
    targetTag,
    reason,
    duration,
    moderatorId
  } = payload;

  // Only the original moderator can confirm/cancel
  if (interaction.user.id !== moderatorId) {
    return interaction.reply({
      content: '❌ Only the moderator who issued this action can confirm or cancel it.',
      flags: 64
    }).catch(() => {});
  }

  const guild = interaction.guild ?? interaction.client.guilds.cache.get(guildId);
  if (!guild) {
    deletePendingModeration(baseInteractionId);
    return interaction.update({
      content: '❌ Guild not found. Action aborted.',
      embeds: [],
      components: []
    }).catch(() => {});
  }

  // Cancel -> just clean up & update message
  if (decision === 'cancel') {
    deletePendingModeration(baseInteractionId);
    return interaction.update({
      content: '❌ Moderation action cancelled.',
      embeds: [],
      components: []
    }).catch(() => {});
  }

  // Confirm => actually perform the moderation action
  try {
    let caseId = generateCaseId(guildId);

    if (action === 'kick') {
      const member = await guild.members.fetch(targetId).catch(() => null);
      if (!member) {
        deletePendingModeration(baseInteractionId);
        return interaction.update({
          content: '❌ User not found. Kick aborted.',
          embeds: [],
          components: []
        }).catch(() => {});
      }

      await member.kick(reason).catch(() => {});

      await saveCase({
        caseId,
        guildId,
        moderatorId,
        targetId,
        action: 'kick',
        reason,
        duration: null,
        timestamp: Date.now()
      });

      const embed = new EmbedBuilder()
        .setTitle('👢 User Kicked')
        .setColor(0xFAA61A)
        .addFields(
          { name: 'User', value: `<@${targetId}>`, inline: true },
          { name: 'Moderator', value: `<@${moderatorId}>`, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Case ID', value: `\`${caseId}\`` }
        );

      const logChannelId = await getLogChannel(guildId);
      if (logChannelId) {
        const logChannel = guild.channels.cache.get(logChannelId);
        if (logChannel && typeof logChannel.send === 'function') {
          logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }

      deletePendingModeration(baseInteractionId);
      return interaction.update({
        content: `✅ Kick executed for <@${targetId}>.`,
        embeds: [],
        components: []
      }).catch(() => {});
    }

    if (action === 'ban' || action === 'tempban') {
      // For tempban, duration is required; for ban it may be null/ignored
      const member = await guild.members.fetch(targetId).catch(() => null);

      if (!member) {
        // Try direct ban via user ID anyway
        await guild.members.ban(targetId, { reason }).catch(() => {});
      } else {
        await member.ban({ reason }).catch(() => {});
      }

      await saveCase({
        caseId,
        guildId,
        moderatorId,
        targetId,
        action: action === 'tempban' ? 'tempban' : 'ban',
        reason,
        duration: duration || null,
        timestamp: Date.now()
      });

      if (action === 'tempban' && duration) {
        try {
          await saveScheduledTask({
            guildId,
            userId: targetId,
            action: 'unban',
            expiresAt: Date.now() + duration,
            caseId
          });
        } catch {
          // non-fatal
        }
      }

      const embed = new EmbedBuilder()
        .setTitle(action === 'tempban' ? '📅 User Temporarily Banned' : '🔨 User Banned')
        .setColor(0xED4245)
        .addFields(
          { name: 'User', value: `<@${targetId}>`, inline: true },
          { name: 'Moderator', value: `<@${moderatorId}>`, inline: true },
          { name: 'Reason', value: reason },
          ...(duration
            ? [{ name: 'Duration', value: formatDuration(duration) }]
            : []),
          { name: 'Case ID', value: `\`${caseId}\`` }
        );

      const logChannelId = await getLogChannel(guildId);
      if (logChannelId) {
        const logChannel = guild.channels.cache.get(logChannelId);
        if (logChannel && typeof logChannel.send === 'function') {
          logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }

      deletePendingModeration(baseInteractionId);
      return interaction.update({
        content:
          action === 'tempban'
            ? `✅ Tempban executed for <@${targetId}> (${formatDuration(duration)}).`
            : `✅ Ban executed for <@${targetId}>.`,
        embeds: [],
        components: []
      }).catch(() => {});
    }

    if (action === 'mute') {
      const member = await guild.members.fetch(targetId).catch(() => null);
      if (!member) {
        deletePendingModeration(baseInteractionId);
        return interaction.update({
          content: '❌ User not found. Mute aborted.',
          embeds: [],
          components: []
        }).catch(() => {});
      }

      const dur = duration || 60_000;
      await member.timeout(dur, reason).catch(() => {});

      await saveCase({
        caseId,
        guildId,
        moderatorId,
        targetId,
        action: 'mute',
        reason,
        duration: dur,
        timestamp: Date.now()
      });

      const embed = new EmbedBuilder()
        .setTitle('🔇 User Muted')
        .setColor(0x5865F2)
        .addFields(
          { name: 'User', value: `<@${targetId}>`, inline: true },
          { name: 'Moderator', value: `<@${moderatorId}>`, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Duration', value: formatDuration(dur) },
          { name: 'Case ID', value: `\`${caseId}\`` }
        );

      const logChannelId = await getLogChannel(guildId);
      if (logChannelId) {
        const logChannel = guild.channels.cache.get(logChannelId);
        if (logChannel && typeof logChannel.send === 'function') {
          logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }

      deletePendingModeration(baseInteractionId);
      return interaction.update({
        content: `✅ Mute executed for <@${targetId}> (${formatDuration(dur)}).`,
        embeds: [],
        components: []
      }).catch(() => {});
    }

    // Unknown action safety
    deletePendingModeration(baseInteractionId);
    return interaction.update({
      content: '❌ Unknown moderation action. Nothing was done.',
      embeds: [],
      components: []
    }).catch(() => {});
  } catch (err) {
    console.error('❌ Error in modConfirm handler:', err);
    deletePendingModeration(baseInteractionId);
    return interaction.update({
      content: '❌ Failed to perform moderation action.',
      embeds: [],
      components: []
    }).catch(() => {});
  }
};