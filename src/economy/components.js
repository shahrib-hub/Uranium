const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const { ZONES } = require('./constants');

function shopCategorySelect(categories, selectedCategoryId) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('eco:shop:category')
      .setPlaceholder('Choose a shop category...')
      .addOptions(
        categories.map((category) => ({
          label: category.name,
          value: category.id,
          description: (category.description || '').substring(0, 100),
          emoji: category.emoji || '🛒',
          default: category.id === selectedCategoryId
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
      .setLabel(`${page + 1}/${totalPages}`)
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
  for (let index = 0; index < Math.min(2, Math.ceil(items.length / 5)); index += 1) {
    const row = new ActionRowBuilder();
    for (const item of items.slice(index * 5, (index + 1) * 5)) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`eco:shop:buy:${item.id}`)
          .setLabel(item.name.substring(0, 25))
          .setEmoji(item.emoji || '🛒')
          .setStyle(ButtonStyle.Success)
      );
    }
    if (row.components.length) rows.push(row);
  }
  return rows;
}

function adventureZoneSelect(userLevel) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('eco:adventure:zone')
      .setPlaceholder('Choose your adventure zone...')
      .addOptions(
        ZONES.map((zone) => ({
          label: zone.name,
          value: zone.id,
          description: `Lv.${zone.lvl} req | ${(zone.Atoms?.[0] || 0).toLocaleString()}-${(zone.Atoms?.[1] || 0).toLocaleString()} Atoms`,
          emoji: zone.emoji || '🗺️',
          default: false
        }))
      )
  );
}

function blackjackButtons(gameId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`eco:bj:hit:${gameId}`).setLabel('Hit').setEmoji('🃏').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`eco:bj:stand:${gameId}`).setLabel('Stand').setEmoji('✋').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`eco:bj:double:${gameId}`).setLabel('Double').setEmoji('⚛️').setStyle(ButtonStyle.Danger)
  );
}

function crashButtons(gameId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`eco:crash:cashout:${gameId}`).setLabel('Cash Out').setStyle(ButtonStyle.Success)
  );
}

function questButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eco:quest:claim_all').setLabel('Claim Completed').setEmoji('🎁').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('eco:quest:refresh').setLabel('Refresh Quests').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
  );
}

function progressButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eco:progress:level').setLabel('Level Info').setEmoji('⭐').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('eco:progress:prestige').setLabel('Prestige').setEmoji('✨').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('eco:progress:streaks').setLabel('Streaks').setEmoji('🔥').setStyle(ButtonStyle.Secondary)
  );
}

function economyHelpSelect() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('eco:help:category')
      .setPlaceholder('Select a category...')
      .addOptions([
        { label: 'Earning Money', value: 'earning', description: 'Daily, work, crime, beg, search', emoji: '⚛️' },
        { label: 'Items and Shop', value: 'shop', description: 'Browse, buy, sell, use items', emoji: '🎒' },
        { label: 'Adventures', value: 'adventure', description: 'Explore zones, hunt, fish', emoji: '🗺️' },
        { label: 'Games', value: 'gambling', description: 'Slots, coinflip, blackjack, dice, crash', emoji: '🎲' },
        { label: 'Progression', value: 'progress', description: 'Levels, prestige, streaks, quests', emoji: '📊' },
        { label: 'Banking', value: 'banking', description: 'Deposit, withdraw, transfer, rob', emoji: '🏦' }
      ])
  );
}

function inventoryItemSelect(inventory, itemIndex) {
  if (!inventory.length) return null;
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('eco:inv:select')
      .setPlaceholder('Select an item...')
      .addOptions(
        inventory.slice(0, 25).map((row) => {
          const item = itemIndex[row.itemId] || row.item;
          const quantity = row.quantity ?? row.amount ?? 0;
          return {
            label: `${item?.name || row.itemId} (x${quantity})`.substring(0, 100),
            value: row.itemId,
            emoji: item?.emoji || '📦',
            description: (item?.description || 'Inspect this item').substring(0, 100),
            default: Boolean(row.selected)
          };
        })
      )
  );
}

function inventoryPaginationButtons(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`eco:inv:page:${page - 1}`).setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
    new ButtonBuilder().setCustomId('eco:noop').setLabel(`${page + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`eco:inv:page:${page + 1}`).setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
    new ButtonBuilder().setCustomId('eco:inv:refresh').setLabel('Refresh').setStyle(ButtonStyle.Primary)
  );
}

function inventoryActionButtons(selectedItem, pendingAction = null) {
  if (pendingAction) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('eco:inv:confirm').setLabel('Confirm').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('eco:inv:cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    );
  }

  const label = selectedItem?.primaryAction?.label || 'Use';
  const disabled = !selectedItem;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eco:inv:action').setLabel(label).setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId('eco:inv:discard').setLabel('Discard').setStyle(ButtonStyle.Danger).setDisabled(disabled),
    new ButtonBuilder().setCustomId('eco:inv:repair').setLabel('Repair').setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId('eco:inv:unequip').setLabel('Unequip').setStyle(ButtonStyle.Secondary).setDisabled(disabled)
  );
}

module.exports = {
  shopCategorySelect,
  shopPaginationButtons,
  shopBuyButtons,
  adventureZoneSelect,
  blackjackButtons,
  crashButtons,
  questButtons,
  progressButtons,
  economyHelpSelect,
  inventoryItemSelect,
  inventoryPaginationButtons,
  inventoryActionButtons
};
