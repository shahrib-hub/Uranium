// src/commands/Economy/eco-admin.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  getBalance,
  setBalance,
  addWallet,
  resetUserEconomy,
  wipeEverything,
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
    .setName('ecoadmin')
    .setDescription('Owner-only economy admin and configuration tools')
    .setDMPermission(false)
    .addSubcommand(sc =>
      sc.setName('give')
        .setDescription('Force give Atoms to a user (wallet)')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true))
    )
    .addSubcommand(sc =>
      sc.setName('set-balance')
        .setDescription('Set exact wallet & bank for a user')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
        .addIntegerOption(o => o.setName('wallet').setDescription('Wallet').setRequired(true))
        .addIntegerOption(o => o.setName('bank').setDescription('Bank').setRequired(true))
    )
    .addSubcommand(sc =>
      sc.setName('reset-user')
        .setDescription("Hard reset a user's economy")
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    )
    .addSubcommand(sc =>
      sc.setName('wipe-all')
        .setDescription('WIPE ALL ECONOMY DATA (no joke)')
    )
    .addSubcommand(sc =>
      sc.setName('status')
        .setDescription('Show current global economy configuration status')
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
            .setDescription('Multiplier (e.g. 1.0, 1.5, 2.0)')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ Owner-only command.', flags: 64 });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'give') {
      const user = interaction.options.getUser('user', true);
      const amount = interaction.options.getInteger('amount', true);
      await addWallet(user.id, amount);

      const bal = await getBalance(user.id);
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Forced Give')
        .setDescription(`Gave \`${amount.toLocaleString()}\` Atoms to ${user}.\nNew wallet: \`${bal.wallet.toLocaleString()}\`.`);

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === 'set-balance') {
      const user = interaction.options.getUser('user', true);
      const wallet = interaction.options.getInteger('wallet', true);
      const bank = interaction.options.getInteger('bank', true);

      await setBalance(user.id, { wallet, bank });

      const embed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle('⚙️ Balance Set')
        .setDescription(`Set ${user}'s wallet to \`${wallet.toLocaleString()}\` and bank to \`${bank.toLocaleString()}\`.`);

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === 'reset-user') {
      const user = interaction.options.getUser('user', true);
      await resetUserEconomy(user.id);

      return interaction.reply({
        content: `✅ Reset economy data for ${user}.`,
        flags: 64
      });
    }

    if (sub === 'wipe-all') {
      await wipeEverything();
      return interaction.reply({
        content: '💀 All economy data wiped.',
        flags: 64
      });
    }

    if (sub === 'status') {
      const disabled = await getGlobalEconomyDisabled();
      const mult = Number(await getMeta('eco_multiplier') || '1') || 1;

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('💼 Economy Global Configuration')
        .addFields(
          { name: 'System Status', value: disabled ? '🔴 Disabled' : '🟢 Active', inline: true },
          { name: 'Global Multiplier', value: `\`${mult}x\``, inline: true }
        );

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === 'toggle-global') {
      const disabled = interaction.options.getBoolean('disabled', true);
      await setGlobalEconomyDisabled(disabled);

      return interaction.reply({
        content: `✅ Global economy system is now **${disabled ? 'DISABLED' : 'ENABLED'}**.`,
        flags: 64
      });
    }

    if (sub === 'set-multiplier') {
      const value = interaction.options.getNumber('value', true);
      await setMeta('eco_multiplier', String(value));

      return interaction.reply({
        content: `✅ Global economy earning multiplier set to **${value}x**.`,
        flags: 64
      });
    }
  }
};