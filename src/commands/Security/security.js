// src/commands/Security/security.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');

const db = require('../../utils/antinukeDb');
const antinukeEmbeds = require('../../components/antinukeEmbeds');
const securityStore = require('../../utils/securityStorage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('security')
    .setDescription('🛡️ Enterprise server security — Anti-Nuke, Panic Lockdown, Quarantine & Whitelist')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // GROUP: ANTINUKE
    .addSubcommandGroup(g =>
      g.setName('antinuke')
        .setDescription('Anti-nuke protection engine and thresholds')
        .addSubcommand(s => s.setName('enable').setDescription('Enable anti-nuke protection for this server'))
        .addSubcommand(s => s.setName('disable').setDescription('Disable anti-nuke protection for this server'))
        .addSubcommand(s => s.setName('status').setDescription('View the anti-nuke security dashboard'))
        .addSubcommand(s =>
          s.setName('punishment')
            .setDescription('Set punishment applied to nuke attackers')
            .addStringOption(o =>
              o.setName('type')
                .setDescription('Punishment type')
                .setRequired(true)
                .addChoices(
                  { name: 'Ban user', value: 'ban' },
                  { name: 'Kick user', value: 'kick' },
                  { name: 'Strip all roles', value: 'striproles' }
                )
            )
        )
        .addSubcommand(s =>
          s.setName('limits')
            .setDescription('Configure action limits for detection')
            .addIntegerOption(o =>
              o.setName('actions')
                .setDescription('Maximum destructive actions allowed before punishment')
                .setRequired(true)
                .setMinValue(1)
            )
        )
        .addSubcommand(s =>
          s.setName('autorecovery')
            .setDescription('Toggle automatic restoration of deleted channels/roles')
            .addBooleanOption(o =>
              o.setName('enabled')
                .setDescription('Whether the bot should auto-restore deleted items')
                .setRequired(true)
            )
        )
        .addSubcommand(s =>
          s.setName('toggle')
            .setDescription('Enable or disable a specific protection module')
            .addStringOption(o =>
              o.setName('feature')
                .setDescription('Module to toggle')
                .setRequired(true)
                .addChoices(
                  { name: 'Anti Ban', value: 'antiban' },
                  { name: 'Anti Kick', value: 'antikick' },
                  { name: 'Anti Bot', value: 'antibot' },
                  { name: 'Anti Channel', value: 'antichannel' },
                  { name: 'Anti Role', value: 'antirole' },
                  { name: 'Anti Emoji', value: 'antiemoji' },
                  { name: 'Anti Webhook', value: 'antiwebhook' },
                  { name: 'Anti Prune', value: 'antiprune' }
                )
            )
            .addBooleanOption(o =>
              o.setName('enabled')
                .setDescription('Enable or disable feature')
                .setRequired(true)
            )
        )
    )

    // GROUP: WHITELIST
    .addSubcommandGroup(g =>
      g.setName('whitelist')
        .setDescription('Manage trusted admins/bots exempt from anti-nuke triggers')
        .addSubcommand(s =>
          s.setName('add')
            .setDescription('Add a trusted user to the whitelist')
            .addUserOption(o => o.setName('user').setDescription('User to whitelist').setRequired(true))
        )
        .addSubcommand(s =>
          s.setName('remove')
            .setDescription('Remove a user from the whitelist')
            .addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true))
        )
        .addSubcommand(s =>
          s.setName('list')
            .setDescription('View all whitelisted users')
        )
    )

    // GROUP: LOCKDOWN
    .addSubcommandGroup(g =>
      g.setName('lockdown')
        .setDescription('Emergency channel and server-wide panic lockdown controls')
        .addSubcommand(s =>
          s.setName('channel')
            .setDescription('Lock or unlock a specific channel')
            .addStringOption(o =>
              o.setName('action')
                .setDescription('Action to take')
                .setRequired(true)
                .addChoices(
                  { name: 'Lock Channel', value: 'lock' },
                  { name: 'Unlock Channel', value: 'unlock' }
                )
            )
            .addChannelOption(o => o.setName('target').setDescription('Channel to lock (defaults to current)'))
            .addStringOption(o => o.setName('reason').setDescription('Reason for lockdown'))
        )
        .addSubcommand(s =>
          s.setName('panic')
            .setDescription('🚨 SERVER-WIDE PANIC: Lock all public channels immediately to stop raids')
            .addStringOption(o => o.setName('reason').setDescription('Reason for server panic lockdown'))
        )
        .addSubcommand(s =>
          s.setName('release')
            .setDescription('🔓 Release server-wide panic lockdown and restore channels')
        )
    )

    // GROUP: QUARANTINE
    .addSubcommandGroup(g =>
      g.setName('quarantine')
        .setDescription('Isolate suspicious raid accounts with automatic role backup and restoration')
        .addSubcommand(s =>
          s.setName('setup')
            .setDescription('Configure quarantine role and isolation channel')
            .addRoleOption(o => o.setName('role').setDescription('Role with zero channel permissions').setRequired(true))
            .addChannelOption(o => o.setName('channel').setDescription('Isolation review channel (optional)'))
        )
        .addSubcommand(s =>
          s.setName('isolate')
            .setDescription('Instantly isolate a user, strip their roles, and assign quarantine role')
            .addUserOption(o => o.setName('user').setDescription('Target user to quarantine').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason for quarantine'))
        )
        .addSubcommand(s =>
          s.setName('release')
            .setDescription('Release a member from quarantine and automatically restore their original roles')
            .addUserOption(o => o.setName('user').setDescription('Target user to release').setRequired(true))
        )
        .addSubcommand(s =>
          s.setName('status')
            .setDescription('Check server quarantine configuration')
        )
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    try {
      // ══════════════════════════════════════════════
      // GROUP: ANTINUKE
      // ══════════════════════════════════════════════
      if (group === 'antinuke') {
        if (sub === 'enable') {
          await db.setEnabled(guildId, true);
          return interaction.reply({
            embeds: [antinukeEmbeds.success('🛡️ Anti-nuke protection enabled for this server.')]
          });
        }

        if (sub === 'disable') {
          await db.setEnabled(guildId, false);
          return interaction.reply({
            embeds: [antinukeEmbeds.error('Anti-nuke protection has been disabled.')]
          });
        }

        if (sub === 'status') {
          const config = await db.getFullConfig(guildId);
          return interaction.reply({
            embeds: [antinukeEmbeds.dashboard(config)],
            flags: 64
          });
        }

        if (sub === 'punishment') {
          const type = interaction.options.getString('type', true);
          await db.setPunishment(guildId, type);
          return interaction.reply({
            embeds: [antinukeEmbeds.success(`Punishment updated to **${type.toUpperCase()}**`)]
          });
        }

        if (sub === 'limits') {
          const actions = interaction.options.getInteger('actions', true);
          await db.setActionLimit(guildId, actions);
          return interaction.reply({
            embeds: [antinukeEmbeds.success(`Action limit set to **${actions}** actions.`)]
          });
        }

        if (sub === 'autorecovery') {
          const enabled = interaction.options.getBoolean('enabled', true);
          await db.setAutoRecovery(guildId, enabled);
          return interaction.reply({
            embeds: [enabled ? antinukeEmbeds.success('Auto-recovery enabled.') : antinukeEmbeds.error('Auto-recovery disabled.')]
          });
        }

        if (sub === 'toggle') {
          const feature = interaction.options.getString('feature', true);
          const enabled = interaction.options.getBoolean('enabled', true);
          await db.setFeature(guildId, feature, enabled);
          return interaction.reply({
            embeds: [antinukeEmbeds.toggle(feature, enabled)]
          });
        }
      }

      // ══════════════════════════════════════════════
      // GROUP: WHITELIST
      // ══════════════════════════════════════════════
      if (group === 'whitelist') {
        const user = interaction.options.getUser('user');

        if (sub === 'add') {
          await db.addWhitelist(guildId, user.id);
          return interaction.reply({
            embeds: [antinukeEmbeds.success(`🛡️ **${user.tag}** has been added to the anti-nuke whitelist.`)]
          });
        }

        if (sub === 'remove') {
          await db.removeWhitelist(guildId, user.id);
          return interaction.reply({
            embeds: [antinukeEmbeds.error(`❌ **${user.tag}** was removed from the anti-nuke whitelist.`)]
          });
        }

        if (sub === 'list') {
          const users = await db.listWhitelist(guildId);
          return interaction.reply({
            embeds: [antinukeEmbeds.whitelist(users)],
            flags: 64
          });
        }
      }

      // ══════════════════════════════════════════════
      // GROUP: LOCKDOWN
      // ══════════════════════════════════════════════
      if (group === 'lockdown') {
        if (sub === 'channel') {
          const action = interaction.options.getString('action', true);
          const target = interaction.options.getChannel('target') || interaction.channel;
          const reason = interaction.options.getString('reason') || 'Channel lockdown operation';

          if (action === 'lock') {
            await securityStore.lockSingleChannel(target, `[Lockdown by ${interaction.user.tag}] ${reason}`);
            const embed = new EmbedBuilder()
              .setTitle('🔒 Channel Locked')
              .setDescription(`Channel <#${target.id}> has been locked down.\nReason: *${reason}*`)
              .setColor(0xED4245)
              .setFooter({ text: `Action by ${interaction.user.tag}` })
              .setTimestamp();
            return interaction.reply({ embeds: [embed] });
          } else {
            await securityStore.unlockSingleChannel(target, `[Unlock by ${interaction.user.tag}] ${reason}`);
            const embed = new EmbedBuilder()
              .setTitle('🔓 Channel Unlocked')
              .setDescription(`Channel <#${target.id}> has been unlocked.`)
              .setColor(0x57F287)
              .setFooter({ text: `Action by ${interaction.user.tag}` })
              .setTimestamp();
            return interaction.reply({ embeds: [embed] });
          }
        }

        if (sub === 'panic') {
          await interaction.deferReply();
          const reason = interaction.options.getString('reason') || 'Emergency raid mitigation';
          const lockedChannels = await securityStore.triggerPanicLockdown(interaction.guild, `[PANIC LOCKDOWN by ${interaction.user.tag}] ${reason}`);

          const embed = new EmbedBuilder()
            .setTitle('🚨 SERVER PANIC LOCKDOWN ACTIVATED')
            .setDescription(`Emergency lockdown initiated by **${interaction.user.tag}**.\n\n**${lockedChannels.length}** channels have been locked down immediately to protect the server from active raids.\n\nTo lift this lockdown when safe, use: \`/security lockdown release\``)
            .setColor(0xFF0000)
            .addFields({ name: 'Reason', value: reason })
            .setTimestamp();

          return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'release') {
          await interaction.deferReply();
          const count = await securityStore.releasePanicLockdown(interaction.guild, `[Panic Release by ${interaction.user.tag}]`);

          const embed = new EmbedBuilder()
            .setTitle('🔓 Server Panic Lockdown Released')
            .setDescription(`Server-wide panic lockdown has been lifted.\nRestored write permissions to **${count}** channels.`)
            .setColor(0x57F287)
            .setFooter({ text: `Released by ${interaction.user.tag}` })
            .setTimestamp();

          return interaction.editReply({ embeds: [embed] });
        }
      }

      // ══════════════════════════════════════════════
      // GROUP: QUARANTINE
      // ══════════════════════════════════════════════
      if (group === 'quarantine') {
        if (sub === 'setup') {
          const role = interaction.options.getRole('role', true);
          const channel = interaction.options.getChannel('channel');

          await securityStore.updateSecurityConfig(guildId, {
            quarantineRoleId: role.id,
            quarantineChannelId: channel ? channel.id : null
          });

          const embed = new EmbedBuilder()
            .setTitle('☣️ Quarantine System Configured')
            .setDescription(`Quarantine role set to <@&${role.id}>${channel ? `\nIsolation channel: <#${channel.id}>` : ''}\n\nMembers placed in quarantine will have their roles saved, removed, and replaced with this role.`)
            .setColor(0xFEE75C)
            .setFooter({ text: 'Uranium Security Engine' });

          return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'isolate') {
          const targetUser = interaction.options.getUser('user', true);
          const reason = interaction.options.getString('reason') || 'Suspicious behavior quarantine';
          const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

          if (!member) {
            return interaction.reply({ content: '❌ Target user is not currently in this server.', flags: 64 });
          }

          if (member.id === interaction.user.id) {
            return interaction.reply({ content: '❌ You cannot quarantine yourself.', flags: 64 });
          }

          if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: '❌ You cannot quarantine someone with equal or higher roles than you.', flags: 64 });
          }

          await interaction.deferReply();
          try {
            const record = await securityStore.isolateMember(interaction.guild, member, reason, interaction.user.tag);
            const embed = new EmbedBuilder()
              .setTitle('☣️ Member Quarantined')
              .setDescription(`**${member.user.tag}** has been quarantined.\n\n• **Roles Stored:** ${record.savedRoleIds.length}\n• **Reason:** ${reason}\n• **Moderator:** ${interaction.user.tag}`)
              .setColor(0xED4245)
              .setThumbnail(member.user.displayAvatarURL())
              .setFooter({ text: 'To restore original roles, use /security quarantine release' })
              .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
          } catch (err) {
            return interaction.editReply(`❌ Quarantine failed: ${err.message}`);
          }
        }

        if (sub === 'release') {
          const targetUser = interaction.options.getUser('user', true);
          const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

          if (!member) {
            return interaction.reply({ content: '❌ Target user is not currently in this server.', flags: 64 });
          }

          await interaction.deferReply();
          try {
            const restored = await securityStore.releaseMember(interaction.guild, member, `Released by ${interaction.user.tag}`);
            const embed = new EmbedBuilder()
              .setTitle('✅ Quarantine Lifted')
              .setDescription(`**${member.user.tag}** has been released from quarantine.\n\nRestored **${restored.length}** original roles.`)
              .setColor(0x57F287)
              .setThumbnail(member.user.displayAvatarURL())
              .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
          } catch (err) {
            return interaction.editReply(`❌ Release failed: ${err.message}`);
          }
        }

        if (sub === 'status') {
          const config = await securityStore.getSecurityConfig(guildId);
          const embed = new EmbedBuilder()
            .setTitle('🛡️ Security & Quarantine Status')
            .addFields(
              { name: 'Quarantine Role', value: config.quarantineRoleId ? `<@&${config.quarantineRoleId}>` : '*Not configured*', inline: true },
              { name: 'Isolation Channel', value: config.quarantineChannelId ? `<#${config.quarantineChannelId}>` : '*Not configured*', inline: true },
              { name: 'Panic Lockdown Active', value: config.isPanicLockdown ? '🚨 **YES**' : 'No', inline: true },
              { name: 'Currently Locked Channels', value: `${config.lockedChannels?.length || 0}`, inline: true }
            )
            .setColor(config.isPanicLockdown ? 0xED4245 : 0x5865F2)
            .setFooter({ text: 'Uranium Security Engine' });

          return interaction.reply({ embeds: [embed], flags: 64 });
        }
      }

      return interaction.reply({ content: 'Subcommand not found.', flags: 64 });
    } catch (err) {
      console.error('security command error', err);
      if (!interaction.replied) return interaction.reply({ content: 'An internal error occurred.', flags: 64 });
    }
  }
};
