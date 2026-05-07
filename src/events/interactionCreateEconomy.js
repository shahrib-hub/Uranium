// src/events/interactionCreateEconomy.js — Uranium Economy Interactions v2.0
const { Events } = require('discord.js');
const { getShopData, findItem } = require('../economy/items');
const { shopPageEmbed, errorEmbed, successEmbed, adventureEmbed, inventoryEmbed } = require('../economy/embeds');
const { shopCategorySelect, shopPaginationButtons, shopBuyButtons, inventoryItemSelect, inventoryPaginationButtons } = require('../economy/components');
const { getBalance, addWallet, addInventoryItem, getStats, bumpStat, getStat, setStat, getInventory, consumeInventoryItem, getCosmetics, setCosmetics } = require('../utils/economyStorage');
const { QUEST_TEMPLATES, ZONES } = require('../economy/constants');
const { getBankTier, getBankLimit, addWalletSafe, setBankTier } = require('../economy/helpers');
const { rollAdventure, rollRange } = require('../economy/rng');
const { awardActionXP, getUserLevel } = require('../economy/levelSystem');
const { setUsedCooldown } = require('../economy/helpers');

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction) {
    // ═══ BUTTONS ═══
    if (interaction.isButton()) {
      const id = interaction.customId;
      if (!id.startsWith('eco:')) return;

      try {
        if (id === 'eco:noop') return interaction.deferUpdate().catch(() => {});

        // Shop pagination
        if (id.startsWith('eco:shop:page:')) {
          const [, , , categoryId, pageStr] = id.split(':');
          const shopData = getShopData();
          const category = shopData.categories.find(c => c.id === categoryId) || shopData.categories[0];
          const perPage = 5;
          const totalPages = Math.max(1, Math.ceil(category.items.length / perPage));
          const page = Math.min(Math.max(parseInt(pageStr) || 0, 0), totalPages - 1);
          const items = category.items.slice(page * perPage, (page + 1) * perPage);

          const embed = shopPageEmbed(interaction.user, category, items, page, totalPages);
          const rows = [shopCategorySelect(shopData.categories, category.id), shopPaginationButtons(category.id, page, totalPages), ...shopBuyButtons(items)];
          return interaction.update({ embeds: [embed], components: rows });
        }

        // Shop buy
        if (id.startsWith('eco:shop:buy:')) {
          const itemId = id.split(':')[3];
          const item = findItem(itemId);
          if (!item) return interaction.reply({ content: '❌ Item no longer exists.', flags: 64 });

          const lvl = await getUserLevel(interaction.user.id);
          if (item.levelReq && lvl.level < item.levelReq) {
            return interaction.reply({ embeds: [errorEmbed(`You need **Level ${item.levelReq}** to buy this! (You're Level ${lvl.level})`)], flags: 64 });
          }

          const balance = await getBalance(interaction.user.id);
          if (balance.wallet < item.price) {
            return interaction.reply({ embeds: [errorEmbed(`Need \`${item.price.toLocaleString()}\` Atoms (have \`${balance.wallet.toLocaleString()}\`).`)], flags: 64 });
          }

          await addWallet(interaction.user.id, -item.price);

          // Handle by type
          if (['title', 'badge', 'frame', 'color'].includes(item.type)) {
            const patch = {};
            if (item.type === 'title') patch.title = item.data.title;
            if (item.type === 'badge') patch.badge = item.data.badge;
            if (item.type === 'frame') patch.frame = item.data.frame;
            if (item.type === 'color') patch.color = item.data.color;
            await setCosmetics(interaction.user.id, patch);
            return interaction.reply({ embeds: [successEmbed(`Bought **${item.name}**! Profile updated. ✨`)], flags: 64 });
          }

          if (item.type === 'bank_upgrade') {
            const currentTier = await getStat(interaction.user.id, 'bank_tier');
            if (currentTier >= item.data.tier) {
              await addWallet(interaction.user.id, item.price);
              return interaction.reply({ embeds: [errorEmbed(`Already at tier ${currentTier}+.`)], flags: 64 });
            }
            await setBankTier(interaction.user.id, item.data.tier);
            const limit = await getBankLimit(interaction.user.id);
            return interaction.reply({ embeds: [successEmbed(`🏦 Bank upgraded to **Tier ${item.data.tier}**! Limit: \`${limit.toLocaleString()}\``)], flags: 64 });
          }

          // Default: add to inventory
          await addInventoryItem(interaction.user.id, item.id, 1);
          await awardActionXP(interaction.user.id, 'buy');
          return interaction.reply({ embeds: [successEmbed(`Bought **${item.emoji} ${item.name}** for \`${item.price.toLocaleString()}\` Atoms!`)], flags: 64 });
        }

        // Quest claim
        if (id === 'eco:quest:claim_all') {
          const userId = interaction.user.id;
          const { getActiveQuests } = require('../economy/questEngine');
          const stats = await getStats(userId);
          let totalMoney = 0, totalXp = 0, claimed = 0;
          const active = await getActiveQuests(userId);

          for (const q of active) {
            const done = (stats[q.key] || 0) >= q.target;
            const already = await getStat(userId, `quest_claimed_${q.id}`);
            if (done && !already) {
              totalMoney += q.Atoms; totalXp += q.xp; claimed++;
              await setStat(userId, `quest_claimed_${q.id}`, 1);
            }
          }

          if (!claimed) return interaction.reply({ embeds: [errorEmbed('No completed quests to claim.')], flags: 64 });
          await addWalletSafe(userId, totalMoney);
          await bumpStat(userId, 'xp', totalXp);
          return interaction.reply({ embeds: [successEmbed(`🎁 Claimed **${claimed}** quest(s)!\n⚛️ +\`${totalMoney.toLocaleString()}\` • 🧪 +\`${totalXp}\` XP`)], flags: 64 });
        }

        // Quest refresh
        if (id === 'eco:quest:refresh') {
          const userId = interaction.user.id;
          const { refreshQuests } = require('../economy/questEngine');
          
          const balance = await getBalance(userId);
          const REFRESH_COST = 5000;
          if (balance.wallet < REFRESH_COST) {
            return interaction.reply({ embeds: [errorEmbed(`You need \`${REFRESH_COST.toLocaleString()}\` Atoms to refresh quests early.`)], flags: 64 });
          }

          await addWalletSafe(userId, -REFRESH_COST);
          await refreshQuests(userId);
          return interaction.reply({ embeds: [successEmbed(`Paid \`${REFRESH_COST.toLocaleString()}\` Atoms. Your quests have been refreshed! Run \`/eco earn quest\` again.`)], flags: 64 });
        }

        // Blackjack buttons
        if (id.startsWith('eco:bj:')) {
          const funHandler = require('../economy/handlers/funHandler');
          const [, , action, gameId] = id.split(':');
          const game = funHandler.bjGames.get(interaction.user.id);
          if (!game || game.gameId !== gameId) return interaction.reply({ embeds: [errorEmbed('Game expired.')], flags: 64 });

          const cardValue = (c) => { if (['J','Q','K'].includes(c)) return 10; if (c === 'A') return 11; return parseInt(c); };
          const handValue = (h) => { let t = h.reduce((s, c) => s + cardValue(c.card), 0); let a = h.filter(c => c.card === 'A').length; while (t > 21 && a > 0) { t -= 10; a--; } return t; };
          const handStr = (h) => h.map(c => `${c.card}${c.suit}`).join(' ');

          if (action === 'hit') {
            game.player.push(game.deck.pop());
            const pv = handValue(game.player);
            if (pv > 21) {
              funHandler.bjGames.delete(interaction.user.id);
              await addWalletSafe(interaction.user.id, -game.bet);
              await bumpStat(interaction.user.id, 'games_played', 1);
              const { EmbedBuilder } = require('discord.js');
              const embed = new EmbedBuilder().setColor(0xe74c3c)
                .setDescription(`🃏 **Your Hand:** ${handStr(game.player)} (${pv})\n🎰 **Dealer:** ${handStr(game.dealer)} (${handValue(game.dealer)})\n\n💥 **BUST!** Lost \`${game.bet.toLocaleString()}\``);
              return interaction.update({ embeds: [embed], components: [] });
            }
            const { blackjackButtons } = require('../economy/components');
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder().setColor(0x2ecc71)
              .setDescription(`🃏 **Your Hand:** ${handStr(game.player)} (${pv})\n🎰 **Dealer:** ${game.dealer[0].card}${game.dealer[0].suit} ? (?)\n\n**Bet:** \`${game.bet.toLocaleString()}\``);
            return interaction.update({ embeds: [embed], components: [blackjackButtons(gameId)] });
          }

          if (action === 'stand' || action === 'double') {
            if (action === 'double') { game.bet *= 2; game.player.push(game.deck.pop()); }
            // Dealer plays
            while (handValue(game.dealer) < 17) game.dealer.push(game.deck.pop());
            const pv = handValue(game.player), dv = handValue(game.dealer);
            funHandler.bjGames.delete(interaction.user.id);

            let result, delta;
            if (pv > 21) { result = '💥 Bust!'; delta = -game.bet; }
            else if (dv > 21) { result = '🎉 Dealer busts! You win!'; delta = game.bet; }
            else if (pv > dv) { result = '🎉 You win!'; delta = game.bet; }
            else if (pv < dv) { result = '😢 Dealer wins.'; delta = -game.bet; }
            else { result = '🤝 Push (tie).'; delta = 0; }

            await addWalletSafe(interaction.user.id, delta);
            await bumpStat(interaction.user.id, 'games_played', 1);
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder().setColor(delta >= 0 ? 0x2ecc71 : 0xe74c3c)
              .setDescription(`🃏 **You:** ${handStr(game.player)} (${pv})\n🎰 **Dealer:** ${handStr(game.dealer)} (${dv})\n\n${result}\n${delta !== 0 ? `${delta > 0 ? '⚛️' : '💸'} ${delta > 0 ? '+' : ''}${delta.toLocaleString()} Atoms` : 'Money returned.'}`);
            return interaction.update({ embeds: [embed], components: [] });
          }
        }

        // Progress buttons
        if (id === 'eco:progress:level' || id === 'eco:progress:prestige' || id === 'eco:progress:streaks') {
          const infoHandler = require('../economy/handlers/infoHandler');
          if (id.endsWith('level')) return infoHandler.level(interaction);
          if (id.endsWith('prestige')) {
            const { canPrestige } = require('../economy/levelSystem');
            const check = await canPrestige(interaction.user.id);
            return interaction.reply({ embeds: [check.can ? successEmbed(`Ready to prestige! Cost: \`${check.cost.toLocaleString()}\`\nUse \`/eco progress prestige\` to confirm.`) : errorEmbed(check.reason)], flags: 64 });
          }
          if (id.endsWith('streaks')) {
            const { getDailyStreak } = require('../economy/helpers');
            const s = await getDailyStreak(interaction.user.id);
            return interaction.reply({ embeds: [successEmbed(`🔥 Streak: \`${s.streak}\` days • Multiplier: \`${s.multiplier}x\``)], flags: 64 });
          }
        }

        // Duel buttons (attack/defend/special)
        if (id.startsWith('eco:duel:')) {
          const { handleDuelButton } = require('../economy/handlers/earnHandler2');
          return handleDuelButton(interaction);
        }

        // Heist buttons (proceed/abort)
        if (id.startsWith('eco:heist:')) {
          const { handleHeistButton } = require('../economy/handlers/earnHandler2');
          return handleHeistButton(interaction);
        }

        // Adventure confirm button
        if (id.startsWith('eco:adv:start:')) {
          await interaction.deferUpdate().catch(() => {});
          const zoneId = id.split(':')[3];
          const zone = ZONES.find(z => z.id === zoneId);
          const { startAdventure } = require('../economy/adventureEngine');
          return startAdventure(interaction, interaction.user.id, zone);
        }

        // Adventure fight/flee buttons
        if (id.startsWith('eco:adv:')) {
          const { handleAdventureButton } = require('../economy/adventureEngine');
          return handleAdventureButton(interaction);
        }

      } catch (err) {
        console.error('[interactionCreateEconomy button]', err);
        if (!interaction.replied && !interaction.deferred) interaction.reply({ content: '❌ Error.', flags: 64 }).catch(() => {});
      }
    }

    // ═══ SELECT MENUS ═══
    if (interaction.isStringSelectMenu()) {
      try {
        // Shop category
        if (interaction.customId === 'eco:shop:category') {
          await interaction.deferUpdate().catch(() => {});
          const categoryId = interaction.values[0];
          const shopData = getShopData();
          const category = shopData.categories.find(c => c.id === categoryId) || shopData.categories[0];
          const perPage = 5;
          const totalPages = Math.max(1, Math.ceil(category.items.length / perPage));
          const items = category.items.slice(0, perPage);
          const embed = shopPageEmbed(interaction.user, category, items, 0, totalPages);
          const rows = [shopCategorySelect(shopData.categories, category.id), shopPaginationButtons(category.id, 0, totalPages), ...shopBuyButtons(items)];
          return interaction.editReply({ embeds: [embed], components: rows });
        }

        // Adventure zone preview
        if (interaction.customId === 'eco:adventure:zone') {
          const zoneId = interaction.values[0];
          const zone = ZONES.find(z => z.id === zoneId);
          if (!zone) return interaction.reply({ embeds: [errorEmbed('Unknown zone.')], flags: 64 });

          // Defer immediately to avoid 3-second timeout (file uploads are slow)
          await interaction.deferUpdate().catch(() => {});

          const lvl = await getUserLevel(interaction.user.id);
          if (lvl.level < zone.lvl) return interaction.followUp({ embeds: [errorEmbed(`Need Level ${zone.lvl} for this zone! (You're Level ${lvl.level})`)], flags: 64 });

          const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
          const path = require('path');
          const fs = require('fs');

          const imgPath = path.resolve(__dirname, '..', 'assets', 'adventure', `adv_${zone.id}.png`);
          const attachment = fs.existsSync(imgPath) ? new AttachmentBuilder(imgPath, { name: `adv_${zone.id}.png` }) : null;

          const lootTable = [
            { name: 'Atoms', chance: '100%', detail: `${zone.Atoms[0].toLocaleString()} - ${zone.Atoms[1].toLocaleString()}` },
            { name: 'XP', chance: '100%', detail: `~${zone.xp} per round` },
            { name: 'Rare Crate', chance: `${(zone.rareChance * 100).toFixed(1)}%`, detail: 'Contains rare items' },
            { name: 'Ambush Event', chance: '20%', detail: 'Fight or flee!' },
            { name: 'Secret Room', chance: '5%', detail: '2x loot bonus' },
            { name: 'Boss Encounter', chance: '3%', detail: '2.5x loot bonus' }
          ];

          const lootLines = lootTable.map(l => `> **${l.name}** — \`${l.chance}\` *(${l.detail})*`).join('\n');

          const embed = new EmbedBuilder()
            .setColor(0x00ff88)
            .setTitle(`${zone.emoji || ''} Adventure Preview: ${zone.name}`)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
            .setDescription([
              `**Zone Info**`,
              `> Level Required: \`${zone.lvl}\``,
              `> Rounds: \`4 - 7\``,
              `> Requires: \`1x Adventure Ticket\``,
              '',
              `**Possible Loot**`,
              lootLines,
              '',
              '*Select **Start Journey** when you are ready!*'
            ].join('\n'));
          
          if (attachment) embed.setImage(`attachment://adv_${zone.id}.png`);

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`eco:adv:start:${zone.id}`)
              .setLabel('Start Journey')
              .setStyle(ButtonStyle.Success)
          );

          const replyObj = { embeds: [embed], components: [row] };
          if (attachment) replyObj.files = [attachment];

          return interaction.editReply(replyObj);
        }

        // Premium Sell menu
        if (interaction.customId === 'eco:sell:menu') {
          await interaction.deferUpdate().catch(() => {});
          const val = interaction.values[0];
          const [itemId, qtyStr] = val.split('_');
          const qty = parseInt(qtyStr, 10) || 1;
          
          const { findItem } = require('../economy/items');
          const item = findItem(itemId);
          if (!item || !item.sellPrice) return interaction.reply({ embeds: [errorEmbed('Item cannot be sold.')], flags: 64 });
          
          const { consumeInventoryItem } = require('../utils/economyStorage');
          const removed = await consumeInventoryItem(interaction.user.id, itemId, qty);
          if (!removed) return interaction.reply({ embeds: [errorEmbed('You don\'t have enough of that item.')], flags: 64 });
          
          const total = item.sellPrice * qty;
          await addWalletSafe(interaction.user.id, total);
          await awardActionXP(interaction.user.id, 'sell');
          
          return interaction.editReply({ embeds: [successEmbed(`Sold ${qty}x **${item.name}** for \`${total.toLocaleString()}\` Atoms!`)], components: [] });
        }

        // Inventory use
        if (interaction.customId === 'eco:inv:use') {
          const itemId = interaction.values[0];
          const item = findItem(itemId);
          if (!item) return interaction.reply({ embeds: [errorEmbed('Item not found.')], flags: 64 });
          const consumed = await consumeInventoryItem(interaction.user.id, itemId, 1);
          if (!consumed) return interaction.reply({ embeds: [errorEmbed('You don\'t have this item.')], flags: 64 });

          // Handle lootbox
          if (item.type === 'lootbox') {
            const range = item.data.Atoms || item.data.coins || [100, 500];
            const Atoms = rollRange(range[0], range[1]);
            await addWalletSafe(interaction.user.id, Atoms);
            return interaction.reply({ embeds: [successEmbed(`${item.emoji} Opened **${item.name}**!\n⚛️ Found **\`${Atoms.toLocaleString()}\`** Atoms!`)], flags: 64 });
          }

          // Handle consumable - energy drink
          if (item.data?.effect === 'reset_cooldown') {
            const { setCooldown } = require('../utils/economyStorage');
            await setCooldown(interaction.user.id, item.data.target, 0);
            return interaction.reply({ embeds: [successEmbed(`${item.emoji} Used **${item.name}**! ${item.data.target} cooldown reset!`)], flags: 64 });
          }

          return interaction.reply({ embeds: [successEmbed(`${item.emoji} Used **${item.name}**!`)], flags: 64 });
        }

        // Economy help categories
        if (interaction.customId === 'eco:help:category') {
          await interaction.deferUpdate().catch(() => {});
          const cat = interaction.values[0];
          const helpPages = {
            earning: '⚛️ **Earning Money**\n\n`/eco earn daily` — Claim daily (streak bonuses!)\n`/eco earn work` — Work level-gated jobs\n`/eco earn crime` — Risky crimes for big payouts\n`/eco earn beg` — Beg for spare change\n`/eco earn search` — Search locations for Atoms\n`/eco earn quest` — View & claim quests',
            shop: '🎒 **Items & Shop**\n\n`/eco shop browse` — Browse 55+ items\n`/eco shop sell` — Sell items for Atoms\nUse the dropdown to switch categories!\nBuy tools, boosters, lootboxes & more.',
            adventure: '🗺️ **Adventures**\n\n`/eco adventure start` — Choose a zone\n`/eco adventure hunt` — Hunt animals\n`/eco adventure fish` — Catch fish\n`/eco adventure explore` — Explore for loot\n\n6 zones unlock as you level up!',
            gambling: '🎲 **Gambling**\n\n`/eco fun slots` — Slot machine\n`/eco fun coinflip` — Heads or tails\n`/eco fun blackjack` — Full blackjack\n`/eco fun dice` — Dice roll\n`/eco fun crash` — Crash game\n\n5% house tax on wins.',
            progress: '📊 **Progression**\n\n`/eco progress level` — View level & XP\n`/eco progress prestige` — Reset for bonuses\n`/eco progress streaks` — Daily streak info\n`/eco info stats` — Detailed statistics',
            banking: '🏦 **Banking**\n\n`/eco bank deposit` — Save Atoms safely\n`/eco bank withdraw` — Take Atoms out\n`/eco bank transfer` — Pay other users (2% tax)\n`/eco bank rob` — Rob someone\'s wallet!'
          };
          const { EmbedBuilder } = require('discord.js');
          const embed = new EmbedBuilder().setColor(0x00ff88).setDescription(helpPages[cat] || 'Category not found.')
            .setFooter({ text: '☢️ Uranium Economy — Use the dropdown to explore more' });
          return interaction.editReply({ embeds: [embed] });
        }

      } catch (err) {
        console.error('[interactionCreateEconomy Error]', {
          message: err.message,
          code: err.code,
          errors: JSON.stringify(err.errors, null, 2),
          method: err.method,
          url: err.url,
          body: JSON.stringify(err.requestBody?.json, null, 2)
        });
        if (!interaction.replied && !interaction.deferred) interaction.reply({ content: '❌ An internal error occurred.', flags: 64 }).catch(() => {});
      }
    }
  }
};
