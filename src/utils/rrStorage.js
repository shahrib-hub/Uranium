// src/utils/rrStorage.js - REVAMPED
const rrdb = require('./rrdb');
const { useMongoDB } = require('../config/database');
const { RRSetup, RRItem, RRLog, RRCounter } = require('../database/mongoose');
const logger = require('./logger');
const chalk = require('chalk');
const now = () => Math.floor(Date.now() / 1000);

// ========== In-memory caches (survive restarts via persistence layer) ==========
const cache = {
  setups: new Map(),           // setupId -> setup doc
  items: new Map(),            // setupId -> items[] array
  setupByMessage: new Map(),   // `${guildId}:${messageId}` -> setupId
  rateLimits: new Map(),       // `${guildId}:${userId}:${setupId}` -> { count, resetAt }
  roleAssignments: new Map(),  // `${guildId}:${userId}` -> Set(roleId)
  kv: new Map()                // General KV cache for get/set helpers
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cacheSet(key, value) { cache.kv.set(key, { value, ttl: Date.now() + CACHE_TTL }); }
function cacheGet(key) {
  const entry = cache.kv.get(key);
  if (!entry) return null;
  if (Date.now() > entry.ttl) { cache.kv.delete(key); return null; }
  return entry.value;
}
function cacheInvalidateSetup(setupId) {
  const sid = String(setupId);
  cache.setups.delete(sid);
  cache.items.delete(sid);
  // Clear any KV cache entries related to this setup
  for (const [key] of cache.kv) {
    if (key.includes(sid)) cache.kv.delete(key);
  }
}

// ========== Rate Limiting (distributed-ready) ==========
async function checkRateLimit(guildId, userId, setupId) {
  const key = `${guildId}:${userId}:${setupId}`;
  const entry = cache.rateLimits.get(key);
  
  if (entry && Date.now() < entry.resetAt) {
    const remaining = Math.ceil((entry.resetAt - Date.now()) / 1000);
    return { allowed: false, remaining };
  }
  
  cache.rateLimits.set(key, { count: 1, resetAt: Date.now() + 1000 }); // 1 second default
  return { allowed: true };
}

async function incrementRateLimit(guildId, userId, setupId, cooldownSeconds) {
  const key = `${guildId}:${userId}:${setupId}`;
  const resetAt = Date.now() + (cooldownSeconds || 1) * 1000;
  cache.rateLimits.set(key, { count: 1, resetAt });
}

// ========== Role Policy Validation ==========
/**
 * Validates if a user can be assigned a role based on:
 * - exclusive groups (mutually exclusive)
 * - required roles (prerequisites)
 * - blocked roles (never self-assign)
 * - per-setup role limits
 */
async function validateRoleAssignment(member, item, setup) {
  const { guild } = member;
  const config = setup.config || {};
  
  // Check blocked roles
  if (config.blockedRoles && config.blockedRoles.includes(item.role_id)) {
    return { allowed: false, reason: 'BLOCKED_ROLE' };
  }
  // Check required roles (prerequisites)
  if (config.requiredRoles) {
    const reqEntries = config.requiredRoles.entries ? config.requiredRoles.entries() : Object.entries(config.requiredRoles);
    for (const [group, requiredRoleIds] of reqEntries) {
      if (!requiredRoleIds || (typeof requiredRoleIds !== 'object' && !Array.isArray(requiredRoleIds))) continue;
      
      // Handle both array and object/Map entries
      const rolesToVerify = Array.isArray(requiredRoleIds) ? requiredRoleIds : Object.values(requiredRoleIds);
      if (rolesToVerify.length === 0) continue;

      const hasAll = rolesToVerify.every(id => member.roles.cache.has(String(id)));
      if (!hasAll) {
        return { allowed: false, reason: 'MISSING_PREREQUISITES', group };
      }
    }
  }
  
  // Check exclusive groups (mutual exclusivity)
  if (config.exclusiveGroups) {
    const excEntries = config.exclusiveGroups.entries ? config.exclusiveGroups.entries() : Object.entries(config.exclusiveGroups);
    for (const [group, roleIds] of excEntries) {
      if (!roleIds || (typeof roleIds !== 'object' && !Array.isArray(roleIds))) continue;
      
      const groupRoles = Array.isArray(roleIds) ? roleIds : Object.values(roleIds);
      const userHasFromGroup = member.roles.cache.some(r => groupRoles.includes(r.id));
      const requestingIsInGroup = groupRoles.includes(item.role_id);
      
      if (userHasFromGroup && !requestingIsInGroup) {
        return { allowed: false, reason: 'EXCLUSIVE_GROUP_CONFLICT', group };
      }
    }
  }
  
  // Check per-setup user limit
  if (config.maxPerUser > 0) {
    const userItems = await listItems(setup.id);
    const currentCount = userItems.filter(i => 
      guild.roles.cache.has(i.role_id) && member.roles.cache.has(i.role_id)
    ).length;
    if (currentCount >= config.maxPerUser) {
      return { allowed: false, reason: 'USER_LIMIT_REACHED' };
    }
  }
  
  return { allowed: true };
}

// ========== CRUD OPERATIONS WITH CACHE ==========
async function initStorage() {
  await rrdb.init();
  logger.info(chalk.magenta('[RR] Storage layer initialized (mode: %s)'), useMongoDB ? 'MongoDB' : 'SQLite');
}

async function createSetup({ guildId, channelId, mode = 'buttons', title = '', description = '', creatorId, config = {} }) {
  const ts = now();
  if (useMongoDB) {
    // Use global counter to avoid duplicate ID conflicts across guilds
    const counter = await RRCounter.findOneAndUpdate(
      { guildId: 'GLOBAL' },
      { $inc: { nextId: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    const integerId = String(counter.nextId);

    const doc = await RRSetup.create({
      _id: integerId,
      guildId, channelId, mode, title, description, creatorId,
      createdAt: ts, updatedAt: ts, active: true, config
    });
    return doc._id;
  }
  const res = await rrdb.instance.run(
    `INSERT INTO rr_setups (guild_id, channel_id, mode, title, description, creator_id, created_at, updated_at, config)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [guildId, channelId, mode, title, description, creatorId, ts, ts, JSON.stringify(config)]
  );
  return res.lastID;
}

async function updateSetupMessageId(setupId, messageId) {
  if (useMongoDB) {
    await RRSetup.findByIdAndUpdate(setupId, { messageId, updatedAt: now() }).catch(() => null);
    cacheInvalidateSetup(setupId);
    return;
  }
  await rrdb.instance.run(
    `UPDATE rr_setups SET message_id = ?, updated_at = ? WHERE id = ?;`,
    [messageId, now(), setupId]
  );
  cacheInvalidateSetup(String(setupId));
}

async function getSetupById(setupId) {
  const sid = String(setupId);
  const key = `setup:${sid}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  let result;
  if (useMongoDB) {
    const doc = await RRSetup.findById(sid).catch(() => null);
    if (!doc) return null;
    result = {
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
      active: doc.active ? 1 : 0,
      config: doc.config || {}
    };
  } else {
    const row = await rrdb.instance.get(`SELECT * FROM rr_setups WHERE id = ?;`, [sid]);
    if (!row) return null;
    const parsedConfig = typeof row.config === 'string' ? JSON.parse(row.config || '{}') : (row.config || {});
    result = {
      ...row,
      config: {
        ...parsedConfig,
        exclusiveGroups: parsedConfig.exclusiveGroups || {},
        requiredRoles: parsedConfig.requiredRoles || {}
      }
    };
  }
  if (result) cacheSet(key, result);
  return result;
}

async function getSetupByMessage(guildId, messageId) {
  const key = `msg:${guildId}:${messageId}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  let result;
  if (useMongoDB) {
    const doc = await RRSetup.findOne({ guildId, messageId, active: true });
    if (!doc) return null;
    result = {
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
      active: doc.active ? 1 : 0,
      config: doc.config || {}
    };
  } else {
    const row = await rrdb.instance.get(`SELECT * FROM rr_setups WHERE guild_id = ? AND message_id = ? AND active = 1;`, [guildId, messageId]);
    if (!row) return null;
    const parsedConfig = typeof row.config === 'string' ? JSON.parse(row.config || '{}') : (row.config || {});
    result = {
      ...row,
      config: {
        ...parsedConfig,
        exclusiveGroups: parsedConfig.exclusiveGroups || {},
        requiredRoles: parsedConfig.requiredRoles || {}
      }
    };
  }
  if (result) cacheSet(key, result);
  return result;
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

  const rows = await rrdb.instance.all(`SELECT * FROM rr_setups WHERE guild_id = ? ORDER BY created_at DESC;`, [guildId]);
  return rows.map(row => ({
    ...row,
    // Note: we don't include config in list view for performance
  }));
}

async function deleteSetup(setupId) {
  const sid = String(setupId);
  if (useMongoDB) {
    await RRSetup.findByIdAndDelete(sid).catch(() => null);
    await RRItem.deleteMany({ setupId: sid });
    await RRLog.deleteMany({ setupId: sid });
    cacheInvalidateSetup(sid);
    return;
  }
  await rrdb.instance.run(`DELETE FROM rr_setups WHERE id = ?;`, [sid]);
  cacheInvalidateSetup(sid);
}

async function addItem({ setupId, emoji, emojiIdentifier, label = null, roleId, position = 0, style = 0, description = null, metadata = {} }) {
  const ts = now();
  const sid = String(setupId);
  if (useMongoDB) {
    const counter = await RRCounter.findOneAndUpdate(
      { guildId: 'GLOBAL_ITEMS' }, // Special key for global item counter
      { $inc: { nextId: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    const integerId = String(counter.nextId);

    const doc = await RRItem.create({
      _id: integerId,
      setupId: sid, emoji, emojiIdentifier, label, roleId, position, createdAt: ts,
      style, description, metadata
    });
    cacheInvalidateSetup(sid);
    return doc._id;
  }
  const res = await rrdb.instance.run(
    `INSERT INTO rr_items (setup_id, emoji, emoji_identifier, label, role_id, position, created_at, style, description, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [sid, emoji, emojiIdentifier, label, roleId, position, ts, style, description, JSON.stringify(metadata)]
  );
  cacheInvalidateSetup(sid);
  return res.lastID;
}

async function removeItem(itemId) {
  const item = await findItemById(itemId);
  if (!item) return;
  
  if (useMongoDB) {
    await RRItem.findByIdAndDelete(itemId).catch(() => null);
    cacheInvalidateSetup(item.setup_id);
    return;
  }
  await rrdb.instance.run(`DELETE FROM rr_items WHERE id = ?;`, [itemId]);
  cacheInvalidateSetup(String(item.setup_id));
}

async function clearAllItems(setupId) {
  const sid = String(setupId);
  if (useMongoDB) {
    await RRItem.deleteMany({ setupId: sid });
  } else {
    await rrdb.instance.run(`DELETE FROM rr_items WHERE setup_id = ?;`, [sid]);
  }
  cacheInvalidateSetup(sid);
}

async function listItems(setupId) {
  const sid = String(setupId);
  const cacheKey = `items:${sid}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  let result;
  if (useMongoDB) {
    const docs = await RRItem.find({ setupId: sid }).sort({ position: 1, _id: 1 });
    result = docs.map(doc => ({
      id: doc._id.toString(),
      setup_id: doc.setupId,
      emoji: doc.emoji,
      emoji_identifier: doc.emojiIdentifier,
      label: doc.label,
      role_id: doc.roleId,
      position: doc.position,
      created_at: doc.createdAt,
      description: doc.description,
      style: doc.style,
      metadata: doc.metadata || {}
    }));
  } else {
    result = await rrdb.instance.all(`SELECT * FROM rr_items WHERE setup_id = ? ORDER BY position ASC, id ASC;`, [sid]);
  }
  cacheSet(cacheKey, result);
  return result;
}

async function findItemByEmoji(setupId, emojiIdentifier) {
  const items = await listItems(setupId);
  return items.find(it => it.emoji_identifier === emojiIdentifier) || null;
}

async function findItemByAnyIdentifier(setupId, identifiers = []) {
  if (!Array.isArray(identifiers) || identifiers.length === 0) return null;
  const items = await listItems(setupId);
  return items.find(it => identifiers.includes(it.emoji_identifier)) || null;
}

async function findItemById(itemId) {
  const cacheKey = `item:${itemId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  let result;
  if (useMongoDB) {
    const doc = await RRItem.findById(itemId).catch(() => null);
    if (!doc) return null;
    result = {
      id: doc._id.toString(),
      setup_id: doc.setupId,
      emoji: doc.emoji,
      emoji_identifier: doc.emojiIdentifier,
      label: doc.label,
      role_id: doc.roleId,
      position: doc.position,
      created_at: doc.createdAt,
      description: doc.description,
      style: doc.style,
      metadata: doc.metadata || {}
    };
  } else {
    result = await rrdb.instance.get(`SELECT * FROM rr_items WHERE id = ? LIMIT 1;`, [itemId]);
  }
  if (result) cacheSet(cacheKey, result);
  return result;
}

async function findItemsByRoleId(roleId) {
  // Efficient lookup for cleanup when a role is deleted
  if (useMongoDB) {
    const docs = await RRItem.find({ roleId }).sort({ createdAt: 1 });
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
  return rrdb.instance.all(`SELECT * FROM rr_items WHERE role_id = ?;`, [roleId]);
}

async function updateItem(itemId, updates) {
  const item = await findItemById(itemId);
  if (!item) return;

  if (useMongoDB) {
    const updateObj = { ...updates };
    if (!updateObj.updatedAt) updateObj.updatedAt = now();
    await RRItem.findByIdAndUpdate(itemId, updateObj).catch(() => null);
    cacheInvalidateSetup(item.setup_id);
    return;
  }
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const params = Object.values(updates);
  await rrdb.instance.run(`UPDATE rr_items SET ${fields} WHERE id = ?;`, [...params, itemId]);
  cacheInvalidateSetup(item.setup_id);
}

async function updateSetupConfig(setupId, config) {
  const sid = String(setupId);
  // Normalize Maps to plain objects for JSON storage (SQLite)
  const serializableConfig = {
    ...config,
    exclusiveGroups: config.exclusiveGroups instanceof Map ? Object.fromEntries(config.exclusiveGroups) : config.exclusiveGroups,
    requiredRoles: config.requiredRoles instanceof Map ? Object.fromEntries(config.requiredRoles) : config.requiredRoles
  };

  if (useMongoDB) {
    await RRSetup.findByIdAndUpdate(sid, { 
      config: serializableConfig,
      updatedAt: now()
    });
    cacheInvalidateSetup(sid);
  } else {
    await rrdb.instance.run(
      `UPDATE rr_setups SET config = ?, updated_at = ? WHERE id = ?;`,
      [JSON.stringify(serializableConfig), now(), sid]
    );
    cacheInvalidateSetup(sid);
  }
}

async function logAction({ guildId, userId, roleId, setupId, action, error = null, metadata = {} }) {
  const ts = now();
  try {
    if (useMongoDB) {
      await RRLog.create({ 
        guildId, userId, roleId, setupId: String(setupId), action, ts,
        error, metadata
      });
    } else {
      await rrdb.instance.run(
        `INSERT INTO rr_logs (guild_id, user_id, role_id, setup_id, action, ts, error, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [guildId, userId, roleId, setupId, action, ts, error, JSON.stringify(metadata)]
      );
    }
  } catch (err) {
    logger.error('[RR] Failed to log action:', err.message);
  }
}

async function getSetupStats(setupId) {
  // Get statistics for a setup (counts per action in last 24h)
  const since = now() - 24*60*60;
  const sid = String(setupId);
  if (useMongoDB) {
    const counts = await RRLog.aggregate([
      { $match: { setupId: sid, ts: { $gte: since } } },
      { $group: { _id: '$action', count: { $sum: 1 } } }
    ]);
    return counts.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {});
  } else {
    const rows = await rrdb.instance.all(
      `SELECT action, COUNT(*) as count FROM rr_logs WHERE setup_id = ? AND ts >= ? GROUP BY action;`,
      [sid, since]
    );
    return rows.reduce((acc, r) => ({ ...acc, [r.action]: r.count }), {});
  }
}

// Track user role assignments (for limit enforcement)
function getUserRolesCache(guildId, userId) {
  const key = `${guildId}:${userId}`;
  return cache.roleAssignments.get(key) || new Set();
}
function setUserRoleCache(guildId, userId, roleId) {
  const key = `${guildId}:${userId}`;
  if (!cache.roleAssignments.has(key)) cache.roleAssignments.set(key, new Set());
  cache.roleAssignments.get(key).add(roleId);
}
function removeUserRoleCache(guildId, userId, roleId) {
  const key = `${guildId}:${userId}`;
  const set = cache.roleAssignments.get(key);
  if (set) set.delete(roleId);
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
  updateItem,
  removeItem,
  clearAllItems,
  listItems,
  findItemByEmoji,
  findItemByAnyIdentifier,
  findItemById,
  findItemsByRoleId,
  updateSetupConfig,
  logAction,
  getSetupStats,
  validateRoleAssignment,
  checkRateLimit,
  incrementRateLimit,
  cacheInvalidateSetup,
  getUserRolesCache,
  setUserRoleCache,
  removeUserRoleCache
};
