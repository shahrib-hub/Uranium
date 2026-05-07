const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { add, list, remove } = require('../../utils/socialDb');
const { isPremiumGuild } = require('../../utils/premium');
const embeds = require('../../components/socialEmbeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notificationtesting')
    .setDescription('testing will not work')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(sc =>
      sc
        .setName('add')
        .setDescription('Add a social notification')
        .addStringOption(o =>
          o
            .setName('platform')
            .setDescription('Select the platform')
            .setRequired(true)
            .addChoices(
              { name: 'YouTube', value: 'youtube' },
              { name: 'Twitch', value: 'twitch' }
            )
        )
        .addStringOption(o =>
          o
            .setName('source')
            .setDescription('YouTube Channel ID / URL or Twitch username')
            .setRequired(true)
        )
        .addChannelOption(o =>
          o
            .setName('channel')
            .setDescription('Channel where notifications will be sent')
            .setRequired(true)
        )
        .addStringOption(o =>
          o
            .setName('message')
            .setDescription('Custom notification message')
            .setRequired(true)
        )
    )

    .addSubcommand(sc =>
      sc
        .setName('remove')
        .setDescription('Remove a notification setup')
        .addIntegerOption(o =>
          o
            .setName('id')
            .setDescription('Notification ID')
            .setRequired(true)
        )
    )

    .addSubcommand(sc =>
      sc
        .setName('list')
        .setDescription('List all configured notifications')
    )

    .addSubcommand(sc =>
      sc
        .setName('dashboard')
        .setDescription('View notification system status')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    const premium = isPremiumGuild(guildId);
    const rows = await list(guildId);

    const limits = premium ? 5 : 1;
    const cooldown = premium ? 60 * 60 * 1000 : 12 * 60 * 60 * 1000;

    if (sub === 'add') {
      const platform = interaction.options.getString('platform');
      const count = rows.filter(r => r.platform === platform).length;

      if (count >= limits) {
        return interaction.reply({
          content: `❌ You’ve reached the **${platform.toUpperCase()}** notification limit (${limits}).`,
          flags: 64
        });
      }

      await add({
        guildId,
        platform,
        source: interaction.options.getString('source'),
        notifyChannelId: interaction.options.getChannel('channel').id,
        message: interaction.options.getString('message'),
        cooldown
      });

      return interaction.reply({
        content: '✅ Notification added successfully.',
        flags: 64
      });
    }

    if (sub === 'remove') {
      await remove(interaction.options.getInteger('id'), guildId);
      return interaction.reply({
        content: '🗑️ Notification removed.',
        flags: 64
      });
    }

    if (sub === 'list' || sub === 'dashboard') {
      const embed = embeds.dashboard(rows, premium);
      return interaction.reply({
        embeds: [embed],
        ephemeral: sub === 'list'
      });
    }
  }
};
