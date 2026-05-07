// src/commands/Economy/ecoconfig.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  getGlobalEconomyDisabled,
  setGlobalEconomyDisabled,
  getMeta,
  setMeta
} = require('../../utils/economyStorage');

const OWNER_IDS = (process.env.BOT_OWNER_IDS || '835826354515214336')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);


module.exports = {
  devOnly: true,
    
  data: new SlashCommandBuilder()
    .setName('ecoconfig')
    .setDescription('Developer economy config (dev guild only)')
    .setDMPermission(false)
    .addSubcommand(sc =>
      sc.setName('status')
        .setDescription('Show current economy config status')
    )
    .addSubcommand(sc =>
      sc.setName('toggle-global')
        .setDescription('Enable/disable global economy system')
        .addBooleanOption(o =>
          o.setName('disabled')
            .setDescription('Whether to disable economy globally')
            .setRequired(true)
        )
    )
    .addSubcommand(sc =>
      sc.setName('set-multiplier')
        .setDescription('Set a global earning multiplier')
        .addNumberOption(o =>
          o.setName('value')
            .setDescription('Multiplier (e.g., 1.0, 1.5, 2.0)')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ Owner-only command.', flags: 64 });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const disabled = await getGlobalEconomyDisabled();
      const mult = Number(await getMeta('eco_multiplier') || '1') || 1;

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('💼 Economy Config Status')
        .addFields(
          { name: 'Global Disabled', value: disabled ? '✅ Yes' : '❌ No', inline: true },
          { name: 'Earning Multiplier', value: `x${mult.toFixed(2)}`, inline: true }
        );

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === 'toggle-global') {
      const disabled = interaction.options.getBoolean('disabled', true);
      await setGlobalEconomyDisabled(disabled);

      return interaction.reply({
        content: `✅ Global economy is now **${disabled ? 'DISABLED' : 'ENABLED'}**.`,
        flags: 64
      });
    }

    if (sub === 'set-multiplier') {
      const value = interaction.options.getNumber('value', true);
      if (value <= 0) {
        return interaction.reply({ content: '❌ Multiplier must be positive.', flags: 64 });
      }
      await setMeta('eco_multiplier', String(value));

      return interaction.reply({
        content: `✅ Global earning multiplier set to \`x${value.toFixed(2)}\`.`,
        flags: 64
      });
    }
  }
};
