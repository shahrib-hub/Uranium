// src/utils/customCommandStorage.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { isMongoReady } = require('../database/dbUtils');
const mongoose = require('mongoose');
const { isPremiumGuild } = require('./premium');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'custom_commands.db');
const db = new sqlite3.Database(dbPath);

// Cooldown tracker in memory: `${guildId}:${commandName}:${scopeKey}` -> timestamp
const cooldownTracker = new Map();

// Initialize SQLite schema
let initPromise = null;
function init() {
  if (initPromise) return initPromise;
  initPromise = new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS custom_commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        data TEXT NOT NULL,
        uses INTEGER DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER,
        UNIQUE(guild_id, name)
      )`,
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
  return initPromise;
}

// MongoDB schema
let MongoCustomCommand = null;
function getMongoModel() {
  if (!isMongoReady()) return null;
  if (!MongoCustomCommand) {
    const schema = new mongoose.Schema({
      guildId: { type: String, required: true },
      name: { type: String, required: true },
      description: { type: String, default: '' },
      data: { type: Object, default: {} },
      uses: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });
    schema.index({ guildId: 1, name: 1 }, { unique: true });
    MongoCustomCommand = mongoose.models.CustomCommand || mongoose.model('CustomCommand', schema);
  }
  return MongoCustomCommand;
}

/**
 * Get all custom commands for a guild
 */
async function getCustomCommands(guildId) {
  if (!guildId) return [];

  const Model = getMongoModel();
  if (Model) {
    try {
      const docs = await Model.find({ guildId }).sort({ name: 1 });
      return docs.map(d => ({
        id: String(d._id),
        guild_id: d.guildId,
        name: d.name,
        description: d.description,
        data: d.data,
        uses: d.uses || 0,
        created_at: d.createdAt?.getTime?.() || Date.now(),
        updated_at: d.updatedAt?.getTime?.() || Date.now()
      }));
    } catch (e) {
      console.warn('[CustomCommands] Mongo read error, fallback to SQLite:', e.message);
    }
  }

  await init();
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM custom_commands WHERE guild_id = ? ORDER BY name ASC`,
      [guildId],
      (err, rows) => {
        if (err) return reject(err);
        const parsed = (rows || []).map(r => ({
          ...r,
          data: (() => {
            try { return JSON.parse(r.data); } catch { return {}; }
          })()
        }));
        resolve(parsed);
      }
    );
  });
}

/**
 * Get a specific custom command by name
 */
async function getCustomCommand(guildId, name) {
  if (!guildId || !name) return null;
  const cleanName = name.trim().toLowerCase();

  const Model = getMongoModel();
  if (Model) {
    try {
      const doc = await Model.findOne({ guildId, name: cleanName });
      if (doc) {
        return {
          id: String(doc._id),
          guild_id: doc.guildId,
          name: doc.name,
          description: doc.description,
          data: doc.data,
          uses: doc.uses || 0,
          created_at: doc.createdAt?.getTime?.() || Date.now(),
          updated_at: doc.updatedAt?.getTime?.() || Date.now()
        };
      }
      return null;
    } catch {}
  }

  await init();
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM custom_commands WHERE guild_id = ? AND name = ?`,
      [guildId, cleanName],
      (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(null);
        resolve({
          ...row,
          data: (() => {
            try { return JSON.parse(row.data); } catch { return {}; }
          })()
        });
      }
    );
  });
}

/**
 * Save / Create / Update custom command with Free (10) vs Premium (50) limit enforcement
 */
async function saveCustomCommand(guildId, commandData) {
  if (!guildId || !commandData || !commandData.name) {
    throw new Error('Guild ID and command name are required');
  }

  const name = commandData.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!name || name.length > 32) {
    throw new Error('Command name must be alphanumeric with no spaces (max 32 characters)');
  }

  const existing = await getCustomCommand(guildId, name);
  const currentCount = await countCustomCommands(guildId);
  const isPremium = await isPremiumGuild(guildId);
  const maxAllowed = isPremium ? 50 : 10;

  if (!existing && currentCount >= maxAllowed) {
    throw new Error(
      `Command limit reached! Free servers can create up to ${maxAllowed} custom commands. ${
        !isPremium ? 'Upgrade to Premium for up to 50 custom commands!' : ''
      }`
    );
  }

  const description = (commandData.description || '').slice(0, 100);
  const actions = Array.isArray(commandData.actions) ? commandData.actions : [
    {
      type: 'message',
      ephemeral: !!commandData.ephemeral,
      message: commandData.message || 'Custom command triggered!',
      embed: commandData.embed || null,
      randomResponses: commandData.randomResponses || []
    }
  ];

  const permissions = commandData.permissions || {
    allowedRoles: [],
    deniedRoles: [],
    allowedChannels: [],
    deniedChannels: []
  };

  const cooldown = commandData.cooldown || {
    type: 'none', // none, user, server
    seconds: 0
  };

  const fullData = {
    actions,
    permissions,
    cooldown,
    hideUsage: !!commandData.hideUsage,
    message: commandData.message || (actions[0]?.message ?? ''),
    ephemeral: !!(commandData.ephemeral ?? actions[0]?.ephemeral),
    embed: commandData.embed || (actions[0]?.embed ?? null),
    randomResponses: commandData.randomResponses || (actions[0]?.randomResponses ?? [])
  };

  const now = Date.now();

  const Model = getMongoModel();
  if (Model) {
    try {
      await Model.findOneAndUpdate(
        { guildId, name },
        {
          description,
          data: fullData,
          updatedAt: new Date()
        },
        { upsert: true }
      );
    } catch (e) {
      console.warn('[CustomCommands] Mongo save failed:', e.message);
    }
  }

  await init();
  const dataJson = JSON.stringify(fullData);
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO custom_commands (guild_id, name, description, data, uses, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)
       ON CONFLICT(guild_id, name) DO UPDATE SET
         description = excluded.description,
         data = excluded.data,
         updated_at = excluded.updated_at`,
      [guildId, name, description, dataJson, now, now],
      function (err) {
        if (err) return reject(err);
        resolve({
          guild_id: guildId,
          name,
          description,
          data: fullData,
          uses: existing ? existing.uses : 0
        });
      }
    );
  });
}

