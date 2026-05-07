// games.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const { updateLeaderboardStats } = require('../../utils/leaderboard'); // your existing module
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('games')
    .setDescription('Play a variety of fun games')
    .addSubcommand(sub =>
      sub.setName('tictactoe')
        .setDescription('Play Tic-Tac-Toe against a friend or the bot')
        .addUserOption(option =>
          option.setName('opponent')
            .setDescription('Challenge a friend (leave empty to play against the bot)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('hangman')
        .setDescription('Play Hangman against a friend')
        .addStringOption(option =>
          option.setName('word')
            .setDescription('The secret word (letters only, no spaces or numbers)')
            .setRequired(true)
        )
        .addUserOption(option =>
          option.setName('opponent')
            .setDescription('Challenge a friend to Hangman')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('category')
            .setDescription('Optional word category (e.g. Animals, Movies, Tech)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('emoji_hint')
            .setDescription('Optional emoji hint for the word')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('memory')
        .setDescription('Play a solo memory match game')
    )
    .addSubcommand(sub =>
      sub.setName('rps')
        .setDescription('Play Rock Paper Scissors')
        .addUserOption(option =>
          option.setName('opponent')
            .setDescription('Challenge another user (leave empty to play vs bot)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('guessthenumber')
        .setDescription('Try to guess the number between 1 and 100')
    )
    .addSubcommand(sub =>
      sub.setName('trivia')
        .setDescription('Play a trivia challenge using Open Trivia DB')
    )
    .addSubcommand(sub =>
      sub.setName('8ball')
        .setDescription('Ask the magic 8-ball a question')
        .addStringOption(option =>
          option.setName('question')
            .setDescription('Your yes/no question')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('fasttype')
        .setDescription('Test your typing speed and accuracy')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // -------------------------
    // 8-ball
    // -------------------------
    if (sub === '8ball') {
      const question = interaction.options.getString('question');
      const responses = [
        '🎯 Yes, definitely.',
        '🤔 Ask again later.',
        '❌ No way.',
        '🔮 It is certain.',
        '🙃 Don’t count on it.',
        '😶 Cannot predict now.',
        '💫 Most likely.',
        '😬 Very doubtful.',
        '🌀 Signs point to yes.',
        '🛑 My reply is no.'
      ];

      const reply = responses[Math.floor(Math.random() * responses.length)];

      const embed = new EmbedBuilder()
        .setTitle('🎱 The Magic 8-Ball Says...')
        .setDescription(`**Q:** ${question}\n**A:** ${reply}`)
        .setColor('Random')
        .setFooter({ text: 'Ask wisely...' });

      return interaction.reply({ embeds: [embed] });
    }

    // -------------------------
    // FastType
    // -------------------------
    if (sub === 'fasttype') {
      const userId = interaction.user.id;
      const phrases = [
        'quick brown fox', 'discord bot challenge', 'fast fingers win', 'typing like a pro',
        'speed is everything', 'catch me if you can', 'keyboard warrior', 'type this fast',
        'no typos allowed', 'ready set go', 'jump over the lazy dog', 'code like a ninja',
        'hello world', 'press enter now', 'syntax error incoming', 'debugging is fun',
        'race against time', 'shift control alt', 'function overload', 'variable velocity',
        'loop the loop', 'array of chaos', 'object oriented madness', 'compile and conquer',
        'runtime surprise', 'stack overflow', 'ping the server', '404 not found',
        'execute the command', 'launch sequence initiated', 'mission accomplished',
        'brace for impact', 'hold the line', 'fire in the hole', 'zero latency',
        'cloud computing storm', 'binary ballet', 'digital dance', 'algorithmic avalanche',
        'data tsunami', 'machine learning magic', 'artificial intelligence', 'neural network',
        'quantum leap', 'parallel universe', 'multithreaded mayhem', 'encryption unlocked',
        'hash it out', 'token takeover', 'authentication required', 'access granted',
        'system rebooted', 'terminal velocity', 'keyboard cat', 'mouse trap', 'clickbait chaos',
        'scroll to win', 'drag and drop', 'hover and strike', 'double click destiny'
      ];

      const phrase = phrases[Math.floor(Math.random() * phrases.length)];

      const embed = new EmbedBuilder()
        .setTitle('⌨️ FastType Challenge')
        .setDescription(`Type this **exactly** within **10 seconds**:\n\n\`${phrase}\``)
        .setColor('Random');

      await interaction.reply({ embeds: [embed] });

      const channel = interaction.channel;
      if (!channel) return interaction.followUp({ content: '⛔ Unable to access the channel.' });

      const startTime = Date.now();
      const filter = m => m.author.id === userId;
      const collector = channel.createMessageCollector({ filter, time: 10000, max: 1 });

      collector.on('collect', async (msg) => {
        const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
        const correct = msg.content.trim() === phrase;
        await msg.delete().catch(() => {});

        const resultEmbed = new EmbedBuilder()
          .setTitle(correct ? '✅ You nailed it!' : '❌ Oops!')
          .setDescription(
            correct
              ? `You typed it correctly in **${timeTaken}s**!`
              : `You typed it wrong. The correct phrase was:\n\`${phrase}\``
          )
          .setColor(correct ? 'Green' : 'Red');

        await interaction.followUp({ embeds: [resultEmbed] });
      });

      collector.on('end', (collected) => {
        if (collected.size === 0) {
          interaction.followUp({ content: `⏰ Time’s up! The phrase was: \`${phrase}\`` });
        }
      });

      return;
    }
// -------------------------
// Guess The Number (fixed rematch without re-using interaction)
// -------------------------
if (sub === 'guessthenumber') {
  const guildId = interaction.guild?.id || 'dm';
  const channel = interaction.channel;
  const user = interaction.user;
  if (!channel) return interaction.reply({ content: '⛔ Unable to access the channel.', flags: 64 });

  // acknowledge once
  await interaction.reply({ content: '🔢 Starting Guess The Number in the channel...', flags: 64 });

  // helper that starts a single game session (sends the prompt message and attaches collectors)
  async function startGuessSession(starterUser) {
    const number = Math.floor(Math.random() * 100) + 1;
    let attempts = 0;

    const embed = new EmbedBuilder()
      .setTitle('🔢 Guess the Number')
      .setDescription(`${starterUser}, I’ve picked a number between **1 and 100**. Send your guesses in the channel!`)
      .setColor('Random');

    const prompt = await channel.send({ embeds: [embed] });

    // collector for numeric guesses by the starter user
    const guessFilter = m => m.author.id === starterUser.id && /^\d+$/.test(m.content);
    const collector = channel.createMessageCollector({ filter: guessFilter, time: 60000 });

    collector.on('collect', async (msg) => {
      attempts++;
      const guess = parseInt(msg.content, 10);
      await msg.delete().catch(() => {});

      if (guess === number) {
        collector.stop('guessed');

        const winEmbed = new EmbedBuilder()
          .setTitle('🎉 Correct!')
          .setDescription(`${starterUser} guessed the number **${number}** in **${attempts}** tries!`)
          .setColor('Green');

        const controls = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('gtn_rematch').setLabel('🔁 Try Again').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('gtn_exit').setLabel('❌ Exit').setStyle(ButtonStyle.Secondary)
        );

        // update prompt message to show result + rematch buttons
        const resultMsg = await prompt.edit({ content: 'Game Over!', embeds: [winEmbed], components: [controls] });

        // collector for rematch/exit buttons
        const postCollector = resultMsg.createMessageComponentCollector({
          filter: i => i.user.id === starterUser.id,
          time: 30000,
          max: 1
        });

        postCollector.on('collect', async i => {
          if (i.customId === 'gtn_exit') {
            await i.update({ content: '👋 Game session ended.', embeds: [], components: [] });
          } else if (i.customId === 'gtn_rematch') {
            await i.update({ content: '🔁 Restarting...', embeds: [], components: [] });
            // start a fresh game session for the same starter user
            setTimeout(() => startGuessSession(starterUser), 800);
          }
        });

      } else {
      // NOT ephemeral — normal message, deletes after 5 seconds
const hint = guess < number ? '🔼 Too low!' : '🔽 Too high!';

channel.send({ content: `${hint} Try again.` })
  .then(m => setTimeout(() => m.delete().catch(() => {}), 5000))
  .catch(() => {});
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason !== 'guessed') {
        // time's up
        const timeoutEmbed = new EmbedBuilder()
          .setTitle('⏰ Time’s up!')
          .setDescription(`No correct guess — the number was **${number}**.`)
          .setColor('Red');

        await prompt.edit({ content: 'Game ended.', embeds: [timeoutEmbed], components: [] }).catch(() => {});
      }
    });
  }

  // start first session
  startGuessSession(user);

  return;
}

     // -------------------------
// Trivia (no "Try Again" button + HTML entity decoding)
// -------------------------
if (sub === 'trivia') {
  const userId = interaction.user.id;
  let difficulty = null;
  let questionCount = 0;
  let score = 0;

  // small helper to decode HTML entities (handles named & numeric entities)
  function decodeHTMLEntities(str) {
    if (!str || typeof str !== 'string') return str;
    const entities = {
      amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00A0'
      // add more named entities if you see them
    };
    return str.replace(/&(#\d+|#x[\da-fA-F]+|[a-zA-Z]+);/g, (m, g1) => {
      if (g1[0] === '#') {
        // numeric entity
        if (g1[1] === 'x' || g1[1] === 'X') return String.fromCharCode(parseInt(g1.slice(2), 16));
        return String.fromCharCode(parseInt(g1.slice(1), 10));
      }
      return entities[g1] || m;
    });
  }

  const difficultyRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('easy').setLabel('🟢 Easy').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('medium').setLabel('🟡 Medium').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('hard').setLabel('🔴 Hard').setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
    .setTitle('🧠 Trivia Challenge')
    .setDescription('Choose your difficulty to begin:')
    .setColor('Random');

  const msg = await interaction.reply({ embeds: [embed], components: [difficultyRow], withResponse: true });

  const difficultyCollector = msg.createMessageComponentCollector({
    filter: i => i.user.id === userId,
    time: 30000,
    max: 1
  });

  difficultyCollector.on('collect', async i => {
    difficulty = i.customId;
    await i.update({
      embeds: [embed.setDescription(`✅ Difficulty selected: **${difficulty}**\nNow type how many questions you want (1–10):`)],
      components: []
    });

    const channel = interaction.channel;
    if (!channel) return interaction.followUp({ content: '⛔ Unable to access the channel.' });

    const countFilter = m => m.author.id === userId && (/^[1-9]$|^10$/).test(m.content);
    const countCollector = channel.createMessageCollector({ filter: countFilter, time: 30000, max: 1 });

    countCollector.on('collect', async m => {
      questionCount = parseInt(m.content, 10);
      await m.delete().catch(() => {});
      await interaction.followUp({ content: `🧠 Starting ${questionCount} question(s)...`, flags: 64 });
      startTrivia(interaction, difficulty, questionCount, userId);
    });
  });

  async function startTrivia(interaction, difficulty, questionCount, userId) {
    try {
      const res = await fetch(`https://opentdb.com/api.php?amount=${questionCount}&difficulty=${difficulty}&type=multiple`);
      const data = await res.json();
      const questions = data.results || [];

      let current = 0;
      score = 0;

      const askQuestion = async () => {
        if (current >= questions.length) {
          const finalEmbed = new EmbedBuilder()
            .setTitle('🏁 Trivia Complete')
            .setDescription(`You scored **${score} / ${questionCount}**`)
            .setColor('Green');

          // -- NO Try Again button: send final result only
          await interaction.followUp({ embeds: [finalEmbed] });
          return;
        }

        const q = questions[current];
        // decode HTML entities in question + answers
        const questionText = decodeHTMLEntities(q.question || 'Question missing');
        const correctAnswer = decodeHTMLEntities(q.correct_answer || '');
        const allAnswers = [...(q.incorrect_answers || []).map(a => decodeHTMLEntities(a)), correctAnswer]
          .sort(() => Math.random() - 0.5);

        // Build answer buttons using indexes in customId so we don't rely on labels
        const optionsRow = new ActionRowBuilder();
        allAnswers.forEach((ans, idx) => {
          const label = ans.length > 80 ? ans.slice(0, 77) + '...' : ans; // safety for label length
          optionsRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`triv_${current}_${idx}`) // identify by question index & answer index
              .setLabel(label)
              .setStyle(ButtonStyle.Secondary)
          );
        });

        const progress = `Progress: ${current + 1}/${questionCount}`;
        const qEmbed = new EmbedBuilder()
          .setTitle(`❓ Question ${current + 1}`)
          .setDescription(questionText)
          .addFields(
            { name: 'Difficulty', value: difficulty, inline: true },
            { name: 'Score', value: `${score}`, inline: true },
            { name: 'Progress', value: progress, inline: false }
          )
          .setColor('Random');

        const qMsg = await interaction.followUp({ embeds: [qEmbed], components: [optionsRow] });

        const qCollector = qMsg.createMessageComponentCollector({
          filter: i => i.user.id === userId,
          time: 15000,
          max: 1
        });

        qCollector.on('collect', async i => {
          // parse customId to find chosen index
          const [, qIdxStr, ansIdxStr] = i.customId.split('_'); // format triv_{qIdx}_{ansIdx}
          const ansIdx = parseInt(ansIdxStr, 10);
          const chosen = allAnswers[ansIdx];
          if (chosen === correctAnswer) {
            score++;
            await i.update({ content: '✅ Correct!', components: [] });
          } else {
            await i.update({ content: `❌ Incorrect! Correct answer was: **${correctAnswer}**`, components: [] });
          }
          current++;
          setTimeout(askQuestion, 1000);
        });

        qCollector.on('end', collected => {
          if (collected.size === 0) {
            interaction.followUp({ content: `⏰ Time’s up! Correct answer was: **${decodeHTMLEntities(correctAnswer)}**` });
            current++;
            setTimeout(askQuestion, 1000);
          }
        });
      };

      askQuestion();
    } catch (err) {
      console.error('Trivia error', err);
      interaction.followUp({ content: '❌ Failed to fetch trivia. Try again later.' });
    }
  }

  return;
}
// -------------------------
// Tic-Tac-Toe (Leaderboard + Rematch + Smart Bot)
// -------------------------
if (sub === 'tictactoe') {
  const playerX = interaction.user;
  const playerO = interaction.options.getUser('opponent');
  const isPvBot = !playerO || playerO.bot || playerO.id === playerX.id;

  const guildId = interaction.guild?.id || 'dm';
  const channel = interaction.channel;

  if (!channel)
    return interaction.reply({ content: '⛔ Unable to access the channel.', flags: 64 });

  await interaction.reply({ content: '🎮 Starting Tic-Tac-Toe in the channel...', flags: 64 });

  const endButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ttt_rematch').setLabel('🔁 Rematch').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ttt_exit').setLabel('❌ Exit').setStyle(ButtonStyle.Secondary)
  );

  async function startTicSession(pX, pO) {
    const board = Array(9).fill(null);
    let currentPlayer = pX;
    let gameOver = false;

    const getSymbol = player => (player.id === pX.id ? '❌' : '⭕');

    const getBoardComponents = () => {
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < 3; c++) {
          const idx = r * 3 + c;
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`ttt_${idx}`)
              .setLabel(board[idx] ?? '⬜')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(!!board[idx] || gameOver)
          );
        }
        rows.push(row);
      }
      return rows;
    };

    const embed = new EmbedBuilder()
      .setTitle('🎮 Tic-Tac-Toe')
      .setDescription(
        isPvBot
          ? `❌ ${pX} vs 🤖 Bot — ${pX} goes first!`
          : `❌ ${pX} vs ⭕ ${pO}\n${pX} goes first!`
      )
      .setColor('Random');

    const prompt = await channel.send({ embeds: [embed], components: getBoardComponents() });

    const collector = prompt.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
      if (gameOver) return;

      if (!isPvBot && i.user.id !== currentPlayer.id)
        return i.reply({ content: '⛔ Not your turn!', flags: 64 });

      if (isPvBot && i.user.id !== pX.id)
        return i.reply({ content: '⛔ Only challenger plays vs bot.', flags: 64 });

      const index = parseInt(i.customId.split('_')[1], 10);
      if (board[index]) return i.reply({ content: '❌ Spot already taken!', flags: 64 });

      board[index] = getSymbol(currentPlayer);

      const winnerSymbol = checkWinner(board);
      const isDraw = board.every(x => x !== null);

      // ========== WINNER LOGIC ==========
      if (winnerSymbol) {
        gameOver = true;

        embed.setDescription(`🎉 ${currentPlayer} wins!\nFinal board:`).setColor('Green');

        // Leaderboard update
        if (isPvBot) {
          updateLeaderboardStats(guildId, pX.id, 'tictactoe', 'win');
        } else {
          const loser = currentPlayer.id === pX.id ? pO : pX;
          updateLeaderboardStats(guildId, currentPlayer.id, 'tictactoe', 'win');
          updateLeaderboardStats(guildId, loser.id, 'tictactoe', 'loss');
        }

        await i.update({ embeds: [embed], components: getBoardComponents() });
        collector.stop('finished');
        return;
      }

      // ========== DRAW LOGIC ==========
      if (isDraw) {
        gameOver = true;
        embed.setDescription('🤝 It’s a draw!').setColor('Grey');
        await i.update({ embeds: [embed], components: getBoardComponents() });
        collector.stop('finished');
        return;
      }

      await i.update({ embeds: [embed], components: getBoardComponents() });

      // ========== BOT MOVE ==========
      if (isPvBot) {
        await wait(400);

        const botIndex = chooseBotMove(board, '⭕', '❌');
        if (botIndex !== null) board[botIndex] = '⭕';

        const botWinner = checkWinner(board);
        const botDraw = board.every(x => x !== null);

        if (botWinner) {
          gameOver = true;
          embed.setDescription(`🤖 Bot wins!\nFinal board:`).setColor('Red');

          updateLeaderboardStats(guildId, pX.id, 'tictactoe', 'loss');

          await prompt.edit({ embeds: [embed], components: getBoardComponents() });
          collector.stop('finished');
          return;
        }

        if (botDraw) {
          gameOver = true;
          embed.setDescription('🤝 It’s a draw!').setColor('Grey');
          await prompt.edit({ embeds: [embed], components: getBoardComponents() });
          collector.stop('finished');
          return;
        }

        await prompt.edit({ embeds: [embed], components: getBoardComponents() });
        return;
      }

      // ========== NEXT TURN PvP ==========
      currentPlayer = currentPlayer.id === pX.id ? pO : pX;
      embed.setDescription(`❌ ${pX} vs ⭕ ${pO}\nNow it's ${currentPlayer}'s turn.`);

      await prompt.edit({ embeds: [embed], components: getBoardComponents() });
    });

    collector.on('end', async (_, reason) => {
      if (!gameOver && reason !== 'finished') {
        embed.setDescription('⏰ Game ended due to inactivity.').setColor('Red');
        await prompt.edit({ embeds: [embed], components: getBoardComponents() }).catch(() => {});
        return;
      }

      await prompt.edit({ content: 'Game over. Choose an option:', components: [endButtons] });

      const authorized = [pX.id];
      if (!isPvBot) authorized.push(pO.id);

      const postCollector = prompt.createMessageComponentCollector({
        filter: btn => authorized.includes(btn.user.id),
        time: 30000,
        max: 1
      });

      postCollector.on('collect', async btn => {
        if (btn.customId === 'ttt_exit') {
          await btn.update({ content: '👋 Game session ended.', embeds: [], components: [] });
          return;
        }

        if (btn.customId === 'ttt_rematch') {
          await btn.update({ content: '🔁 Rematch starting...', embeds: [], components: [] });
          setTimeout(() => startTicSession(pX, pO), 800);
        }
      });
    });

    // Helpers
    function checkWinner(board) {
      const lines = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
      ];
      for (const [a,b,c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c])
          return board[a];
      }
      return null;
    }

    function chooseBotMove(board, bot, player) {
      const empty = board.map((v,i) => v ? null : i).filter(v => v !== null);

      function winsIf(idx, symbol) {
        const b = [...board];
        b[idx] = symbol;
        return checkWinner(b) === symbol;
      }

      for (const idx of empty) if (winsIf(idx, bot)) return idx;
      for (const idx of empty) if (winsIf(idx, player)) return idx;

      if (empty.includes(4)) return 4;

      const corners = [0,2,6,8].filter(i => empty.includes(i));
      if (corners.length) return corners[Math.floor(Math.random() * corners.length)];

      return empty[Math.floor(Math.random() * empty.length)] ?? null;
    }

    function wait(ms) {
      return new Promise(res => setTimeout(res, ms));
    }
  }

  startTicSession(playerX, playerO || { id: 'bot', username: 'Bot' });

  return;
}
      
        
    // -------------------------
    // Hangman
    // -------------------------
    if (sub === 'hangman') {
      const host = interaction.user;
      const opponent = interaction.options.getUser('opponent');
      const rawWord = interaction.options.getString('word');
      const category = interaction.options.getString('category');
      const emojiHint = interaction.options.getString('emoji_hint');
      const word = rawWord?.toLowerCase().replace(/[^a-z]/g, '');

      if (!opponent || opponent.bot || opponent.id === host.id) {
        return interaction.reply({ content: '❌ You must challenge a real user (not yourself or a bot).', flags: 64 });
      }

      if (!word || word.length < 2) {
        return interaction.reply({ content: '❌ Please provide a valid secret word (letters only, at least 2 characters).', flags: 64 });
      }

      await interaction.reply({ content: `✅ Hangman game created! ${opponent} has been challenged.`, flags: 64 });

      await startHangman(interaction.guild?.id || 'dm', interaction.channel, host, opponent, word, category, emojiHint);

      return;
    }

    async function startHangman(guildId, channel, host, guesser, word, category, emojiHint) {
      if (!channel) return;
      let guessed = [];
      let attemptsLeft = 6;
      let gameOver = false;
      const totalTime = 120;
      let timeLeft = totalTime;

      const hangmanStages = [
        '```\n\n\n\n\n=====\n```',
        '```\n |\n |\n |\n |\n=====\n```',
        '```\n +---+\n |\n |\n |\n |\n=====\n```',
        '```\n +---+\n |   O\n |\n |\n |\n=====\n```',
        '```\n +---+\n |   O\n |   |\n |\n |\n=====\n```',
        '```\n +---+\n |   O\n |  /|\\\n |\n |\n=====\n```',
        '```\n +---+\n |   O\n |  /|\\\n |  / \\\n |\n=====\n```'
      ];

      const displayWord = () => word.split('').map(l => (guessed.includes(l) ? l : '_')).join(' ');
      const progressBar = () => {
        const totalBars = 12;
        const filled = Math.ceil((timeLeft / totalTime) * totalBars);
        return '🕒 ' + '█'.repeat(filled) + '░'.repeat(totalBars - filled) + ` ${timeLeft}s`;
      };

      const embed = new EmbedBuilder()
        .setTitle('🔤 Hangman')
        .setDescription(`${hangmanStages[6 - attemptsLeft]}\nWord: \`${displayWord()}\`\n❤️ Lives left: ${attemptsLeft}`)
        .addFields(
          { name: '📂 Category', value: category || 'No hint provided', inline: true },
          { name: '💡 Emoji Hint', value: emojiHint || 'No hint provided', inline: true },
          { name: '⏳ Time Left', value: progressBar(), inline: false }
        )
        .setColor('Random')
        .setFooter({ text: 'Made by SHM' });

      const gameMsg = await channel.send({ content: `🎮 ${guesser}, ${host} has challenged you to Hangman!`, embeds: [embed] });

      const filter = m => m.author.id === guesser.id && m.channel.id === channel.id && /^[a-zA-Z]$/.test(m.content.toLowerCase());
      const collector = channel.createMessageCollector({ filter, time: totalTime * 1000 });

      const interval = setInterval(async () => {
        if (gameOver) return clearInterval(interval);
        timeLeft -= 5;
        if (timeLeft <= 0) {
          collector.stop('timeout');
          return;
        }
        embed.setFields([
          { name: '📂 Category', value: category || 'No hint provided', inline: true },
          { name: '💡 Emoji Hint', value: emojiHint || 'No hint provided', inline: true },
          { name: '⏳ Time Left', value: progressBar(), inline: false }
        ]);
        await gameMsg.edit({ embeds: [embed] }).catch(() => {});
      }, 5000);

      collector.on('collect', async msg => {
        if (gameOver) return;

        const letter = msg.content.toLowerCase();
        if (guessed.includes(letter)) {
          await msg.react('⚠️').catch(() => {});
          setTimeout(() => { if (msg.deletable) msg.delete().catch(() => {}); }, 3000);
          return;
        }

        guessed.push(letter);

        if (!word.includes(letter)) {
          attemptsLeft--;
          await msg.react('❌').catch(() => {});
        } else {
          await msg.react('✅').catch(() => {});
        }

        const current = displayWord();
        embed.setDescription(`${hangmanStages[6 - attemptsLeft]}\nWord: \`${current}\`\n❤️ Lives left: ${attemptsLeft}`);
        embed.setFields([
          { name: '📂 Category', value: category || 'No hint provided', inline: true },
          { name: '💡 Emoji Hint', value: emojiHint || 'No hint provided', inline: true },
          { name: '⏳ Time Left', value: progressBar(), inline: false }
        ]);
        await gameMsg.edit({ embeds: [embed] }).catch(() => {});

        setTimeout(() => { if (msg.deletable) msg.delete().catch(() => {}); }, 3000);

        if (!current.includes('_')) {
          gameOver = true;
          clearInterval(interval);
          collector.stop('win');
          updateLeaderboardStats(guildId, guesser.id, 'hangman', 'win');
          updateLeaderboardStats(guildId, host.id, 'hangman', 'loss');
          await channel.send(`${guesser} guessed the word: **${word}**!`);
        } else if (attemptsLeft <= 0) {
          gameOver = true;
          clearInterval(interval);
          collector.stop('lose');
          updateLeaderboardStats(guildId, guesser.id, 'hangman', 'loss');
          updateLeaderboardStats(guildId, host.id, 'hangman', 'win');
          await channel.send(`${guesser} lost! The word was **${word}**.`);
        }
      });

      collector.on('end', async (_, reason) => {
        clearInterval(interval);
        if (!gameOver && reason !== 'win' && reason !== 'lose') {
          updateLeaderboardStats(guildId, guesser.id, 'hangman', 'loss');
          updateLeaderboardStats(guildId, host.id, 'hangman', 'win');
          await channel.send(`⏰ Time’s up! The word was **${word}**.`);
        }
      });
    }

    // -------------------------
    // Rock Paper Scissors (fixed with rematch)
    // -------------------------
    if (sub === 'rps') {
      const challenger = interaction.user;
      const opponent = interaction.options.getUser('opponent');
      const guildId = interaction.guild?.id || 'dm';
      const channel = interaction.channel;
      if (!channel) return interaction.reply({ content: '⛔ Unable to access the channel.', flags: 64 });

      const choices = ['rock', 'paper', 'scissors'];
      const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };

      const choiceButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rps_rock').setLabel('🪨 Rock').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rps_paper').setLabel('📄 Paper').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rps_scissors').setLabel('✂️ Scissors').setStyle(ButtonStyle.Primary)
      );

      const endButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rps_rematch').setLabel('🔁 Rematch').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('rps_exit').setLabel('❌ Exit').setStyle(ButtonStyle.Secondary)
      );

      const computeResult = (c1, c2) => {
        if (c1 === c2) return 0;
        if ((c1 === 'rock' && c2 === 'scissors') ||
            (c1 === 'paper' && c2 === 'rock') ||
            (c1 === 'scissors' && c2 === 'paper')) return 1;
        return 2;
      };

      // PvBot game flow
      async function startPvBotGame(challengerUser) {
        const prompt = await channel.send({
          content: `${challengerUser}, choose your move!`,
          components: [choiceButtons]
        });

        const filter = i => i.user.id === challengerUser.id;
        const collector = prompt.createMessageComponentCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', async i => {
          const userChoice = i.customId.replace('rps_', '');
          const botChoice = choices[Math.floor(Math.random() * choices.length)];

          const res = computeResult(userChoice, botChoice);
          let resultText;
          if (res === 0) resultText = `It’s a tie!`;
          else if (res === 1) resultText = `${challengerUser} wins! 🎉`;
          else resultText = `Bot wins! 🎉`;

          if (res === 1) updateLeaderboardStats(guildId, challengerUser.id, 'rps', 'win');
          if (res === 2) updateLeaderboardStats(guildId, challengerUser.id, 'rps', 'loss');

          const embed = new EmbedBuilder()
            .setTitle('🤖 Rock Paper Scissors')
            .addFields(
              { name: 'You', value: `${emojis[userChoice]} ${userChoice}`, inline: true },
              { name: 'Bot', value: `${emojis[botChoice]} ${botChoice}`, inline: true },
              { name: 'Result', value: resultText }
            )
            .setColor('Random');

          await i.update({ content: 'Game Over!', embeds: [embed], components: [endButtons] });

          const postCollector = i.message.createMessageComponentCollector({
            filter: b => b.user.id === challengerUser.id,
            time: 30000,
            max: 1
          });

          postCollector.on('collect', async b => {
            if (b.customId === 'rps_exit') {
              await b.update({ content: '👋 Game session ended.', components: [], embeds: [] });
            } else if (b.customId === 'rps_rematch') {
              await b.update({ content: '🔁 Rematch starting...', components: [], embeds: [] });
              setTimeout(() => startPvBotGame(challengerUser), 800);
            }
          });
        });

        collector.on('end', collected => {
          if (collected.size === 0) {
            prompt.edit({ content: '⏰ Time out — no move selected.', components: [] }).catch(() => {});
          }
        });
      }

      // PvP game flow
      async function startPvPGame(challengerUser, opponentUser) {
        const prompt = await channel.send({
          content: `🎮 ${challengerUser} has challenged ${opponentUser} to Rock Paper Scissors! Both players, click your move.`,
          components: [choiceButtons]
        });

        const moves = {};
        const filter = i => [challengerUser.id, opponentUser.id].includes(i.user.id);
        const collector = prompt.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async i => {
          if (moves[i.user.id]) return i.reply({ content: 'You already picked!', flags: 64 });
          moves[i.user.id] = i.customId.replace('rps_', '');
          await i.reply({ content: `✅ You picked ${emojis[moves[i.user.id]]} ${moves[i.user.id]}`, flags: 64 });

          if (Object.keys(moves).length === 2) collector.stop();
        });

        collector.on('end', async () => {
          if (Object.keys(moves).length < 2) {
            await prompt.edit({ content: '❌ Game cancelled. One or both players didn’t respond.', components: [] }).catch(() => {});
            return;
          }

          const p1Choice = moves[challengerUser.id];
          const p2Choice = moves[opponentUser.id];
          const res = computeResult(p1Choice, p2Choice);

          let resultText;
          if (res === 0) resultText = `It’s a tie!`;
          else if (res === 1) resultText = `${challengerUser} wins! 🎉`;
          else resultText = `${opponentUser} wins! 🎉`;

          if (res === 1) {
            updateLeaderboardStats(guildId, challengerUser.id, 'rps', 'win');
            updateLeaderboardStats(guildId, opponentUser.id, 'rps', 'loss');
          } else if (res === 2) {
            updateLeaderboardStats(guildId, opponentUser.id, 'rps', 'win');
            updateLeaderboardStats(guildId, challengerUser.id, 'rps', 'loss');
          }

          const embed = new EmbedBuilder()
            .setTitle('👥 Rock Paper Scissors')
            .addFields(
              { name: challengerUser.username, value: `${emojis[p1Choice]} ${p1Choice}`, inline: true },
              { name: opponentUser.username, value: `${emojis[p2Choice]} ${p2Choice}`, inline: true },
              { name: 'Result', value: resultText }
            )
            .setColor('Random');

          await prompt.edit({ content: 'Game Over!', embeds: [embed], components: [endButtons] }).catch(() => {});

          const postCollector = prompt.createMessageComponentCollector({
            filter: b => [challengerUser.id, opponentUser.id].includes(b.user.id),
            time: 30000,
            max: 1
          });

          postCollector.on('collect', async b => {
            if (b.customId === 'rps_exit') {
              await b.update({ content: '👋 Game session ended.', components: [], embeds: [] });
            } else if (b.customId === 'rps_rematch') {
              await b.update({ content: '🔁 Rematch starting...', components: [], embeds: [] });
              setTimeout(() => startPvPGame(challengerUser, opponentUser), 800);
            }
          });
        });
      }

      // Acknowledge once, then run the channel-based flow
      await interaction.reply({ content: '🎮 Game starting in channel...', flags: 64 });

      if (!opponent || opponent.bot || opponent.id === challenger.id) {
        startPvBotGame(challenger);
      } else {
        startPvPGame(challenger, opponent);
      }

      return;
    }

    // -------------------------
    // Memory (solo)
    // -------------------------
    if (sub === 'memory') {
      const player = interaction.user;

      const emojis = ['🍎', '🍌', '🍇', '🍓', '🍍', '🥝'];
      const shuffled = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
      const board = Array(12).fill('❓');
      const matched = Array(12).fill(false);
      let firstPick = null;
      let attempts = 0;

      const getBoardComponents = () => {
        const rows = [];
        for (let i = 0; i < 3; i++) {
          const row = new ActionRowBuilder();
          for (let j = 0; j < 4; j++) {
            const index = i * 4 + j;
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`mem_${index}`)
                .setLabel(board[index])
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(matched[index] || board[index] !== '❓')
            );
          }
          rows.push(row);
        }
        return rows;
      };

      const embed = new EmbedBuilder()
        .setTitle('🧠 Memory Match')
        .setDescription('Flip two cards to find a match!')
        .setColor('Random');

      const message = await interaction.reply({ embeds: [embed], components: getBoardComponents(), withResponse: true });

      const collector = message.createMessageComponentCollector({ time: 120000 });

      collector.on('collect', async i => {
        if (i.user.id !== player.id) return i.reply({ content: '⛔ Only the player can flip cards.', flags: 64 });

        const index = parseInt(i.customId.split('_')[1]);
        if (board[index] !== '❓' || matched[index]) return;

        board[index] = shuffled[index];
        await i.update({ embeds: [embed], components: getBoardComponents() });

        if (firstPick === null) {
          firstPick = index;
        } else {
          attempts++;
          const secondPick = index;

          if (shuffled[firstPick] === shuffled[secondPick]) {
            matched[firstPick] = true;
            matched[secondPick] = true;
          } else {
            await new Promise(res => setTimeout(res, 1000));
            board[firstPick] = '❓';
            board[secondPick] = '❓';
          }

          firstPick = null;

          const allMatched = matched.every(Boolean);
          if (allMatched) {
            collector.stop('win');
            embed.setDescription(`🎉 You matched all pairs in ${attempts} attempts!`);
            await interaction.editReply({ embeds: [embed], components: getBoardComponents() });
          } else {
            await interaction.editReply({ embeds: [embed], components: getBoardComponents() });
          }
        }
      });

      collector.on('end', async (_, reason) => {
        if (reason !== 'win') {
          embed.setDescription('⏰ Time’s up! Game over.');
          await interaction.editReply({ embeds: [embed], components: getBoardComponents() });
        }
      });

      return;
    }

    // fallback
    return interaction.reply({ content: 'Unknown subcommand.', flags: 64 });
  }
};