const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder
} = require('discord.js');

const ms = require('ms');
const {
  saveCase,
  getCasesByUser,
  getCaseById,
  updateCase,
  saveScheduledTask,
  getLogChannel
} = require('../../utils/modStorage');

function generateCaseId(guildId) {
  return `CASE-${guildId}-${Date.now().toString(36)}`;
}

function parseDuration(input) {
  try {
    const duration = ms(input);
    return typeof duration === 'number' && duration >= 1000 ? duration : null;
  } catch {
    return null;
  }
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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Moderation tools and actions')
    // moderation actions - all flat subcommands
    .addSubcommand((sc) =>
      sc
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption((o) =>
          o.setName('user').setDescription('Target user').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('reason').setDescription('Reason').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('kick')
        .setDescription('Kick a user')
        .addUserOption((o) =>
          o.setName('user').setDescription('Target user').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('reason').setDescription('Reason').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('ban')
        .setDescription('Ban a user (optionally timed)')
        .addUserOption((o) =>
          o.setName('user').setDescription('Target user').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('reason').setDescription('Reason').setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName('duration')
            .setDescription('Optional duration (e.g. 1d6h)')
            .setRequired(false)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('tempban')
        .setDescription('Temporarily ban a user')
        .addUserOption((o) =>
          o.setName('user').setDescription('Target user').setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName('duration')
            .setDescription('Duration (e.g. 1d)')
            .setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('reason').setDescription('Reason').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('unban')
        .setDescription('Unban a user by ID')
        .addStringOption((o) =>
          o.setName('userid').setDescription('User ID').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('reason').setDescription('Reason').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('mute')
        .setDescription('Timeout a user (mute)')
        .addUserOption((o) =>
          o.setName('user').setDescription('Target user').setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName('duration')
            .setDescription('Duration (e.g. 30m, 1h)')
            .setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('reason').setDescription('Reason').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('unmute')
        .setDescription('Remove timeout from a user')
        .addUserOption((o) =>
          o.setName('user').setDescription('Target user').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('reason').setDescription('Reason').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('timeout')
        .setDescription('Timeout a user')
        .addUserOption((o) =>
          o.setName('user').setDescription('Target user').setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName('duration')
            .setDescription('Duration (e.g. 10m, 1h)')
            .setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('reason').setDescription('Reason').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('softban')
        .setDescription('Softban a user (ban + unban)')
        .addUserOption((o) =>
          o.setName('user').setDescription('Target user').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('reason').setDescription('Reason').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('purge')
        .setDescription('Bulk delete messages')
        .addIntegerOption((o) =>
          o.setName('count').setDescription('Number of messages').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('lockdown')
        .setDescription('Lock a channel')
        .addChannelOption((o) =>
          o.setName('channel').setDescription('Target channel').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('reason').setDescription('Reason').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('unlock')
        .setDescription('Unlock a channel')
        .addChannelOption((o) =>
          o.setName('channel').setDescription('Target channel').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('reason').setDescription('Reason').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('slowmode')
        .setDescription('Set slowmode for a channel')
        .addChannelOption((o) =>
          o.setName('channel').setDescription('Target channel').setRequired(true)
        )
        .addIntegerOption((o) =>
          o
            .setName('seconds')
            .setDescription('Slowmode duration in seconds')
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('nick')
        .setDescription('Change a users nickname')
        .addUserOption((o) =>
          o.setName('user').setDescription('Target user').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('nickname').setDescription('New nickname').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('force-role')
        .setDescription('Add or remove a role from a user')
        .addStringOption((o) =>
          o
            .setName('action')
            .setDescription('Add or remove')
            .setRequired(true)
            .addChoices(
              { name: 'add', value: 'add' },
              { name: 'remove', value: 'remove' }
            )
        )
        .addUserOption((o) =>
          o.setName('user').setDescription('Target user').setRequired(true)
        )
        .addRoleOption((o) =>
          o.setName('role').setDescription('Role to modify').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('clear-roles')
        .setDescription('Remove all roles from a user except specified')
        .addUserOption((o) =>
          o.setName('user').setDescription('Target user').setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName('preserveroles')
            .setDescription('Comma-separated role IDs to keep')
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('unwarn')
        .setDescription('Remove a warning')
        .addUserOption((o) =>
          o.setName('user').setDescription('Target user').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('caseid').setDescription('Case ID to remove').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('infractions')
        .setDescription('List user infractions')
        .addUserOption((o) =>
          o.setName('user').setDescription('Target user').setRequired(true)
        )
        .addIntegerOption((o) =>
          o.setName('page').setDescription('Page number').setRequired(false)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('notes-add')
        .setDescription('Add a private note to a user')
        .addUserOption((o) =>
          o.setName('user').setDescription('Target user').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('text').setDescription('Note text').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('notes-list')
        .setDescription('List private notes for a user')
        .addUserOption((o) =>
          o.setName('user').setDescription('Target user').setRequired(true)
        )
        .addIntegerOption((o) =>
          o.setName('page').setDescription('Page number').setRequired(false)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('history')
        .setDescription('Summarize user moderation history')
        .addUserOption((o) =>
          o.setName('user').setDescription('Target user').setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand(false);
    const guildId = interaction.guild.id;
    const member = interaction.member;

    // /mod warn
    if (sub === 'warn') {
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return interaction.reply({
          content: '❌ You lack permission to warn users.',
          flags: 64
        });
      }

      const caseId = generateCaseId(guildId);
      await saveCase({
        caseId,
        guildId,
        moderatorId: interaction.user.id,
        targetId: target.id,
        action: 'warn',
        reason,
        duration: null,
        timestamp: Date.now(),
        evidence: [],
        references: []
      });

      const embed = new EmbedBuilder()
        .setTitle('⚠️ Warning issued')
        .setColor(0xFEE75C)
        .addFields(
          { name: 'User', value: `<@${target.id}>`, inline: true },
          { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Reason', value: reason }
        )
        .setFooter({ text: `Case ID: ${caseId}` });

      const logChannelId = await getLogChannel(guildId);
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel?.send) logChannel.send({ embeds: [embed] }).catch(() => {});
      }

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    // /mod kick
    if (sub === 'kick') {
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return interaction.reply({
          content: '❌ You lack permission to kick users.',
          flags: 64
        });
      }

      const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!guildMember) {
        return interaction.reply({ content: 'User not found.', flags: 64 });
      }

      await guildMember.kick(reason).catch(() => {});

      const caseId = generateCaseId(guildId);
      await saveCase({
        caseId,
        guildId,
        moderatorId: interaction.user.id,
        targetId: target.id,
        action: 'kick',
        reason,
        duration: null,
        timestamp: Date.now()
      });

      const embed = new EmbedBuilder()
        .setTitle('👢 User Kicked')
        .setColor(0xFAA61A)
        .addFields(
          { name: 'User', value: `<@${target.id}>`, inline: true },
          { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Case ID', value: `\`${caseId}\`` }
        );

      const logChannelId = await getLogChannel(guildId);
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel?.send) logChannel.send({ embeds: [embed] }).catch(() => {});
      }

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    // /mod ban
    if (sub === 'ban') {
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const durationStr = interaction.options.getString('duration');
      const duration = durationStr ? parseDuration(durationStr) : null;

      if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({
          content: '❌ You lack permission to ban users.',
          flags: 64
        });
      }

      const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!guildMember) {
        return interaction.reply({ content: 'User not found.', flags: 64 });
      }

      await guildMember.ban({ reason }).catch(() => {});

      const caseId = generateCaseId(guildId);
      await saveCase({
        caseId,
        guildId,
        moderatorId: interaction.user.id,
        targetId: target.id,
        action: duration ? 'ban_timed' : 'ban',
        reason,
        duration,
        timestamp: Date.now()
      });

      if (duration) {
        try {
          await saveScheduledTask({
            guildId,
            userId: target.id,
            action: 'unban',
            expiresAt: Date.now() + duration,
            caseId
          });
        } catch {
          // non-fatal
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('🔨 User Banned')
        .setColor(0xED4245)
        .addFields(
          { name: 'User', value: `<@${target.id}>`, inline: true },
          { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Reason', value: reason },
          ...(duration
            ? [{ name: 'Duration', value: formatDuration(duration) }]
            : []),
          { name: 'Case ID', value: `\`${caseId}\`` }
        );

      const logChannelId = await getLogChannel(guildId);
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel?.send) logChannel.send({ embeds: [embed] }).catch(() => {});
      }

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    // /mod tempban
    if (sub === 'tempban') {
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const durationStr = interaction.options.getString('duration');
      const duration = parseDuration(durationStr);

      if (!duration) {
        return interaction.reply({
          content: '❌ Invalid duration format.',
          flags: 64
        });
      }

      if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({
          content: '❌ You lack permission to tempban users.',
          flags: 64
        });
      }

      const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!guildMember) {
        return interaction.reply({ content: 'User not found.', flags: 64 });
      }

      await guildMember.ban({ reason }).catch(() => {});

      const caseId = generateCaseId(guildId);
      await saveCase({
        caseId,
        guildId,
        moderatorId: interaction.user.id,
        targetId: target.id,
        action: 'tempban',
        reason,
        duration,
        timestamp: Date.now()
      });

      try {
        await saveScheduledTask({
          guildId,
          userId: target.id,
          action: 'unban',
          expiresAt: Date.now() + duration,
          caseId
        });
      } catch {
        // non-fatal
      }

      const embed = new EmbedBuilder()
        .setTitle('📅 User Temporarily Banned')
        .setColor(0xED4245)
        .addFields(
          { name: 'User', value: `<@${target.id}>`, inline: true },
          { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Duration', value: formatDuration(duration) },
          { name: 'Case ID', value: `\`${caseId}\`` }
        );

      const logChannelId = await getLogChannel(guildId);
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel?.send) logChannel.send({ embeds: [embed] }).catch(() => {});
      }

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    // /mod unban
    if (sub === 'unban') {
      const userId = interaction.options.getString('userid');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({
          content: '❌ You lack permission to unban users.',
          flags: 64
        });
      }

      await interaction.guild.bans.remove(userId, reason).catch(() => null);

      const caseId = generateCaseId(guildId);
      await saveCase({
        caseId,
        guildId,
        moderatorId: interaction.user.id,
        targetId: userId,
        action: 'unban',
        reason,
        duration: null,
        timestamp: Date.now()
      });

      const embed = new EmbedBuilder()
        .setTitle('♻️ User Unbanned')
        .setColor(0x57F287)
        .addFields(
          { name: 'User ID', value: userId, inline: true },
          { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Case ID', value: `\`${caseId}\`` }
        );

      const logChannelId = await getLogChannel(guildId);
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel?.send) logChannel.send({ embeds: [embed] }).catch(() => {});
      }

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    // /mod mute
    if (sub === 'mute') {
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const durationStr = interaction.options.getString('duration');
      const duration = parseDuration(durationStr);

      if (!duration) {
        return interaction.reply({
          content: '❌ Invalid duration format.',
          flags: 64
        });
      }

      if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({
          content: '❌ You lack permission to mute users.',
          flags: 64
        });
      }

      const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!guildMember) {
        return interaction.reply({ content: 'User not found.', flags: 64 });
      }

      await guildMember.timeout(duration, reason).catch(() => {});

      const caseId = generateCaseId(guildId);
      await saveCase({
        caseId,
        guildId,
        moderatorId: interaction.user.id,
        targetId: target.id,
        action: 'mute',
        reason,
        duration,
        timestamp: Date.now()
      });

      const embed = new EmbedBuilder()
        .setTitle('🔇 User Muted')
        .setColor(0x5865F2)
        .addFields(
          { name: 'User', value: `<@${target.id}>`, inline: true },
          { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Duration', value: formatDuration(duration) },
          { name: 'Case ID', value: `\`${caseId}\`` }
        );

      const logChannelId = await getLogChannel(guildId);
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel?.send) logChannel.send({ embeds: [embed] }).catch(() => {});
      }

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    // /mod unmute
    if (sub === 'unmute') {
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({
          content: '❌ You lack permission to unmute users.',
          flags: 64
        });
      }

      const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!guildMember) {
        return interaction.reply({ content: 'User not found.', flags: 64 });
      }

      await guildMember.timeout(null, reason).catch(() => {});

      const caseId = generateCaseId(guildId);
      await saveCase({
        caseId,
        guildId,
        moderatorId: interaction.user.id,
        targetId: target.id,
        action: 'unmute',
        reason,
        duration: null,
        timestamp: Date.now()
      });

      const embed = new EmbedBuilder()
        .setTitle('🔊 User Unmuted')
        .setColor(0x57F287)
        .addFields(
          { name: 'User', value: `<@${target.id}>`, inline: true },
          { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Case ID', value: `\`${caseId}\`` }
        );

      const logChannelId = await getLogChannel(guildId);
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel?.send) logChannel.send({ embeds: [embed] }).catch(() => {});
      }

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    // /mod timeout
    if (sub === 'timeout') {
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const durationStr = interaction.options.getString('duration');
      const duration = parseDuration(durationStr);

      if (!duration) {
        return interaction.reply({
          content: '❌ Invalid duration format.',
          flags: 64
        });
      }

      if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({
          content: '❌ You lack permission to timeout users.',
          flags: 64
        });
      }

      const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!guildMember) {
        return interaction.reply({ content: 'User not found.', flags: 64 });
      }

      await guildMember.timeout(duration, reason).catch(() => {});

      const caseId = generateCaseId(guildId);
      await saveCase({
        caseId,
        guildId,
        moderatorId: interaction.user.id,
        targetId: target.id,
        action: 'timeout',
        reason,
        duration,
        timestamp: Date.now()
      });

      const embed = new EmbedBuilder()
        .setTitle('⏱️ User Timed Out')
        .setColor(0x5865F2)
        .addFields(
          { name: 'User', value: `<@${target.id}>`, inline: true },
          { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Duration', value: formatDuration(duration) },
          { name: 'Case ID', value: `\`${caseId}\`` }
        );

      const logChannelId = await getLogChannel(guildId);
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel?.send) logChannel.send({ embeds: [embed] }).catch(() => {});
      }

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    // /mod softban
    if (sub === 'softban') {
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({
          content: '❌ You lack permission to softban users.',
          flags: 64
        });
      }

      const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!guildMember) {
        return interaction.reply({ content: 'User not found.', flags: 64 });
      }

      await guildMember.ban({ reason }).catch(() => {});
      await interaction.guild.bans.remove(target.id, reason).catch(() => null);

      const caseId = generateCaseId(guildId);
      await saveCase({
        caseId,
        guildId,
        moderatorId: interaction.user.id,
        targetId: target.id,
        action: 'softban',
        reason,
        duration: null,
        timestamp: Date.now()
      });

      const embed = new EmbedBuilder()
        .setTitle('👢 User Softbanned')
        .setColor(0xFAA61A)
        .addFields(
          { name: 'User', value: `<@${target.id}>`, inline: true },
          { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Case ID', value: `\`${caseId}\`` }
        );

      const logChannelId = await getLogChannel(guildId);
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel?.send) logChannel.send({ embeds: [embed] }).catch(() => {});
      }

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    // /mod purge
    if (sub === 'purge') {
      const count = interaction.options.getInteger('count');

      if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({
          content: '❌ You lack permission to purge messages.',
          flags: 64
        });
      }

      if (count < 1 || count > 100) {
        return interaction.reply({
          content: '❌ You can only delete between 1 and 100 messages.',
          flags: 64
        });
      }

      const messages = await interaction.channel.bulkDelete(count, true).catch(() => null);
      if (!messages) {
        return interaction.reply({
          content: '❌ Failed to delete messages. They may be too old.',
          flags: 64
        });
      }

      return interaction.reply({
        content: `🧹 Deleted ${messages.size} messages.`,
        flags: 64
      });
    }

    // /mod lockdown
    if (sub === 'lockdown') {
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({
          content: '❌ You lack permission to lock channels.',
          flags: 64
        });
      }

      const me = interaction.guild.members.me;
      if (!me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({
          content: '❌ I need the Manage Roles permission to lock channels (configured flow).',
          flags: 64
        });
      }

      if (!channel.isTextBased()) {
        return interaction.reply({
          content: '❌ This command only works on text-based channels.',
          flags: 64
        });
      }

      try {
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          SendMessages: false
        });
      } catch (err) {
        console.error('Lockdown error:', err);
        return interaction.reply({
          content: '⚠️ Failed to lock the channel. Check my permissions and role hierarchy.',
          flags: 64
        });
      }

      return interaction.reply({
        content: `🔒 Locked ${channel} — ${reason}`,
        flags: 64
      });
    }

    // /mod unlock
    if (sub === 'unlock') {
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({
          content: '❌ You lack permission to unlock channels.',
          flags: 64
        });
      }

      const me = interaction.guild.members.me;
      if (!me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({
          content: '❌ I need the Manage Roles permission to unlock channels (configured flow).',
          flags: 64
        });
      }

      if (!channel.isTextBased()) {
        return interaction.reply({
          content: '❌ This command only works on text-based channels.',
          flags: 64
        });
      }

      try {
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          SendMessages: null
        });
      } catch (err) {
        console.error('Unlock error:', err);
        return interaction.reply({
          content: '⚠️ Failed to unlock the channel. Check my permissions and role hierarchy.',
          flags: 64
        });
      }

      return interaction.reply({
        content: `🔓 Unlocked ${channel} — ${reason}`,
        flags: 64
      });
    }

    // /mod slowmode
    if (sub === 'slowmode') {
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const seconds = interaction.options.getInteger('seconds');

      if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({
          content: '❌ You lack permission to set slowmode.',
          flags: 64
        });
      }

      if (seconds < 0 || seconds > 21600) {
        return interaction.reply({
          content: '❌ Slowmode must be between 0 and 21600 seconds.',
          flags: 64
        });
      }

      await channel.setRateLimitPerUser(seconds).catch(() => {});
      return interaction.reply({
        content: `🐢 Set slowmode in ${channel} to ${seconds} seconds.`,
        flags: 64
      });
    }

    // /mod nick
    if (sub === 'nick') {
      const target = interaction.options.getUser('user');
      const nickname = interaction.options.getString('nickname');

      if (!member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
        return interaction.reply({
          content: '❌ You lack permission to change nicknames.',
          flags: 64
        });
      }

      const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!guildMember) {
        return interaction.reply({ content: 'User not found.', flags: 64 });
      }

      await guildMember.setNickname(nickname).catch(() => null);

      return interaction.reply({
        content: `✏️ Changed nickname of <@${target.id}> to **${nickname}**.`,
        flags: 64
      });
    }

    // /mod force-role
    if (sub === 'force-role') {
      const action = interaction.options.getString('action');
      const target = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');

      if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({
          content: '❌ You lack permission to manage roles.',
          flags: 64
        });
      }

      const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!guildMember) {
        return interaction.reply({ content: 'User not found.', flags: 64 });
      }

      if (action === 'add') {
        await guildMember.roles.add(role).catch(() => null);
        return interaction.reply({
          content: `✅ Added role ${role} to <@${target.id}>.`,
          flags: 64
        });
      } else {
        await guildMember.roles.remove(role).catch(() => null);
        return interaction.reply({
          content: `❎ Removed role ${role} from <@${target.id}>.`,
          flags: 64
        });
      }
    }

    // /mod clear-roles
    if (sub === 'clear-roles') {
      const target = interaction.options.getUser('user');
      const preserve = interaction.options.getString('preserveroles');
      const preserveIds = preserve
        ? preserve.split(',').map((r) => r.trim())
        : [];

      if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({
          content: '❌ You lack permission to manage roles.',
          flags: 64
        });
      }

      const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!guildMember) {
        return interaction.reply({ content: 'User not found.', flags: 64 });
      }

      const rolesToRemove = guildMember.roles.cache
        .filter((r) => r.id !== interaction.guild.id && !preserveIds.includes(r.id))
        .map((r) => r.id);

      await guildMember.roles.remove(rolesToRemove).catch(() => null);

      return interaction.reply({
        content: `🧼 Cleared roles from <@${target.id}> except preserved ones.`,
        flags: 64
      });
    }

    // /mod unwarn
    if (sub === 'unwarn') {
      const target = interaction.options.getUser('user');
      const caseId = interaction.options.getString('caseid');

      if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return interaction.reply({
          content: '❌ You lack permission to unwarn users.',
          flags: 64
        });
      }

      try {
        const c = await getCaseById(guildId, caseId);
        if (!c || c.targetId !== target.id || c.action !== 'warn') {
          return interaction.reply({
            content: '⚠️ No matching warning found.',
            flags: 64
          });
        }
        await updateCase(guildId, caseId, { action: 'note_removed' });
      } catch (err) {
        console.error('Unwarn error:', err);
        return interaction.reply({
          content: '❌ Failed to remove warning.',
          flags: 64
        });
      }

      return interaction.reply({
        content: `✅ Removed warning \`${caseId}\` from <@${target.id}>.`,
        flags: 64
      });
    }

    // /mod infractions
    if (sub === 'infractions') {
      try {
        const target = interaction.options.getUser('user');
        const page = interaction.options.getInteger('page') || 1;
        const perPage = 5;
        const rows = await getCasesByUser(guildId, target.id);
        if (!rows || !rows.length) {
          return interaction.reply({
            content: '⚠️ No infractions found.',
            flags: 64
          });
        }

        const start = (page - 1) * perPage;
        const pageRows = rows.slice(start, start + perPage);

        const embed = new EmbedBuilder()
          .setTitle(`📄 Infractions for ${target.tag}`)
          .setColor(0xFEE75C)
          .setFooter({ text: `Page ${page}` });

        for (const row of pageRows) {
          embed.addFields({
            name: `${row.action.toUpperCase()} — ${row.caseId}`,
            value: `**Reason:** ${row.reason || 'None'}\n**Moderator:** <@${row.moderatorId}>\n**Date:** <t:${Math.floor(
              row.timestamp / 1000
            )}:f>`,
            inline: false
          });
        }

        return interaction.reply({ embeds: [embed], flags: 64 });
      } catch (err) {
        console.error('Infractions error:', err);
        return interaction.reply({
          content: '❌ Failed to fetch infractions.',
          flags: 64
        });
      }
    }

    // /mod notes-add
    if (sub === 'notes-add') {
      const target = interaction.options.getUser('user');
      const text = interaction.options.getString('text');

      const caseId = generateCaseId(guildId);
      try {
        await saveCase({
          caseId,
          guildId,
          moderatorId: interaction.user.id,
          targetId: target.id,
          action: 'note',
          reason: text,
          duration: null,
          timestamp: Date.now()
        });
      } catch (err) {
        console.error('Notes-add error:', err);
        return interaction.reply({
          content: '❌ Failed to add note.',
          flags: 64
        });
      }

      return interaction.reply({
        content: `📝 Note added to <@${target.id}>.`,
        flags: 64
      });
    }

    // /mod notes-list
    if (sub === 'notes-list') {
      try {
        const target = interaction.options.getUser('user');
        const page = interaction.options.getInteger('page') || 1;
        const perPage = 5;
        const rows = await getCasesByUser(guildId, target.id);
        const notes = (rows || []).filter((r) => r.action === 'note');
        if (!notes.length) {
          return interaction.reply({
            content: '⚠️ No notes found.',
            flags: 64
          });
        }

        const start = (page - 1) * perPage;
        const pageRows = notes.slice(start, start + perPage);

        const embed = new EmbedBuilder()
          .setTitle(`🗒️ Notes for ${target.tag}`)
          .setColor(0x2B2D31)
          .setFooter({ text: `Page ${page}` });

        for (const row of pageRows) {
          embed.addFields({
            name: `Note — ${row.caseId}`,
            value: `**Text:** ${row.reason}\n**By:** <@${row.moderatorId}>\n**Date:** <t:${Math.floor(
              row.timestamp / 1000
            )}:f>`,
            inline: false
          });
        }

        return interaction.reply({ embeds: [embed], flags: 64 });
      } catch (err) {
        console.error('Notes-list error:', err);
        return interaction.reply({
          content: '❌ Failed to fetch notes.',
          flags: 64
        });
      }
    }

    // /mod history
    if (sub === 'history') {
      try {
        const target = interaction.options.getUser('user');
        const rows = await getCasesByUser(guildId, target.id);
        if (!rows || !rows.length) {
          return interaction.reply({
            content: '⚠️ No moderation history found.',
            flags: 64
          });
        }

        const counts = {};
        for (const row of rows) {
          counts[row.action] = (counts[row.action] || 0) + 1;
        }

        const summary = Object.entries(counts)
          .map(([action, count]) => `**${action.toUpperCase()}**: ${count}`)
          .join('\n');

        const embed = new EmbedBuilder()
          .setTitle(`📊 Moderation History for ${target.tag}`)
          .setColor(0x5865F2)
          .setDescription(summary);

        return interaction.reply({ embeds: [embed], flags: 64 });
      } catch (err) {
        console.error('History error:', err);
        return interaction.reply({
          content: '❌ Failed to fetch moderation history.',
          flags: 64
        });
      }
    }

    // Default fallback
    return interaction.reply({
      content: 'Unknown moderation action or missing arguments.',
      flags: 64
    });
  }
};