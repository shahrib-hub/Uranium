// src/utils/joinPingStorage.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { useMongoDB } = require('../config/database');
const { JoinPingConfig } = require('../database/mongoose');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'joinping.db');
const db = new sqlite3.Database(dbPath);

// Promisified helpers
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}
function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}
function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

let initialized = false;
async function init() {
  if (initialized) return;
  initialized = true;

  await runAsync('PRAGMA journal_mode = WAL;');
  await runAsync('PRAGMA synchronous = NORMAL;');

  await runAsync(`
    CREATE TABLE IF NOT EXISTS join_pings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
  `);

  await runAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_join_pings_guild_channel ON join_pings (guildId, channelId);
  `);
}

module.exports = {
  init,

  async addChannel(guildId, channelId) {
    const now = Date.now();
    if (useMongoDB) {
      try {
        await JoinPingConfig.create({ guildId, channelId, createdAt: now });
        return true;
      } catch (err) {
        if (err.code === 11000) return false;
        throw err;
      }
    }

    await init();
    try {
      await runAsync(
        `INSERT INTO join_pings (guildId, channelId, createdAt) VALUES (?, ?, ?)`,
        [guildId, channelId, now]
      );
      return true;
    } catch (err) {
      // unique constraint -> already exists
      if (String(err.message).includes('UNIQUE') || String(err.message).includes('unique')) {
        return false;
      }
      throw err;
    }
  },

  async removeChannel(guildId, channelId) {
    if (useMongoDB) {
      await JoinPingConfig.deleteOne({ guildId, channelId });
      return;
    }

    await init();
    await runAsync(`DELETE FROM join_pings WHERE guildId = ? AND channelId = ?`, [guildId, channelId]);
  },

  // remove everything for guild
  async clearGuild(guildId) {
    if (useMongoDB) {
      await JoinPingConfig.deleteMany({ guildId });
      return;
    }

    await init();
    await runAsync(`DELETE FROM join_pings WHERE guildId = ?`, [guildId]);
  },

  async listChannels(guildId) {
    if (useMongoDB) {
      const docs = await JoinPingConfig.find({ guildId }).sort({ createdAt: 1 });
      return docs.map(d => ({ channelId: d.channelId, createdAt: d.createdAt }));
    }

    await init();
    const rows = await allAsync(`SELECT channelId, createdAt FROM join_pings WHERE guildId = ? ORDER BY createdAt ASC`, [guildId]);
    return rows.map(r => ({ channelId: r.channelId, createdAt: r.createdAt }));
  },

  // list all rows (useful for maintenance)
  async listAll() {
    if (useMongoDB) {
      const docs = await JoinPingConfig.find({});
      return docs.map(d => ({ guildId: d.guildId, channelId: d.channelId, createdAt: d.createdAt }));
    }

    await init();
    return allAsync(`SELECT guildId, channelId, createdAt FROM join_pings`);
  },

  async hasChannel(guildId, channelId) {
    if (useMongoDB) {
      const doc = await JoinPingConfig.findOne({ guildId, channelId });
      return !!doc;
    }

    await init();
    const row = await getAsync(`SELECT 1 FROM join_pings WHERE guildId = ? AND channelId = ?`, [guildId, channelId]);
    return !!row;
  }
};