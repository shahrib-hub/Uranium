const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const {
  initEconomy,
  bumpStat,
  getBalance,
  addWallet,
  addBank,
  getInventory,
  getGlobalEconomyDisabled
} = require('../../utils/economyStorage');
const { errorEmbed, successEmbed, shopPageEmbed } = require('../../economy/embeds');
const { getBankLimit, addWalletSafe } = require('../../economy/helpers');
const { getShopData, findItem } = require('../../economy/items');
const { shopCategorySelect, shopPaginationButtons, shopBuyButtons } = require('../../economy/components');
const { canPrestige, doPrestige, awardActionXP } = require('../../economy/levelSystem');
const { TAXES } = require('../../economy/constants');
const { getDailyStreak, sellItem, handleRobProtection, getActionMultiplier } = require('../../economy/service');

const infoHandler = require('../../economy/handlers/infoHandler');
const earnHandler = require('../../economy/handlers/earnHandler');
const earnHandler2 = require('../../economy/handlers/earnHandler2');
const funHandler = require('../../economy/handlers/funHandler');
const gameHandler = require('../../economy/handlers/gameHandler');

module.exports = {
  devOnly: false,
  data: new SlashCommandBuilder()
    .setName('eco')
    .setDescription('Economy system')
    .setDMPermission(false)
    .addSubcommandGroup((group) => group.setName('info').setDescription('View economy info')
      .addSubcommand((sub) => sub.setName('balance').setDescription('View balance').addUserOption((opt) => opt.setName('user').setDescription('Target user')))
      .addSubcommand((sub) => sub.setName('profile').setDescription('View profile').addUserOption((opt) => opt.setName('user').setDescription('Target user')))
      .addSubcommand((sub) => sub.setName('inventory').setDescription('View inventory').addUserOption((opt) => opt.setName('user').setDescription('Target user')))
      .addSubcommand((sub) => sub.setName('leaderboard').setDescription('View leaderboard').addStringOption((opt) => opt.setName('type').setDescription('Board type').addChoices(
        { name: 'Net Worth', value: 'net' },
        { name: 'Wallet', value: 'wallet' },
        { name: 'Bank', value: 'bank' }
      )))
      .addSubcommand((sub) => sub.setName('stats').setDescription('View stats').addUserOption((opt) => opt.setName('user').setDescription('Target user')))
      .addSubcommand((sub) => sub.setName('level').setDescription('View level').addUserOption((opt) => opt.setName('user').setDescription('Target user'))))
    .addSubcommandGroup((group) => group.setName('bank').setDescription('Banking commands')
      .addSubcommand((sub) => sub.setName('deposit').setDescription('Deposit Atoms').addStringOption((opt) => opt.setName('amount').setDescription('Amount or all').setRequired(true)))
      .addSubcommand((sub) => sub.setName('withdraw').setDescription('Withdraw Atoms').addStringOption((opt) => opt.setName('amount').setDescription('Amount or all').setRequired(true)))
      .addSubcommand((sub) => sub.setName('transfer').setDescription('Transfer Atoms').addUserOption((opt) => opt.setName('user').setDescription('Target user').setRequired(true)).addIntegerOption((opt) => opt.setName('amount').setDescription('Amount').setRequired(true)))
      .addSubcommand((sub) => sub.setName('rob').setDescription('Rob another user').addUserOption((opt) => opt.setName('user').setDescription('Target user').setRequired(true))))
    .addSubcommandGroup((group) => group.setName('earn').setDescription('Earn Atoms')
      .addSubcommand((sub) => sub.setName('daily').setDescription('Claim daily reward'))
      .addSubcommand((sub) => sub.setName('work').setDescription('Work a job'))
      .addSubcommand((sub) => sub.setName('crime').setDescription('Commit a crime'))
      .addSubcommand((sub) => sub.setName('beg').setDescription('Beg for Atoms'))
      .addSubcommand((sub) => sub.setName('search').setDescription('Search for Atoms'))
      .addSubcommand((sub) => sub.setName('quest').setDescription('View quests'))
      .addSubcommand((sub) => sub.setName('mine').setDescription('Mine for ores'))
      .addSubcommand((sub) => sub.setName('hack').setDescription('Hack a target'))
      .addSubcommand((sub) => sub.setName('scavenge').setDescription('Scavenge for loot'))
      .addSubcommand((sub) => sub.setName('dig').setDescription('Dig for relics'))
      .addSubcommand((sub) => sub.setName('bounty').setDescription('Claim a bounty'))
      .addSubcommand((sub) => sub.setName('reactor').setDescription('Run the reactor'))
      .addSubcommand((sub) => sub.setName('chop').setDescription('Chop wood'))
      .addSubcommand((sub) => sub.setName('drill').setDescription('Drill underground')))
    .addSubcommandGroup((group) => group.setName('fun').setDescription('Games and gambling')
      .addSubcommand((sub) => sub.setName('slots').setDescription('Play slots').addIntegerOption((opt) => opt.setName('bet').setDescription('Bet amount').setRequired(true)))
      .addSubcommand((sub) => sub.setName('coinflip').setDescription('Flip a coin').addStringOption((opt) => opt.setName('side').setDescription('heads or tails').setRequired(true).addChoices(
        { name: 'Heads', value: 'heads' },
        { name: 'Tails', value: 'tails' }
      )).addIntegerOption((opt) => opt.setName('bet').setDescription('Bet amount').setRequired(true)))
      .addSubcommand((sub) => sub.setName('blackjack').setDescription('Play blackjack').addIntegerOption((opt) => opt.setName('bet').setDescription('Bet amount').setRequired(true)))
      .addSubcommand((sub) => sub.setName('dice').setDescription('Roll dice').addIntegerOption((opt) => opt.setName('bet').setDescription('Bet amount').setRequired(true)))
      .addSubcommand((sub) => sub.setName('crash').setDescription('Play crash').addIntegerOption((opt) => opt.setName('bet').setDescription('Bet amount').setRequired(true))))
    .addSubcommand((sub) => sub.setName('shop').setDescription('Browse the shop'))
    .addSubcommand((sub) => sub.setName('sell').setDescription('Sell an item')
      .addStringOption((opt) => opt.setName('item').setDescription('Item id').setAutocomplete(true))
      .addIntegerOption((opt) => opt.setName('quantity').setDescription('Quantity')))
    .addSubcommandGroup((group) => group.setName('games').setDescription('Interactive games')
      .addSubcommand((sub) => sub.setName('mines').setDescription('Play Mines').addIntegerOption((opt) => opt.setName('bet').setDescription('Bet amount').setRequired(true)).addIntegerOption((opt) => opt.setName('mines').setDescription('Number of mines (1-20, default 3)')))
      .addSubcommand((sub) => sub.setName('roulette').setDescription('Play Roulette').addIntegerOption((opt) => opt.setName('bet').setDescription('Bet amount').setRequired(true)))
      .addSubcommand((sub) => sub.setName('highlow').setDescription('Play High-Low').addIntegerOption((opt) => opt.setName('bet').setDescription('Bet amount').setRequired(true)))
      .addSubcommand((sub) => sub.setName('scratch').setDescription('Play Scratch Card').addIntegerOption((opt) => opt.setName('bet').setDescription('Bet amount').setRequired(true)))
      .addSubcommand((sub) => sub.setName('tower').setDescription('Play Tower').addIntegerOption((opt) => opt.setName('bet').setDescription('Bet amount').setRequired(true))))
    .addSubcommandGroup((group) => group.setName('adventure').setDescription('Adventure commands')
      .addSubcommand((sub) => sub.setName('start').setDescription('Start an adventure'))
      .addSubcommand((sub) => sub.setName('hunt').setDescription('Go hunting'))
      .addSubcommand((sub) => sub.setName('fish').setDescription('Go fishing'))
      .addSubcommand((sub) => sub.setName('explore').setDescription('Explore for loot'))
      .addSubcommand((sub) => sub.setName('duel').setDescription('Duel an NPC'))
      .addSubcommand((sub) => sub.setName('heist').setDescription('Run a heist')))
    .addSubcommandGroup((group) => group.setName('progress').setDescription('Progression')
      .addSubcommand((sub) => sub.setName('level').setDescription('View level progress'))
      .addSubcommand((sub) => sub.setName('prestige').setDescription('Prestige your profile'))
      .addSubcommand((sub) => sub.setName('streaks').setDescription('View streaks'))),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name !== 'item') return;

    const inventory = await getInventory(interaction.user.id);
    const choices = inventory.slice(0, 25).map((entry) => {
      const item = findItem(entry.itemId);
      return {
        name: `${item?.name || entry.itemId} (x${entry.quantity})`,
        value: entry.itemId
      };
    });
    await interaction.respond(choices.filter((choice) => choice.name.toLowerCase().includes(focused.value.toLowerCase())));
  },

  async execute(interaction) {
    await initEconomy();
    await bumpStat(interaction.user.id, 'commands_used', 1);

    if (await getGlobalEconomyDisabled()) {
      return interaction.reply({ embeds: [errorEmbed('Economy is temporarily disabled.')], flags: 64 });
    }

    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    try {
      if (group === 'info') {
        if (sub === 'balance') return infoHandler.balance(interaction);
        if (sub === 'profile') return infoHandler.profile(interaction);
        if (sub === 'inventory') return infoHandler.inventory(interaction);
        if (sub === 'leaderboard') return infoHandler.leaderboard(interaction);
        if (sub === 'stats') return infoHandler.stats(interaction);
        if (sub === 'level') return infoHandler.level(interaction);
      }

      if (group === 'bank') {
        const userId = interaction.user.id;
        const balance = await getBalance(userId);
        const bankLimit = await getBankLimit(userId);

        if (sub === 'deposit') {
          const raw = interaction.options.getString('amount', true);
          const amount = raw.toLowerCase() === 'all' ? balance.wallet : Math.floor(Number(raw));
          if (!amount || amount <= 0) return interaction.reply({ embeds: [errorEmbed('Invalid amount.')], flags: 64 });
          if (amount > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough in wallet.')], flags: 64 });
          if (balance.bank + amount > bankLimit) return interaction.reply({ embeds: [errorEmbed(`That exceeds your bank cap of \`${bankLimit.toLocaleString()}\`.`)], flags: 64 });
          await addWallet(userId, -amount);
          await addBank(userId, amount);
          const next = await getBalance(userId);
          return interaction.reply({ embeds: [successEmbed(`Deposited \`${amount.toLocaleString()}\`.\nWallet: \`${next.wallet.toLocaleString()}\` | Bank: \`${next.bank.toLocaleString()}\``)] });
        }

        if (sub === 'withdraw') {
          const raw = interaction.options.getString('amount', true);
          const amount = raw.toLowerCase() === 'all' ? balance.bank : Math.floor(Number(raw));
          if (!amount || amount <= 0) return interaction.reply({ embeds: [errorEmbed('Invalid amount.')], flags: 64 });
          if (amount > balance.bank) return interaction.reply({ embeds: [errorEmbed('Not enough in bank.')], flags: 64 });
          await addBank(userId, -amount);
          await addWallet(userId, amount);
          const next = await getBalance(userId);
          return interaction.reply({ embeds: [successEmbed(`Withdrew \`${amount.toLocaleString()}\`.\nWallet: \`${next.wallet.toLocaleString()}\` | Bank: \`${next.bank.toLocaleString()}\``)] });
        }

        if (sub === 'transfer') {
          const target = interaction.options.getUser('user', true);
          const amount = interaction.options.getInteger('amount', true);
          if (target.bot || target.id === userId) return interaction.reply({ embeds: [errorEmbed('Choose a valid user.')], flags: 64 });
          if (amount <= 0) return interaction.reply({ embeds: [errorEmbed('Amount must be positive.')], flags: 64 });
          if (amount > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms.')], flags: 64 });
          const tax = Math.floor(amount * TAXES.TRANSFER);
          const net = amount - tax;
          await addWallet(userId, -amount);
          await addWallet(target.id, net);
          return interaction.reply({ embeds: [successEmbed(`Transferred \`${net.toLocaleString()}\` to ${target}.\nTax: \`${tax.toLocaleString()}\`.`)] });
        }

        if (sub === 'rob') {
          const target = interaction.options.getUser('user', true);
          if (target.bot || target.id === userId) return interaction.reply({ embeds: [errorEmbed('Choose a valid robbery target.')], flags: 64 });

          const robberBalance = await getBalance(userId);
          const victimBalance = await getBalance(target.id);
          if (robberBalance.wallet < 500) return interaction.reply({ embeds: [errorEmbed('You need at least 500 Atoms in your wallet to rob someone.')], flags: 64 });
          if (victimBalance.wallet < 500) return interaction.reply({ embeds: [errorEmbed('That user does not have enough Atoms to rob.')], flags: 64 });

          await bumpStat(userId, 'rob_used', 1);
          const robBoost = await getActionMultiplier(userId, 'rob');
          const protection = await handleRobProtection(userId, target.id, victimBalance.wallet);

          if (protection.blocked) {
            await bumpStat(userId, 'rob_fail', 1);
            const xp = await awardActionXP(userId, 'rob_fail');
            return interaction.reply({
              embeds: [errorEmbed(`${target.username} blocked your robbery${protection.source ? ` with **${protection.source.name}**` : ''}.\nXP: +${xp.xpGained}`)]
            });
          }

          const successChance = Math.min(0.92, Math.max(0.1, 0.5 * robBoost.multiplier * (1 - Number(protection.successPenalty || 0))));
          if (Math.random() < successChance) {
            const stolenBase = Math.floor(Math.random() * Math.max(200, victimBalance.wallet * 0.35)) + 100;
            const stolen = Math.min(victimBalance.wallet, Math.floor(stolenBase * Math.max(1, robBoost.multiplier)));
            await addWallet(target.id, -stolen);
            await addWallet(userId, stolen);
            await bumpStat(userId, 'rob_success', 1);
            const xp = await awardActionXP(userId, 'rob_success');
            const extra = protection.counterLoss > 0 ? `\nCounter trap hit you for \`${protection.counterLoss.toLocaleString()}\` Atoms.` : '';
            return interaction.reply({
              embeds: [successEmbed(`You robbed ${target} for \`${stolen.toLocaleString()}\` Atoms.${extra}\nXP: +${xp.xpGained}`)]
            });
          }

          const penalty = Math.min(robberBalance.wallet, Math.floor(robberBalance.wallet * 0.25));
          await addWallet(userId, -penalty);
          await addWallet(target.id, penalty);
          await bumpStat(userId, 'rob_fail', 1);
          const xp = await awardActionXP(userId, 'rob_fail');
          const extra = protection.counterLoss > 0 ? `\nCounter trap hit you for \`${protection.counterLoss.toLocaleString()}\` Atoms too.` : '';
          return interaction.reply({
            embeds: [errorEmbed(`Robbery failed. You paid ${target} \`${penalty.toLocaleString()}\` in damages.${extra}\nXP: +${xp.xpGained}`)]
          });
        }
      }

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

      if (group === 'fun') {
        if (sub === 'slots') return funHandler.slots(interaction);
        if (sub === 'coinflip') return funHandler.coinflip(interaction);
        if (sub === 'blackjack') return funHandler.blackjack(interaction);
        if (sub === 'dice') return funHandler.dice(interaction);
        if (sub === 'crash') return funHandler.crash(interaction);
      }

      if (group === 'games') {
        if (sub === 'mines') return gameHandler.startMines(interaction);
        if (sub === 'roulette') return gameHandler.startRoulette(interaction);
        if (sub === 'highlow') return gameHandler.startHighLow(interaction);
        if (sub === 'scratch') return gameHandler.startScratch(interaction);
        if (sub === 'tower') return gameHandler.startTower(interaction);
      }

      if (sub === 'shop') {
        const shopData = getShopData();
        const category = shopData.categories[0];
        const perPage = 5;
        const totalPages = Math.max(1, Math.ceil(category.items.length / perPage));
        const items = category.items.slice(0, perPage);
        return interaction.reply({
          embeds: [shopPageEmbed(interaction.user, category, items, 0, totalPages)],
          components: [
            shopCategorySelect(shopData.categories, category.id),
            shopPaginationButtons(category.id, 0, totalPages),
            ...shopBuyButtons(items)
          ]
        });
      }

      if (sub === 'sell') {
        const itemId = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity') || 1;

        if (!itemId) {
          const inventory = await getInventory(interaction.user.id);
          const sellable = inventory.filter((entry) => {
            const item = findItem(entry.itemId);
            return item && item.sellPrice > 0 && entry.quantity >= quantity;
          });
          if (!sellable.length) {
            return interaction.reply({ embeds: [errorEmbed('You have nothing sellable in your inventory.')], flags: 64 });
          }

          const options = sellable.slice(0, 25).map((entry) => {
            const item = findItem(entry.itemId);
            return {
              label: `Sell ${quantity}x ${item.name}`,
              description: `${((item.sellPrice || 0) * quantity).toLocaleString()} Atoms`,
              emoji: item.emoji,
              value: `${entry.itemId}_${quantity}`
            };
          });

          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle('Sell Items').setDescription(`Choose an item to sell **${quantity}x**.`)],
            components: [
              new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId('eco:sell:menu')
                  .setPlaceholder('Select an item to sell')
                  .addOptions(options)
              )
            ]
          });
        }

        const result = await sellItem(interaction.user.id, itemId, quantity);
        return interaction.reply({ embeds: [successEmbed(`Sold ${quantity}x **${result.item.name}** for \`${result.total.toLocaleString()}\` Atoms.`)] });
      }

      if (group === 'adventure') {
        if (sub === 'start') return earnHandler.adventure(interaction);
        if (sub === 'hunt') return earnHandler.hunt(interaction);
        if (sub === 'fish') return earnHandler.fish(interaction);
        if (sub === 'explore') return earnHandler.explore(interaction);
        if (sub === 'duel') return earnHandler2.duel(interaction);
        if (sub === 'heist') return earnHandler2.heist(interaction);
      }

      if (group === 'progress') {
        if (sub === 'level') return infoHandler.level(interaction);
        if (sub === 'streaks') {
          const streak = await getDailyStreak(interaction.user.id);
          return interaction.reply({ embeds: [successEmbed(`Daily streak: \`${streak.streak}\` day(s)\nMultiplier: \`${streak.multiplier}x\``)] });
        }
        if (sub === 'prestige') {
          const userId = interaction.user.id;
          const check = await canPrestige(userId);
          if (!check.can) return interaction.reply({ embeds: [errorEmbed(check.reason)], flags: 64 });
          const balance = await getBalance(userId);
          if (balance.wallet < check.cost) {
            return interaction.reply({ embeds: [errorEmbed(`Need \`${check.cost.toLocaleString()}\` Atoms. You have \`${balance.wallet.toLocaleString()}\`.`)], flags: 64 });
          }
          await addWallet(userId, -check.cost);
          const result = await doPrestige(userId);
          return interaction.reply({
            embeds: [successEmbed(`Prestiged to **${result.newPrestige}**.\nPermanent earning bonus: **${((result.multiplier - 1) * 100).toFixed(0)}%**.`)]
          });
        }
      }

      return interaction.reply({ embeds: [errorEmbed('Unknown subcommand.')], flags: 64 });
    } catch (error) {
      console.error('[eco]', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [errorEmbed(error.message || 'Something went wrong.')], flags: 64 }).catch(() => {});
      } else {
        await interaction.followUp({ embeds: [errorEmbed(error.message || 'Something went wrong.')], flags: 64 }).catch(() => {});
      }
    }
  }
};
