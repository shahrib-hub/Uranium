const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getShopData, findItem } = require('../economy/items');
const { shopPageEmbed, errorEmbed, successEmbed } = require('../economy/embeds');
const { shopCategorySelect, shopPaginationButtons, shopBuyButtons } = require('../economy/components');
const {
  buyItem,
  useItem,
  discardItem,
  repairItem,
  refreshQuests,
  claimCompletedQuests,
  getQuestRefreshTime,
  getInventoryView,
  getItemPrimaryAction,
  getDailyStreak
} = require('../economy/service');
const { getUserLevel } = require('../economy/levelSystem');
const { ZONES } = require('../economy/constants');
const infoHandler = require('../economy/handlers/infoHandler');

function formatUseResult(result) {
  if (!result) return 'Done.';
  if (result.mode === 'open') {
    const rewardText = result.rewards.length ? ` Items: ${result.rewards.map((reward) => `${reward.emoji || '📦'} ${reward.name}`).join(', ')}` : '';
    return `${result.crate.emoji || '📦'} Opened **${result.crate.name}** and found \`${result.Atoms.toLocaleString()}\` Atoms.${rewardText}`;
  }
  if (result.mode === 'boost') {
    return `${result.item.emoji || '✨'} Activated **${result.item.name}**.`;
  }
  if (result.mode === 'repair') {
    return `🔧 Repaired **${result.result.tool.name}** to full durability.`;
  }
  if (result.mode === 'equip') {
    return `${result.item.emoji || '🎒'} Equipped **${result.item.name}**.`;
  }
  if (result.mode === 'consume' && result.xp) {
    return `${result.item.emoji || '🧪'} Used **${result.item.name}** and gained \`${result.xp.xpGained}\` XP.`;
  }
  if (result.mode === 'consume' && result.refund) {
    return `${result.item.emoji || '🧪'} Used **${result.item.name}** and recovered \`${Number(result.refund || 0).toLocaleString()}\` Atoms.`;
  }
  if (result.mode === 'consume' && result.newLimit) {
    return `${result.item.emoji || '💵'} Used **${result.item.name}**. New bank limit: \`${result.newLimit.toLocaleString()}\`.`;
  }
  return `${result.item?.emoji || '✅'} Used **${result.item?.name || 'item'}**.`;
}

async function sendInventoryNotice(interaction, text, isError = false) {
  const payload = { embeds: [isError ? errorEmbed(text) : successEmbed(text)], flags: 64 };
  if (interaction.deferred || interaction.replied) return interaction.followUp(payload).catch(() => {});
  return interaction.reply(payload).catch(() => {});
}

