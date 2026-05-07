// src/utils/rrStorage.js
const rrdb = require('./rrdb');
const { useMongoDB } = require('../config/database');
const { RRSetup, RRItem, RRLog } = require('../database/mongoose');
const now = () => Math.floor(Date.now() / 1000);

async function initStorage() {
  await rrdb.init();
}

async function createSetup({ guildId, channelId, mode = 'buttons', title = '', description = '', creatorId }) {
  const ts = now();
  if (useMongoDB) {
    const doc = await RRSetup.create({
      guildId, channelId, mode, title, description, creatorId, createdAt: ts, updatedAt: ts, active: true
    });
    return doc._id.toString();
  }

  const res = await rrdb.instance.run(
    `INSERT INTO rr_setups (guild_id, channel_id, mode, title, description, creator_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [guildId, channelId, mode, title, description, creatorId, ts, ts]
  );
  return res.lastID;
}

async function updateSetupMessageId(setupId, messageId) {
  if (useMongoDB) {
    await RRSetup.findByIdAndUpdate(setupId, { messageId, updatedAt: now() }).catch(() => null);
    return;
  }

  await rrdb.instance.run(
    `UPDATE rr_setups SET message_id = ?, updated_at = ? WHERE id = ?;`,
    [messageId, now(), setupId]
  );
}

async function getSetupById(setupId) {
  if (useMongoDB) {
    const doc = await RRSetup.findById(setupId).catch(() => null);
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      guild_id: doc.guildId,
      channel_id: doc.channelId,
      message_id: doc.messageId,
      mode: doc.mode,
      title: doc.title,
      description: doc.description,
      creator_id: doc.creatorId,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
      active: doc.active ? 1 : 0
    };
  }

  return rrdb.instance.get(`SELECT * FROM rr_setups WHERE id = ?;`, [setupId]);
}

async function getSetupByMessage(guildId, messageId) {
  if (useMongoDB) {
    const doc = await RRSetup.findOne({ guildId, messageId, active: true });
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      guild_id: doc.guildId,
      channel_id: doc.channelId,
      message_id: doc.messageId,
      mode: doc.mode,
      title: doc.title,
      description: doc.description,
      creator_id: doc.creatorId,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
      active: doc.active ? 1 : 0
    };
  }

  return rrdb.instance.get(`SELECT * FROM rr_setups WHERE guild_id = ? AND message_id = ? AND active = 1;`, [guildId, messageId]);
}

async function listSetupsForGuild(guildId) {
  if (useMongoDB) {
    const docs = await RRSetup.find({ guildId }).sort({ createdAt: -1 });
    return docs.map(doc => ({
      id: doc._id.toString(),
      guild_id: doc.guildId,
      channel_id: doc.channelId,
      message_id: doc.messageId,
      mode: doc.mode,
      title: doc.title,
      description: doc.description,
      creator_id: doc.creatorId,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
      active: doc.active ? 1 : 0
    }));
  }

  return rrdb.instance.all(`SELECT * FROM rr_setups WHERE guild_id = ? ORDER BY created_at DESC;`, [guildId]);
}

async function deleteSetup(setupId) {
  if (useMongoDB) {
    await RRSetup.findByIdAndDelete(setupId).catch(() => null);
    await RRItem.deleteMany({ setupId });
    return;
  }

  return rrdb.instance.run(`DELETE FROM rr_setups WHERE id = ?;`, [setupId]);
}

async function addItem({ setupId, emoji, emojiIdentifier, label = null, roleId, position = 0 }) {
  const ts = now();
  if (useMongoDB) {
    const doc = await RRItem.create({
      setupId: String(setupId), emoji, emojiIdentifier, label, roleId, position, createdAt: ts
    });
    return doc._id.toString();
  }

  const res = await rrdb.instance.run(
    `INSERT INTO rr_items (setup_id, emoji, emoji_identifier, label, role_id, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [setupId, emoji, emojiIdentifier, label, roleId, position, ts]
  );
  return res.lastID;
}

async function removeItem(itemId) {
  if (useMongoDB) {
    await RRItem.findByIdAndDelete(itemId).catch(() => null);
    return;
  }

  return rrdb.instance.run(`DELETE FROM rr_items WHERE id = ?;`, [itemId]);
}

async function listItems(setupId) {
  if (useMongoDB) {
    const docs = await RRItem.find({ setupId: String(setupId) }).sort({ position: 1, _id: 1 });
    return docs.map(doc => ({
      id: doc._id.toString(),
      setup_id: doc.setupId,
      emoji: doc.emoji,
      emoji_identifier: doc.emojiIdentifier,
      label: doc.label,
      role_id: doc.roleId,
      position: doc.position,
      created_at: doc.createdAt
    }));
  }

  return rrdb.instance.all(`SELECT * FROM rr_items WHERE setup_id = ? ORDER BY position ASC, id ASC;`, [setupId]);
}

async function findItemByEmoji(setupId, emojiIdentifier) {
  if (useMongoDB) {
    const doc = await RRItem.findOne({ setupId: String(setupId), emojiIdentifier });
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      setup_id: doc.setupId,
      emoji: doc.emoji,
      emoji_identifier: doc.emojiIdentifier,
      label: doc.label,
      role_id: doc.roleId,
      position: doc.position,
      created_at: doc.createdAt
    };
  }

  return rrdb.instance.get(`SELECT * FROM rr_items WHERE setup_id = ? AND emoji_identifier = ? LIMIT 1;`, [setupId, emojiIdentifier]);
}

