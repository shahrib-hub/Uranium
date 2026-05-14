// src/utils/ticketDb.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { useMongoDB } = require('../config/database');
const { TicketConfig, TicketCounter, Ticket, TicketMember, TicketPanel, getDbStatus } = require('../database/mongoose');

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
      { upsert: true, returnDocument: 'before' } // returns the doc *before* update
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

async function getTicket(guildId, ticketId) {
  if (useMongoDB && getDbStatus()) {
    const doc = await Ticket.findOne({ guildId, ticketId });
    if (!doc) return null;
    return {
      id: doc.ticketId,
      guild_id: doc.guildId,
      opener_id: doc.openerId,
      channel_id: doc.channelId,
      type: doc.type,
      status: doc.status,
      claim_user_id: doc.claimUserId,
      created_at: doc.createdAt,
      closed_at: doc.closedAt,
      description: doc.description,
      form_responses: doc.formResponses
    };
  }
  return await get(`SELECT * FROM tickets WHERE guild_id = ? AND id = ?`, [guildId, ticketId]);
}

async function getTicketByChannel(guildId, channelId) {
  if (useMongoDB && getDbStatus()) {
    const doc = await Ticket.findOne({ guildId, channelId });
    if (!doc) return null;
    return {
      id: doc.ticketId,
      guild_id: doc.guildId,
      opener_id: doc.openerId,
      channel_id: doc.channelId,
      type: doc.type,
      status: doc.status,
      claim_user_id: doc.claimUserId,
      created_at: doc.createdAt,
      closed_at: doc.closedAt,
      description: doc.description,
      form_responses: doc.formResponses
    };
  }
  return await get(`SELECT * FROM tickets WHERE guild_id = ? AND channel_id = ?`, [guildId, channelId]);
}

async function updateTicket(guildId, ticketId, updates) {
  if (useMongoDB && getDbStatus()) {
    const mongoUpdates = {};
    if ('status' in updates) mongoUpdates.status = updates.status;
    if ('claim_user_id' in updates) mongoUpdates.claimUserId = updates.claim_user_id;
    if ('closed_at' in updates) mongoUpdates.closedAt = updates.closed_at;
    if ('description' in updates) mongoUpdates.description = updates.description;
    
    await Ticket.updateOne({ guildId, ticketId }, { $set: mongoUpdates });
    return;
  }
  
  const keys = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  await run(`UPDATE tickets SET ${setClause} WHERE guild_id = ? AND id = ?`, [...values, guildId, ticketId]);
}

async function deleteTicket(guildId, ticketId) {
  if (useMongoDB && getDbStatus()) {
    await Ticket.deleteOne({ guildId, ticketId });
    await TicketMember.deleteMany({ guildId, ticketId });
    return;
  }
  await run(`DELETE FROM tickets WHERE guild_id = ? AND id = ?`, [guildId, ticketId]);
  await run(`DELETE FROM ticket_members WHERE guild_id = ? AND ticket_id = ?`, [guildId, ticketId]);
}

async function addTicketMember(guildId, ticketId, userId) {
  if (useMongoDB && getDbStatus()) {
    await TicketMember.findOneAndUpdate({ guildId, ticketId, userId }, {}, { upsert: true });
    return;
  }
  await run(`INSERT OR IGNORE INTO ticket_members (guild_id, ticket_id, user_id) VALUES (?, ?, ?)`, [guildId, ticketId, userId]);
}

async function removeTicketMember(guildId, ticketId, userId) {
  if (useMongoDB && getDbStatus()) {
    await TicketMember.deleteOne({ guildId, ticketId, userId });
    return;
  }
  await run(`DELETE FROM ticket_members WHERE guild_id = ? AND ticket_id = ? AND user_id = ?`, [guildId, ticketId, userId]);
}

async function getTicketMembers(guildId, ticketId) {
  if (useMongoDB && getDbStatus()) {
    const docs = await TicketMember.find({ guildId, ticketId });
    return docs.map(d => d.userId);
  }
  const rows = await all(`SELECT user_id FROM ticket_members WHERE guild_id = ? AND ticket_id = ?`, [guildId, ticketId]);
  return rows.map(r => r.user_id);
}

