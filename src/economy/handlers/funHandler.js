const { getBalance, bumpStat, clearExpiredEffects, getActiveEffects, deleteEffect, updateEffect } = require('../../utils/economyStorage');
const { addWalletSafe } = require('../helpers');
const { errorEmbed, successEmbed } = require('../embeds');
const { SLOT_SYMBOLS, SLOT_JACKPOT_MULT, SLOT_PAIR_MULT, BLACKJACK, TAXES } = require('../constants');
const { rollRange, pickRandom } = require('../rng');
const { awardActionXP } = require('../levelSystem');
const { EmbedBuilder } = require('discord.js');
const { blackjackButtons } = require('../components');
const { getActionMultiplier } = require('../service');

const bjGames = new Map();

function cardValue(card) {
  if (['J', 'Q', 'K'].includes(card)) return 10;
  if (card === 'A') return 11;
  return parseInt(card, 10);
}

function handValue(hand) {
  let total = hand.reduce((sum, current) => sum + cardValue(current.card), 0);
  let aces = hand.filter((card) => card.card === 'A').length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function handString(hand) {
  return hand.map((card) => `${card.card}${card.suit}`).join(' ');
}

function buildBlackjackEmbed(user, game, hideDealer = true, note = null) {
  const dealerHand = hideDealer ? [game.dealer[0], { card: '?', suit: '' }] : game.dealer;
  const dealerValue = hideDealer ? '?' : handValue(game.dealer);
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setAuthor({ name: `${user.username}'s Blackjack`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setDescription([
      `Bet: \`${game.bet.toLocaleString()}\``,
      '',
      `Your Hand: ${handString(game.player)} (${handValue(game.player)})`,
      `Dealer: ${handString(dealerHand)} (${dealerValue})`,
      note
    ].filter(Boolean).join('\n'));
}

async function maybeUseGambleBuff(userId) {
  await clearExpiredEffects(userId);
  const effects = await getActiveEffects(userId);
  const effect = effects.find((entry) => entry.key === 'gamble_buff');
  if (!effect) return 0;

  if (effect.usesRemaining !== null && effect.usesRemaining !== undefined) {
    if (effect.usesRemaining <= 1) await deleteEffect(effect.effectId);
    else await updateEffect(effect.effectId, { usesRemaining: effect.usesRemaining - 1 });
  }
  return Number(effect.metadata?.chanceBonus || 0);
}

async function gambleDelta(userId, outcomeDelta) {
  await addWalletSafe(userId, outcomeDelta);
  await bumpStat(userId, 'games_played', 1);
  return awardActionXP(userId, outcomeDelta >= 0 ? 'gamble_win' : 'gamble_lose');
}

module.exports = {
  bjGames,

  async slots(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger('bet', true);
    const balance = await getBalance(userId);
    if (bet <= 0) return interaction.reply({ embeds: [errorEmbed('Bet must be positive.')], flags: 64 });
    if (bet > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms in wallet.')], flags: 64 });

    const actionBoost = await getActionMultiplier(userId, 'gamble');
    const chanceBonus = await maybeUseGambleBuff(userId);
    const spin = () => pickRandom(SLOT_SYMBOLS);
    const symbols = [spin(), spin(), spin()];

    let delta = -bet;
    let text = `\`${symbols.join(' | ')}\` - no match. Lost \`${bet.toLocaleString()}\`.`;
    const rerollWin = chanceBonus > 0 && Math.random() < chanceBonus;

    if ((symbols[0] === symbols[1] && symbols[1] === symbols[2]) || rerollWin) {
      const winnings = Math.floor(bet * SLOT_JACKPOT_MULT * actionBoost.multiplier);
      const tax = Math.floor(winnings * TAXES.GAMBLE);
      delta = winnings - tax;
      text = `\`${symbols.join(' | ')}\` - JACKPOT!\nWon \`${winnings.toLocaleString()}\` (tax \`${tax.toLocaleString()}\`).`;
    } else if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {
      const winnings = Math.floor(bet * SLOT_PAIR_MULT * actionBoost.multiplier);
      delta = winnings - bet;
      text = `\`${symbols.join(' | ')}\` - pair.\nNet: ${delta >= 0 ? '+' : ''}\`${delta.toLocaleString()}\``;
    }

    const xp = await gambleDelta(userId, delta);
    await interaction.reply({ embeds: [delta >= 0 ? successEmbed(`${text}\nXP: +${xp.xpGained}`) : errorEmbed(`${text}\nXP: +${xp.xpGained}`)] });
  },

  async coinflip(interaction) {
    const userId = interaction.user.id;
    const side = interaction.options.getString('side', true).toLowerCase();
    const bet = interaction.options.getInteger('bet', true);
    const balance = await getBalance(userId);
    if (bet <= 0) return interaction.reply({ embeds: [errorEmbed('Bet must be positive.')], flags: 64 });
    if (bet > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms.')], flags: 64 });

    const actionBoost = await getActionMultiplier(userId, 'gamble');
    const chanceBonus = await maybeUseGambleBuff(userId);
    const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
    const win = outcome === side || (outcome !== side && chanceBonus > 0 && Math.random() < chanceBonus);
    const delta = win ? Math.floor(bet * actionBoost.multiplier) : -bet;

    const xp = await gambleDelta(userId, delta);
    const text = `Coin: **${outcome}** - You ${win ? 'won' : 'lost'} ${win ? `\`${delta.toLocaleString()}\`` : `\`${bet.toLocaleString()}\``} Atoms.\nXP: +${xp.xpGained}`;
    await interaction.reply({ embeds: [win ? successEmbed(text) : errorEmbed(text)] });
  },

  async blackjack(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger('bet', true);
    const balance = await getBalance(userId);
    if (bet <= 0) return interaction.reply({ embeds: [errorEmbed('Bet must be positive.')], flags: 64 });
    if (bet > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms.')], flags: 64 });
    if (bjGames.has(userId)) return interaction.reply({ embeds: [errorEmbed('You already have an active blackjack game.')], flags: 64 });

    const deck = [];
    for (const suit of BLACKJACK.SUITS) for (const card of BLACKJACK.DECK) deck.push({ card, suit });
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const gameId = Date.now().toString(36);
    const game = {
      gameId,
      userId,
      bet,
      deck,
      player: [deck.pop(), deck.pop()],
      dealer: [deck.pop(), deck.pop()],
      doubled: false
    };

    bjGames.set(userId, game);
    if (handValue(game.player) === 21) {
      bjGames.delete(userId);
      const actionBoost = await getActionMultiplier(userId, 'gamble');
      const delta = Math.floor(bet * 1.5 * actionBoost.multiplier);
      const xp = await gambleDelta(userId, delta);
      return interaction.reply({
        embeds: [buildBlackjackEmbed(interaction.user, game, false, `Blackjack! Net win: \`${delta.toLocaleString()}\`\nXP: +${xp.xpGained}`)]
      });
    }

    await interaction.reply({ embeds: [buildBlackjackEmbed(interaction.user, game)], components: [blackjackButtons(gameId)] });
  },

  async dice(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger('bet', true);
    const balance = await getBalance(userId);
    if (bet <= 0) return interaction.reply({ embeds: [errorEmbed('Bet must be positive.')], flags: 64 });
    if (bet > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms.')], flags: 64 });

    const actionBoost = await getActionMultiplier(userId, 'gamble');
    const chanceBonus = await maybeUseGambleBuff(userId);
    const player = rollRange(1, 6) + rollRange(1, 6);
    const dealer = rollRange(1, 6) + rollRange(1, 6);
    const win = player > dealer || (player < dealer && chanceBonus > 0 && Math.random() < chanceBonus);
    const tie = player === dealer;
    const delta = tie ? 0 : (win ? Math.floor(bet * actionBoost.multiplier) : -bet);

    const xp = await gambleDelta(userId, tie ? 0 : delta);
    const text = `You rolled **${player}** vs dealer **${dealer}**.\n${tie ? 'Tie.' : win ? `Won \`${delta.toLocaleString()}\`` : `Lost \`${bet.toLocaleString()}\``}\nXP: +${xp.xpGained}`;
    await interaction.reply({ embeds: [tie || win ? successEmbed(text) : errorEmbed(text)] });
  },

  async crash(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger('bet', true);
    const balance = await getBalance(userId);
    if (bet <= 0) return interaction.reply({ embeds: [errorEmbed('Bet must be positive.')], flags: 64 });
    if (bet > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms.')], flags: 64 });

    const actionBoost = await getActionMultiplier(userId, 'gamble');
    const chanceBonus = await maybeUseGambleBuff(userId);
    const crashPoint = 1 + Math.random() * Math.random() * 10;
    const cashout = 1 + Math.random() * (crashPoint - 1);
    const won = cashout < crashPoint || (chanceBonus > 0 && Math.random() < chanceBonus);
    const mult = won ? Math.max(1, Math.floor(cashout * 100) / 100) : 0;
    const winnings = won ? Math.floor(bet * mult * actionBoost.multiplier) : 0;
    const delta = won ? winnings - bet : -bet;

    const xp = await gambleDelta(userId, delta);
    const text = won
      ? `Crashed at **${crashPoint.toFixed(2)}x**. You cashed out at **${mult}x**.\nNet: +\`${delta.toLocaleString()}\`\nXP: +${xp.xpGained}`
      : `Crashed at **${crashPoint.toFixed(2)}x**. You lost \`${bet.toLocaleString()}\`.\nXP: +${xp.xpGained}`;
    await interaction.reply({ embeds: [won ? successEmbed(text) : errorEmbed(text)] });
  },

  async handleBlackjackButton(interaction) {
    const [, , action, gameId] = interaction.customId.split(':');
    const game = bjGames.get(interaction.user.id);
    if (!game || game.gameId !== gameId) {
      return interaction.reply({ embeds: [errorEmbed('This blackjack session expired.')], flags: 64 });
    }

    await interaction.deferUpdate().catch(() => {});

    if (action === 'hit') {
      game.player.push(game.deck.pop());
      if (handValue(game.player) > 21) {
        bjGames.delete(interaction.user.id);
        const xp = await gambleDelta(interaction.user.id, -game.bet);
        return interaction.editReply({
          embeds: [buildBlackjackEmbed(interaction.user, game, false, `Bust. Lost \`${game.bet.toLocaleString()}\`.\nXP: +${xp.xpGained}`)],
          components: []
        });
      }
      return interaction.editReply({ embeds: [buildBlackjackEmbed(interaction.user, game)], components: [blackjackButtons(gameId)] });
    }

    if (action === 'double') {
      const balance = await getBalance(interaction.user.id);
      if (game.doubled || balance.wallet < game.bet * 2) {
        return interaction.followUp({ embeds: [errorEmbed('You cannot double right now.')], flags: 64 }).catch(() => {});
      }
      game.bet *= 2;
      game.doubled = true;
      game.player.push(game.deck.pop());
      if (handValue(game.player) > 21) {
        bjGames.delete(interaction.user.id);
        const xp = await gambleDelta(interaction.user.id, -game.bet);
        return interaction.editReply({
          embeds: [buildBlackjackEmbed(interaction.user, game, false, `Bust on double. Lost \`${game.bet.toLocaleString()}\`.\nXP: +${xp.xpGained}`)],
          components: []
        });
      }
    }

    while (handValue(game.dealer) < 17) {
      game.dealer.push(game.deck.pop());
    }

    const playerValue = handValue(game.player);
    const dealerValue = handValue(game.dealer);
    const actionBoost = await getActionMultiplier(interaction.user.id, 'gamble');
    let delta = 0;
    let note = 'Push.';

    if (dealerValue > 21 || playerValue > dealerValue) {
      delta = Math.floor(game.bet * actionBoost.multiplier);
      note = `You win \`${delta.toLocaleString()}\`.`;
    } else if (playerValue < dealerValue) {
      delta = -game.bet;
      note = `You lose \`${game.bet.toLocaleString()}\`.`;
    }

    bjGames.delete(interaction.user.id);
    const xp = await gambleDelta(interaction.user.id, delta);
    await interaction.editReply({
      embeds: [buildBlackjackEmbed(interaction.user, game, false, `${note}\nXP: +${xp.xpGained}`)],
      components: []
    });
  }
};
