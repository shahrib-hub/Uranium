const { EmbedBuilder } = require('discord.js');
const { getBalance, getStats, getLeaderboard } = require('../../utils/economyStorage');
const { balanceEmbed, profileEmbed, inventoryEmbed, leaderboardEmbed, errorEmbed } = require('../embeds');
const { inventoryItemSelect, inventoryPaginationButtons, inventoryActionButtons, progressButtons } = require('../components');
const { getUserLevel } = require('../levelSystem');
const { getInventoryView, getBankTier, getBankLimit, getItemPrimaryAction } = require('../service');
const { progressBar } = require('../rng');
const { getRuntimeItem } = require('../runtimeItems');

const inventorySessions = new Map();

function getInventorySession(messageId) {
  return inventorySessions.get(messageId) || null;
}

function setInventorySession(messageId, session) {
  inventorySessions.set(messageId, { ...session, touchedAt: Date.now() });
}

function clearInventorySession(messageId) {
  inventorySessions.delete(messageId);
}

function buildInventoryRender(target, view, session) {
  const perPage = 8;
  const totalPages = Math.max(1, Math.ceil(view.rows.length / perPage));
  const page = Math.min(Math.max(session.page || 0, 0), totalPages - 1);
  const visible = view.rows.slice(page * perPage, (page + 1) * perPage).map((row) => ({
    ...row,
    selected: row.itemId === session.selectedItemId
  }));
  const index = Object.fromEntries(view.rows.map((row) => [row.itemId, row.item || getRuntimeItem(row.itemId)]));
  const selected = view.rows.find((row) => row.itemId === session.selectedItemId) || null;
  if (selected) selected.primaryAction = getItemPrimaryAction(selected.item);

  const embed = inventoryEmbed(target, visible, index, page, totalPages, selected, view.collections);
  const components = [
    inventoryItemSelect(visible, index),
    inventoryPaginationButtons(page, totalPages),
    inventoryActionButtons(selected, session.pendingAction)
  ].filter(Boolean);
  return { embed, components, page, totalPages, selected };
}

async function renderInventoryMessage(message, target, ownerId, sessionPatch = {}) {
  const existing = getInventorySession(message.id) || { ownerId, targetId: target.id, page: 0, selectedItemId: null, pendingAction: null };
  const nextSession = { ...existing, ...sessionPatch };
  const view = await getInventoryView(target.id);
  const render = buildInventoryRender(target, view, nextSession);
  setInventorySession(message.id, {
    ...nextSession,
    page: render.page,
    selectedItemId: render.selected?.itemId || null
  });
  await message.edit({ embeds: [render.embed], components: render.components });
  return render;
}

