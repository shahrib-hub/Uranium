// src/commands/Economy/eco.js — Uranium Economy v2.0
const { SlashCommandBuilder } = require('discord.js');
const { initEconomy, bumpStat, getBalance, addWallet, addBank, getInventory, getCosmetics, setCosmetics, getStat } = require('../../utils/economyStorage');
const { errorEmbed, successEmbed } = require('../../economy/embeds');
const { getBankTier, getBankLimit, canUseCooldown, setUsedCooldown, addWalletSafe } = require('../../economy/helpers');
const { getShopData, findItem } = require('../../economy/items');
const { shopCategorySelect, shopPaginationButtons, shopBuyButtons, economyHelpSelect } = require('../../economy/components');
const { shopPageEmbed } = require('../../economy/embeds');
const { getUserLevel, canPrestige, doPrestige, awardActionXP } = require('../../economy/levelSystem');
const { getDailyStreak } = require('../../economy/helpers');
const { progressBar } = require('../../economy/rng');
const { TAXES } = require('../../economy/constants');
const { EmbedBuilder } = require('discord.js');

// Import handlers
const infoHandler = require('../../economy/handlers/infoHandler');
const earnHandler = require('../../economy/handlers/earnHandler');
const earnHandler2 = require('../../economy/handlers/earnHandler2');
const funHandler = require('../../economy/handlers/funHandler');

