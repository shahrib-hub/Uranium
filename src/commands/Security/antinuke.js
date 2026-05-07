const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');

const db = require('../../utils/antinukeDb');
const embeds = require('../../components/antinukeEmbeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('🛡️ Advanced server anti-nuke protection system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    /* ───────── CORE ───────── */
    .addSubcommand(sc =>
      sc.setName('enable')
        .setDescription('Enable anti-nuke protection for this server')
    )
    .addSubcommand(sc =>
      sc.setName('disable')
        .setDescription('Disable anti-nuke protection for this server')
    )
    .addSubcommand(sc =>
      sc.setName('dashboard')
        .setDescription('View the anti-nuke security dashboard')
    )

    /* ───────── PUNISHMENT ───────── */
    .addSubcommand(sc =>
      sc.setName('punishment')
        .setDescription('Set punishment for nuke attempts')
        .addStringOption(o =>
          o.setName('type')
            .setDescription('Punishment to apply to the attacker')
            .setRequired(true)
            .addChoices(
              { name: 'Ban user', value: 'ban' },
              { name: 'Kick user', value: 'kick' },
              { name: 'Strip all roles', value: 'striproles' }
            )
        )
    )

    /* ───────── LIMITS ───────── */
    .addSubcommand(sc =>
      sc.setName('limits')
        .setDescription('Configure action limits for detection')
        .addIntegerOption(o =>
          o.setName('actions')
            .setDescription('Maximum destructive actions allowed before punishment')
            .setRequired(true)
            .setMinValue(1)
        )
    )

    /* ───────── AUTO RECOVERY ───────── */
    .addSubcommand(sc =>
      sc.setName('autorecovery')
        .setDescription('Enable or disable auto recovery')
        .addBooleanOption(o =>
          o.setName('enabled')
            .setDescription('Whether the bot should auto-restore deleted items')
            .setRequired(true)
        )
    )

    /* ───────── FEATURE TOGGLE ───────── */
    .addSubcommand(sc =>
      sc.setName('toggle')
        .setDescription('Enable or disable a specific protection feature')
        .addStringOption(o =>
          o.setName('feature')
            .setDescription('Protection module to toggle')
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
            .setDescription('Enable or disable the selected feature')
            .setRequired(true)
        )
    )

    /* ───────── WHITELIST ───────── */
    .addSubcommandGroup(g =>
      g.setName('whitelist')
        .setDescription('Manage anti-nuke whitelist')
        .addSubcommand(sc =>
          sc.setName('add')
            .setDescription('Add a trusted user to the whitelist')
            .addUserOption(o =>
              o.setName('user')
                .setDescription('User to whitelist')
                .setRequired(true)
            )
        )
        .addSubcommand(sc =>
          sc.setName('remove')
            .setDescription('Remove a user from the whitelist')
            .addUserOption(o =>
              o.setName('user')
                .setDescription('User to remove from whitelist')
                .setRequired(true)
            )
        )
        .addSubcommand(sc =>
          sc.setName('list')
            .setDescription('View all whitelisted users')
        )
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup(false);

    /* ───────── CORE ───────── */

    if (sub === 'enable') {
      await db.setEnabled(guildId, true);
      return interaction.reply({
        embeds: [embeds.success('🛡️ Anti-nuke protection enabled for this server.')]
      });
    }

    if (sub === 'disable') {
      await db.setEnabled(guildId, false);
      return interaction.reply({
        embeds: [embeds.error('Anti-nuke protection has been disabled.')]
      });
    }

    if (sub === 'dashboard') {
      const config = await db.getFullConfig(guildId);
      return interaction.reply({
        embeds: [embeds.dashboard(config)],
        flags: 64
      });
    }

    /* ───────── SETTINGS ───────── */

    if (sub === 'punishment') {
      const type = interaction.options.getString('type');
      await db.setPunishment(guildId, type);

      return interaction.reply({
        embeds: [embeds.success(`Punishment updated to **${type.toUpperCase()}**`)]
      });
    }

    if (sub === 'limits') {
      const actions = interaction.options.getInteger('actions');
      await db.setActionLimit(guildId, actions);

      return interaction.reply({
        embeds: [embeds.success(`Action limit set to **${actions}** actions.`)]
      });
    }

    if (sub === 'autorecovery') {
      const enabled = interaction.options.getBoolean('enabled');
      await db.setAutoRecovery(guildId, enabled);

      return interaction.reply({
        embeds: [
          enabled
            ? embeds.success('Auto-recovery enabled.')
            : embeds.error('Auto-recovery disabled.')
        ]
      });
    }

    if (sub === 'toggle') {
      const feature = interaction.options.getString('feature');
      const enabled = interaction.options.getBoolean('enabled');

      await db.setFeature(guildId, feature, enabled);

      return interaction.reply({
        embeds: [
          embeds.toggle(feature, enabled)
        ]
      });
    }

    /* ───────── WHITELIST ───────── */

    if (group === 'whitelist') {
      const user = interaction.options.getUser('user');

      if (sub === 'add') {
        await db.addWhitelist(guildId, user.id);
        return interaction.reply({
          embeds: [embeds.success(`${user.tag} has been whitelisted.`)]
        });
      }

      if (sub === 'remove') {
        await db.removeWhitelist(guildId, user.id);
        return interaction.reply({
          embeds: [embeds.error(`${user.tag} removed from whitelist.`)]
        });
      }

      if (sub === 'list') {
        const users = await db.listWhitelist(guildId);
        return interaction.reply({
          embeds: [embeds.whitelist(users)],
          flags: 64
        });
      }
    }
  }
};