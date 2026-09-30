// src/dashboard/routes/economy.js — Economy System API
const { Router } = require('express');
const economyStorage = require('../../utils/economyStorage');

module.exports = function createEconomyRouter(client, { requireGuildAccess, requireGuildAdmin, requireGuildMod }) {
  const router = Router();

  // 1. GET Economy Settings & Leaderboard
  router.get('/guild/:guildId/economy', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { guild } = req;
      const currency = (await economyStorage.getMeta(`guild_${guild.id}_currency`)) || '🪙';
      const dailyAmount = parseInt((await economyStorage.getMeta(`guild_${guild.id}_daily`)) || '250', 10);
      const workMin = parseInt((await economyStorage.getMeta(`guild_${guild.id}_work_min`)) || '50', 10);
      const workMax = parseInt((await economyStorage.getMeta(`guild_${guild.id}_work_max`)) || '200', 10);

      // Fetch Top users
      const rawLeaderboard = (await economyStorage.getLeaderboard('net', 15)) || [];

      // Enrich with Discord users
      const leaderboard = await Promise.all(
        rawLeaderboard.map(async (row, index) => {
          let username = `User (${row.userId})`;
          let avatar = null;
          try {
            const member = await guild.members.fetch(row.userId).catch(() => null);
            if (member) {
              username = member.user.username;
              avatar = member.user.displayAvatarURL({ dynamic: true, size: 64 });
            }
          } catch {}

          return {
            rank: index + 1,
            userId: row.userId,
            username,
            avatar,
            wallet: row.wallet,
            bank: row.bank,
            net: row.net
          };
        })
      );

      res.json({
        settings: {
          currency,
          dailyAmount,
          workMin,
          workMax
        },
        leaderboard
      });
    } catch (err) {
      console.error('[Economy API] GET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. POST Update Economy Settings
  router.post('/guild/:guildId/economy/settings', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const { currency, dailyAmount, workMin, workMax } = req.body;

      if (currency !== undefined) {
        await economyStorage.setMeta(`guild_${guild.id}_currency`, String(currency).slice(0, 10));
      }
      if (dailyAmount !== undefined) {
        await economyStorage.setMeta(`guild_${guild.id}_daily`, Math.max(1, parseInt(dailyAmount, 10) || 250));
      }
      if (workMin !== undefined) {
        await economyStorage.setMeta(`guild_${guild.id}_work_min`, Math.max(1, parseInt(workMin, 10) || 50));
      }
      if (workMax !== undefined) {
        await economyStorage.setMeta(`guild_${guild.id}_work_max`, Math.max(1, parseInt(workMax, 10) || 200));
      }

      res.json({ success: true, message: 'Economy settings updated successfully!' });
    } catch (err) {
      console.error('[Economy API] SETTINGS error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
