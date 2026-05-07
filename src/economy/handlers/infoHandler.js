// src/economy/handlers/infoHandler.js
const { getBalance, getStats, getInventory, getLeaderboard, getCosmetics, bumpStat } = require('../../utils/economyStorage');
const { getBankTier, getBankLimit } = require('../helpers');
const { balanceEmbed, profileEmbed, inventoryEmbed, leaderboardEmbed, errorEmbed } = require('../embeds');
const { inventoryItemSelect, inventoryPaginationButtons, progressButtons } = require('../components');
const { getUserLevel } = require('../levelSystem');
const { findItem, getShopData } = require('../items');
const { progressBar } = require('../rng');
const { EmbedBuilder } = require('discord.js');
const { RARITIES } = require('../constants');

module.exports = {
  async balance(interaction) {
    const target = interaction.options?.getUser?.('user') || interaction.user;
    const balance = await getBalance(target.id);
    const bankTier = await getBankTier(target.id);
    const bankLimit = await getBankLimit(target.id);
    const lvl = await getUserLevel(target.id);
    const embed = balanceEmbed(target, balance, bankTier, bankLimit, lvl.level, lvl.prestige);
    return interaction.reply({ embeds: [embed] });
  },

  async profile(interaction) {
    const target = interaction.options?.getUser?.('user') || interaction.user;
    const balance = await getBalance(target.id);
    const stats = await getStats(target.id);
    const cosmetics = await getCosmetics(target.id);
    const bankTier = await getBankTier(target.id);
    const bankLimit = await getBankLimit(target.id);
    const levelInfo = await getUserLevel(target.id);
    const embed = profileEmbed(target, balance, stats, cosmetics, bankTier, bankLimit, levelInfo);
    return interaction.reply({ embeds: [embed] });
  },

  async inventory(interaction) {
    const target = interaction.options?.getUser?.('user') || interaction.user;
    const inv = await getInventory(target.id);
    const shopData = getShopData();
    const index = {};
    for (const cat of shopData.categories) for (const item of cat.items) index[item.id] = item;

    const perPage = 10;
    const totalPages = Math.max(1, Math.ceil(inv.length / perPage));
    const page = 0;
    const pageItems = inv.slice(0, perPage);

    const embed = inventoryEmbed(target, pageItems, index, page, totalPages);
    const components = [];
    if (target.id === interaction.user.id) {
      const sel = inventoryItemSelect(inv, index);
      if (sel) components.push(sel);
    }
    if (totalPages > 1) components.push(inventoryPaginationButtons(page, totalPages));

    return interaction.reply({ embeds: [embed], components });
  },

  async leaderboard(interaction) {
    try {
      await interaction.deferReply();
      const type = interaction.options?.getString?.('type') || 'net';
      const entries = await getLeaderboard(type, 10);
      const userCache = new Map();
      for (const row of entries) {
        try {
          const user = await interaction.client.users.fetch(row.userId).catch(() => null);
          if (user) userCache.set(row.userId, user);
        } catch (_) {}
      }
      const embed = leaderboardEmbed(type, entries, userCache);
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[eco leaderboard]', err);
      const method = interaction.deferred ? 'editReply' : 'reply';
      await interaction[method]({ embeds: [errorEmbed('Failed to load leaderboard.')], flags: 64 }).catch(() => {});
    }
  },

  async stats(interaction) {
    const target = interaction.options?.getUser?.('user') || interaction.user;
    const stats = await getStats(target.id);
    const lvl = await getUserLevel(target.id);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setAuthor({ name: `${target.username}'s Stats`, iconURL: target.displayAvatarURL({ size: 128 }) })
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '⭐ Level', value: `\`${lvl.level}\``, inline: true },
        { name: '🧪 Total XP', value: `\`${lvl.totalXP.toLocaleString()}\``, inline: true },
        { name: '✨ Prestige', value: `\`${lvl.prestige}\``, inline: true },
        { name: '📊 Commands Used', value: `\`${stats.commands_used || 0}\``, inline: true },
        { name: '💸 Money Earned', value: `\`${(stats.money_earned || 0).toLocaleString()}\``, inline: true },
        { name: '💸 Money Spent', value: `\`${(stats.money_spent || 0).toLocaleString()}\``, inline: true },
        { name: '🎲 Games Played', value: `\`${stats.games_played || 0}\``, inline: true },
        { name: '💼 Work Done', value: `\`${stats.work_used || 0}\``, inline: true },
        { name: '🔫 Crimes', value: `✅ ${stats.crime_success || 0} / ❌ ${stats.crime_fail || 0}`, inline: true },
        { name: '🎯 Hunts', value: `\`${stats.hunt_used || 0}\``, inline: true },
        { name: '🐟 Fish Caught', value: `\`${stats.fish_used || 0}\``, inline: true },
        { name: '🔥 Daily Streak', value: `\`${stats.daily_streak || 0}\``, inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  },

  async level(interaction) {
    const target = interaction.options?.getUser?.('user') || interaction.user;
    const lvl = await getUserLevel(target.id);
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setAuthor({ name: `${target.username}'s Level`, iconURL: target.displayAvatarURL({ size: 128 }) })
      .setDescription([
        `⭐ **Level:** \`${lvl.level}\` / \`100\``,
        `🧪 **XP:** ${progressBar(lvl.currentXP, lvl.nextLevelXP, 12)}`,
        `📊 **XP Progress:** \`${lvl.currentXP.toLocaleString()} / ${lvl.nextLevelXP.toLocaleString()}\``,
        `✨ **Prestige:** \`${lvl.prestige}\` (${((lvl.multiplier - 1) * 100).toFixed(0)}% bonus)`,
        `⚛️ **Total XP:** \`${lvl.totalXP.toLocaleString()}\``
      ].join('\n'));
    const row = progressButtons();
    return interaction.reply({ embeds: [embed], components: [row] });
  }
};