async function getPanels(guildId) {
  if (useMongoDB && getDbStatus()) {
    const query = guildId ? { guildId } : {};
    const docs = await TicketPanel.find(query);
    return docs.map(d => ({
      panel_id: d.panelId,
      guild_id: d.guildId,
      channel_id: d.channelId,
      name: d.name,
      is_premium_only: d.premiumOnly ? 1 : 0,
      types: JSON.stringify(d.types || [])
    }));
  }
  const sql = guildId ? `SELECT * FROM ticket_panels WHERE guild_id = ?` : `SELECT * FROM ticket_panels`;
  const params = guildId ? [guildId] : [];
  return await all(sql, params);
}

async function getPanelById(panelId) {
  if (useMongoDB && getDbStatus()) {
    const d = await TicketPanel.findOne({ panelId });
    if (!d) return null;
    return {
      panel_id: d.panelId,
      guild_id: d.guildId,
      channel_id: d.channelId,
      name: d.name,
      is_premium_only: d.premiumOnly ? 1 : 0,
      types: JSON.stringify(d.types || [])
    };
  }
  return await get(`SELECT * FROM ticket_panels WHERE panel_id = ?`, [panelId]);
}

async function createPanel(data) {
  if (useMongoDB && getDbStatus()) {
    let typesArr = [];
    if (typeof data.types === 'string') {
      try { typesArr = JSON.parse(data.types); } catch { typesArr = [data.types]; }
    } else if (Array.isArray(data.types)) {
      typesArr = data.types;
    }

    await TicketPanel.findOneAndUpdate(
      { panelId: data.panel_id },
      { 
        guildId: data.guild_id, 
        channelId: data.channel_id, 
        name: data.name, 
        premiumOnly: !!data.is_premium_only,
        types: typesArr
      },
      { upsert: true }
    );
    return;
  }
  await run(
    `INSERT OR REPLACE INTO ticket_panels (panel_id, guild_id, channel_id, name, is_premium_only, types) VALUES (?, ?, ?, ?, ?, ?)`,
    [data.panel_id, data.guild_id, data.channel_id, data.name, data.is_premium_only, data.types || '[]']
  );
}

async function removePanel(panelId) {
  if (useMongoDB && getDbStatus()) {
    await TicketPanel.deleteOne({ panelId });
    return;
  }
  await run(`DELETE FROM ticket_panels WHERE panel_id = ?`, [panelId]);
}

async function deleteGuildConfig(guildId) {
  if (useMongoDB && getDbStatus()) {
    await TicketConfig.deleteOne({ guildId });
    await TicketPanel.deleteMany({ guildId });
    return;
  }
  await run(`DELETE FROM guild_config WHERE guild_id = ?`, [guildId]);
  await run(`DELETE FROM ticket_panels WHERE guild_id = ?`, [guildId]);
}

async function deleteGuildCounter(guildId) {
  if (useMongoDB && getDbStatus()) {
    await TicketCounter.deleteOne({ guildId });
    return;
  }
  await run(`DELETE FROM counters WHERE guild_id = ?`, [guildId]);
}

async function deleteAllGuildTickets(guildId) {
  if (useMongoDB && getDbStatus()) {
    await Ticket.deleteMany({ guildId });
    await TicketMember.deleteMany({ guildId });
    return;
  }
  await run(`DELETE FROM tickets WHERE guild_id = ?`, [guildId]);
  await run(`DELETE FROM ticket_members WHERE guild_id = ?`, [guildId]);
}

module.exports = {
  db,
  run,
  get,
  all,
  getConfig,
  setConfig,
  nextTicketId,
  getTicket,
  getTicketByChannel,
  updateTicket,
  deleteTicket,
  addTicketMember,
  removeTicketMember,
  getTicketMembers,
  getPanels,
  getPanelById,
  createPanel,
  removePanel,
  deleteGuildConfig,
  deleteGuildCounter,
  deleteAllGuildTickets
};
