// src/economy/components.js — Uranium Economy UI Components v2.0
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const { ZONES } = require('./constants');

// ═══════════════════════════════════════
// 🛒 SHOP COMPONENTS
// ═══════════════════════════════════════
function shopCategorySelect(categories, selectedCategoryId) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('eco:shop:category')
      .setPlaceholder('📂 Choose a shop category...')
      .addOptions(
        categories.map(cat => ({
          label: cat.name,
          value: cat.id,
          description: cat.description?.substring(0, 50) || '',
          emoji: cat.emoji || '🛒',
          default: cat.id === selectedCategoryId
        }))
      )
  );
}

function shopPaginationButtons(categoryId, page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`eco:shop:page:${categoryId}:${page - 1}`)
      .setLabel('Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId('eco:noop')
      .setLabel(`📄 ${page + 1}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`eco:shop:page:${categoryId}:${page + 1}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );
}

function shopBuyButtons(items) {
  const rows = [];
  // Max 5 buttons per row, max 2 rows for buy buttons
  for (let r = 0; r < Math.min(2, Math.ceil(items.length / 5)); r++) {
    const row = new ActionRowBuilder();
    const slice = items.slice(r * 5, (r + 1) * 5);
    for (const item of slice) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`eco:shop:buy:${item.id}`)
          .setLabel(`${item.name.substring(0, 25)}`)
          .setEmoji(item.emoji || '🛒')
          .setStyle(ButtonStyle.Success)
      );
    }
    if (row.components.length) rows.push(row);
  }
  return rows;
}

// ═══════════════════════════════════════
// 🗺️ ADVENTURE COMPONENTS
// ═══════════════════════════════════════
function adventureZoneSelect(userLevel) {
  const options = ZONES.map(z => ({
    label: z.name,
    value: z.id,
    description: `Lv.${z.lvl} req • ${(z.Atoms?.[0] || 0).toLocaleString()}-${(z.Atoms?.[1] || 0).toLocaleString()} Atoms`,
    emoji: z.emoji || '🗺️'
  })).filter(z => {
    // Show all zones but mark locked ones
    return true;
  });

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('eco:adventure:zone')
      .setPlaceholder('🗺️ Choose your adventure zone...')
      .addOptions(options)
  );
}

// ═══════════════════════════════════════
// 🎲 GAMBLING COMPONENTS
// ═══════════════════════════════════════
function blackjackButtons(gameId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`eco:bj:hit:${gameId}`)
      .setLabel('Hit')
      .setEmoji('🃏')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`eco:bj:stand:${gameId}`)
      .setLabel('Stand')
      .setEmoji('✋')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`eco:bj:double:${gameId}`)
      .setLabel('Double Down')
      .setEmoji('⚛️')
      .setStyle(ButtonStyle.Danger)
  );
}

function crashButtons(gameId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`eco:crash:cashout:${gameId}`)
      .setLabel('⚛️ Cash Out!')
      .setStyle(ButtonStyle.Success)
  );
}

// ═══════════════════════════════════════
// 📊 QUEST COMPONENTS
// ═══════════════════════════════════════
function questButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('eco:quest:claim_all')
      .setLabel('Claim Completed')
      .setEmoji('🎁')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('eco:quest:refresh')
      .setLabel('Refresh Quests')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary)
  );
}

// ═══════════════════════════════════════
// 📈 PROGRESS COMPONENTS
// ═══════════════════════════════════════
function progressButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('eco:progress:level')
      .setLabel('Level Info')
      .setEmoji('⭐')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('eco:progress:prestige')
      .setLabel('Prestige')
      .setEmoji('✨')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('eco:progress:streaks')
      .setLabel('Streaks')
      .setEmoji('🔥')
      .setStyle(ButtonStyle.Secondary)
  );
}

// ═══════════════════════════════════════
// ⚛️ ECONOMY HELP COMPONENTS
// ═══════════════════════════════════════
function economyHelpSelect() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('eco:help:category')
      .setPlaceholder('📖 Select a category to learn more...')
      .addOptions([
        { label: '⚛️ Earning Money', value: 'earning', description: 'Daily, work, crime, beg, search', emoji: '⚛️' },
        { label: '🎒 Items & Shop', value: 'shop', description: 'Browse, buy, sell, use items', emoji: '🎒' },
        { label: '🗺️ Adventures', value: 'adventure', description: 'Explore zones, hunt, fish', emoji: '🗺️' },
        { label: '🎲 Gambling', value: 'gambling', description: 'Slots, coinflip, blackjack, dice, crash', emoji: '🎲' },
        { label: '📊 Progression', value: 'progress', description: 'Levels, prestige, streaks, quests', emoji: '📊' },
        { label: '🏦 Banking', value: 'banking', description: 'Deposit, withdraw, transfer, rob', emoji: '🏦' }
      ])
  );
}

// ═══════════════════════════════════════
// 📦 INVENTORY COMPONENTS
// ═══════════════════════════════════════
function inventoryItemSelect(inventory, itemIndex) {
  const usable = inventory.filter(row => {
    const item = itemIndex[row.itemId];
    if (!item) return false;
    if (item.usable === false) return false;
    return ['consumable', 'booster', 'lootbox', 'tool'].includes(item.type);
  }).slice(0, 25);

  if (!usable.length) return null;

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('eco:inv:use')
      .setPlaceholder('🎒 Select an item to use...')
      .addOptions(
        usable.map(row => {
          const item = itemIndex[row.itemId];
          return {
            label: `${item.name} (×${row.quantity})`,
            value: item.id,
            emoji: item.emoji || '📦'
          };
        })
      )
  );
}

function inventoryPaginationButtons(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`eco:inv:page:${page - 1}`)
      .setLabel('◀')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId('eco:noop')
      .setLabel(`${page + 1}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`eco:inv:page:${page + 1}`)
      .setLabel('▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );
}

module.exports = {
  shopCategorySelect, shopPaginationButtons, shopBuyButtons,
  adventureZoneSelect, blackjackButtons, crashButtons,
  questButtons, progressButtons, economyHelpSelect,
  inventoryItemSelect, inventoryPaginationButtons
};
