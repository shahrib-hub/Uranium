const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../data/leaderboard.json');

function loadData() {
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '{}');
  return JSON.parse(fs.readFileSync(dbPath));
}

function saveData(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function updateLeaderboardStats(guildId, userId, game, result) {
  const data = loadData();

  if (!data[guildId]) data[guildId] = {};
  if (!data[guildId][userId]) {
    data[guildId][userId] = {
      rps: { wins: 0, losses: 0 },
      hangman: { wins: 0, losses: 0 },
      tictactoe: { wins: 0, losses: 0 },
      xp: 0,
      streak: 0
    };
  }

  const userStats = data[guildId][userId];

  if (!userStats[game]) userStats[game] = { wins: 0, losses: 0 };

  if (result === 'win') {
    userStats[game].wins++;
    userStats.streak++;
    userStats.xp += 2;
  } else if (result === 'loss') {
    userStats[game].losses++;
    userStats.streak = 0;
    userStats.xp += 1;
  }

  saveData(data);
}

function getLeaderboard(guildId, game) {
  const data = loadData();
  const guildStats = data[guildId] || {};

  const leaderboard = Object.entries(guildStats).map(([userId, stats]) => {
    const gameStats = stats[game] || { wins: 0, losses: 0 };
    return {
      userId,
      wins: gameStats.wins,
      losses: gameStats.losses,
      total: gameStats.wins + gameStats.losses,
      xp: stats.xp || 0,
      streak: stats.streak || 0
    };
  });

  return leaderboard.sort((a, b) => b.wins - a.wins).slice(0, 10);
}

function getGlobalLeaderboard(guildId) {
  const data = loadData();
  const guildStats = data[guildId] || {};

  const leaderboard = Object.entries(guildStats).map(([userId, stats]) => {
    const totalWins =
      (stats.rps?.wins || 0) +
      (stats.hangman?.wins || 0) +
      (stats.tictactoe?.wins || 0);
    const totalLosses =
      (stats.rps?.losses || 0) +
      (stats.hangman?.losses || 0) +
      (stats.tictactoe?.losses || 0);
    return {
      userId,
      wins: totalWins,
      losses: totalLosses,
      xp: stats.xp || 0,
      streak: stats.streak || 0
    };
  });

  return leaderboard.sort((a, b) => b.xp - a.xp).slice(0, 10);
}

module.exports = {
  updateLeaderboardStats,
  getLeaderboard,
  getGlobalLeaderboard
};
