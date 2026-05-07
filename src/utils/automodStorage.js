const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { useMongoDB } = require('../config/database');
const mongooseModels = require('../database/mongoose');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'automod.db');
const db = new sqlite3.Database(dbPath);

// helpers
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
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
function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

let ready = (async function init() {
  await runAsync('PRAGMA foreign_keys = ON;');
  await runAsync('PRAGMA journal_mode = WAL;');
  await runAsync('PRAGMA synchronous = NORMAL;');

  await runAsync(`
    CREATE TABLE IF NOT EXISTS automod_settings (
      guildId TEXT PRIMARY KEY,
      settings TEXT
    );
  `);

  // optional join tracking table (not strictly necessary)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS automod_joins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT,
      timestamp INTEGER
    );
  `);
})();

function defaultConfig() {
  return {
    AntiSpam: { enabled: true, maxMessages: 5, timeWindow: 5, action: 'delete' },
    AntiLink: { enabled: true, action: 'delete', whitelistedDomains: [] },
    AntiCaps: { enabled: false, percentage: 70, action: 'delete' },
    AntiInvite: { enabled: true, action: 'delete' },
    AntiMentionSpam: { enabled: true, maxMentions: 6, action: 'delete' },
    BannedWords: { enabled: false, words: [], action: 'delete' },
    AntiRaid: { enabled: false, joinThreshold: 5, timeWindow: 10, action: 'kick' },
    IgnoredChannels: [],
    IgnoredRoles: []
  };
}

module.exports = {
  async getConfig(guildId) {
    if (useMongoDB) {
      const doc = await mongooseModels.AutomodSettings.findOne({ guildId });
      if (!doc) {
        const def = defaultConfig();
        await this.setConfig(guildId, def);
        return def;
      }
      try { return JSON.parse(doc.settings); }
      catch { return defaultConfig(); }
    }

    await ready;
    const row = await getAsync(`SELECT settings FROM automod_settings WHERE guildId = ?`, [guildId]);
    if (!row) {
      const def = defaultConfig();
      await this.setConfig(guildId, def);
      return def;
    }
    try {
      return JSON.parse(row.settings);
    } catch {
      const def = defaultConfig();
      await this.setConfig(guildId, def);
      return def;
    }
  },

  async setConfig(guildId, newSettings) {
    const json = JSON.stringify(newSettings);
    if (useMongoDB) {
      await mongooseModels.AutomodSettings.findOneAndUpdate(
        { guildId },
        { settings: json },
        { upsert: true }
      );
      return;
    }

    await ready;
    return runAsync(
      `INSERT INTO automod_settings (guildId, settings) VALUES (?, ?)
       ON CONFLICT(guildId) DO UPDATE SET settings = excluded.settings`,
      [guildId, json]
    );
  },

  // convenience helpers for single-key updates
  async updatePartial(guildId, patch) {
    const cfg = await this.getConfig(guildId);
    const merged = { ...cfg, ...patch };
    await this.setConfig(guildId, merged);
    return merged;
  },

  // join logging (optional)
  async addJoinRecord(guildId, ts = Date.now()) {
    await ready;
    return runAsync(`INSERT INTO automod_joins (guildId, timestamp) VALUES (?, ?)`, [guildId, ts]);
  },

  async getRecentJoins(guildId, sinceTs) {
    await ready;
    return allAsync(`SELECT * FROM automod_joins WHERE guildId = ? AND timestamp >= ?`, [guildId, sinceTs]);
  },

  async clearOldJoins(olderThanTs) {
    await ready;
    return runAsync(`DELETE FROM automod_joins WHERE timestamp < ?`, [olderThanTs]);
  }
};

// Periodically clean old join records (every 30 min, removes records older than 24h)
setInterval(async () => {
  try {
    await ready;
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    await runAsync(`DELETE FROM automod_joins WHERE timestamp < ?`, [cutoff]);
  } catch (err) {
    console.warn('[automodStorage] periodic join cleanup failed:', err?.message || err);
  }
}, 30 * 60 * 1000);