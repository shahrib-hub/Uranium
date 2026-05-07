// src/commands/Moderation/anti-ghostping.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const ghostStorage = require('../../utils/ghostStorage');

function makeEmbed(title, desc, color = 0x5865F2) {
  return new EmbedBuilder().setTitle(title).setDescription(desc).setColor(color);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anti-ghostping')
    .setDescription('Setup the anti ghost ping system')
    .addSubcommand(sc => sc.setName('setup').setDescription('Enable anti ghost ping (defaults: notify)'))
    .addSubcommand(sc => sc.setName('disable').setDescription('Disable anti ghost ping'))
    .addSubcommand(sc =>
      sc.setName('number-reset')
        .setDescription("Reset a user's ghost ping count")
        .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
    )
    .addSubcommand(sc =>
      sc.setName('config')
        .setDescription('Configure anti-ghostping behavior')
        .addStringOption(o => o.setName('action').setDescription('Action: none | notify | timeout').addChoices(
          { name: 'none', value: 'none' },
          { name: 'notify', value: 'notify' },
          { name: 'timeout', value: 'timeout' }
        ))
        .addIntegerOption(o => o.setName('timeout').setDescription('Timeout seconds (if action=timeout)').setMinValue(30).setMaxValue(604800))
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({ embeds: [makeEmbed('Permission denied', 'You need **Manage Server** to use this command.', 0xED4245)], flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    try {
      await ghostStorage.ensureDefaults(interaction.guild.id);

      if (sub === 'setup') {
        await ghostStorage.setEnabled(interaction.guild.id, true);
        return interaction.reply({ embeds: [makeEmbed('Anti-Ghostping', '✅ Anti-ghostping enabled (action: notify).')], flags: 64 });
      }

      if (sub === 'disable') {
        await ghostStorage.setEnabled(interaction.guild.id, false);
        return interaction.reply({ embeds: [makeEmbed('Anti-Ghostping', '✅ Anti-ghostping disabled.')], flags: 64 });
      }

      if (sub === 'number-reset') {
        const user = interaction.options.getUser('user', true);
        await ghostStorage.resetCount(interaction.guild.id, user.id);
        return interaction.reply({ embeds: [makeEmbed('Reset', `✅ ${user.tag}'s ghost ping count reset to 0.`)] , flags: 64 });
      }

      if (sub === 'config') {
        const action = interaction.options.getString('action');
        const timeout = interaction.options.getInteger('timeout');

        if (!action && typeof timeout !== 'number') {
          const cur = await ghostStorage.getSettings(interaction.guild.id);
          return interaction.reply({
            embeds: [makeEmbed('Anti-Ghostping config', `Enabled: ${cur.enabled ? '✅' : '❌'}\nAction: ${cur.action}\nTimeout (s): ${cur.timeoutSeconds}`)],
            flags: 64
          });
        }

        const cur = await ghostStorage.getSettings(interaction.guild.id);

        const newAction = action || cur.action;
        const newTimeout = typeof timeout === 'number' ? timeout : cur.timeoutSeconds;
        await ghostStorage.setAction(interaction.guild.id, newAction, newTimeout);

        return interaction.reply({ embeds: [makeEmbed('Anti-Ghostping config', `✅ Updated: action=${newAction}, timeout=${newTimeout}s`)], flags: 64 });
      }

      return interaction.reply({ embeds: [makeEmbed('Unknown', 'Unknown subcommand')], flags: 64 });
    } catch (err) {
      console.error('[anti-ghostping cmd] error', err);
      return interaction.reply({ embeds: [makeEmbed('Error', 'An internal error occurred.')], flags: 64 });
    }
  }
};