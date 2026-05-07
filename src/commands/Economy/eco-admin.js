// src/commands/Economy/ecoadmin.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  getBalance,
  setBalance,
  addWallet,
  addBank,
  resetUserEconomy,
  wipeEverything
} = require('../../utils/economyStorage');

const OWNER_IDS = (process.env.BOT_OWNER_IDS || '835826354515214336')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

module.exports = {
  devOnly: true, // 👈 IMPORTANT: part of the main export

  data: new SlashCommandBuilder()
    .setName('ecoadmin')
    .setDescription('Owner-only economy admin tools')
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
  }
};