module.exports = {
  devOnly: false,
  data: new SlashCommandBuilder()
    .setName('eco')
    .setDescription('☢️ Uranium Economy System')
    .setDMPermission(false)

    // ═══ INFO GROUP ═══
    .addSubcommandGroup(g => g.setName('info').setDescription('View info & profiles')
      .addSubcommand(s => s.setName('balance').setDescription('View balance').addUserOption(o => o.setName('user').setDescription('User')))
      .addSubcommand(s => s.setName('profile').setDescription('View rich profile').addUserOption(o => o.setName('user').setDescription('User')))
      .addSubcommand(s => s.setName('inventory').setDescription('View inventory').addUserOption(o => o.setName('user').setDescription('User')))
      .addSubcommand(s => s.setName('leaderboard').setDescription('Global leaderboard').addStringOption(o => o.setName('type').setDescription('Type').addChoices({ name: 'Net Worth', value: 'net' }, { name: 'Wallet', value: 'wallet' }, { name: 'Bank', value: 'bank' })))
      .addSubcommand(s => s.setName('stats').setDescription('Detailed stats').addUserOption(o => o.setName('user').setDescription('User')))
      .addSubcommand(s => s.setName('level').setDescription('Level & XP info').addUserOption(o => o.setName('user').setDescription('User')))
    )

    // ═══ BANK GROUP ═══
    .addSubcommandGroup(g => g.setName('bank').setDescription('Banking operations')
      .addSubcommand(s => s.setName('deposit').setDescription('Deposit to bank').addStringOption(o => o.setName('amount').setDescription('Amount or "all"').setRequired(true)))
      .addSubcommand(s => s.setName('withdraw').setDescription('Withdraw from bank').addStringOption(o => o.setName('amount').setDescription('Amount or "all"').setRequired(true)))
      .addSubcommand(s => s.setName('transfer').setDescription('Transfer Atoms').addUserOption(o => o.setName('user').setDescription('Target').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)))
      .addSubcommand(s => s.setName('rob').setDescription('Rob someone (risky!)').addUserOption(o => o.setName('user').setDescription('Target').setRequired(true)))
    )

    // ═══ EARN GROUP ═══
    .addSubcommandGroup(g => g.setName('earn').setDescription('Earn Atoms & XP')
      .addSubcommand(s => s.setName('daily').setDescription('Claim daily reward'))
      .addSubcommand(s => s.setName('work').setDescription('Work a job'))
      .addSubcommand(s => s.setName('crime').setDescription('Commit a crime (risky!)'))
      .addSubcommand(s => s.setName('beg').setDescription('Beg for Atoms'))
      .addSubcommand(s => s.setName('search').setDescription('Search for Atoms'))
      .addSubcommand(s => s.setName('quest').setDescription('View & claim quests'))
      .addSubcommand(s => s.setName('mine').setDescription('Mine for ores and gems'))
      .addSubcommand(s => s.setName('hack').setDescription('Hack a system for data'))
      .addSubcommand(s => s.setName('scavenge').setDescription('Scavenge for scraps'))
      .addSubcommand(s => s.setName('dig').setDescription('Dig for archaeology finds'))
      .addSubcommand(s => s.setName('bounty').setDescription('Hunt a bounty target'))
      .addSubcommand(s => s.setName('reactor').setDescription('Run the nuclear reactor'))
      .addSubcommand(s => s.setName('chop').setDescription('Chop some wood'))
      .addSubcommand(s => s.setName('drill').setDescription('Drill deep underground'))
    )

    // ═══ FUN GROUP ═══
    .addSubcommandGroup(g => g.setName('fun').setDescription('Gambling & games')
      .addSubcommand(s => s.setName('slots').setDescription('Play slots').addIntegerOption(o => o.setName('bet').setDescription('Bet amount').setRequired(true)))
      .addSubcommand(s => s.setName('coinflip').setDescription('Coinflip').addStringOption(o => o.setName('side').setDescription('Side').setRequired(true).addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' })).addIntegerOption(o => o.setName('bet').setDescription('Bet').setRequired(true)))
      .addSubcommand(s => s.setName('blackjack').setDescription('Play blackjack').addIntegerOption(o => o.setName('bet').setDescription('Bet').setRequired(true)))
      .addSubcommand(s => s.setName('dice').setDescription('Roll dice').addIntegerOption(o => o.setName('bet').setDescription('Bet').setRequired(true)))
      .addSubcommand(s => s.setName('crash').setDescription('Crash game').addIntegerOption(o => o.setName('bet').setDescription('Bet').setRequired(true)))
    )

    // ═══ SHOP & SELL ═══
    .addSubcommand(s => s.setName('shop').setDescription('Browse the shop'))
    .addSubcommand(s => s.setName('sell').setDescription('Sell an item').addStringOption(o => o.setName('item').setDescription('Item ID').setRequired(false).setAutocomplete(true)).addIntegerOption(o => o.setName('quantity').setDescription('Qty')))

    // ═══ ADVENTURE GROUP ═══
    .addSubcommandGroup(g => g.setName('adventure').setDescription('Adventures & activities')
      .addSubcommand(s => s.setName('start').setDescription('Start an adventure'))
      .addSubcommand(s => s.setName('hunt').setDescription('Go hunting'))
      .addSubcommand(s => s.setName('fish').setDescription('Go fishing'))
      .addSubcommand(s => s.setName('explore').setDescription('Explore for loot'))
      .addSubcommand(s => s.setName('duel').setDescription('Duel an NPC monster'))
      .addSubcommand(s => s.setName('heist').setDescription('Plan a multi-stage heist'))
    )

    // ═══ PROGRESS GROUP ═══
    .addSubcommandGroup(g => g.setName('progress').setDescription('Levels & prestige')
      .addSubcommand(s => s.setName('level').setDescription('View level info'))
      .addSubcommand(s => s.setName('prestige').setDescription('Prestige (reset for bonuses)'))
      .addSubcommand(s => s.setName('streaks').setDescription('View your streaks'))
    ),

  // ═══════════════════════════════════════
  // AUTOCOMPLETE
  // ═══════════════════════════════════════
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name === 'item') {
      const inv = await getInventory(interaction.user.id);
      const choices = inv.slice(0, 25).map(r => {
        const item = findItem(r.itemId);
        return { name: `${item?.name || r.itemId} (×${r.quantity})`, value: r.itemId };
      });
      await interaction.respond(choices.filter(c => c.name.toLowerCase().includes(focused.value.toLowerCase())));
    }
  },

  // ═══════════════════════════════════════
  // EXECUTE
  // ═══════════════════════════════════════
  async execute(interaction) {
    await initEconomy();
    await bumpStat(interaction.user.id, 'commands_used', 1);

    const { getGlobalEconomyDisabled } = require('../../utils/economyStorage');
    const disabled = await getGlobalEconomyDisabled();
    if (disabled) return interaction.reply({ embeds: [errorEmbed('Economy is temporarily disabled.')], flags: 64 });

    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();

    try {
      // ═══ INFO ═══
      if (group === 'info') {
        if (sub === 'balance') return infoHandler.balance(interaction);
        if (sub === 'profile') return infoHandler.profile(interaction);
        if (sub === 'inventory') return infoHandler.inventory(interaction);
        if (sub === 'leaderboard') return infoHandler.leaderboard(interaction);
        if (sub === 'stats') return infoHandler.stats(interaction);
        if (sub === 'level') return infoHandler.level(interaction);
      }

      // ═══ BANK ═══
      if (group === 'bank') {
        const userId = interaction.user.id;
        const bal = await getBalance(userId);
        const bankLimit = await getBankLimit(userId);

        if (sub === 'deposit') {
          const input = interaction.options.getString('amount', true);
          let amount = input.toLowerCase() === 'all' ? bal.wallet : Math.floor(Number(input));
          if (!amount || amount <= 0) return interaction.reply({ embeds: [errorEmbed('Invalid amount.')], flags: 64 });
          if (amount > bal.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough in wallet.')], flags: 64 });
          if (bal.bank + amount > bankLimit) return interaction.reply({ embeds: [errorEmbed(`Exceeds bank cap of \`${bankLimit.toLocaleString()}\`.`)], flags: 64 });
          await addWallet(userId, -amount); await addBank(userId, amount);
          const newBal = await getBalance(userId);
          return interaction.reply({ embeds: [successEmbed(`Deposited \`${amount.toLocaleString()}\`.\n⚛️ Wallet: \`${newBal.wallet.toLocaleString()}\` • 🏦 Bank: \`${newBal.bank.toLocaleString()}\``)] });
        }

        if (sub === 'withdraw') {
          const input = interaction.options.getString('amount', true);
          let amount = input.toLowerCase() === 'all' ? bal.bank : Math.floor(Number(input));
          if (!amount || amount <= 0) return interaction.reply({ embeds: [errorEmbed('Invalid amount.')], flags: 64 });
          if (amount > bal.bank) return interaction.reply({ embeds: [errorEmbed('Not enough in bank.')], flags: 64 });
          await addBank(userId, -amount); await addWallet(userId, amount);
          const newBal = await getBalance(userId);
          return interaction.reply({ embeds: [successEmbed(`Withdrew \`${amount.toLocaleString()}\`.\n⚛️ Wallet: \`${newBal.wallet.toLocaleString()}\` • 🏦 Bank: \`${newBal.bank.toLocaleString()}\``)] });
        }

        if (sub === 'transfer') {
          const target = interaction.options.getUser('user', true);
          const amount = interaction.options.getInteger('amount', true);
          if (target.bot || target.id === userId) return interaction.reply({ embeds: [errorEmbed('Cannot transfer to that user.')], flags: 64 });
          if (amount <= 0) return interaction.reply({ embeds: [errorEmbed('Amount must be positive.')], flags: 64 });
          if (amount > bal.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms.')], flags: 64 });
          const tax = Math.floor(amount * TAXES.TRANSFER);
          const net = amount - tax;
          await addWallet(userId, -amount); await addWallet(target.id, net);
          return interaction.reply({ embeds: [successEmbed(`Transferred \`${net.toLocaleString()}\` to ${target}.\nTax: \`${tax.toLocaleString()}\` (${(TAXES.TRANSFER * 100).toFixed(0)}%)`)] });
        }

        if (sub === 'rob') {
          const target = interaction.options.getUser('user', true);
          if (target.bot || target.id === userId) return interaction.reply({ embeds: [errorEmbed('Cannot rob that user.')], flags: 64 });
          const aBal = await getBalance(userId);
          const vBal = await getBalance(target.id);
          if (aBal.wallet < 500) return interaction.reply({ embeds: [errorEmbed('Need 500+ Atoms in wallet to rob.')], flags: 64 });
          if (vBal.wallet < 500) return interaction.reply({ embeds: [errorEmbed('Target has too few Atoms.')], flags: 64 });

          const roll = Math.random();
          if (roll < 0.50) {
            const stolen = Math.floor(Math.random() * (vBal.wallet * 0.35)) + 100;
            const clamped = Math.min(stolen, vBal.wallet);
            await addWallet(target.id, -clamped); await addWallet(userId, clamped);
            await bumpStat(userId, 'rob_success', 1);
            const xp = await awardActionXP(userId, 'rob_success');
            return interaction.reply({ embeds: [successEmbed(`You robbed ${target} for \`${clamped.toLocaleString()}\` Atoms! 🧪 +${xp.xpGained} XP`)] });
          } else {
            const penalty = Math.min(aBal.wallet, Math.floor(aBal.wallet * 0.25));
            await addWallet(userId, -penalty); await addWallet(target.id, penalty);
            await bumpStat(userId, 'rob_fail', 1);
            await awardActionXP(userId, 'rob_fail');
            return interaction.reply({ embeds: [errorEmbed(`Robbery failed! Paid ${target} \`${penalty.toLocaleString()}\` as a fine.`)] });
          }
        }
      }

      // ═══ EARN ═══
      if (group === 'earn') {
        if (sub === 'daily') return earnHandler.daily(interaction);
        if (sub === 'work') return earnHandler.work(interaction);
        if (sub === 'crime') return earnHandler.crime(interaction);
        if (sub === 'beg') return earnHandler.beg(interaction);
        if (sub === 'search') return earnHandler.search(interaction);
        if (sub === 'quest') return earnHandler.quest(interaction);
        if (sub === 'mine') return earnHandler2.mine(interaction);
        if (sub === 'hack') return earnHandler2.hack(interaction);
        if (sub === 'scavenge') return earnHandler2.scavenge(interaction);
        if (sub === 'dig') return earnHandler2.dig(interaction);
        if (sub === 'bounty') return earnHandler2.bounty(interaction);
        if (sub === 'reactor') return earnHandler2.reactor(interaction);
        if (sub === 'chop') return earnHandler2.chop(interaction);
        if (sub === 'drill') return earnHandler2.drill(interaction);
      }

      // ═══ FUN ═══
      if (group === 'fun') {
        if (sub === 'slots') return funHandler.slots(interaction);
        if (sub === 'coinflip') return funHandler.coinflip(interaction);
        if (sub === 'blackjack') return funHandler.blackjack(interaction);
        if (sub === 'dice') return funHandler.dice(interaction);
        if (sub === 'crash') return funHandler.crash(interaction);
      }

      // ═══ SHOP ═══
      if (sub === 'shop') {
        const shopData = getShopData();
        const category = shopData.categories[0];
        const perPage = 5;
        const totalPages = Math.max(1, Math.ceil(category.items.length / perPage));
        const items = category.items.slice(0, perPage);
        const embed = shopPageEmbed(interaction.user, category, items, 0, totalPages);
        const rows = [shopCategorySelect(shopData.categories, category.id), shopPaginationButtons(category.id, 0, totalPages), ...shopBuyButtons(items)];
        return interaction.reply({ embeds: [embed], components: rows });
      }

      if (sub === 'sell') {
        const itemId = interaction.options.getString('item');
        const qty = interaction.options.getInteger('quantity') || 1;
        
        if (!itemId) {
          // Premium interactive sell menu
          const { getInventory } = require('../../utils/economyStorage');
          const inv = await getInventory(interaction.user.id);
          const sellable = inv.filter(i => {
            const info = findItem(i.id);
            return info && info.sellPrice > 0 && i.amount >= qty;
          });
          if (!sellable.length) return interaction.reply({ embeds: [errorEmbed('You have nothing sellable in your inventory.')], flags: 64 });
          
          const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
          const options = sellable.slice(0, 25).map(i => {
            const info = findItem(i.id);
            return {
              label: `Sell ${qty}x ${info.name}`,
              description: `For ${((info.sellPrice || 0) * qty).toLocaleString()} Atoms`,
              emoji: info.emoji,
              value: `${i.id}_${qty}`
            };
          });
          
          const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('eco:sell:menu')
              .setPlaceholder('Select an item to sell...')
              .addOptions(options)
          );
          const em = new EmbedBuilder().setColor(0xf1c40f).setTitle('🛒 Sell Items').setDescription(`Choose an item below to sell **${qty}x** of it.\n\n*If you have many items, use the \`/eco sell item:...\` option directly!*`);
          return interaction.reply({ embeds: [em], components: [row] });
        }

        const item = findItem(itemId);
        if (!item) return interaction.reply({ embeds: [errorEmbed('Item not found.')], flags: 64 });
        if (!item.sellPrice) return interaction.reply({ embeds: [errorEmbed('This item cannot be sold.')], flags: 64 });
        const { consumeInventoryItem } = require('../../utils/economyStorage');
        const removed = await consumeInventoryItem(interaction.user.id, itemId, qty);
        if (!removed) return interaction.reply({ embeds: [errorEmbed('You don\'t have enough of that item.')], flags: 64 });
        const total = item.sellPrice * qty;
        await addWalletSafe(interaction.user.id, total);
        await awardActionXP(interaction.user.id, 'sell');
        return interaction.reply({ embeds: [successEmbed(`Sold ${qty}x **${item.name}** for \`${total.toLocaleString()}\` Atoms!`)] });
      }

      // ═══ ADVENTURE ═══
      if (group === 'adventure') {
        if (sub === 'start') return earnHandler.adventure(interaction);
        if (sub === 'hunt') return earnHandler.hunt(interaction);
        if (sub === 'fish') return earnHandler.fish(interaction);
        if (sub === 'explore') return earnHandler.explore(interaction);
        if (sub === 'duel') return earnHandler2.duel(interaction);
        if (sub === 'heist') return earnHandler2.heist(interaction);
      }

      // ═══ PROGRESS ═══
      if (group === 'progress') {
        if (sub === 'level') return infoHandler.level(interaction);

        if (sub === 'prestige') {
          const userId = interaction.user.id;
          const check = await canPrestige(userId);
          if (!check.can) return interaction.reply({ embeds: [errorEmbed(`Cannot prestige: ${check.reason}`)], flags: 64 });
          const bal = await getBalance(userId);
          if (bal.wallet < check.cost) return interaction.reply({ embeds: [errorEmbed(`Need \`${check.cost.toLocaleString()}\` Atoms (you have \`${bal.wallet.toLocaleString()}\`).`)], flags: 64 });
          await addWallet(userId, -check.cost);
          const result = await doPrestige(userId);
          return interaction.reply({ embeds: [successEmbed(`✨ **PRESTIGE ${result.newPrestige}!**\nYour level was reset but you now have a permanent **${((result.multiplier - 1) * 100).toFixed(0)}% earning bonus**!`)] });
        }

        if (sub === 'streaks') {
          const streak = await getDailyStreak(interaction.user.id);
          return interaction.reply({ embeds: [successEmbed(`🔥 **Daily Streak:** \`${streak.streak}\` days\n⚛️ **Multiplier:** \`${streak.multiplier}x\``)] });
        }
      }

      return interaction.reply({ embeds: [errorEmbed('Unknown subcommand.')], flags: 64 });
    } catch (err) {
      console.error('[eco]', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [errorEmbed(err.message || 'Something went wrong.')], flags: 64 }).catch(() => {});
      } else {
        await interaction.followUp({ embeds: [errorEmbed(err.message || 'Something went wrong.')], flags: 64 }).catch(() => {});
      }
    }
  }
};