/**
 * Try multiple possible identifiers in the database and return first match.
 * identifiers: array of strings to test (ordered)
 */
async function findItemByAnyIdentifier(setupId, identifiers = []) {
  if (!identifiers || identifiers.length === 0) return null;
  if (useMongoDB) {
    const doc = await RRItem.findOne({ setupId: String(setupId), emojiIdentifier: { $in: identifiers } });
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      setup_id: doc.setupId,
      emoji: doc.emoji,
      emoji_identifier: doc.emojiIdentifier,
      label: doc.label,
      role_id: doc.roleId,
      position: doc.position,
      created_at: doc.createdAt
    };
  }

  // make placeholders ?,?,...
  const placeholders = identifiers.map(() => '?').join(',');
  // params: setupId, then each identifier
  const sql = `SELECT * FROM rr_items WHERE setup_id = ? AND emoji_identifier IN (${placeholders}) LIMIT 1;`;
  const params = [setupId, ...identifiers];
  return rrdb.instance.get(sql, params);
}

async function findItemById(itemId) {
  if (useMongoDB) {
    const doc = await RRItem.findById(itemId).catch(() => null);
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      setup_id: doc.setupId,
      emoji: doc.emoji,
      emoji_identifier: doc.emojiIdentifier,
      label: doc.label,
      role_id: doc.roleId,
      position: doc.position,
      created_at: doc.createdAt
    };
  }

  return rrdb.instance.get(`SELECT * FROM rr_items WHERE id = ? LIMIT 1;`, [itemId]);
}

async function logAction({ guildId, userId, roleId, setupId, action }) {
  if (useMongoDB) {
    await RRLog.create({ guildId, userId, roleId, setupId: String(setupId), action, ts: now() });
    return;
  }

  await rrdb.instance.run(
    `INSERT INTO rr_logs (guild_id, user_id, role_id, setup_id, action, ts) VALUES (?, ?, ?, ?, ?, ?);`,
    [guildId, userId, roleId, setupId, action, now()]
  );
}

module.exports = {
  initStorage,
  createSetup,
  updateSetupMessageId,
  getSetupById,
  getSetupByMessage,
  listSetupsForGuild,
  deleteSetup,
  addItem,
  removeItem,
  listItems,
  findItemByEmoji,
  findItemByAnyIdentifier,
  findItemById,
  logAction
};