// src/commands/AFK/afk.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} = require('discord.js');
const afkStorage = require('../../utils/afkStorage');
const { makeInfoEmbed, clamp } = require('../../utils/afkHelpers');

const MAX_REASON_LEN = 300;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Manage AFK status')
    .addSubcommand(sc =>
      sc
        .setName('set')
        .setDescription('Set yourself as AFK with optional reason')
        .addStringOption(o =>
          o.setName('reason')
            .setDescription('Why are you AFK?')
            .setMaxLength(MAX_REASON_LEN)
        )
        .addBooleanOption(o =>
          o.setName('hidestatus')
            .setDescription('Hide presence change while AFK')
        )
    )
    .addSubcommand(sc =>
      sc
        .setName('remove')
        .setDescription('Remove your AFK status')
    )
    .addSubcommand(sc =>
      sc
        .setName('info')
        .setDescription('Show AFK info for a user')
        .addUserOption(o =>
          o.setName('user')
            .setDescription('User to check (defaults to you)')
        )
    )
    .addSubcommand(sc =>
      sc
        .setName('list')
        .setDescription('List AFK users in this guild')
        .addIntegerOption(o =>
          o.setName('page')
            .setDescription('Page number')
            .setMinValue(1)
        )
    )
    .addSubcommandGroup(g =>
      g
        .setName('config')
        .setDescription('Guild AFK configuration')
        .addSubcommand(sc =>
          sc
            .setName('enable')
            .setDescription('Enable AFK auto-replies (Manage Guild)')
        )
        .addSubcommand(sc =>
          sc
            .setName('disable')
            .setDescription('Disable AFK auto-replies (Manage Guild)')
        )
        .addSubcommand(sc =>
          sc
            .setName('cooldown')
            .setDescription('Set AFK mention cooldown seconds (Manage Guild)')
            .addIntegerOption(o =>
              o.setName('seconds')
                .setDescription('Cooldown in seconds (1–600)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(600)
            )
        )
        // <-- FIX: required 'action' must come before optional 'channel'
        .addSubcommand(sc =>
          sc
            .setName('ignore-channel')
            .setDescription('Manage channels where AFK auto-replies are suppressed')
            .addStringOption(o =>
              o.setName('action')
                .setDescription('add | remove | list')
                .setRequired(true)
                .addChoices(
                  { name: 'add', value: 'add' },
                  { name: 'remove', value: 'remove' },
                  { name: 'list', value: 'list' }
                )
            )
            .addChannelOption(o =>
              o.setName('channel')
                .setDescription('Channel to add/remove or list from')
                .addChannelTypes(
                  ChannelType.GuildText,
                  ChannelType.GuildAnnouncement,
                  ChannelType.PublicThread,
                  ChannelType.PrivateThread
                )
            )
        )
    )
    .addSubcommand(sc =>
      sc
        .setName('pingcheck')
        .setDescription('Quickly ping-check a user AFK record')
        .addUserOption(o =>
          o.setName('user').setDescription('User to check').setRequired(true)
        )
    ),

  async execute(interaction) {
    // safe getSubcommand / getSubcommandGroup
    let sub = null;
    let group = null;
    try {
      sub = interaction.options.getSubcommand();
    } catch {
      sub = null;
    }
    try {
      group = interaction.options.getSubcommandGroup();
    } catch {
      group = null;
    }

    const member = interaction.member;

    try {
      // AFK set
      if (sub === 'set') {
        await interaction.deferReply({ flags: 64 });
        const reason = interaction.options.getString('reason') || null;
        const hideStatus = interaction.options.getBoolean('hidestatus') || false;

        await afkStorage.setAfk(interaction.guild.id, interaction.user.id, reason, Date.now(), hideStatus);

        const extras = reason ? ` Reason: "${reason}"` : '';
        return interaction.editReply(`You are now AFK.${extras}`);
      }

      // AFK remove
      if (sub === 'remove') {
        await interaction.deferReply({ flags: 64 });
        await afkStorage.removeAfk(interaction.guild.id, interaction.user.id);
        return interaction.editReply('AFK status removed. Welcome back!');
      }

      // AFK info
      if (sub === 'info') {
        await interaction.deferReply({ flags: 64 });
        const user = interaction.options.getUser('user') || interaction.user;
        const afk = await afkStorage.getAfk(interaction.guild.id, user.id);
        if (!afk) {
          return interaction.editReply(`No AFK record for <@${user.id}>.`);
        }
        const embed = makeInfoEmbed({
          afkUserId: user.id,
          reason: afk.reason,
          startTimestamp: afk.startTimestamp,
          notifiedCount: afk.notifiedCount || 0
        });
        return interaction.editReply({ embeds: [embed] });
      }

      // AFK list
      if (sub === 'list') {
        await interaction.deferReply({ flags: 64 });
        const page = clamp(interaction.options.getInteger('page') || 1, 1, 1000);
        const records = await afkStorage.listAfk(interaction.guild.id, page, 10);
        if (!records.length) {
          return interaction.editReply('No users are currently AFK in this guild.');
        }
        const lines = records.map(r => {
          const since = Math.floor(r.startTimestamp / 1000);
          const reason = r.reason ? ` — ${r.reason}` : '';
          return `• <@${r.userId}> — since <t:${since}:R>${reason}`;
        });
        return interaction.editReply(`AFK users (page ${page}):\n${lines.join('\n')}`);
      }

      // Config group — runtime permission check with clear error message
      if (group === 'config') {
        const hasPerm = member.permissions.has(PermissionFlagsBits.ManageGuild);
        if (!hasPerm) {
          // Clear, helpful ephemeral embed for unauthorized users
          const errEmbed = new EmbedBuilder()
            .setTitle('⛔ Permission denied')
            .setDescription('You need the **Manage Server** (Manage Guild) permission to change AFK configuration.')
            .addFields(
              { name: 'What to do', value: 'Ask a server admin to run this command, or grant you Manage Server permission.' }
            )
            .setColor(0xED4245);
          return interaction.reply({ embeds: [errEmbed], flags: 64 });
        }

        await interaction.deferReply({ flags: 64 });

        if (sub === 'enable') {
          await afkStorage.setGuildConfig(interaction.guild.id, { enabled: true });
          return interaction.editReply('AFK auto-replies enabled for this guild.');
        }

        if (sub === 'disable') {
          await afkStorage.setGuildConfig(interaction.guild.id, { enabled: false });
          return interaction.editReply('AFK auto-replies disabled for this guild.');
        }

        if (sub === 'cooldown') {
          const seconds = interaction.options.getInteger('seconds');
          // builder enforces range; still clamp defensively
          const clamped = clamp(seconds || 30, 1, 600);
          await afkStorage.setGuildConfig(interaction.guild.id, { cooldownSeconds: clamped });
          return interaction.editReply(`AFK mention cooldown set to ${clamped}s.`);
        }

        if (sub === 'ignore-channel') {
          const action = interaction.options.getString('action', true);
          const channel = interaction.options.getChannel('channel');

          if (action === 'list') {
            const ids = await afkStorage.listIgnoredChannels(interaction.guild.id);
            if (!ids.length) return interaction.editReply('No ignored channels configured.');
            return interaction.editReply(`Ignored channels:\n${ids.map(id => `<#${id}>`).join('\n')}`);
          }

          if (!channel) {
            return interaction.editReply('You must specify a channel for add/remove.');
          }

          if (action === 'add') {
            await afkStorage.addIgnoredChannel(interaction.guild.id, channel.id);
            return interaction.editReply(`Added <#${channel.id}> to ignored channels.`);
          } else if (action === 'remove') {
            await afkStorage.removeIgnoredChannel(interaction.guild.id, channel.id);
            return interaction.editReply(`Removed <#${channel.id}> from ignored channels.`);
          } else {
            return interaction.editReply('Unknown action. Use add, remove, or list.');
          }
        }
      }

      // pingcheck
      if (sub === 'pingcheck') {
        await interaction.deferReply({ flags: 64 });
        const user = interaction.options.getUser('user');
        const afk = await afkStorage.getAfk(interaction.guild.id, user.id);
        if (!afk) return interaction.editReply(`No AFK record for <@${user.id}>.`);
        const since = Math.floor(afk.startTimestamp / 1000);
        const reason = afk.reason ? `Reason: ${afk.reason}` : 'No reason';
        return interaction.editReply(`AFK: <@${user.id}> — ${reason} — since <t:${since}:R>`);
      }

      // fallback
      return interaction.reply({ content: 'Unknown AFK action or missing arguments.', flags: 64 });
    } catch (err) {
      console.error('[AFK command error]', err);

      // try to respond if we haven't already
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ content: 'Failed to process AFK command. Please try again.' });
        } else {
          await interaction.reply({ content: 'Failed to process AFK command. Please try again.', flags: 64 });
        }
      } catch (e) {
        // last resort: log
        console.error('[AFK reply error]', e);
      }
    }
  }
};