async function handleInventoryMutation(interaction, executor) {
  const session = infoHandler.getInventorySession(interaction.message.id);
  if (!session) return interaction.reply({ embeds: [errorEmbed('This inventory view expired. Re-open it with `/eco info inventory`.')], flags: 64 });
  if (interaction.user.id !== session.ownerId) return interaction.reply({ embeds: [errorEmbed('Only the player who opened this inventory can use its controls.')], flags: 64 });

  const selectedId = session.selectedItemId;
  if (!selectedId) return interaction.reply({ embeds: [errorEmbed('Select an item first.')], flags: 64 });

  try {
    const result = await executor(selectedId, session);
    await infoHandler.renderInventoryMessage(interaction.message, interaction.user, session.ownerId, { ...session, pendingAction: null });
    await sendInventoryNotice(interaction, formatUseResult(result));
  } catch (error) {
    await sendInventoryNotice(interaction, error.message || 'Action failed.', true);
  }
}

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction) {
    if (interaction.isButton()) {
      const id = interaction.customId;
      if (!id.startsWith('eco:')) return;

      try {
        if (id === 'eco:noop') return interaction.deferUpdate().catch(() => {});

        if (id.startsWith('eco:shop:page:')) {
          const [, , , categoryId, pageStr] = id.split(':');
          const shopData = getShopData();
          const category = shopData.categories.find((entry) => entry.id === categoryId) || shopData.categories[0];
          const perPage = 5;
          const totalPages = Math.max(1, Math.ceil(category.items.length / perPage));
          const page = Math.min(Math.max(Number(pageStr) || 0, 0), totalPages - 1);
          const items = category.items.slice(page * perPage, (page + 1) * perPage);
          return interaction.update({
            embeds: [shopPageEmbed(interaction.user, category, items, page, totalPages)],
            components: [shopCategorySelect(shopData.categories, category.id), shopPaginationButtons(category.id, page, totalPages), ...shopBuyButtons(items)]
          });
        }

        if (id.startsWith('eco:shop:buy:')) {
          const itemId = id.split(':')[3];
          const result = await buyItem(interaction.user.id, itemId);
          return interaction.reply({ embeds: [successEmbed(result.autoApplied ? `Bought **${result.item.name}** and applied it immediately.` : `Bought **${result.item.name}** for \`${result.item.price.toLocaleString()}\` Atoms.`)], flags: 64 });
        }

        if (id === 'eco:quest:claim_all') {
          const result = await claimCompletedQuests(interaction.user.id);
          if (!result.claimed.length) return interaction.reply({ embeds: [errorEmbed('No completed quests to claim.')], flags: 64 });
          return interaction.reply({ embeds: [successEmbed(`Claimed **${result.claimed.length}** quest(s) for \`${result.totalAtoms.toLocaleString()}\` Atoms and \`${result.totalXp}\` XP.`)], flags: 64 });
        }

        if (id === 'eco:quest:refresh') {
          await refreshQuests(interaction.user.id);
          const refreshMs = await getQuestRefreshTime(interaction.user.id);
          return interaction.reply({ embeds: [successEmbed(`Your quests were refreshed. Next free refresh timer: \`${Math.ceil(refreshMs / 60000)}\` minute(s).`)], flags: 64 });
        }

        if (id === 'eco:progress:level' || id === 'eco:progress:prestige' || id === 'eco:progress:streaks') {
          if (id.endsWith('level')) return infoHandler.level(interaction);
          if (id.endsWith('prestige')) {
            const { canPrestige } = require('../economy/levelSystem');
            const check = await canPrestige(interaction.user.id);
            return interaction.reply({ embeds: [check.can ? successEmbed(`Ready to prestige. Cost: \`${check.cost.toLocaleString()}\``) : errorEmbed(check.reason)], flags: 64 });
          }
          const streak = await getDailyStreak(interaction.user.id);
          return interaction.reply({ embeds: [successEmbed(`Daily streak: \`${streak.streak}\` day(s) | Multiplier: \`${streak.multiplier}x\``)], flags: 64 });
        }

        if (id.startsWith('eco:duel:')) {
          const { handleDuelButton } = require('../economy/handlers/earnHandler2');
          return handleDuelButton(interaction);
        }

        if (id.startsWith('eco:bj:')) {
          const { handleBlackjackButton } = require('../economy/handlers/funHandler');
          return handleBlackjackButton(interaction);
        }

        // ═══════════════════════════════════
        // 🎮 NEW GAMES HANDLERS
        // ═══════════════════════════════════
        if (id.startsWith('eco:mines:')) {
          const gameHandler = require('../economy/handlers/gameHandler');
          const action = id.split(':')[2];
          if (action === 'click') return gameHandler.handleMinesClick(interaction);
          if (action === 'cashout') return gameHandler.handleMinesCayout(interaction);
          if (action === 'quit') return gameHandler.handleMinesQuit(interaction);
        }

        if (id.startsWith('eco:roulette:')) {
          const gameHandler = require('../economy/handlers/gameHandler');
          const action = id.split(':')[2];
          if (action === 'bet') return gameHandler.handleRouletteBet(interaction);
          if (action === 'spin') return gameHandler.handleRouletteSpin(interaction);
          if (action === 'clear') return gameHandler.handleRouletteClear(interaction);
        }

        if (id.startsWith('eco:highlow:')) {
          const gameHandler = require('../economy/handlers/gameHandler');
          return gameHandler.handleHighLowChoice(interaction);
        }

        if (id.startsWith('eco:scratch:reveal:')) {
          const gameHandler = require('../economy/handlers/gameHandler');
          return gameHandler.handleScratchReveal(interaction);
        }

        if (id.startsWith('eco:tower:')) {
          const gameHandler = require('../economy/handlers/gameHandler');
          const action = id.split(':')[2];
          if (action === 'climb') return gameHandler.handleTowerClimb(interaction);
          if (action === 'cashout') return gameHandler.handleTowerCayout(interaction);
          if (action === 'quit') return gameHandler.handleTowerQuit(interaction);
        }

        if (id.startsWith('eco:heist:')) {
          const { handleHeistButton } = require('../economy/handlers/earnHandler2');
          return handleHeistButton(interaction);
        }

        if (id.startsWith('eco:adv:start:')) {
          await interaction.deferUpdate().catch(() => {});
          const zoneId = id.split(':')[3];
          const zone = ZONES.find((entry) => entry.id === zoneId);
          const { startAdventure } = require('../economy/adventureEngine');
          return startAdventure(interaction, interaction.user.id, zone);
        }

        if (id.startsWith('eco:adv:')) {
          const { handleAdventureButton } = require('../economy/adventureEngine');
          return handleAdventureButton(interaction);
        }

        if (id.startsWith('eco:inv:page:')) {
          await interaction.deferUpdate().catch(() => {});
          const session = infoHandler.getInventorySession(interaction.message.id);
          if (!session) return;
          return infoHandler.renderInventoryMessage(interaction.message, interaction.user, session.ownerId, { ...session, page: Number(id.split(':')[3]) || 0, pendingAction: null });
        }

        if (id === 'eco:inv:refresh') {
          await interaction.deferUpdate().catch(() => {});
          const session = infoHandler.getInventorySession(interaction.message.id);
          if (!session) return;
          return infoHandler.renderInventoryMessage(interaction.message, interaction.user, session.ownerId, { ...session, pendingAction: null });
        }

        if (id === 'eco:inv:discard') {
          await interaction.deferUpdate().catch(() => {});
          const session = infoHandler.getInventorySession(interaction.message.id);
          if (!session) return;
          return infoHandler.renderInventoryMessage(interaction.message, interaction.user, session.ownerId, { ...session, pendingAction: 'discard' });
        }

        if (id === 'eco:inv:action') {
          const session = infoHandler.getInventorySession(interaction.message.id);
          if (!session) return interaction.reply({ embeds: [errorEmbed('This inventory view expired.')], flags: 64 });
          const view = await getInventoryView(session.targetId);
          const selected = view.rows.find((row) => row.itemId === session.selectedItemId);
          const primaryAction = getItemPrimaryAction(selected?.item);

          if (['open'].includes(primaryAction.mode)) {
            await interaction.deferUpdate().catch(() => {});
            return infoHandler.renderInventoryMessage(interaction.message, interaction.user, session.ownerId, { ...session, pendingAction: 'action' });
          }

          return handleInventoryMutation(interaction, async (selectedId) => useItem(interaction.user.id, selectedId));
        }

        if (id === 'eco:inv:repair') {
          return handleInventoryMutation(interaction, async (selectedId) => {
            const result = await repairItem(interaction.user.id, { itemId: selectedId });
            return { mode: 'repair', item: findItem(selectedId), result };
          });
        }

        if (id === 'eco:inv:unequip') {
          const session = infoHandler.getInventorySession(interaction.message.id);
          if (!session) return interaction.reply({ embeds: [errorEmbed('This inventory view expired.')], flags: 64 });
          const { clearLoadout } = require('../utils/economyStorage');
          const view = await getInventoryView(session.targetId);
          const selected = view.rows.find((row) => row.itemId === session.selectedItemId);
          if (!selected?.equipped?.length) return interaction.reply({ embeds: [errorEmbed('That item is not equipped.')], flags: 64 });
          for (const slot of selected.equipped) await clearLoadout(interaction.user.id, slot);
          await infoHandler.renderInventoryMessage(interaction.message, interaction.user, session.ownerId, { ...session, pendingAction: null });
          return sendInventoryNotice(interaction, `Unequipped **${selected.item?.name || selected.itemId}**.`);
        }

        if (id === 'eco:inv:confirm') {
          const session = infoHandler.getInventorySession(interaction.message.id);
          if (!session) return interaction.reply({ embeds: [errorEmbed('This inventory view expired.')], flags: 64 });

          if (session.pendingAction === 'discard') {
            return handleInventoryMutation(interaction, async (selectedId) => {
              const result = await discardItem(interaction.user.id, selectedId, 1);
              return { mode: 'discard', item: result.item };
            });
          }

          if (session.pendingAction === 'action') {
            return handleInventoryMutation(interaction, async (selectedId) => useItem(interaction.user.id, selectedId));
          }

          return interaction.reply({ embeds: [errorEmbed('Nothing is waiting for confirmation.')], flags: 64 });
        }

        if (id === 'eco:inv:cancel') {
          await interaction.deferUpdate().catch(() => {});
          const session = infoHandler.getInventorySession(interaction.message.id);
          if (!session) return;
          return infoHandler.renderInventoryMessage(interaction.message, interaction.user, session.ownerId, { ...session, pendingAction: null });
        }
      } catch (error) {
        console.error('[interactionCreateEconomy button]', error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ embeds: [errorEmbed(error.message || 'An economy interaction failed.')], flags: 64 }).catch(() => {});
        }
      }
    }

    if (interaction.isStringSelectMenu()) {
      try {
        if (interaction.customId === 'eco:shop:category') {
          await interaction.deferUpdate().catch(() => {});
          const categoryId = interaction.values[0];
          const shopData = getShopData();
          const category = shopData.categories.find((entry) => entry.id === categoryId) || shopData.categories[0];
          const perPage = 5;
          const totalPages = Math.max(1, Math.ceil(category.items.length / perPage));
          const items = category.items.slice(0, perPage);
          return interaction.editReply({
            embeds: [shopPageEmbed(interaction.user, category, items, 0, totalPages)],
            components: [shopCategorySelect(shopData.categories, category.id), shopPaginationButtons(category.id, 0, totalPages), ...shopBuyButtons(items)]
          });
        }

        if (interaction.customId === 'eco:adventure:zone') {
          const zoneId = interaction.values[0];
          const zone = ZONES.find((entry) => entry.id === zoneId);
          if (!zone) return interaction.reply({ embeds: [errorEmbed('Unknown zone.')], flags: 64 });

          await interaction.deferUpdate().catch(() => {});
          const levelInfo = await getUserLevel(interaction.user.id);
          if (levelInfo.level < zone.lvl) return interaction.followUp({ embeds: [errorEmbed(`Need Level ${zone.lvl} for this zone.`)], flags: 64 });

          const imagePath = path.resolve(__dirname, '..', 'assets', 'adventure', `adv_${zone.id}.png`);
          const attachment = fs.existsSync(imagePath) ? new AttachmentBuilder(imagePath, { name: `adv_${zone.id}.png` }) : null;
          const embed = new EmbedBuilder()
            .setColor(0x00ff88)
            .setTitle(`${zone.emoji || '🗺️'} Adventure Preview: ${zone.name}`)
            .setDescription([
              `Level Required: \`${zone.lvl}\``,
              `Reward Range: \`${zone.Atoms[0].toLocaleString()} - ${zone.Atoms[1].toLocaleString()}\` Atoms`,
              `Base XP: \`${zone.xp}\``,
              `Rare crate chance: \`${(zone.rareChance * 100).toFixed(1)}%\``
            ].join('\n'));
          if (attachment) embed.setImage(`attachment://adv_${zone.id}.png`);
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`eco:adv:start:${zone.id}`).setLabel('Start Journey').setStyle(ButtonStyle.Success)
          );
          const payload = { embeds: [embed], components: [row] };
          if (attachment) payload.files = [attachment];
          return interaction.editReply(payload);
        }

        if (interaction.customId === 'eco:sell:menu') {
          await interaction.deferUpdate().catch(() => {});
          const [itemId, qtyStr] = interaction.values[0].split('_');
          const quantity = Number(qtyStr) || 1;
          const result = await require('../economy/service').sellItem(interaction.user.id, itemId, quantity);
          return interaction.editReply({ embeds: [successEmbed(`Sold ${quantity}x **${result.item.name}** for \`${result.total.toLocaleString()}\` Atoms.`)], components: [] });
        }

        if (interaction.customId === 'eco:inv:select') {
          await interaction.deferUpdate().catch(() => {});
          const session = infoHandler.getInventorySession(interaction.message.id);
          if (!session) return;
          return infoHandler.renderInventoryMessage(interaction.message, interaction.user, session.ownerId, { ...session, selectedItemId: interaction.values[0], pendingAction: null });
        }

        if (interaction.customId === 'eco:help:category') {
          await interaction.deferUpdate().catch(() => {});
          const category = interaction.values[0];
          const pages = {
            earning: '`/eco earn daily`, `/eco earn work`, `/eco earn crime`, `/eco earn beg`, `/eco earn search`, `/eco earn mine`, `/eco earn chop`, `/eco earn dig`, `/eco earn scavenge`, `/eco earn hack`, `/eco earn reactor`, `/eco earn bounty`',
            shop: '`/eco shop`, `/eco sell`, `/eco info inventory`',
            adventure: '`/eco adventure start`, `/eco adventure hunt`, `/eco adventure fish`, `/eco adventure explore`, `/eco adventure duel`, `/eco adventure heist`',
            gambling: '`/eco fun slots`, `/eco fun coinflip`, `/eco fun blackjack`, `/eco fun dice`, `/eco fun crash`, `/eco games mines`, `/eco games roulette`, `/eco games highlow`, `/eco games scratch`, `/eco games tower`',
            progress: '`/eco progress level`, `/eco progress prestige`, `/eco progress streaks`, `/eco earn quest`',
            banking: '`/eco bank deposit`, `/eco bank withdraw`, `/eco bank transfer`, `/eco bank rob`'
          };
          return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00ff88).setDescription(pages[category] || 'Category not found.')] });
        }
      } catch (error) {
        console.error('[interactionCreateEconomy select]', error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ embeds: [errorEmbed(error.message || 'An economy selection failed.')], flags: 64 }).catch(() => {});
        }
      }
    }
  }
};