module.exports = {
  getInventorySession,
  setInventorySession,
  clearInventorySession,
  renderInventoryMessage,

  async balance(interaction) {
    const target = interaction.options?.getUser?.('user') || interaction.user;
    const [balance, bankTier, bankLimit, levelInfo] = await Promise.all([
      getBalance(target.id),
      getBankTier(target.id),
      getBankLimit(target.id),
      getUserLevel(target.id)
    ]);
    return interaction.reply({ embeds: [balanceEmbed(target, balance, bankTier, bankLimit, levelInfo.level, levelInfo.prestige)] });
  },

  async profile(interaction) {
    const target = interaction.options?.getUser?.('user') || interaction.user;
    const [balance, stats, cosmetics, bankTier, bankLimit, levelInfo] = await Promise.all([
      getBalance(target.id),
      getStats(target.id),
      require('../../utils/economyStorage').getCosmetics(target.id),
      getBankTier(target.id),
      getBankLimit(target.id),
      getUserLevel(target.id)
    ]);
    return interaction.reply({ embeds: [profileEmbed(target, balance, stats, cosmetics, bankTier, bankLimit, levelInfo)] });
  },

  async inventory(interaction) {
    const target = interaction.options?.getUser?.('user') || interaction.user;
    const view = await getInventoryView(target.id);
    const initialSession = { ownerId: interaction.user.id, targetId: target.id, page: 0, selectedItemId: view.rows[0]?.itemId || null, pendingAction: null };
    const render = buildInventoryRender(target, view, initialSession);
    const reply = await interaction.reply({ embeds: [render.embed], components: render.components, fetchReply: true });
    setInventorySession(reply.id, {
      ownerId: interaction.user.id,
      targetId: target.id,
      page: render.page,
      selectedItemId: render.selected?.itemId || null,
      pendingAction: null
    });
  },

  async leaderboard(interaction) {
    try {
      await interaction.deferReply();
      const type = interaction.options?.getString?.('type') || 'net';
      const entries = await getLeaderboard(type, 10);
      const userCache = new Map();
      for (const row of entries) {
        const user = await interaction.client.users.fetch(row.userId).catch(() => null);
        if (user) userCache.set(row.userId, user);
      }
      await interaction.editReply({ embeds: [leaderboardEmbed(type, entries, userCache)] });
    } catch (error) {
      console.error('[eco leaderboard]', error);
      const method = interaction.deferred ? 'editReply' : 'reply';
      await interaction[method]({ embeds: [errorEmbed('Failed to load leaderboard.')], flags: 64 }).catch(() => {});
    }
  },

  async stats(interaction) {
    const target = interaction.options?.getUser?.('user') || interaction.user;
    const [stats, levelInfo] = await Promise.all([getStats(target.id), getUserLevel(target.id)]);
    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setAuthor({ name: `${target.username}'s Stats`, iconURL: target.displayAvatarURL({ size: 128 }) })
      .addFields(
        { name: 'Level', value: `\`${levelInfo.level}\``, inline: true },
        { name: 'Total XP', value: `\`${levelInfo.totalXP.toLocaleString()}\``, inline: true },
        { name: 'Prestige', value: `\`${levelInfo.prestige}\``, inline: true },
        { name: 'Commands Used', value: `\`${stats.commands_used || 0}\``, inline: true },
        { name: 'Money Earned', value: `\`${(stats.money_earned || 0).toLocaleString()}\``, inline: true },
        { name: 'Money Spent', value: `\`${(stats.money_spent || 0).toLocaleString()}\``, inline: true },
        { name: 'Games Played', value: `\`${stats.games_played || 0}\``, inline: true },
        { name: 'Work', value: `\`${stats.work_used || 0}\``, inline: true },
        { name: 'Crime', value: `✅ ${stats.crime_success || 0} | ❌ ${stats.crime_fail || 0}`, inline: true },
        { name: 'Hunt', value: `\`${stats.hunt_used || 0}\``, inline: true },
        { name: 'Fish', value: `\`${stats.fish_used || 0}\``, inline: true },
        { name: 'Daily Streak', value: `\`${stats.daily_streak || 0}\``, inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  },

  async level(interaction) {
    const target = interaction.options?.getUser?.('user') || interaction.user;
    const levelInfo = await getUserLevel(target.id);
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setAuthor({ name: `${target.username}'s Level`, iconURL: target.displayAvatarURL({ size: 128 }) })
      .setDescription([
        `Level: \`${levelInfo.level}\` / \`100\``,
        `XP: ${progressBar(levelInfo.currentXP, levelInfo.nextLevelXP, 12)}`,
        `Progress: \`${levelInfo.currentXP.toLocaleString()} / ${levelInfo.nextLevelXP.toLocaleString()}\``,
        `Prestige: \`${levelInfo.prestige}\` (${((levelInfo.multiplier - 1) * 100).toFixed(0)}% bonus)`,
        `Total XP: \`${levelInfo.totalXP.toLocaleString()}\``
      ].join('\n'));
    return interaction.reply({ embeds: [embed], components: [progressButtons()] });
  }
};
