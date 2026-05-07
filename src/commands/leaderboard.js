const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  getLeaderboard,
  getGlobalLeaderboard
} = require('../utils/leaderboard');

const gameIcons = {
  rps: '🪨',
  hangman: '🔤',
  tictactoe: '❎',
  global: '🌐'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View game leaderboards')
    .addSubcommand(sub =>
      sub.setName('rps').setDescription('View Rock Paper Scissors leaderboard')
    )
    .addSubcommand(sub =>
      sub.setName('hangman').setDescription('View Hangman leaderboard')
    )
    .addSubcommand(sub =>
      sub.setName('tictactoe').setDescription('View Tic-Tac-Toe leaderboard')
    )
    .addSubcommand(sub =>
      sub.setName('global').setDescription('View global leaderboard (XP based)')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    const leaderboard =
      sub === 'global'
        ? getGlobalLeaderboard(guildId)
        : getLeaderboard(guildId, sub);

    const top10 = leaderboard.slice(0, 10);
    const icon = gameIcons[sub] || '🏆';
    const title =
      sub === 'global'
        ? `${icon} Global Leaderboard`
        : `${icon} ${sub.charAt(0).toUpperCase() + sub.slice(1)} Leaderboard`;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor('Gold')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setFooter({ text: 'Multi-Bot Leaderboard • Made by Mynzz' })
      .setTimestamp();

    if (top10.length === 0) {
      embed.setDescription('No stats available yet. Be the first to play!');
    } else {
      embed.setDescription(
        top10.map((entry, i) => {
          const userTag = `<@${entry.userId}>`;
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
          return `${medal} ${userTag}\n🏅 Wins: \`${entry.wins}\` | ❌ Losses: \`${entry.losses}\` | 🧠 XP: \`${entry.xp}\` | 🔥 Streak: \`${entry.streak}\``;
        }).join('\n\n')
      );
    }

    await interaction.reply({ embeds: [embed] });
  }
};
