// src/commands/Moderation/join-ping.js
const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType
} = require('discord.js');

const joinPingStorage = require('../../utils/joinPingStorage');

function makeContainer(text) {
  const c = new ContainerBuilder();
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  return c;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join-ping')
    .setDescription('Configure your join ping system.')
    .addSubcommand(sc =>
      sc.setName('add')
        .setDescription('User will receive a ping in specified channel when joining.')
        .addChannelOption(o =>
          o.setName('channel')
            .setDescription('Channel to send pings in')
            .addChannelTypes(ChannelType.GuildAnnouncement, ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sc =>
      sc.setName('remove')
        .setDescription('Remove join pings for a specified channel.')
        .addChannelOption(o =>
          o.setName('channel')
            .setDescription('Channel to stop pinging')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .addSubcommand(sc =>
      sc.setName('disable')
        .setDescription('Disable ALL join pings for this guild (destructive).')
    )
    .addSubcommand(sc =>
      sc.setName('list')
        .setDescription('List configured join-ping channels for this guild.')
    ),

  async execute(interaction) {
    // require Administrator (keeps parity with your sample)
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'You **do not** have the permission to do that!', flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    await joinPingStorage.init?.();

    try {
      if (sub === 'add') {
        const channel = interaction.options.getChannel('channel', true);
        if (!channel.isTextBased?.()) {
          return interaction.reply({ content: 'Please provide a valid text channel.', flags: 64 });
        }

        const added = await joinPingStorage.addChannel(interaction.guild.id, channel.id);
        if (!added) {
          return interaction.reply({ content: `A join-ping already exists for ${channel}.`, flags: 64 });
        }

        const container = makeContainer(`**🔔 Join Ping System**\n\n# > Ping Added\n\n**• Ping Added**\n> ${channel} will now be pinged for new members.`);
        return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      if (sub === 'remove') {
        const channel = interaction.options.getChannel('channel', true);
        const exists = await joinPingStorage.hasChannel(interaction.guild.id, channel.id);
        if (!exists) {
          return interaction.reply({ content: `No join-ping configured for ${channel}.`, flags: 64 });
        }

        await joinPingStorage.removeChannel(interaction.guild.id, channel.id);
        const container = makeContainer(`**🔔 Join Ping System**\n\n# > Ping Removed\n\n**• Ping Removed**\n> ${channel} will no longer be pinged for new members.`);
        return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      if (sub === 'disable') {
        const pingdata = await joinPingStorage.listChannels(interaction.guild.id);
        if (!pingdata.length) {
          return interaction.reply({ content: 'There are no join-pings configured for this guild.', flags: 64 });
        }

        const container = makeContainer(`**🛠 Join Ping System**\n\n# > Danger: Remove ALL\n\nThis will remove **ALL** join-pings from this server. Confirm below to proceed.`);
        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('jp_confirm').setLabel('✅ Confirm').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('jp_cancel').setLabel('❌ Cancel').setStyle(ButtonStyle.Danger)
        );

        const msg = await interaction.reply({ components: [buttons], embeds: [], withResponse: true });
        const collector = msg.createMessageComponentCollector({ time: 30_000 });

        collector.on('collect', async i => {
          try {
            if (i.user.id !== interaction.user.id) {
              return i.reply({ content: 'You cannot use these buttons.', flags: 64 });
            }
            if (i.customId === 'jp_confirm') {
              await joinPingStorage.clearGuild(interaction.guild.id);
              await i.update({ content: '✅ All join-pings removed.', components: [] });
            } else {
              await i.update({ content: 'Operation cancelled.', components: [] });
            }
          } catch (err) {
            // minimal logging
            console.error('[join-ping cmd] button handler error', err);
            try { await i.update({ content: 'An error occurred.', components: [] }); } catch {}
          } finally {
            collector.stop();
          }
        });

        collector.on('end', () => {
          try { if (!msg.deleted) msg.edit?.({ components: [] }).catch(()=>{}); } catch {}
        });

        return;
      }

      if (sub === 'list') {
        const rows = await joinPingStorage.listChannels(interaction.guild.id);
        if (!rows.length) {
          return interaction.reply({ content: 'No join-pings configured for this guild.', flags: 64 });
        }

        const lines = rows.map(r => `• <#${r.channelId}> — configured ${new Date(r.createdAt).toLocaleString()}`);
        const container = makeContainer(`**🔔 Join Ping System — configured channels**\n\n${lines.join('\n')}`);
        return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      return interaction.reply({ content: 'Unknown subcommand', flags: 64 });
    } catch (err) {
      console.error('[join-ping cmd] error', err);
      if (!interaction.replied) {
        return interaction.reply({ content: 'Internal error occurred.', flags: 64 });
      }
    }
  }
};