/**
 * Delete custom command by name
 */
async function deleteCustomCommand(guildId, name) {
  if (!guildId || !name) return false;
  const cleanName = name.trim().toLowerCase();

  const Model = getMongoModel();
  if (Model) {
    try {
      await Model.findOneAndDelete({ guildId, name: cleanName });
    } catch {}
  }

  await init();
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM custom_commands WHERE guild_id = ? AND name = ?`,
      [guildId, cleanName],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      }
    );
  });
}

/**
 * Count custom commands for a guild
 */
async function countCustomCommands(guildId) {
  if (!guildId) return 0;
  const Model = getMongoModel();
  if (Model) {
    try {
      return await Model.countDocuments({ guildId });
    } catch {}
  }

  await init();
  return new Promise((resolve) => {
    db.get(
      `SELECT COUNT(*) AS count FROM custom_commands WHERE guild_id = ?`,
      [guildId],
      (err, row) => resolve(row ? row.count : 0)
    );
  });
}

/**
 * Increment use counter
 */
async function incrementUses(guildId, name) {
  const cleanName = name.trim().toLowerCase();
  const Model = getMongoModel();
  if (Model) {
    Model.findOneAndUpdate({ guildId, name: cleanName }, { $inc: { uses: 1 } }).catch(() => null);
  }
  await init();
  db.run(`UPDATE custom_commands SET uses = uses + 1 WHERE guild_id = ? AND name = ?`, [guildId, cleanName], () => {});
}

/**
 * Check permissions and cooldown before execution
 */
function checkExecutionAllowed(member, channel, cmdData) {
  const perms = cmdData.data?.permissions || {};
  const cooldown = cmdData.data?.cooldown || { type: 'none', seconds: 0 };

  // 1. Channel check
  const allowedCh = perms.allowedChannels || [];
  const deniedCh = perms.deniedChannels || [];

  if (deniedCh.length > 0 && deniedCh.includes(channel.id)) {
    return { allowed: false, reason: 'This command is not allowed in this channel.' };
  }
  if (allowedCh.length > 0 && !allowedCh.includes(channel.id)) {
    return { allowed: false, reason: 'This command can only be used in designated channels.' };
  }

  // 2. Role check
  const memberRoleIds = member.roles?.cache ? Array.from(member.roles.cache.keys()) : [];
  const allowedRoles = perms.allowedRoles || [];
  const deniedRoles = perms.deniedRoles || [];

  if (deniedRoles.length > 0 && deniedRoles.some(r => memberRoleIds.includes(r))) {
    return { allowed: false, reason: 'You have a role that is barred from using this command.' };
  }
  if (allowedRoles.length > 0 && !allowedRoles.some(r => memberRoleIds.includes(r))) {
    return { allowed: false, reason: 'You do not have the required role to execute this command.' };
  }

  // 3. Cooldown check
  if (cooldown.type && cooldown.type !== 'none' && cooldown.seconds > 0) {
    const scopeId = cooldown.type === 'server' ? 'server' : member.id;
    const key = `${member.guild.id}:${cmdData.name}:${scopeId}`;
    const now = Date.now();
    const lastUse = cooldownTracker.get(key) || 0;
    const diff = (now - lastUse) / 1000;

    if (diff < cooldown.seconds) {
      const remaining = Math.ceil(cooldown.seconds - diff);
      return {
        allowed: false,
        reason: `Command is on cooldown. Please wait **${remaining}s** before trying again.`
      };
    }
    cooldownTracker.set(key, now);
  }

  return { allowed: true };
}

module.exports = {
  getCustomCommands,
  getCustomCommand,
  saveCustomCommand,
  deleteCustomCommand,
  countCustomCommands,
  incrementUses,
  checkExecutionAllowed
};
