// src/utils/logStorage.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { isMongoReady } = require('../database/dbUtils');
const mongooseModels = require('../database/mongoose');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'logging.db');
const db = new sqlite3.Database(dbPath);

// promisified helpers
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

let initialized = false;
async function init() {
  if (initialized) return;
  initialized = true;
  await runAsync('PRAGMA foreign_keys = ON;');
  await runAsync('PRAGMA journal_mode = WAL;');
  await runAsync('PRAGMA synchronous = NORMAL;');

  await runAsync(`
    CREATE TABLE IF NOT EXISTS log_settings (
      guildId TEXT PRIMARY KEY,
      logChannel TEXT,
      webhookId TEXT,
      webhookToken TEXT
    );
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS log_events (
      guildId TEXT,
      eventName TEXT,
      enabled INTEGER DEFAULT 0,
      PRIMARY KEY (guildId, eventName)
    );
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS log_ignored_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT,
      channelId TEXT
    );
  `);
}

// public API
async function setLogChannel(guildId, channelId) {
  if (isMongoReady()) {
    await mongooseModels.LogConfig.findOneAndUpdate({ guildId }, { logChannel: channelId }, { upsert: true });
    return;
  }

  await init();
  return runAsync(
    `INSERT INTO log_settings (guildId, logChannel) VALUES (?, ?)
     ON CONFLICT(guildId) DO UPDATE SET logChannel = excluded.logChannel`,
    [guildId, channelId]
  );
}
async function getLogChannel(guildId) {
  if (isMongoReady()) {
    const doc = await mongooseModels.LogConfig.findOne({ guildId });
    return doc ? doc.logChannel : null;
  }

  await init();
  const row = await getAsync(`SELECT logChannel FROM log_settings WHERE guildId = ?`, [guildId]);
  return row?.logChannel ?? null;
}

async function setWebhook(guildId, webhookId, webhookToken) {
  if (isMongoReady()) {
    await mongooseModels.LogConfig.findOneAndUpdate({ guildId }, { webhookId, webhookToken }, { upsert: true });
    return;
  }

  await init();
  return runAsync(
    `INSERT INTO log_settings (guildId, webhookId, webhookToken) VALUES (?, ?, ?)
     ON CONFLICT(guildId) DO UPDATE SET webhookId = excluded.webhookId, webhookToken = excluded.webhookToken`,
    [guildId, webhookId, webhookToken]
  );
}
async function getWebhook(guildId) {
  if (isMongoReady()) {
    const doc = await mongooseModels.LogConfig.findOne({ guildId });
    if (!doc || !doc.webhookId || !doc.webhookToken) return null;
    return { id: doc.webhookId, token: doc.webhookToken };
  }

  await init();
  const row = await getAsync(`SELECT webhookId, webhookToken FROM log_settings WHERE guildId = ?`, [guildId]);
  if (!row || !row.webhookId || !row.webhookToken) return null;
  return { id: row.webhookId, token: row.webhookToken };
}

async function setEventEnabled(guildId, eventName, enabled = true) {
  if (isMongoReady()) {
    await mongooseModels.LogEvent.findOneAndUpdate(
      { guildId, eventName },
      { enabled: !!enabled },
      { upsert: true }
    );
    return;
  }

  await init();
  return runAsync(
    `INSERT INTO log_events (guildId, eventName, enabled) VALUES (?, ?, ?)
     ON CONFLICT(guildId, eventName) DO UPDATE SET enabled = excluded.enabled`,
    [guildId, eventName, enabled ? 1 : 0]
  );
}
async function isEventEnabled(guildId, eventName) {
  if (isMongoReady()) {
    const doc = await mongooseModels.LogEvent.findOne({ guildId, eventName });
    return doc ? doc.enabled : false;
  }

  await init();
  const row = await getAsync(`SELECT enabled FROM log_events WHERE guildId = ? AND eventName = ?`, [guildId, eventName]);
  // default off unless explicitly enabled
  return !!(row && row.enabled === 1);
}
async function listEvents(guildId) {
  if (isMongoReady()) {
    const docs = await mongooseModels.LogEvent.find({ guildId });
    return docs.map(e => ({ eventName: e.eventName, enabled: e.enabled ? 1 : 0 }));
  }

  await init();
  return allAsync(`SELECT eventName, enabled FROM log_events WHERE guildId = ?`, [guildId]);
}

async function addIgnoredChannel(guildId, channelId) {
  if (isMongoReady()) {
    await mongooseModels.LogIgnoredChannel.findOneAndUpdate({ guildId, channelId }, {}, { upsert: true });
    return;
  }

  await init();
  return runAsync(`INSERT INTO log_ignored_channels (guildId, channelId) VALUES (?, ?)`, [guildId, channelId]);
}
async function removeIgnoredChannel(guildId, channelId) {
  if (isMongoReady()) {
    await mongooseModels.LogIgnoredChannel.findOneAndDelete({ guildId, channelId });
    return;
  }

  await init();
  return runAsync(`DELETE FROM log_ignored_channels WHERE guildId = ? AND channelId = ?`, [guildId, channelId]);
}
async function listIgnoredChannels(guildId) {
  if (isMongoReady()) {
    const docs = await mongooseModels.LogIgnoredChannel.find({ guildId });
    return docs.map(d => d.channelId);
  }

  await init();
  const rows = await allAsync(`SELECT channelId FROM log_ignored_channels WHERE guildId = ?`, [guildId]);
  return rows.map(r => r.channelId);
}

module.exports = {
  init,
  setLogChannel,
  getLogChannel,
  setWebhook,
  getWebhook,
  setEventEnabled,
  isEventEnabled,
  listEvents,
  addIgnoredChannel,
  removeIgnoredChannel,
  listIgnoredChannels
};