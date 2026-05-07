// src/commands/Economy/economy.js — Uranium Economy Help v2.0
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { economyHelpSelect } = require('../../economy/components');

module.exports = {
  devOnly: false,
  data: new SlashCommandBuilder()
    .setName('economy')
    .setDescription('☢️ Economy help & overview')
    .addSubcommand(sc => sc.setName('help').setDescription('Show economy help menu')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub !== 'help') return interaction.reply({ content: '❌ Unknown subcommand.', flags: 64 });

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setTitle('☢️ URANIUM ECONOMY — Command Center')
      .setThumbnail(interaction.client.user.displayAvatarURL({ size: 512 }))
      .setDescription([
        '> *The most addictive economy system on Discord.*',
        '',
        '**Select a category below** to see detailed commands.',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '⚛️ **Earning** — Daily, work, crime, beg, search',
        '🎒 **Items & Shop** — 55+ items across 8 categories',
        '🗺️ **Adventures** — 6 zones with unique loot',
        '🎲 **Gambling** — Slots, blackjack, crash & more',
        '📊 **Progression** — Levels, XP, prestige system',
        '🏦 **Banking** — Deposit, withdraw, rob, transfer',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '⚡ **Quick Start:** `/eco earn daily` → `/eco earn work` → `/eco shop browse`',
        '🔥 **Pro Tip:** Daily streaks give up to **5x** bonus rewards!'
      ].join('\n'))
      .addFields(
        { name: '⭐ Leveling', value: 'Earn XP from every action.\nUnlock better jobs, zones & items!', inline: true },
        { name: '✨ Prestige', value: 'Reset at Lv.50 for permanent\nearning multipliers!', inline: true },
        { name: '🛡️ Protection', value: 'Buy padlocks & shields\nto protect from robbers!', inline: true }
      )
      .setFooter({ text: '☢️ Uranium Economy • Use the dropdown below to explore' })
      .setTimestamp();

    const row = economyHelpSelect();
    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
