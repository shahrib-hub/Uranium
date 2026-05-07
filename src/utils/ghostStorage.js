// src/utils/ghostStorage.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { useMongoDB } = require('../config/database');
const { GhostConfig, GhostCount } = require('../database/mongoose');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'ghostping.db');
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

let _ready = false;
async function ensureSchema() {
  if (_ready) return;
  _ready = true;

  await runAsync('PRAGMA foreign_keys = ON;');
  await runAsync('PRAGMA journal_mode = WAL;');
  await runAsync('PRAGMA synchronous = NORMAL;');

  // settings: per guild config
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ghost_settings (
      guildId TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      action TEXT DEFAULT 'notify', -- none | notify | timeout
      timeoutSeconds INTEGER DEFAULT 300
    );
  `);

  // counts: per user per guild
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ghost_counts (
      guildId TEXT,
      userId TEXT,
      count INTEGER DEFAULT 0,
      PRIMARY KEY (guildId, userId)
    );
  `);
}

// Public API
const storage = {
  _readyPromise: ensureSchema(),

  async ensureDefaults(guildId) {
    if (useMongoDB) {
      let doc = await GhostConfig.findOne({ guildId });
      if (!doc) {
        doc = await GhostConfig.create({ guildId, enabled: false, action: 'notify', timeoutSeconds: 300 });
      }
      return { guildId, enabled: doc.enabled, action: doc.action, timeoutSeconds: doc.timeoutSeconds };
    }

    await storage._readyPromise;
    const cur = await getAsync(`SELECT * FROM ghost_settings WHERE guildId = ?`, [guildId]);
    if (!cur) {
      await runAsync(`INSERT INTO ghost_settings (guildId, enabled, action, timeoutSeconds) VALUES (?, 0, 'notify', 300)`, [guildId]);
      return { guildId, enabled: false, action: 'notify', timeoutSeconds: 300 };
    }
    return {
      guildId,
      enabled: cur.enabled === 1,
      action: cur.action || 'notify',
      timeoutSeconds: cur.timeoutSeconds || 300
    };
  },

  async setEnabled(guildId, enabled = true) {
    if (useMongoDB) {
      await GhostConfig.findOneAndUpdate({ guildId }, { enabled: !!enabled }, { upsert: true });
      return;
    }

    await storage._readyPromise;
    return runAsync(`
      INSERT INTO ghost_settings (guildId, enabled) VALUES (?, ?)
      ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled
    `, [guildId, enabled ? 1 : 0]);
  },

  async setAction(guildId, action = 'notify', timeoutSeconds = 300) {
    if (useMongoDB) {
      await GhostConfig.findOneAndUpdate({ guildId }, { action, timeoutSeconds }, { upsert: true });
      return;
    }

    await storage._readyPromise;
    return runAsync(`
      INSERT INTO ghost_settings (guildId, action, timeoutSeconds) VALUES (?, ?, ?)
      ON CONFLICT(guildId) DO UPDATE SET action = excluded.action, timeoutSeconds = excluded.timeoutSeconds
    `, [guildId, action, timeoutSeconds]);
  },

  async getSettings(guildId) {
    if (useMongoDB) {
      const doc = await GhostConfig.findOne({ guildId });
      if (!doc) return { guildId, enabled: false, action: 'notify', timeoutSeconds: 300 };
      return { guildId, enabled: doc.enabled, action: doc.action, timeoutSeconds: doc.timeoutSeconds };
    }

    await storage._readyPromise;
    const row = await getAsync(`SELECT * FROM ghost_settings WHERE guildId = ?`, [guildId]);
    if (!row) return { guildId, enabled: false, action: 'notify', timeoutSeconds: 300 };
    return { guildId, enabled: !!row.enabled, action: row.action || 'notify', timeoutSeconds: row.timeoutSeconds || 300 };
  },

  // counts
  async incrementCount(guildId, userId, by = 1) {
    if (useMongoDB) {
      const doc = await GhostCount.findOneAndUpdate(
        { guildId, userId },
        { $inc: { count: by } },
        { upsert: true, new: true }
      );
      return doc.count;
    }

    await storage._readyPromise;
    const existing = await getAsync(`SELECT count FROM ghost_counts WHERE guildId = ? AND userId = ?`, [guildId, userId]);
    if (!existing) {
      await runAsync(`INSERT INTO ghost_counts (guildId, userId, count) VALUES (?, ?, ?)`, [guildId, userId, by]);
      return by;
    } else {
      const newCount = (existing.count || 0) + by;
      await runAsync(`UPDATE ghost_counts SET count = ? WHERE guildId = ? AND userId = ?`, [newCount, guildId, userId]);
      return newCount;
    }
  },

  async resetCount(guildId, userId) {
    if (useMongoDB) {
      await GhostCount.findOneAndDelete({ guildId, userId });
      return;
    }

    await storage._readyPromise;
    return runAsync(`DELETE FROM ghost_counts WHERE guildId = ? AND userId = ?`, [guildId, userId]);
  },

  async getCount(guildId, userId) {
    if (useMongoDB) {
      const doc = await GhostCount.findOne({ guildId, userId });
      return doc ? doc.count : 0;
    }

    await storage._readyPromise;
    const r = await getAsync(`SELECT count FROM ghost_counts WHERE guildId = ? AND userId = ?`, [guildId, userId]);
    return r ? (r.count || 0) : 0;
  }
};

module.exports = storage;