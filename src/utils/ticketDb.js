// src/utils/ticketDb.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { useMongoDB } = require('../config/database');
const { TicketConfig, TicketCounter, getDbStatus } = require('../database/mongoose');

const db = new sqlite3.Database(path.join(__dirname, '../data/ticket.db'));

// initialize schema with additional tables/columns
db.serialize(() => {
  db.run(`PRAGMA foreign_keys = ON;`);

  db.run(`CREATE TABLE IF NOT EXISTS guild_config (
    guild_id TEXT PRIMARY KEY,
    setup_channel_id TEXT,
    transcript_channel_id TEXT,
    open_category_id TEXT,
    closed_category_id TEXT,
    archive_category_id TEXT,
    support_role_id TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS counters (
    guild_id TEXT PRIMARY KEY,
    next_id INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER,
    guild_id TEXT,
    opener_id TEXT,
    channel_id TEXT,
    type TEXT,
    status TEXT,
    claim_user_id TEXT,
    created_at INTEGER,
    closed_at INTEGER,
    description TEXT,
    form_responses TEXT,
    PRIMARY KEY(guild_id, id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ticket_members (
    guild_id TEXT,
    ticket_id INTEGER,
    user_id TEXT,
    PRIMARY KEY(guild_id, ticket_id, user_id)
  )`);

  // panels: supports multi-panel per guild (premium only)
  db.run(`CREATE TABLE IF NOT EXISTS ticket_panels (
    panel_id TEXT PRIMARY KEY,
    guild_id TEXT,
    channel_id TEXT,
    name TEXT,
    is_premium_only INTEGER DEFAULT 0,
    types TEXT
  )`);
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err); else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err); else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
}

// Convenience helpers
async function getConfig(guildId) {
  if (useMongoDB) {
    if (!getDbStatus()) return undefined;
    const doc = await TicketConfig.findOne({ guildId });
    if (doc) {
      return {
        guild_id: doc.guildId,
        setup_channel_id: doc.setupChannelId,
        transcript_channel_id: doc.transcriptChannelId,
        open_category_id: doc.openCategoryId,
        closed_category_id: doc.closedCategoryId,
        archive_category_id: doc.archiveCategoryId,
        support_role_id: doc.supportRoleId
      };
    }
    return undefined; // consistent with db.get
  }

  return await get(`SELECT * FROM guild_config WHERE guild_id = ?`, [guildId]);
}

async function setConfig(guildId, config) {
  if (useMongoDB) {
    if (!getDbStatus()) return;
    await TicketConfig.findOneAndUpdate(
      { guildId },
      {
        setupChannelId: config.setup_channel_id,
        transcriptChannelId: config.transcript_channel_id,
        openCategoryId: config.open_category_id,
        closedCategoryId: config.closed_category_id,
        archiveCategoryId: config.archive_category_id,
        supportRoleId: config.support_role_id
      },
      { upsert: true }
    );
    return;
  }

  await run(
    `INSERT OR REPLACE INTO guild_config (
      guild_id, setup_channel_id, transcript_channel_id,
      open_category_id, closed_category_id, archive_category_id, support_role_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      guildId,
      config.setup_channel_id,
      config.transcript_channel_id,
      config.open_category_id,
      config.closed_category_id,
      config.archive_category_id,
      config.support_role_id
    ]
  );
}

async function nextTicketId(guildId) {
  if (useMongoDB) {
    if (!getDbStatus()) return 1;
    const doc = await TicketCounter.findOneAndUpdate(
      { guildId },
      { $inc: { nextId: 1 } },
      { upsert: true, new: false } // new: false returns the doc *before* update
    );
    if (!doc) {
      // First ticket for guild
      return 1;
    }
    return doc.nextId;
  }

  const row = await get(`SELECT next_id FROM counters WHERE guild_id = ?`, [guildId]);
  if (!row) {
    await run(`INSERT INTO counters (guild_id, next_id) VALUES (?, 2)`, [guildId]);
    return 1;
  } else {
    const id = row.next_id;
    await run(`UPDATE counters SET next_id = ? WHERE guild_id = ?`, [id + 1, guildId]);
    return id;
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  getConfig,
  setConfig,
  nextTicketId
};
