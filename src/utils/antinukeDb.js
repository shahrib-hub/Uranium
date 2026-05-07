const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { useMongoDB } = require('../config/database');
const mongooseModels = require('../database/mongoose');

const dbPath = path.join(__dirname, '../../data/antinuke.db');
const db = new sqlite3.Database(dbPath);

/* ───────────────────────────── */
/* PROMISE HELPERS */
/* ───────────────────────────── */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/* ───────────────────────────── */
/* INIT TABLES */
/* ───────────────────────────── */
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS antinuke_config (
      guild_id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      punishment TEXT DEFAULT 'ban',
      action_limit INTEGER DEFAULT 3,
      autorecovery INTEGER DEFAULT 1,
      log_channel TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS antinuke_features (
      guild_id TEXT,
      feature TEXT,
      enabled INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, feature)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS antinuke_whitelist (
      guild_id TEXT,
      user_id TEXT,
      PRIMARY KEY (guild_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS antinuke_actions (
      guild_id TEXT,
      user_id TEXT,
      count INTEGER,
      last_action INTEGER,
      PRIMARY KEY (guild_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS antinuke_recovery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      action TEXT,
      target_id TEXT,
      timestamp INTEGER
    )
  `);
});

/* ───────────────────────────── */
/* DEFAULT FEATURES */
/* ───────────────────────────── */
const FEATURES = [
  'antichannel',
  'antirole',
  'antiemoji',
  'antiwebhook',
  'antiban',
  'antikick',
  'antibot',
  'antiprune'
];

/* ───────────────────────────── */
/* ENSURE GUILD */
/* ───────────────────────────── */
async function ensureGuild(guildId) {
  if (useMongoDB) {
    let doc = await mongooseModels.AntiNukeConfig.findOne({ guildId });
    if (!doc) {
      await mongooseModels.AntiNukeConfig.create({ guildId });
    }
    return;
  }

  await run(
    `INSERT OR IGNORE INTO antinuke_config (guild_id) VALUES (?)`,
    [guildId]
  );

  for (const feature of FEATURES) {
    await run(
      `INSERT OR IGNORE INTO antinuke_features (guild_id, feature) VALUES (?, ?)`,
      [guildId, feature]
    );
  }
}

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

/* ───────────────────────────── */
/* READ CONFIG */
/* ───────────────────────────── */
async function getFullConfig(guildId) {
  await ensureGuild(guildId);

  if (useMongoDB) {
    const doc = await mongooseModels.AntiNukeConfig.findOne({ guildId });
    return {
      enabled: doc.enabled,
      punishment: doc.punishment,
      action_limit: doc.actionLimit || 3,
      autorecovery: doc.autoRecovery ?? true,
      log_channel: doc.logChannel || null,
      antichannel: !!doc.antichannel,
      antirole: !!doc.antirole,
      antiemoji: !!doc.antiemoji,
      antiwebhook: !!doc.antiwebhook,
      antiban: !!doc.antiban,
      antikick: !!doc.antikick,
      antibot: !!doc.antibot,
      antiprune: !!doc.antiprune
    };
  }

  const base = await get(
    `SELECT * FROM antinuke_config WHERE guild_id = ?`,
    [guildId]
  );

  const features = await all(
    `SELECT feature, enabled FROM antinuke_features WHERE guild_id = ?`,
    [guildId]
  );

  const featureMap = {};
  for (const f of features) {
    featureMap[f.feature] = Boolean(f.enabled);
  }

  return {
    enabled: Boolean(base.enabled),
    punishment: base.punishment,
    action_limit: base.action_limit,
    autorecovery: Boolean(base.autorecovery),
    log_channel: base.log_channel,
    ...featureMap
  };
}

/* ───────────────────────────── */
/* CONFIG SETTERS */
/* ───────────────────────────── */
async function setEnabled(guildId, state) {
  await ensureGuild(guildId);
  if (useMongoDB) {
    await mongooseModels.AntiNukeConfig.updateOne({ guildId }, { enabled: !!state });
    return;
  }
  await run(
    `UPDATE antinuke_config SET enabled = ? WHERE guild_id = ?`,
    [state ? 1 : 0, guildId]
  );
}

async function setPunishment(guildId, punishment) {
  await ensureGuild(guildId);
  if (useMongoDB) {
    await mongooseModels.AntiNukeConfig.updateOne({ guildId }, { punishment });
    return;
  }
  await run(
    `UPDATE antinuke_config SET punishment = ? WHERE guild_id = ?`,
    [punishment, guildId]
  );
}

async function setActionLimit(guildId, limit) {
  await ensureGuild(guildId);
  if (useMongoDB) {
    await mongooseModels.AntiNukeConfig.updateOne({ guildId }, { actionLimit: limit });
    return;
  }
  await run(
    `UPDATE antinuke_config SET action_limit = ? WHERE guild_id = ?`,
    [limit, guildId]
  );
}

async function setAutoRecovery(guildId, state) {
  await ensureGuild(guildId);
  if (useMongoDB) {
    await mongooseModels.AntiNukeConfig.updateOne({ guildId }, { autoRecovery: !!state });
    return;
  }
  await run(
    `UPDATE antinuke_config SET autorecovery = ? WHERE guild_id = ?`,
    [state ? 1 : 0, guildId]
  );
}

/* ───────────────────────────── */
/* FEATURE TOGGLES */
/* ───────────────────────────── */
async function setFeature(guildId, feature, enabled) {
  await ensureGuild(guildId);
  if (useMongoDB) {
    const update = {};
    update[feature] = !!enabled;
    await mongooseModels.AntiNukeConfig.updateOne({ guildId }, update);
    return;
  }
  await run(
    `UPDATE antinuke_features
     SET enabled = ?
     WHERE guild_id = ? AND feature = ?`,
    [enabled ? 1 : 0, guildId, feature]
  );
}

/* ───────────────────────────── */
/* ACTION TRACKING */
/* ───────────────────────────── */
// Action tracking is temporary data. In MongoDB we can store it in limitsJson or memory.
const actionCache = new Map();

async function incrementAction(guildId, userId, now) {
  if (useMongoDB) {
    const key = `${guildId}-${userId}`;
    const data = actionCache.get(key) || { count: 0, last_action: 0 };
    if (now - data.last_action > 10000) {
      data.count = 1;
      data.last_action = now;
    } else {
      data.count += 1;
      data.last_action = now;
    }
    actionCache.set(key, data);
    return data.count;
  }

  const row = await get(
    `SELECT * FROM antinuke_actions WHERE guild_id = ? AND user_id = ?`,
    [guildId, userId]
  );

  if (!row || now - row.last_action > 10000) {
    await run(
      `INSERT OR REPLACE INTO antinuke_actions
       (guild_id, user_id, count, last_action)
       VALUES (?, ?, 1, ?)`,
      [guildId, userId, now]
    );
    return 1;
  }

  const next = row.count + 1;
  await run(
    `UPDATE antinuke_actions
     SET count = ?, last_action = ?
     WHERE guild_id = ? AND user_id = ?`,
    [next, now, guildId, userId]
  );

  return next;
}

/* ───────────────────────────── */
/* WHITELIST */
/* ───────────────────────────── */
async function isWhitelisted(guildId, userId) {
  if (useMongoDB) {
    const exists = await mongooseModels.AntiNukeWhitelist.findOne({ guildId, userId });
    return !!exists;
  }

  const row = await get(
    `SELECT 1 FROM antinuke_whitelist WHERE guild_id = ? AND user_id = ?`,
    [guildId, userId]
  );
  return Boolean(row);
}

async function addWhitelist(guildId, userId) {
  if (useMongoDB) {
    await mongooseModels.AntiNukeWhitelist.findOneAndUpdate({ guildId, userId }, {}, { upsert: true });
    return;
  }

  await run(
    `INSERT OR IGNORE INTO antinuke_whitelist VALUES (?, ?)`,
    [guildId, userId]
  );
}

async function removeWhitelist(guildId, userId) {
  if (useMongoDB) {
    await mongooseModels.AntiNukeWhitelist.findOneAndDelete({ guildId, userId });
    return;
  }

  await run(
    `DELETE FROM antinuke_whitelist WHERE guild_id = ? AND user_id = ?`,
    [guildId, userId]
  );
}

async function listWhitelist(guildId) {
  if (useMongoDB) {
    const docs = await mongooseModels.AntiNukeWhitelist.find({ guildId });
    return docs.map(d => ({ user_id: d.userId }));
  }

  return all(
    `SELECT user_id FROM antinuke_whitelist WHERE guild_id = ?`,
    [guildId]
  );
}

/* ───────────────────────────── */
/* LOG CHANNEL */
/* ───────────────────────────── */
async function getLogChannel(guildId) {
  if (useMongoDB) {
    const doc = await mongooseModels.AntiNukeConfig.findOne({ guildId });
    return doc?.logChannel || null;
  }

  const row = await get(
    `SELECT log_channel FROM antinuke_config WHERE guild_id = ?`,
    [guildId]
  );
  return row?.log_channel || null;
}

async function setLogChannel(guildId, channelId) {
  await ensureGuild(guildId);
  if (useMongoDB) {
    await mongooseModels.AntiNukeConfig.updateOne({ guildId }, { logChannel: channelId });
    return;
  }

  await run(
    `UPDATE antinuke_config SET log_channel = ? WHERE guild_id = ?`,
    [channelId, guildId]
  );
}

/* ───────────────────────────── */
/* AUTO RECOVERY LOGS */
/* ───────────────────────────── */
const recoveryLogsCache = new Map(); // Temporary for MongoDB

async function logRecovery(guildId, action, target) {
  if (useMongoDB) {
    const arr = recoveryLogsCache.get(guildId) || [];
    arr.unshift({
      guild_id: guildId,
      action,
      target_id: target?.id || null,
      timestamp: Date.now()
    });
    if (arr.length > 50) arr.pop();
    recoveryLogsCache.set(guildId, arr);
    return;
  }

  await run(
    `INSERT INTO antinuke_recovery
     (guild_id, action, target_id, timestamp)
     VALUES (?, ?, ?, ?)`,
    [
      guildId,
      action,
      target?.id || null,
      Date.now()
    ]
  );
}

async function getRecoveryLogs(guildId, limit = 20) {
  if (useMongoDB) {
    const arr = recoveryLogsCache.get(guildId) || [];
    return arr.slice(0, limit);
  }

  return all(
    `SELECT * FROM antinuke_recovery
     WHERE guild_id = ?
     ORDER BY timestamp DESC
     LIMIT ?`,
    [guildId, limit]
  );
}

/* ───────────────────────────── */
/* EXPORT */
/* ───────────────────────────── */
module.exports = {
  getFullConfig,
  setEnabled,
  setPunishment,
  setActionLimit,
  setAutoRecovery,
  setFeature,
  isWhitelisted,
  addWhitelist,
  removeWhitelist,
  listWhitelist,
  incrementAction,
  getLogChannel,
  setLogChannel,
  logRecovery,
  getRecoveryLogs
};