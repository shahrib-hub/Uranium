const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { useMongoDB } = require('../config/database');
const mongooseModels = require('../database/mongoose');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'afk_storage.db');
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

async function init() {
  await runAsync('PRAGMA foreign_keys = ON;');
  await runAsync('PRAGMA journal_mode = WAL;');
  await runAsync('PRAGMA synchronous = NORMAL;');

  await runAsync(`
    CREATE TABLE IF NOT EXISTS afk_records (
      guildId TEXT NOT NULL,
      userId TEXT NOT NULL,
      reason TEXT,
      startTimestamp INTEGER NOT NULL,
      hideStatus INTEGER NOT NULL DEFAULT 0,
      lastNotifiedJson TEXT NOT NULL DEFAULT '{}',
      notifiedCount INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (guildId, userId)
    );
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS afk_guild_config (
      guildId TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      cooldownSeconds INTEGER NOT NULL DEFAULT 30
    );
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS afk_ignored_channels (
      guildId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      PRIMARY KEY (guildId, channelId)
    );
  `);
}

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

const afkStorage = {
  init,

  async setAfk(guildId, userId, reason, startTs, hideStatus) {
    if (useMongoDB) {
      await mongooseModels.AFKUser.findOneAndUpdate(
        { guildId, userId },
        { reason, startTimestamp: startTs, hideStatus: !!hideStatus },
        { upsert: true }
      );
      return;
    }

    await init();
    const hide = hideStatus ? 1 : 0;
    const lastJson = '{}';
    await runAsync(
      `INSERT INTO afk_records (guildId, userId, reason, startTimestamp, hideStatus, lastNotifiedJson, notifiedCount)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(guildId, userId) DO UPDATE SET
         reason=excluded.reason,
         startTimestamp=excluded.startTimestamp,
         hideStatus=excluded.hideStatus,
         lastNotifiedJson=excluded.lastNotifiedJson,
         notifiedCount=excluded.notifiedCount`,
      [guildId, userId, reason || null, startTs, hide, lastJson, 0]
    );
  },

  async removeAfk(guildId, userId) {
    if (useMongoDB) {
      await mongooseModels.AFKUser.findOneAndDelete({ guildId, userId });
      return;
    }

    await init();
    await runAsync(`DELETE FROM afk_records WHERE guildId = ? AND userId = ?`, [guildId, userId]);
  },

  async getAfk(guildId, userId) {
    if (useMongoDB) {
      const doc = await mongooseModels.AFKUser.findOne({ guildId, userId });
      if (!doc) return null;
      return {
        guildId: doc.guildId,
        userId: doc.userId,
        reason: doc.reason,
        startTimestamp: doc.startTimestamp,
        hideStatus: doc.hideStatus,
        lastNotified: safeJsonParse(doc.lastNotifiedJson, {}),
        notifiedCount: doc.notifiedCount || 0
      };
    }

    await init();
    const row = await getAsync(`SELECT * FROM afk_records WHERE guildId = ? AND userId = ?`, [guildId, userId]);
    if (!row) return null;
    return {
      guildId: row.guildId,
      userId: row.userId,
      reason: row.reason,
      startTimestamp: Number(row.startTimestamp) || Date.now(),
      hideStatus: !!row.hideStatus,
      lastNotified: safeJsonParse(row.lastNotifiedJson, {}),
      notifiedCount: Number(row.notifiedCount) || 0,
    };
  },

  async listAfk(guildId, page = 1, perPage = 10) {
    const offset = (Math.max(page, 1) - 1) * perPage;

    if (useMongoDB) {
      const docs = await mongooseModels.AFKUser.find({ guildId }).sort({ startTimestamp: -1 }).skip(offset).limit(perPage);
      return docs.map(doc => ({
        guildId: doc.guildId,
        userId: doc.userId,
        reason: doc.reason,
        startTimestamp: doc.startTimestamp,
        hideStatus: doc.hideStatus,
        lastNotified: doc.lastNotified || {},
        notifiedCount: doc.notifiedCount || 0
      }));
    }

    await init();
    const rows = await allAsync(
      `SELECT * FROM afk_records WHERE guildId = ? ORDER BY startTimestamp DESC LIMIT ? OFFSET ?`,
      [guildId, perPage, offset]
    );
    return rows.map(r => ({
      guildId: r.guildId,
      userId: r.userId,
      reason: r.reason,
      startTimestamp: Number(r.startTimestamp),
      hideStatus: !!r.hideStatus,
      lastNotified: safeJsonParse(r.lastNotifiedJson, {}),
      notifiedCount: Number(r.notifiedCount) || 0,
    }));
  },

  async setGuildConfig(guildId, configObj) {
    const current = await this.getGuildConfig(guildId);
    const merged = {
      enabled: configObj.enabled ?? current.enabled ?? true,
      cooldownSeconds: configObj.cooldownSeconds ?? current.cooldownSeconds ?? 30,
    };

    if (useMongoDB) {
      await mongooseModels.AFKGuildConfig.findOneAndUpdate(
        { guildId },
        { enabled: merged.enabled, cooldownSeconds: Math.max(1, Math.min(600, merged.cooldownSeconds)) },
        { upsert: true }
      );
      return merged;
    }

    await init();
    await runAsync(
      `INSERT INTO afk_guild_config (guildId, enabled, cooldownSeconds)
       VALUES (?, ?, ?)
       ON CONFLICT(guildId) DO UPDATE SET
         enabled=excluded.enabled,
         cooldownSeconds=excluded.cooldownSeconds`,
      [guildId, merged.enabled ? 1 : 0, Math.max(1, Math.min(600, Number(merged.cooldownSeconds) || 30))]
    );
    return merged;
  },

  async getGuildConfig(guildId) {
    if (useMongoDB) {
      let doc = await mongooseModels.AFKGuildConfig.findOne({ guildId });
      if (!doc) {
        doc = await mongooseModels.AFKGuildConfig.create({ guildId, enabled: true, cooldownSeconds: 30 });
      }
      return { enabled: doc.enabled, cooldownSeconds: doc.cooldownSeconds };
    }

    await init();
    const row = await getAsync(`SELECT * FROM afk_guild_config WHERE guildId = ?`, [guildId]);
    if (!row) {
      await runAsync(
        `INSERT INTO afk_guild_config (guildId, enabled, cooldownSeconds) VALUES (?, ?, ?)`,
        [guildId, 1, 30]
      );
      return { enabled: true, cooldownSeconds: 30 };
    }
    return { enabled: !!row.enabled, cooldownSeconds: Number(row.cooldownSeconds) || 30 };
  },

  async addIgnoredChannel(guildId, channelId) {
    if (useMongoDB) {
      await mongooseModels.AFKIgnoredChannel.findOneAndUpdate({ guildId, channelId }, {}, { upsert: true });
      return;
    }

    await init();
    await runAsync(
      `INSERT INTO afk_ignored_channels (guildId, channelId)
       VALUES (?, ?)
       ON CONFLICT(guildId, channelId) DO NOTHING`,
      [guildId, channelId]
    );
  },

  async removeIgnoredChannel(guildId, channelId) {
    if (useMongoDB) {
      await mongooseModels.AFKIgnoredChannel.findOneAndDelete({ guildId, channelId });
      return;
    }

    await init();
    await runAsync(`DELETE FROM afk_ignored_channels WHERE guildId = ? AND channelId = ?`, [guildId, channelId]);
  },

  async listIgnoredChannels(guildId) {
    if (useMongoDB) {
      const docs = await mongooseModels.AFKIgnoredChannel.find({ guildId });
      return docs.map(d => d.channelId);
    }

    await init();
    const rows = await allAsync(`SELECT channelId FROM afk_ignored_channels WHERE guildId = ?`, [guildId]);
    return rows.map(r => r.channelId);
  },

  async updateLastNotified(guildId, afkUserId, notifierId, ts) {
    if (useMongoDB) {
      const doc = await mongooseModels.AFKUser.findOne({ guildId, userId: afkUserId });
      if (!doc) return;
      const last = safeJsonParse(doc.lastNotifiedJson, {});
      last[notifierId] = ts;
      doc.lastNotifiedJson = JSON.stringify(last);
      doc.notifiedCount = (doc.notifiedCount || 0) + 1;
      doc.markModified('lastNotifiedJson');
      await doc.save();
      return;
    }

    await init();
    const row = await getAsync(
      `SELECT lastNotifiedJson, notifiedCount FROM afk_records WHERE guildId = ? AND userId = ?`,
      [guildId, afkUserId]
    );
    if (!row) return;
    const map = safeJsonParse(row.lastNotifiedJson, {});
    map[notifierId] = ts;
    const newCount = (Number(row.notifiedCount) || 0) + 1;
    await runAsync(
      `UPDATE afk_records
       SET lastNotifiedJson = ?, notifiedCount = ?
       WHERE guildId = ? AND userId = ?`,
      [JSON.stringify(map), newCount, guildId, afkUserId]
    );
  },

  async getLastNotified(guildId, afkUserId, notifierId) {
    if (useMongoDB) {
      const doc = await mongooseModels.AFKUser.findOne({ guildId, userId: afkUserId });
      if (!doc) return null;
      const map = safeJsonParse(doc.lastNotifiedJson, {});
      return map[notifierId] || null;
    }

    await init();
    const row = await getAsync(
      `SELECT lastNotifiedJson FROM afk_records WHERE guildId = ? AND userId = ?`,
      [guildId, afkUserId]
    );
    if (!row) return null;
    const map = safeJsonParse(row.lastNotifiedJson, {});
    return map[notifierId] || null;
  }
};

module.exports = afkStorage;
