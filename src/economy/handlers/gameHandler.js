const {
  getBalance,
  bumpStat,
  clearExpiredEffects,
  getActiveEffects,
  updateEffect,
  deleteEffect
} = require('../../utils/economyStorage');
const { addWalletSafe } = require('../helpers');
const { errorEmbed, successEmbed } = require('../embeds');
const { getActionMultiplier } = require('../service');
const { awardActionXP } = require('../levelSystem');
const {
  TAXES,
  ROULETTE_NUMBERS,
  ROULETTE_REDS,
  HIGHLOW_DECK,
  HIGHLOW_VALUES,
  SCRATCH_SYMBOLS,
  SCRATCH_PAYOUTS,
  TOWER_CONFIG,
  MINES_CONFIG
} = require('../constants');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

// ═══════════════════════════════════════════════════════════
// 🎮 GAME SESSION STORES
// ═══════════════════════════════════════════════════════════
const minesGames = new Map();
const rouletteGames = new Map();
const highlowGames = new Map();
const scratchGames = new Map();
const towerGames = new Map();

// ═══════════════════════════════════════════════════════════
// 🛡️ HELPER: Gamble buff check
// ═══════════════════════════════════════════════════════════
async function maybeUseGambleBuff(userId) {
  await clearExpiredEffects(userId);
  const effects = await getActiveEffects(userId);
  const effect = effects.find((e) => e.key === 'gamble_buff');
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

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function roll(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ═══════════════════════════════════════════════════════════
// 💣 MINES GAME
// ═══════════════════════════════════════════════════════════

function buildMinesEmbed(user, game, reveal = false) {
  const gridEmojis = [];
  for (let i = 0; i < 25; i++) {
    if (game.revealed.includes(i)) {
      gridEmojis.push(game.mines.includes(i) ? '💥' : '💎');
    } else if (reveal) {
      gridEmojis.push(game.mines.includes(i) ? '💣' : '💎');
    } else {
      gridEmojis.push('⬛');
    }
  }

  const rows = [];
  for (let r = 0; r < 5; r++) {
    const row = gridEmojis.slice(r * 5, r * 5 + 5).join(' ');
    rows.push(row);
  }

  const gems = game.revealed.filter((i) => !game.mines.includes(i)).length;
  const mult = MINES_CONFIG.gemMultiplier(game.mineCount, gems);
  const potential = Math.floor(game.bet * mult);

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setAuthor({ name: `${user.username}'s Mines`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setDescription([
      `💣 Mines: **${game.mineCount}** | 💎 Gems: **${gems}**`,
      `💰 Bet: \`${game.bet.toLocaleString()}\` | Potential: \`${potential.toLocaleString()}\``,
      `📈 Multiplier: **${mult.toFixed(2)}x**`,
      '',
      rows.join('\n')
    ].join('\n'))
    .setFooter({ text: 'Click a tile to reveal. Cashout before hitting a mine!' });

  return embed;
}

function buildMinesButtons(gameId, revealed) {
  const rows = [];
  for (let r = 0; r < 5; r++) {
    const buttons = [];
    for (let c = 0; c < 5; c++) {
      const idx = r * 5 + c;
      const disabled = revealed.includes(idx);
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`eco:mines:click:${r}:${c}`)
          .setEmoji('⬛')
          .setStyle(disabled ? 2 : 2)
          .setDisabled(disabled)
      );
    }
    rows.push(new ActionRowBuilder().addComponents(buttons));
  }

  const actionRow = new ActionRowBuilder().addComponents([
    new ButtonBuilder().setCustomId('eco:mines:cashout').setLabel('💰 Cashout').setStyle(3),
    new ButtonBuilder().setCustomId('eco:mines:quit').setLabel('❌ Quit').setStyle(4)
  ]);

  return [...rows, actionRow];
}

async function startMines(interaction) {
  const userId = interaction.user.id;
  const bet = interaction.options.getInteger('bet', true);
  const mines = interaction.options.getInteger('mines') || 3;

  if (bet <= 0) return interaction.reply({ embeds: [errorEmbed('Bet must be positive.')], flags: 64 });
  if (mines < 1 || mines > 20) return interaction.reply({ embeds: [errorEmbed('Mines must be between 1 and 20.')], flags: 64 });

  const balance = await getBalance(userId);
  if (bet > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms in wallet.')], flags: 64 });
  if (minesGames.has(userId)) return interaction.reply({ embeds: [errorEmbed('You already have an active Mines game.')], flags: 64 });

  // Generate mine positions
  const positions = Array.from({ length: 25 }, (_, i) => i);
  const shuffled = shuffle(positions);
  const minePositions = new Set(shuffled.slice(0, mines));

  const game = {
    userId,
    bet,
    mineCount: mines,
    mines: minePositions,
    revealed: [],
    startedAt: Date.now()
  };

  minesGames.set(userId, game);

  await interaction.reply({
    embeds: [buildMinesEmbed(interaction.user, game)],
    components: buildMinesButtons(game.gameId || Date.now().toString(), [])
  });
}

async function handleMinesClick(interaction) {
  const [, , , rowStr, colStr] = interaction.customId.split(':');
  const row = parseInt(rowStr, 10);
  const col = parseInt(colStr, 10);
  const idx = row * 5 + col;

  const game = minesGames.get(interaction.user.id);
  if (!game) return interaction.reply({ embeds: [errorEmbed('No active Mines game.')], flags: 64 });
  if (game.revealed.includes(idx)) return interaction.deferUpdate().catch(() => {});

  game.revealed.push(idx);

  if (game.mines.has(idx)) {
    // Hit a mine - game over
    minesGames.delete(interaction.user.id);
    const xp = await gambleDelta(interaction.user.id, -game.bet);

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setAuthor({ name: `${interaction.user.username}'s Mines - GAME OVER`, iconURL: interaction.user.displayAvatarURL({ size: 128 }) })
      .setDescription([
        `💥 You hit a mine! Lost \`${game.bet.toLocaleString()}\`.`,
        `💣 Mines: ${game.mineCount} | 💎 Found: ${game.revealed.filter((i) => !game.mines.has(i)).length}`,
        `XP: +${xp.xpGained}`
      ].join('\n'));

    const revealedEmbed = buildMinesEmbed(interaction.user, game, true);
    return interaction.update({
      embeds: [embed, revealedEmbed],
      components: []
    });
  }

  // Safe! Continue
  const gems = game.revealed.filter((i) => !game.mines.has(i)).length;
  const mult = MINES_CONFIG.gemMultiplier(game.mineCount, gems);
  const potential = Math.floor(game.bet * mult);

  if (game.revealed.length === 25 - game.mineCount) {
    // Cleared all safe tiles - jackpot!
    minesGames.delete(interaction.user.id);
    const winnings = Math.floor(game.bet * mult);
    const tax = Math.floor(winnings * TAXES.GAMBLE);
    const net = winnings - tax;
    const xp = await gambleDelta(interaction.user.id, net);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setAuthor({ name: `${interaction.user.username}'s Mines - JACKPOT!`, iconURL: interaction.user.displayAvatarURL({ size: 128 }) })
      .setDescription([
        `🏆 You cleared all safe tiles!`,
        `💰 Won \`${winnings.toLocaleString()}\` (tax \`${tax.toLocaleString()}\`).`,
        `Net: +\`${net.toLocaleString()}\` | Multiplier: **${mult.toFixed(2)}x**`,
        `XP: +${xp.xpGained}`
      ].join('\n'));

    return interaction.update({ embeds: [embed], components: [] });
  }

  await interaction.update({
    embeds: [buildMinesEmbed(interaction.user, game)],
    components: buildMinesButtons(game.gameId || '', game.revealed)
  });
}

async function handleMinesCayout(interaction) {
  const game = minesGames.get(interaction.user.id);
  if (!game) return interaction.reply({ embeds: [errorEmbed('No active Mines game.')], flags: 64 });

  const gems = game.revealed.filter((i) => !game.mines.has(i)).length;
  const mult = MINES_CONFIG.gemMultiplier(game.mineCount, gems);
  const winnings = Math.floor(game.bet * mult);
  const tax = Math.floor(winnings * TAXES.GAMBLE);
  const net = winnings - tax;

  minesGames.delete(interaction.user.id);
  const xp = await gambleDelta(interaction.user.id, net);

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setAuthor({ name: `${interaction.user.username} Cashed Out!`, iconURL: interaction.user.displayAvatarURL({ size: 128 }) })
    .setDescription([
      `💰 Won \`${winnings.toLocaleString()}\` (tax \`${tax.toLocaleString()}\`).`,
      `Net: +\`${net.toLocaleString()}\` | Multiplier: **${mult.toFixed(2)}x**`,
      `💎 Gems found: ${gems}`,
      `XP: +${xp.xpGained}`
    ].join('\n'));

  const revealedEmbed = buildMinesEmbed(interaction.user, game, true);
  return interaction.update({ embeds: [embed, revealedEmbed], components: [] });
}

async function handleMinesQuit(interaction) {
  const game = minesGames.get(interaction.user.id);
  if (!game) return interaction.reply({ embeds: [errorEmbed('No active Mines game.')], flags: 64 });

  minesGames.delete(interaction.user.id);
  const revealedEmbed = buildMinesEmbed(interaction.user, game, true);

  return interaction.update({
    embeds: [new EmbedBuilder().setColor(0x95a5a6).setTitle('Mines - Quit').setDescription('You quit the game. No winnings.'), revealedEmbed],
    components: []
  });
}

// ═══════════════════════════════════════════════════════════
// 🎡 ROULETTE GAME
// ═══════════════════════════════════════════════════════════

const ROULETTE_BET_TYPES = {
  straight: { name: 'Straight (Single)', mult: 35 },
  split: { name: 'Split (Two)', mult: 17 },
  street: { name: 'Street (Three)', mult: 11 },
  corner: { name: 'Corner (Four)', mult: 8 },
  sixline: { name: 'Six Line', mult: 5 },
  red: { name: 'Red', mult: 2 },
  black: { name: 'Black', mult: 2 },
  even: { name: 'Even', mult: 2 },
  odd: { name: 'Odd', mult: 2 },
  low: { name: '1-18', mult: 2 },
  high: { name: '19-36', mult: 2 },
  dozen1: { name: '1st Dozen', mult: 3 },
  dozen2: { name: '2nd Dozen', mult: 3 },
  dozen3: { name: '3rd Dozen', mult: 3 },
  column1: { name: '1st Column', mult: 3 },
  column2: { name: '2nd Column', mult: 3 },
  column3: { name: '3rd Column', mult: 3 }
};

function isRed(num) {
  return num !== 0 && ROULETTE_REDS.has(num);
}

function buildRouletteEmbed(user, game, spinning = false) {
  const resultDisplay = game.wonNumber !== null
    ? `🎰 Result: **${game.wonNumber}** ${game.wonNumber === 0 ? '🟢' : isRed(game.wonNumber) ? '🔴' : '⚫'}`
    : spinning
      ? '🎰 Spinning... 🎰'
      : '🎰 Place your bets!';

  const totalBet = Object.values(game.bets).reduce((a, b) => a + b, 0);
  const betsDisplay = Object.entries(game.bets)
    .filter(([, amt]) => amt > 0)
    .map(([type, amt]) => `• ${ROULETTE_BET_TYPES[type]?.name || type}: \`${amt.toLocaleString()}\``)
    .join('\n') || 'No bets placed.';

  return new EmbedBuilder()
    .setColor(0xe67e22)
    .setAuthor({ name: `${user.username}'s Roulette`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setDescription([
      resultDisplay,
      '',
      `💰 Total Bet: \`${totalBet.toLocaleString()}\` | Current Bet: \`${game.currentBet.toLocaleString()}\``,
      '',
      '**Your Bets:**',
      betsDisplay
    ].join('\n'))
    .setFooter({ text: spinning ? 'The wheel is spinning...' : 'Select a bet type below.' });
}

function buildRouletteButtons(currentBet) {
  const mainRow = new ActionRowBuilder().addComponents([
    new ButtonBuilder().setCustomId('eco:roulette:bet:red').setLabel('🔴 Red (2x)').setStyle(1).setDisabled(currentBet <= 0),
    new ButtonBuilder().setCustomId('eco:roulette:bet:black').setLabel('⚫ Black (2x)').setStyle(1).setDisabled(currentBet <= 0),
    new ButtonBuilder().setCustomId('eco:roulette:bet:even').setLabel('🔢 Even (2x)').setStyle(1).setDisabled(currentBet <= 0),
    new ButtonBuilder().setCustomId('eco:roulette:bet:odd').setLabel('🔠 Odd (2x)').setStyle(1).setDisabled(currentBet <= 0)
  ]);

  const secondRow = new ActionRowBuilder().addComponents([
    new ButtonBuilder().setCustomId('eco:roulette:bet:low').setLabel('1-18 (2x)').setStyle(2).setDisabled(currentBet <= 0),
    new ButtonBuilder().setCustomId('eco:roulette:bet:high').setLabel('19-36 (2x)').setStyle(2).setDisabled(currentBet <= 0),
    new ButtonBuilder().setCustomId('eco:roulette:bet:dozen1').setLabel('1st 12 (3x)').setStyle(2).setDisabled(currentBet <= 0),
    new ButtonBuilder().setCustomId('eco:roulette:bet:dozen2').setLabel('2nd 12 (3x)').setStyle(2).setDisabled(currentBet <= 0),
    new ButtonBuilder().setCustomId('eco:roulette:bet:dozen3').setLabel('3rd 12 (3x)').setStyle(2).setDisabled(currentBet <= 0)
  ]);

  const thirdRow = new ActionRowBuilder().addComponents([
    new ButtonBuilder().setCustomId('eco:roulette:spin').setLabel('🎰 SPIN!').setStyle(3),
    new ButtonBuilder().setCustomId('eco:roulette:clear').setLabel('🗑️ Clear').setStyle(4)
  ]);

  return [mainRow, secondRow, thirdRow];
}

async function startRoulette(interaction) {
  const userId = interaction.user.id;
  const bet = interaction.options.getInteger('bet', true);

  if (bet <= 0) return interaction.reply({ embeds: [errorEmbed('Bet must be positive.')], flags: 64 });
  const balance = await getBalance(userId);
  if (bet > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms in wallet.')], flags: 64 });

  // Deduct bet from wallet
  await addWalletSafe(userId, -bet);

  const game = {
    userId,
    bet,
    currentBet: bet,
    bets: { straight: 0, split: 0, street: 0, corner: 0, sixline: 0, red: 0, black: 0, even: 0, odd: 0, low: 0, high: 0, dozen1: 0, dozen2: 0, dozen3: 0, column1: 0, column2: 0, column3: 0 },
    wonNumber: null,
    startedAt: Date.now()
  };

  rouletteGames.set(userId, game);

  await interaction.reply({
    embeds: [buildRouletteEmbed(interaction.user, game)],
    components: buildRouletteButtons(game.currentBet)
  });
}

async function handleRouletteBet(interaction) {
  const game = rouletteGames.get(interaction.user.id);
  if (!game) return interaction.reply({ embeds: [errorEmbed('No active roulette game.')], flags: 64 });

  const [, , , betType] = interaction.customId.split(':');
  const betAmount = game.currentBet;

  if (game.bets[betType] === undefined) {
    return interaction.reply({ embeds: [errorEmbed('Invalid bet type.')], flags: 64 });
  }

  game.bets[betType] += betAmount;

  await interaction.update({
    embeds: [buildRouletteEmbed(interaction.user, game)],
    components: buildRouletteButtons(game.currentBet)
  });
}

async function handleRouletteSpin(interaction) {
  const game = rouletteGames.get(interaction.user.id);
  if (!game) return interaction.reply({ embeds: [errorEmbed('No active roulette game.')], flags: 64 });

  const totalBet = Object.values(game.bets).reduce((a, b) => a + b, 0);
  if (totalBet === 0) return interaction.reply({ embeds: [errorEmbed('Place at least one bet first!')], flags: 64 });

  // Spin the wheel
  const winningNumber = ROULETTE_NUMBERS[Math.floor(Math.random() * ROULETTE_NUMBERS.length)];
  game.wonNumber = winningNumber;

  // Calculate winnings
  let totalWin = 0;
  const winningBets = [];

  if (game.bets.straight > 0 && winningNumber === game.bets.straight) {
    totalWin += game.bets.straight * ROULETTE_BET_TYPES.straight.mult;
    winningBets.push(`Straight ${winningNumber}: +\`${Math.floor(game.bets.straight * 35).toLocaleString()}\``);
  }
  if (game.bets.red > 0 && isRed(winningNumber)) {
    totalWin += game.bets.red * 2;
    winningBets.push(`Red: +\`${Math.floor(game.bets.red * 2).toLocaleString()}\``);
  }
  if (game.bets.black > 0 && winningNumber !== 0 && !isRed(winningNumber)) {
    totalWin += game.bets.black * 2;
    winningBets.push(`Black: +\`${Math.floor(game.bets.black * 2).toLocaleString()}\``);
  }
  if (game.bets.even > 0 && winningNumber % 2 === 0 && winningNumber !== 0) {
    totalWin += game.bets.even * 2;
    winningBets.push(`Even: +\`${Math.floor(game.bets.even * 2).toLocaleString()}\``);
  }
  if (game.bets.odd > 0 && winningNumber % 2 !== 0) {
    totalWin += game.bets.odd * 2;
    winningBets.push(`Odd: +\`${Math.floor(game.bets.odd * 2).toLocaleString()}\``);
  }
  if (game.bets.low > 0 && winningNumber >= 1 && winningNumber <= 18) {
    totalWin += game.bets.low * 2;
    winningBets.push(`1-18: +\`${Math.floor(game.bets.low * 2).toLocaleString()}\``);
  }
  if (game.bets.high > 0 && winningNumber >= 19 && winningNumber <= 36) {
    totalWin += game.bets.high * 2;
    winningBets.push(`19-36: +\`${Math.floor(game.bets.high * 2).toLocaleString()}\``);
  }
  if (game.bets.dozen1 > 0 && winningNumber >= 1 && winningNumber <= 12) {
    totalWin += game.bets.dozen1 * 3;
    winningBets.push(`1st Dozen: +\`${Math.floor(game.bets.dozen1 * 3).toLocaleString()}\``);
  }
  if (game.bets.dozen2 > 0 && winningNumber >= 13 && winningNumber <= 24) {
    totalWin += game.bets.dozen2 * 3;
    winningBets.push(`2nd Dozen: +\`${Math.floor(game.bets.dozen2 * 3).toLocaleString()}\``);
  }
  if (game.bets.dozen3 > 0 && winningNumber >= 25 && winningNumber <= 36) {
    totalWin += game.bets.dozen3 * 3;
    winningBets.push(`3rd Dozen: +\`${Math.floor(game.bets.dozen3 * 3).toLocaleString()}\``);
  }

  const netResult = totalWin - totalBet;

  await interaction.update({
    embeds: [buildRouletteEmbed(interaction.user, game, false)],
    components: []
  });

  // Defer follow-up for the result
  await interaction.followUp({
    embeds: [
      new EmbedBuilder()
        .setColor(netResult >= 0 ? 0x2ecc71 : 0xe74c3c)
        .setAuthor({ name: `${interaction.user.username}'s Roulette Result`, iconURL: interaction.user.displayAvatarURL({ size: 128 }) })
        .setDescription([
          `🎰 The wheel lands on: **${winningNumber}** ${winningNumber === 0 ? '🟢 GREEN' : isRed(winningNumber) ? '🔴' : '⚫'}`,
          '',
          winningBets.length > 0 ? `**Winning Bets:**\n${winningBets.join('\n')}` : 'No winning bets.',
          '',
          `💰 Net: ${netResult >= 0 ? '+' : ''}\`${netResult.toLocaleString()}\``
        ].join('\n'))
    ]
  });

  if (totalWin > 0) {
    await addWalletSafe(interaction.user.id, totalWin);
  }
  await gambleDelta(interaction.user.id, netResult);

  rouletteGames.delete(interaction.user.id);
}

async function handleRouletteClear(interaction) {
  const game = rouletteGames.get(interaction.user.id);
  if (!game) return interaction.reply({ embeds: [errorEmbed('No active roulette game.')], flags: 64 });

  // Refund the bet
  await addWalletSafe(interaction.user.id, game.bet);
  rouletteGames.delete(interaction.user.id);

  return interaction.update({
    embeds: [new EmbedBuilder().setColor(0x95a5a6).setTitle('Roulette').setDescription('Bets cleared. Bet refunded.')],
    components: []
  });
}

// ═══════════════════════════════════════════════════════════
// 🃏 HIGH-LOW GAME
// ═══════════════════════════════════════════════════════════

function buildHighLowEmbed(user, game) {
  const currentCard = game.currentCard;
  const cardStr = `${currentCard.card}${currentCard.suit}`;
  const cardValue = HIGHLOW_VALUES[currentCard.card] || parseInt(currentCard.card, 10) || 1;

  const cardsDisplay = game.history.map((c) => `${c.card}${c.suit}`).join(' → ') + ` → **?**`;

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setAuthor({ name: `${user.username}'s High-Low`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setDescription([
      `🎴 Round: **${game.round}/7**`,
      `💰 Bet: \`${game.bet.toLocaleString()}\` | Potential Win: \`${game.potentialWin.toLocaleString()}\``,
      '',
      `Current Card: **${cardStr}** (${cardValue})`,
      '',
      `Cards: ${cardsDisplay}`
    ].join('\n'))
    .setFooter({ text: 'Will the next card be HIGHER or LOWER?' });
}

function buildHighLowButtons() {
  return [new ActionRowBuilder().addComponents([
    new ButtonBuilder().setCustomId('eco:highlow:higher').setLabel('⬆️ HIGHER').setStyle(3),
    new ButtonBuilder().setCustomId('eco:highlow:lower').setLabel('⬇️ LOWER').setStyle(4),
    new ButtonBuilder().setCustomId('eco:highlow:stop').setLabel('💰 STOP & CASHOUT').setStyle(2)
  ])];
}

async function startHighLow(interaction) {
  const userId = interaction.user.id;
  const bet = interaction.options.getInteger('bet', true);

  if (bet <= 0) return interaction.reply({ embeds: [errorEmbed('Bet must be positive.')], flags: 64 });
  const balance = await getBalance(userId);
  if (bet > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms.')], flags: 64 });

  if (highlowGames.has(userId)) return interaction.reply({ embeds: [errorEmbed('You already have an active High-Low game.')], flags: 64 });

  const deck = [];
  for (const suit of ['♠', '♥', '♦', '♣']) {
    for (const card of HIGHLOW_DECK) {
      deck.push({ card, suit });
    }
  }
  const shuffled = shuffle(deck);

  const game = {
    userId,
    bet,
    deck: shuffled,
    currentCard: shuffled.pop(),
    history: [],
    round: 1,
    potentialWin: bet,
    startedAt: Date.now()
  };

  highlowGames.set(userId, game);

  await interaction.reply({
    embeds: [buildHighLowEmbed(interaction.user, game)],
    components: buildHighLowButtons()
  });
}

async function handleHighLowChoice(interaction) {
  const game = highlowGames.get(interaction.user.id);
  if (!game) return interaction.reply({ embeds: [errorEmbed('No active High-Low game.')], flags: 64 });

  const [, , choice] = interaction.customId.split(':');

  const nextCard = game.deck.pop();
  const currentValue = HIGHLOW_VALUES[game.currentCard.card] || parseInt(game.currentCard.card, 10) || 1;
  const nextValue = HIGHLOW_VALUES[nextCard.card] || parseInt(nextCard.card, 10) || 1;

  game.history.push(game.currentCard);
  game.currentCard = nextCard;

  let won = false;
  let resultText = '';

  if (choice === 'higher' && nextValue > currentValue) {
    won = true;
    resultText = `⬆️ HIGHER! ${nextCard.card}${nextCard.suit} (${nextValue}) > ${game.history[game.history.length - 1].card}${game.history[game.history.length - 1].suit}`;
  } else if (choice === 'lower' && nextValue < currentValue) {
    won = true;
    resultText = `⬇️ LOWER! ${nextCard.card}${nextCard.suit} (${nextValue}) < ${game.history[game.history.length - 1].card}${game.history[game.history.length - 1].suit}`;
  } else if (nextValue === currentValue) {
    // Tie goes to the player
    won = true;
    resultText = `🤝 TIE! ${nextCard.card}${nextCard.suit} = ${game.history[game.history.length - 1].card}${game.history[game.history.length - 1].suit}`;
  } else {
    resultText = choice === 'higher'
      ? `❌ ${nextCard.card}${nextCard.suit} (${nextValue}) is NOT higher!`
      : `❌ ${nextCard.card}${nextCard.suit} (${nextValue}) is NOT lower!`;
  }

  if (!won) {
    // Game over
    highlowGames.delete(interaction.user.id);
    const xp = await gambleDelta(interaction.user.id, -game.bet);

    return interaction.update({
      embeds: [
        new EmbedBuilder().setColor(0xe74c3c).setTitle('High-Low - GAME OVER').setDescription(resultText),
        new EmbedBuilder().setColor(0x95a5a6).setDescription(`Lost \`${game.bet.toLocaleString()}\`\nXP: +${xp.xpGained}`)
      ],
      components: []
    });
  }

  // Won this round
  game.round++;
  game.potentialWin *= 2;

  if (game.round > 7 || game.deck.length === 0) {
    // Won the game!
    const winnings = game.potentialWin;
    const tax = Math.floor(winnings * TAXES.GAMBLE);
    const net = winnings - tax;

    highlowGames.delete(interaction.user.id);
    const xp = await gambleDelta(interaction.user.id, net);

    return interaction.update({
      embeds: [
        new EmbedBuilder().setColor(0x2ecc71).setTitle('High-Low - WINNER!').setDescription([
          resultText,
          '',
          `🏆 Completed **${game.round - 1}/7** rounds!`,
          `💰 Won \`${winnings.toLocaleString()}\` (tax \`${tax.toLocaleString()}\`)`,
          `Net: +\`${net.toLocaleString()}\``,
          `XP: +${xp.xpGained}`
        ].join('\n')),
        buildHighLowEmbed(interaction.user, game)
      ],
      components: []
    });
  }

  await interaction.update({
    embeds: [
      new EmbedBuilder().setColor(0x2ecc71).setTitle('Correct!').setDescription(resultText),
      buildHighLowEmbed(interaction.user, game)
    ],
    components: buildHighLowButtons()
  });
}

async function handleHighLowStop(interaction) {
  const game = highlowGames.get(interaction.user.id);
  if (!game) return interaction.reply({ embeds: [errorEmbed('No active High-Low game.')], flags: 64 });

  const winnings = game.potentialWin;
  const tax = Math.floor(winnings * TAXES.GAMBLE);
  const net = winnings - tax;

  highlowGames.delete(interaction.user.id);
  const xp = await gambleDelta(interaction.user.id, net);

  return interaction.update({
    embeds: [
      new EmbedBuilder().setColor(0x2ecc71).setTitle('Cashed Out!').setDescription([
        `💰 Won \`${winnings.toLocaleString()}\` (tax \`${tax.toLocaleString()}\`)`,
        `Net: +\`${net.toLocaleString()}\``,
        `Rounds: ${game.round - 1}/7`,
        `XP: +${xp.xpGained}`
      ].join('\n'))
    ],
    components: []
  });
}

// ═══════════════════════════════════════════════════════════
// 🎫 SCRATCH CARD GAME
// ═══════════════════════════════════════════════════════════

function buildScratchEmbed(user, game) {
  const tiles = game.tiles.map((t, i) => t.revealed ? t.symbol : '❓').join(' ');

  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setAuthor({ name: `${user.username}'s Scratch Card`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setDescription([
      `🎫 Scratch the tiles to reveal prizes!`,
      '',
      tiles.slice(0, 15) + '\n' + tiles.slice(15, 30) + '\n' + tiles.slice(30),
      '',
      `💰 Bet: \`${game.bet.toLocaleString()}\` | Multiplier: **${game.matchMultiplier}x**`
    ].join('\n'))
    .setFooter({ text: 'Click tiles to reveal!' });
}

function buildScratchButtons(gameId) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const buttons = [];
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`eco:scratch:reveal:${idx}`)
          .setEmoji('🎫')
          .setStyle(2)
      );
    }
    rows.push(new ActionRowBuilder().addComponents(buttons));
  }
  return rows;
}

async function startScratch(interaction) {
  const userId = interaction.user.id;
  const bet = interaction.options.getInteger('bet', true);

  if (bet <= 0) return interaction.reply({ embeds: [errorEmbed('Bet must be positive.')], flags: 64 });
  const balance = await getBalance(userId);
  if (bet > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms.')], flags: 64 });

  // Generate 9 random tiles
  const tiles = Array.from({ length: 9 }, () => ({
    symbol: SCRATCH_SYMBOLS[Math.floor(Math.random() * SCRATCH_SYMBOLS.length)],
    revealed: false
  }));

  // Determine match multiplier
  const matchMultiplier = roll(1, 5);

  const game = {
    userId,
    bet,
    tiles,
    matchMultiplier,
    revealed: 0,
    startedAt: Date.now()
  };

  scratchGames.set(userId, game);

  await interaction.reply({
    embeds: [buildScratchEmbed(interaction.user, game)],
    components: buildScratchButtons(Date.now().toString())
  });
}

async function handleScratchReveal(interaction) {
  const game = scratchGames.get(interaction.user.id);
  if (!game) return interaction.reply({ embeds: [errorEmbed('No active scratch game.')], flags: 64 });

  const idx = parseInt(interaction.customId.split(':')[3], 10);
  if (game.tiles[idx].revealed) return interaction.deferUpdate().catch(() => {});

  game.tiles[idx].revealed = true;
  game.revealed++;

  if (game.revealed === 9) {
    // All revealed - calculate winnings
    const symbolCounts = {};
    for (const tile of game.tiles) {
      symbolCounts[tile.symbol] = (symbolCounts[tile.symbol] || 0) + 1;
    }

    let bestMatch = 0;
    for (const count of Object.values(symbolCounts)) {
      if (count >= 2 && SCRATCH_PAYOUTS[count]) {
        const maxPayout = Math.max(...Object.values(SCRATCH_PAYOUTS[count]));
        bestMatch = Math.max(bestMatch, count);
      }
    }

    let mult = 0;
    if (bestMatch >= 3) mult = SCRATCH_PAYOUTS[3][game.tiles.find((t) => symbolCounts[t.symbol] >= 3)?.symbol] || 0;
    else if (bestMatch === 2) mult = SCRATCH_PAYOUTS[2][game.tiles.find((t) => symbolCounts[t.symbol] === 2)?.symbol] || 0;

    const winnings = Math.floor(game.bet * mult);
    const net = winnings - game.bet;

    scratchGames.delete(interaction.user.id);
    const xp = await gambleDelta(interaction.user.id, net);

    const symbolsLine = Object.entries(symbolCounts)
      .map(([sym, cnt]) => `${sym} x${cnt}`)
      .join(', ');

    return interaction.update({
      embeds: [
        new EmbedBuilder().setColor(net >= 0 ? 0x2ecc71 : 0xe74c3c).setTitle('Scratch Result').setDescription([
          `Symbols: ${symbolsLine}`,
          `Best Match: ${bestMatch} of a kind`,
          `Multiplier: **${mult}x**`,
          '',
          net >= 0
            ? `💰 Won \`${winnings.toLocaleString()}\`! Net: +\`${net.toLocaleString()}\``
            : `💸 Lost \`${game.bet.toLocaleString()}\``,
          `XP: +${xp.xpGained}`
        ].join('\n')),
        buildScratchEmbed(interaction.user, game)
      ],
      components: []
    });
  }

  await interaction.update({
    embeds: [buildScratchEmbed(interaction.user, game)],
    components: buildScratchButtons(Date.now().toString())
  });
}

// ═══════════════════════════════════════════════════════════
// 🗼 TOWER GAME
// ═══════════════════════════════════════════════════════════

function buildTowerEmbed(user, game) {
  const floors = [];
  for (let i = TOWER_CONFIG.MAX_FLOORS; i >= 1; i--) {
    const reached = i < game.currentFloor;
    const current = i === game.currentFloor;
    const escaped = game.escapedFloors.includes(i);

    let status = '⬛';
    if (reached || escaped) status = '🟢';
    else if (current) status = '🔶';

    const chance = TOWER_CONFIG.floorChance(i);
    floors.push(`${status} Floor ${i}: ${current ? `(${(chance * 100).toFixed(0)}% chance)` : ''}`);
  }

  const mult = TOWER_CONFIG.cashoutMult(game.currentFloor - 1);

  return new EmbedBuilder()
    .setColor(0x8e44ad)
    .setAuthor({ name: `${user.username}'s Tower`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setDescription([
      `🗼 Floor: **${game.currentFloor}**/${TOWER_CONFIG.MAX_FLOORS}`,
      `💰 Bet: \`${game.bet.toLocaleString()}\` | Current Cashout: \`${Math.floor(game.bet * mult).toLocaleString()}\` (**${mult}x**)`,
      '',
      floors.join('\n')
    ].join('\n'))
    .setFooter({ text: 'Climb higher for bigger rewards, or cashout now!' });
}

function buildTowerButtons() {
  return [new ActionRowBuilder().addComponents([
    new ButtonBuilder().setCustomId('eco:tower:climb').setLabel('🧗 CLIMB!').setStyle(3),
    new ButtonBuilder().setCustomId('eco:tower:cashout').setLabel(`💰 Cashout (${TOWER_CONFIG.cashoutMult(1)}x)`).setStyle(1),
    new ButtonBuilder().setCustomId('eco:tower:quit').setLabel('❌ Quit').setStyle(4)
  ])];
}

async function startTower(interaction) {
  const userId = interaction.user.id;
  const bet = interaction.options.getInteger('bet', true);

  if (bet <= 0) return interaction.reply({ embeds: [errorEmbed('Bet must be positive.')], flags: 64 });
  const balance = await getBalance(userId);
  if (bet > balance.wallet) return interaction.reply({ embeds: [errorEmbed('Not enough Atoms.')], flags: 64 });

  if (towerGames.has(userId)) return interaction.reply({ embeds: [errorEmbed('You already have an active Tower game.')], flags: 64 });

  const game = {
    userId,
    bet,
    currentFloor: 1,
    escapedFloors: [],
    startedAt: Date.now()
  };

  towerGames.set(userId, game);

  await interaction.reply({
    embeds: [buildTowerEmbed(interaction.user, game)],
    components: buildTowerButtons()
  });
}

async function handleTowerClimb(interaction) {
  const game = towerGames.get(interaction.user.id);
  if (!game) return interaction.reply({ embeds: [errorEmbed('No active Tower game.')], flags: 64 });

  const chance = TOWER_CONFIG.floorChance(game.currentFloor);
  const survived = Math.random() < chance;

  if (!survived) {
    // Fell!
    towerGames.delete(interaction.user.id);
    const xp = await gambleDelta(interaction.user.id, -game.bet);

    return interaction.update({
      embeds: [
        new EmbedBuilder().setColor(0xe74c3c).setTitle('Tower - FELL!').setDescription([
          `💀 You fell on floor **${game.currentFloor}**!`,
          `💸 Lost \`${game.bet.toLocaleString()}\``,
          `Reached: ${game.currentFloor - 1} floors`,
          `XP: +${xp.xpGained}`
        ].join('\n'))
      ],
      components: []
    });
  }

  // Survived this floor
  game.escapedFloors.push(game.currentFloor);
  game.currentFloor++;

  if (game.currentFloor > TOWER_CONFIG.MAX_FLOORS) {
    // Reached the top!
    const mult = TOWER_CONFIG.cashoutMult(TOWER_CONFIG.MAX_FLOORS);
    const winnings = Math.floor(game.bet * mult);
    const tax = Math.floor(winnings * TAXES.GAMBLE);
    const net = winnings - tax;

    towerGames.delete(interaction.user.id);
    const xp = await gambleDelta(interaction.user.id, net);

    return interaction.update({
      embeds: [
        new EmbedBuilder().setColor(0xf1c40f).setTitle('TOWER - CONQUERED!').setDescription([
          `🏆 You reached the top of the tower!`,
          `💰 Won \`${winnings.toLocaleString()}\` (tax \`${tax.toLocaleString()}\`)`,
          `Net: +\`${net.toLocaleString()}\` | Bonus: **${mult}x**`,
          `XP: +${xp.xpGained}`
        ].join('\n')),
        buildTowerEmbed(interaction.user, game)
      ],
      components: []
    });
  }

  const newMult = TOWER_CONFIG.cashoutMult(game.currentFloor - 1);
  await interaction.update({
    embeds: [
      new EmbedBuilder().setColor(0x2ecc71).setTitle(`Floor ${game.currentFloor - 1} - SURVIVED!`).setDescription(`🧗 You made it to floor **${game.currentFloor}**! Next floor: ${(TOWER_CONFIG.floorChance(game.currentFloor) * 100).toFixed(0)}% chance. Cashout now: **${newMult}x**`),
      buildTowerEmbed(interaction.user, game)
    ],
    components: buildTowerButtons()
  });
}

async function handleTowerCayout(interaction) {
  const game = towerGames.get(interaction.user.id);
  if (!game) return interaction.reply({ embeds: [errorEmbed('No active Tower game.')], flags: 64 });

  const mult = TOWER_CONFIG.cashoutMult(game.currentFloor - 1);
  const winnings = Math.floor(game.bet * mult);
  const tax = Math.floor(winnings * TAXES.GAMBLE);
  const net = winnings - tax;

  towerGames.delete(interaction.user.id);
  const xp = await gambleDelta(interaction.user.id, net);

  return interaction.update({
    embeds: [
      new EmbedBuilder().setColor(0x2ecc71).setTitle('Cashed Out!').setDescription([
        `💰 Won \`${winnings.toLocaleString()}\` (tax \`${tax.toLocaleString()}\`)`,
        `Net: +\`${net.toLocaleString()}\` | Floors: ${game.currentFloor - 1}/${TOWER_CONFIG.MAX_FLOORS}`,
        `XP: +${xp.xpGained}`
      ].join('\n')),
      buildTowerEmbed(interaction.user, game)
    ],
    components: []
  });
}

async function handleTowerQuit(interaction) {
  const game = towerGames.get(interaction.user.id);
  if (!game) return interaction.reply({ embeds: [errorEmbed('No active Tower game.')], flags: 64 });

  const mult = TOWER_CONFIG.cashoutMult(game.currentFloor - 1);
  const winnings = Math.floor(game.bet * mult);
  const tax = Math.floor(winnings * TAXES.GAMBLE);
  const net = winnings - tax;

  towerGames.delete(interaction.user.id);
  await gambleDelta(interaction.user.id, net);

  return interaction.update({
    embeds: [
      new EmbedBuilder().setColor(0x95a5a6).setTitle('Tower - Quit').setDescription([
        `You quit after ${game.currentFloor - 1} floors.`,
        `Cashed out: \`${winnings.toLocaleString()}\` (tax \`${tax.toLocaleString()}\`)`,
        `Net: +\`${net.toLocaleString()}\``
      ].join('\n')),
      buildTowerEmbed(interaction.user, game)
    ],
    components: []
  });
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════
module.exports = {
  minesGames,
  rouletteGames,
  highlowGames,
  scratchGames,
  towerGames,

  // Mines
  startMines,
  handleMinesClick,
  handleMinesCayout,
  handleMinesQuit,

  // Roulette
  startRoulette,
  handleRouletteBet,
  handleRouletteSpin,
  handleRouletteClear,

  // High-Low
  startHighLow,
  handleHighLowChoice,
  handleHighLowStop,

  // Scratch
  startScratch,
  handleScratchReveal,

  // Tower
  startTower,
  handleTowerClimb,
  handleTowerCayout,
  handleTowerQuit
};
