// src/economy/handlers/funHandler.js
const { getBalance, bumpStat } = require('../../utils/economyStorage');
const { addWalletSafe } = require('../helpers');
const { errorEmbed, successEmbed } = require('../embeds');
const { SLOT_SYMBOLS, SLOT_JACKPOT_MULT, SLOT_PAIR_MULT, BLACKJACK, TAXES } = require('../constants');
const { rollRange, rollChance, pickRandom } = require('../rng');
const { awardActionXP } = require('../levelSystem');
const { EmbedBuilder } = require('discord.js');
const { blackjackButtons } = require('../components');

// Active blackjack games stored in memory
const bjGames = new Map();

function cardValue(card) {
  if (['J','Q','K'].includes(card)) return 10;
  if (card === 'A') return 11;
  return parseInt(card);
}

function handValue(hand) {
  let total = hand.reduce((s, c) => s + cardValue(c.card), 0);
  let aces = hand.filter(c => c.card === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function handStr(hand) {
  return hand.map(c => `${c.card}${c.suit}`).join(' ');
}

function bjEmbed(user, playerHand, dealerHand, bet, hideDealer = true) {
  const pVal = handValue(playerHand);
  const dHand = hideDealer ? [dealerHand[0], { card: '?', suit: '' }] : dealerHand;
  const dVal = hideDealer ? '?' : handValue(dealerHand);
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setAuthor({ name: `${user.username}'s Blackjack`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setDescription([
      `**Bet:** \`${bet.toLocaleString()}\``,
      '',
      `🃏 **Your Hand:** ${handStr(playerHand)} (${pVal})`,
      `🎰 **Dealer:** ${handStr(dHand)} (${dVal})`
    ].join('\n'));
}

module.exports = {
  bjGames,

  async slots(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger('bet', true);
    const balance = await getBalance(userId);
    if (bet <= 0) return interaction.reply({ embeds: [errorEmbed('Bet must be positive.')], flags: 64 });
    if (bet > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms in wallet.')], flags: 64 });

    const spin = () => pickRandom(SLOT_SYMBOLS);
    const r1 = spin(), r2 = spin(), r3 = spin();
    let delta = -bet, text;

    if (r1 === r2 && r2 === r3) {
      const winnings = Math.floor(bet * SLOT_JACKPOT_MULT);
      const tax = Math.floor(winnings * TAXES.GAMBLE);
      delta = winnings - tax;
      text = `🎰 **JACKPOT!** \`${r1} | ${r2} | ${r3}\`\n⚛️ Won: \`${winnings.toLocaleString()}\` (tax: \`${tax.toLocaleString()}\`)\n☢️ **Net: +\`${delta.toLocaleString()}\`**`;
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
      const winnings = Math.floor(bet * SLOT_PAIR_MULT);
      delta = winnings - bet;
      text = `🎰 \`${r1} | ${r2} | ${r3}\` — Pair!\n⚛️ Net: **${delta >= 0 ? '+' : ''}\`${delta.toLocaleString()}\`**`;
    } else {
      text = `🎰 \`${r1} | ${r2} | ${r3}\` — No match!\n💸 Lost: **\`${bet.toLocaleString()}\`**`;
    }

    await addWalletSafe(userId, delta);
    await bumpStat(userId, 'games_played', 1);
    const xp = await awardActionXP(userId, delta >= 0 ? 'gamble_win' : 'gamble_lose');
    text += `\n🧪 +${xp.xpGained} XP`;
    await interaction.reply({ embeds: [delta >= 0 ? successEmbed(text) : errorEmbed(text)] });
  },

  async coinflip(interaction) {
    const userId = interaction.user.id;
    const side = interaction.options.getString('side', true);
    const bet = interaction.options.getInteger('bet', true);
    const balance = await getBalance(userId);
    if (bet <= 0) return interaction.reply({ embeds: [errorEmbed('Bet must be positive.')], flags: 64 });
    if (bet > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms.')], flags: 64 });

    const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
    const win = outcome === side.toLowerCase();
    const delta = win ? bet : -bet;

    await addWalletSafe(userId, delta);
    await bumpStat(userId, 'games_played', 1);
    const xp = await awardActionXP(userId, win ? 'gamble_win' : 'gamble_lose');
    const text = `⚛️ Coin: **${outcome}** — You **${win ? 'won' : 'lost'}** \`${bet.toLocaleString()}\` Atoms!\n🧪 +${xp.xpGained} XP`;
    await interaction.reply({ embeds: [win ? successEmbed(text) : errorEmbed(text)] });
  },

  async blackjack(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger('bet', true);
    const balance = await getBalance(userId);
    if (bet <= 0) return interaction.reply({ embeds: [errorEmbed('Bet must be positive.')], flags: 64 });
    if (bet > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms.')], flags: 64 });
    if (bjGames.has(userId)) return interaction.reply({ embeds: [errorEmbed('You already have an active game!')], flags: 64 });

    // Build deck
    const deck = [];
    for (const suit of BLACKJACK.SUITS) for (const card of BLACKJACK.DECK) deck.push({ card, suit });
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }

    const player = [deck.pop(), deck.pop()];
    const dealer = [deck.pop(), deck.pop()];
    const gameId = Date.now().toString(36);

    bjGames.set(userId, { deck, player, dealer, bet, gameId, userId });

    // Check natural blackjack
    if (handValue(player) === 21) {
      bjGames.delete(userId);
      const winnings = Math.floor(bet * BLACKJACK.BJ_MULT);
      await addWalletSafe(userId, winnings);
      await bumpStat(userId, 'games_played', 1);
      await awardActionXP(userId, 'gamble_win');
      const embed = bjEmbed(interaction.user, player, dealer, bet, false);
      embed.setColor(0xf1c40f).addFields({ name: '🎉 BLACKJACK!', value: `Won \`${winnings.toLocaleString()}\` Atoms!` });
      return interaction.reply({ embeds: [embed] });
    }

    const embed = bjEmbed(interaction.user, player, dealer, bet, true);
    const row = blackjackButtons(gameId);
    await interaction.reply({ embeds: [embed], components: [row] });
  },

  async dice(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger('bet', true);
    const balance = await getBalance(userId);
    if (bet <= 0) return interaction.reply({ embeds: [errorEmbed('Bet must be positive.')], flags: 64 });
    if (bet > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms.')], flags: 64 });

    const player = rollRange(1, 6) + rollRange(1, 6);
    const dealer = rollRange(1, 6) + rollRange(1, 6);
    const win = player > dealer;
    const tie = player === dealer;
    const delta = tie ? 0 : (win ? bet : -bet);

    await addWalletSafe(userId, delta);
    await bumpStat(userId, 'games_played', 1);
    const xp = await awardActionXP(userId, win ? 'gamble_win' : 'gamble_lose');
    const text = `🎲 You rolled **${player}** vs Dealer's **${dealer}**\n${tie ? '🤝 Tie! Money returned.' : win ? `⚛️ Won \`${bet.toLocaleString()}\`!` : `💸 Lost \`${bet.toLocaleString()}\``}\n🧪 +${xp.xpGained} XP`;
    await interaction.reply({ embeds: [tie ? successEmbed(text) : (win ? successEmbed(text) : errorEmbed(text))] });
  },

  async crash(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger('bet', true);
    const balance = await getBalance(userId);
    if (bet <= 0) return interaction.reply({ embeds: [errorEmbed('Bet must be positive.')], flags: 64 });
    if (bet > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms.')], flags: 64 });

    // Simple crash: random multiplier, auto cash-out
    const crashPoint = 1 + Math.random() * Math.random() * 10; // Skewed toward low
    const cashout = 1 + Math.random() * (crashPoint - 1); // Random auto-cashout before crash
    const won = cashout < crashPoint;
    const mult = won ? Math.floor(cashout * 100) / 100 : 0;
    const winnings = won ? Math.floor(bet * mult) : 0;
    const delta = won ? winnings - bet : -bet;

    await addWalletSafe(userId, delta);
    await bumpStat(userId, 'games_played', 1);
    const xp = await awardActionXP(userId, won ? 'gamble_win' : 'gamble_lose');
    const text = won
      ? `📈 Crashed at **${crashPoint.toFixed(2)}x**! You cashed out at **${mult}x**\n⚛️ Won \`${winnings.toLocaleString()}\`! 🧪 +${xp.xpGained} XP`
      : `💥 Crashed at **${crashPoint.toFixed(2)}x**! You didn't cash out!\n💸 Lost \`${bet.toLocaleString()}\` 🧪 +${xp.xpGained} XP`;
    await interaction.reply({ embeds: [won ? successEmbed(text) : errorEmbed(text)] });
  }
};
