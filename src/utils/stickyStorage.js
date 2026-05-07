// src/utils/stickyStorage.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { useMongoDB } = require('../config/database');
const { Sticky, StickyConfig } = require('../database/mongoose');

const dbDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'sticky.db');
const db = new sqlite3.Database(dbPath);

// ---------------------------
// Promisified DB helpers
// ---------------------------
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

// ---------------------------
// INIT FIX — prevents recursion
// ---------------------------
let initialized = false;

async function init() {
  if (initialized) return;  // prevents infinite loop
  initialized = true;

  await runAsync('PRAGMA foreign_keys = ON;');
  await runAsync('PRAGMA journal_mode = WAL;');
  await runAsync('PRAGMA synchronous = NORMAL;');

  await runAsync(`
    CREATE TABLE IF NOT EXISTS stickies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('pinned', 'bottom')),
      embedFlag INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      lastMessageId TEXT,
      createdBy TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0
    );
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS sticky_config (
      guildId TEXT PRIMARY KEY,
      repostDelaySeconds INTEGER DEFAULT 1,
      autoPinOnCreate INTEGER DEFAULT 1,
      webhookName TEXT
    );
  `);
}

// ---------------------------
// Sticky CRUD
// ---------------------------
async function createSticky(guildId, channelId, content, type, embedFlag, createdBy, options = {}) {
  const createdAt = Date.now();
  const priority = options.priority || 0;

  if (useMongoDB) {
    const doc = await Sticky.create({
      guildId, channelId, content, type, embedFlag: !!embedFlag, enabled: true, createdBy, createdAt, priority
    });
    return doc._id.toString();
  }

  await init();
  const res = await runAsync(
    `INSERT INTO stickies (guildId, channelId, content, type, embedFlag, enabled, createdBy, createdAt, priority)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    [guildId, channelId, content, type, embedFlag ? 1 : 0, createdBy, createdAt, priority]
  );

  return res.lastID;
}

async function updateSticky(id, updates = {}) {
  if (useMongoDB) {
    await Sticky.findByIdAndUpdate(id, updates).catch(() => null);
    return;
  }

  await init();
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (!fields.length) return;

  values.push(id);
  await runAsync(`UPDATE stickies SET ${fields.join(', ')} WHERE id = ?`, values);
}

async function removeSticky(id) {
  if (useMongoDB) {
    await Sticky.findByIdAndDelete(id).catch(() => null);
    return;
  }

  await init();
  await runAsync(`DELETE FROM stickies WHERE id = ?`, [id]);
}

async function getSticky(id) {
  if (useMongoDB) {
    const doc = await Sticky.findById(id).catch(() => null);
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      guildId: doc.guildId,
      channelId: doc.channelId,
      content: doc.content,
      type: doc.type,
      embedFlag: doc.embedFlag ? 1 : 0,
      enabled: doc.enabled ? 1 : 0,
      lastMessageId: doc.lastMessageId,
      createdBy: doc.createdBy,
      createdAt: doc.createdAt,
      priority: doc.priority
    };
  }

  await init();
  return await getAsync(`SELECT * FROM stickies WHERE id = ?`, [id]);
}

async function listStickies(guildId, page = 1, perPage = 10) {
  const offset = (page - 1) * perPage;

  if (useMongoDB) {
    const docs = await Sticky.find({ guildId }).sort({ priority: 1, createdAt: 1 }).skip(offset).limit(perPage);
    return docs.map(doc => ({
      id: doc._id.toString(),
      guildId: doc.guildId,
      channelId: doc.channelId,
      content: doc.content,
      type: doc.type,
      embedFlag: doc.embedFlag ? 1 : 0,
      enabled: doc.enabled ? 1 : 0,
      lastMessageId: doc.lastMessageId,
      createdBy: doc.createdBy,
      createdAt: doc.createdAt,
      priority: doc.priority
    }));
  }

  await init();
  return await allAsync(
    `SELECT * FROM stickies WHERE guildId = ?
     ORDER BY priority ASC, createdAt ASC
     LIMIT ? OFFSET ?`,
    [guildId, perPage, offset]
  );
}

async function listStickiesInChannel(guildId, channelId) {
  if (useMongoDB) {
    const docs = await Sticky.find({ guildId, channelId, enabled: true }).sort({ priority: 1 });
    return docs.map(doc => ({
      id: doc._id.toString(),
      guildId: doc.guildId,
      channelId: doc.channelId,
      content: doc.content,
      type: doc.type,
      embedFlag: doc.embedFlag ? 1 : 0,
      enabled: doc.enabled ? 1 : 0,
      lastMessageId: doc.lastMessageId,
      createdBy: doc.createdBy,
      createdAt: doc.createdAt,
      priority: doc.priority
    }));
  }

  await init();
  return await allAsync(
    `SELECT * FROM stickies
     WHERE guildId = ? AND channelId = ? AND enabled = 1
     ORDER BY priority ASC`,
    [guildId, channelId]
  );
}

async function setLastMessageId(id, messageId) {
  if (useMongoDB) {
    await Sticky.findByIdAndUpdate(id, { lastMessageId: messageId }).catch(() => null);
    return;
  }

  await init();
  await runAsync(`UPDATE stickies SET lastMessageId = ? WHERE id = ?`, [messageId, id]);
}

// ---------------------------
// Guild Config (FIXED)
// ---------------------------
async function getGuildConfig(guildId) {
  if (useMongoDB) {
    let doc = await StickyConfig.findOne({ guildId });
    if (!doc) {
      doc = await StickyConfig.create({ guildId, repostDelaySeconds: 1, autoPinOnCreate: true, webhookName: null });
    }
    return {
      repostDelaySeconds: doc.repostDelaySeconds,
      autoPinOnCreate: doc.autoPinOnCreate,
      webhookName: doc.webhookName
    };
  }

  await init();
  let row = await getAsync(`SELECT * FROM sticky_config WHERE guildId = ?`, [guildId]);

  if (!row) {
    // Insert default config ONCE without recursion
    await runAsync(
      `INSERT INTO sticky_config (guildId, repostDelaySeconds, autoPinOnCreate, webhookName)
       VALUES (?, ?, ?, ?)`,
      [guildId, 1, 1, null]
    );

    row = { repostDelaySeconds: 1, autoPinOnCreate: 1, webhookName: null };
  }

  return {
    repostDelaySeconds: row.repostDelaySeconds ?? 1,
    autoPinOnCreate: !!row.autoPinOnCreate,
    webhookName: row.webhookName || null
  };
}

async function setGuildConfig(guildId, config = {}) {
  const current = await getGuildConfig(guildId);

  const merged = {
    repostDelaySeconds: config.repostDelaySeconds ?? current.repostDelaySeconds ?? 1,
    autoPinOnCreate: config.autoPinOnCreate ?? current.autoPinOnCreate ?? 1,
    webhookName: config.webhookName ?? current.webhookName ?? null
  };

  if (useMongoDB) {
    await StickyConfig.findOneAndUpdate({ guildId }, merged, { upsert: true });
    return;
  }

  await init();
  await runAsync(
    `INSERT INTO sticky_config (guildId, repostDelaySeconds, autoPinOnCreate, webhookName)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(guildId) DO UPDATE SET
       repostDelaySeconds = excluded.repostDelaySeconds,
       autoPinOnCreate = excluded.autoPinOnCreate,
       webhookName = excluded.webhookName`,
    [guildId, merged.repostDelaySeconds, merged.autoPinOnCreate ? 1 : 0, merged.webhookName]
  );
}

// ---------------------------
// EXPORTS
// ---------------------------
module.exports = {
  init,
  createSticky,
  updateSticky,
  removeSticky,
  getSticky,
  listStickies,
  listStickiesInChannel,
  setLastMessageId,
  setGuildConfig,
  getGuildConfig
};