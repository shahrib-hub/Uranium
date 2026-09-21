// src/utils/modStorage.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { useMongoDB } = require('../config/database');
const mongooseModels = require('../database/mongoose');
const { isMongoReady } = require('../database/dbUtils');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'mod_storage.db');
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

async function ensureSchema() {
  // Pragmas
  await runAsync('PRAGMA foreign_keys = ON;');
  await runAsync('PRAGMA journal_mode = WAL;');
  await runAsync('PRAGMA synchronous = NORMAL;');

  // If an old 'cases' table exists with a column named "references", migrate it.
  const casesInfo = await allAsync(`SELECT name FROM sqlite_master WHERE type='table' AND name='cases'`);
  if (casesInfo.length) {
    const cols = await allAsync(`PRAGMA table_info(cases)`);
    const hasOldReferences = cols.some(c => c.name === 'references');
    const hasNewReferences = cols.some(c => c.name === 'references_list');

    if (hasOldReferences && !hasNewReferences) {
      // Perform safe migration: create temp table with new column name, copy, drop old, rename
      await runAsync(`BEGIN TRANSACTION;`);
      await runAsync(`CREATE TABLE IF NOT EXISTS cases_temp (
        caseId TEXT PRIMARY KEY,
        guildId TEXT,
        moderatorId TEXT,
        targetId TEXT,
        action TEXT,
        reason TEXT,
        duration INTEGER,
        timestamp INTEGER,
        evidence TEXT,
        references_list TEXT
      );`);

      // Copy data, mapping old 'references' -> 'references_list'
      await runAsync(`INSERT INTO cases_temp (caseId, guildId, moderatorId, targetId, action, reason, duration, timestamp, evidence, references_list)
        SELECT caseId, guildId, moderatorId, targetId, action, reason, duration, timestamp, evidence, references FROM cases;`);

      await runAsync(`DROP TABLE cases;`);
      await runAsync(`ALTER TABLE cases_temp RENAME TO cases;`);
      await runAsync(`COMMIT;`);
    }
  }

  // Create tables (idempotent) — with new column name references_list
  await runAsync(`CREATE TABLE IF NOT EXISTS cases (
    caseId TEXT PRIMARY KEY,
    guildId TEXT,
    moderatorId TEXT,
    targetId TEXT,
    action TEXT,
    reason TEXT,
    duration INTEGER,
    timestamp INTEGER,
    evidence TEXT,
    references_list TEXT
  );`);

  await runAsync(`CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT,
    userId TEXT,
    action TEXT,
    expiresAt INTEGER,
    caseId TEXT
  );`);

  await runAsync(`CREATE TABLE IF NOT EXISTS mod_roles (
    guildId TEXT,
    roleId TEXT
  );`);

  await runAsync(`CREATE TABLE IF NOT EXISTS settings (
    guildId TEXT PRIMARY KEY,
    logChannel TEXT,
    mutedRole TEXT
  );`);
}

function serializeArray(arr) {
  if (typeof arr === 'string') return arr;
  return JSON.stringify(Array.isArray(arr) ? arr : (arr ? [arr] : []));
}

function deserializeArray(str) {
  if (Array.isArray(str)) return str;
  try {
    const parsed = JSON.parse(str || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const storage = {
  _ready: ensureSchema(),

  // CASE LOGGING
  async saveCase(data) {
    const evidenceSerialized = serializeArray(data.evidence);
    const referencesSerialized = serializeArray(data.references);

    if (isMongoReady()) {
      await mongooseModels.ModCase.create({
        guildId: data.guildId,
        caseId: data.caseId,
        moderatorId: data.moderatorId,
        targetId: data.targetId,
        action: data.action,
        reason: data.reason,
        duration: data.duration || 0,
        timestamp: data.timestamp || Date.now(),
        evidence: evidenceSerialized,
        references_list: referencesSerialized
      });
      return;
    }

    await storage._ready;
    return runAsync(
      `INSERT INTO cases (caseId, guildId, moderatorId, targetId, action, reason, duration, timestamp, evidence, references_list)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.caseId,
        data.guildId,
        data.moderatorId,
        data.targetId,
        data.action,
        data.reason,
        data.duration || 0,
        data.timestamp || Date.now(),
        evidenceSerialized,
        referencesSerialized
      ]
    );
  },

  async getCasesByUser(guildId, userId) {
    if (isMongoReady()) {
      const docs = await mongooseModels.ModCase.find({ guildId, targetId: userId }).sort({ timestamp: -1 }).lean();
      return docs.map(doc => ({
        ...doc,
        references: deserializeArray(doc.references_list),
        evidence: deserializeArray(doc.evidence)
      }));
    }

    await storage._ready;
    const rows = await allAsync(
      `SELECT * FROM cases WHERE guildId = ? AND targetId = ? ORDER BY timestamp DESC`,
      [guildId, userId]
    );
    return rows.map(row => ({
      ...row,
      // normalize field name back to `references` in returned object for compatibility
      references: deserializeArray(row.references_list),
      evidence: deserializeArray(row.evidence)
    }));
  },

  async getCaseById(guildId, caseId) {
    if (isMongoReady()) {
      const doc = await mongooseModels.ModCase.findOne({ guildId, caseId }).lean();
      if (!doc) return null;
      return {
        ...doc,
        references: deserializeArray(doc.references_list),
        evidence: deserializeArray(doc.evidence)
      };
    }

    await storage._ready;
    const row = await getAsync(
      `SELECT * FROM cases WHERE guildId = ? AND caseId = ?`,
      [guildId, caseId]
    );
    if (!row) return null;
    return {
      ...row,
      references: deserializeArray(row.references_list),
      evidence: deserializeArray(row.evidence)
    };
  },

  async updateCase(guildId, caseId, updates) {
    if (isMongoReady()) {
      const mappedUpdates = { ...updates };
      if (mappedUpdates.references !== undefined) {
        mappedUpdates.references_list = serializeArray(mappedUpdates.references);
        delete mappedUpdates.references;
      }
      if (mappedUpdates.evidence !== undefined) {
        mappedUpdates.evidence = serializeArray(mappedUpdates.evidence);
      }
      await mongooseModels.ModCase.updateOne({ guildId, caseId }, { $set: mappedUpdates });
      return;
    }

    await storage._ready;
    const fields = Object.keys(updates || {});
    if (!fields.length) return;
    // if updates includes 'references' convert the key to 'references_list'
    const converted = fields.map(f => (f === 'references' ? 'references_list' : f));
    const values = fields.map(f => (Array.isArray(updates[f]) ? serializeArray(updates[f]) : updates[f]));
    const setClause = converted.map(f => `${f} = ?`).join(', ');
    return runAsync(`UPDATE cases SET ${setClause} WHERE guildId = ? AND caseId = ?`, [...values, guildId, caseId]);
  },

  async getCasesByGuild(guildId, { limit = 50, offset = 0, action = null, search = null } = {}) {
    if (isMongoReady()) {
      const query = { guildId };
      if (action && action !== 'all') query.action = action;
      if (search) {
        query.$or = [
          { caseId: { $regex: search, $options: 'i' } },
          { targetId: { $regex: search, $options: 'i' } },
          { moderatorId: { $regex: search, $options: 'i' } },
          { reason: { $regex: search, $options: 'i' } }
        ];
      }
      const total = await mongooseModels.ModCase.countDocuments(query);
      const docs = await mongooseModels.ModCase.find(query)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean();
      return {
        total,
        cases: docs.map(doc => ({
          ...doc,
          references: deserializeArray(doc.references_list),
          evidence: deserializeArray(doc.evidence)
        }))
      };
    }

    await storage._ready;
    let sql = `SELECT * FROM cases WHERE guildId = ?`;
    const params = [guildId];

    if (action && action !== 'all') {
      sql += ` AND action = ?`;
      params.push(action);
    }
    if (search) {
      sql += ` AND (caseId LIKE ? OR targetId LIKE ? OR moderatorId LIKE ? OR reason LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countRow = await getAsync(countSql, params);
    const total = Number(countRow?.count || 0);

    sql += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    const rows = await allAsync(sql, [...params, limit, offset]);
    const cases = rows.map(row => ({
      ...row,
      references: deserializeArray(row.references_list),
      evidence: deserializeArray(row.evidence)
    }));

    return { total, cases };
  },

  async deleteCase(guildId, caseId) {
    if (isMongoReady()) {
      const res = await mongooseModels.ModCase.deleteOne({ guildId, caseId });
      return res.deletedCount > 0;
    }

    await storage._ready;
    const res = await runAsync(`DELETE FROM cases WHERE guildId = ? AND caseId = ?`, [guildId, caseId]);
    return res.changes > 0;
  },

  async getModerationStats(guildId) {
    if (isMongoReady()) {
      const cases = await mongooseModels.ModCase.find({ guildId }).lean();
      const stats = { total: cases.length, warns: 0, mutes: 0, kicks: 0, bans: 0, notes: 0 };
      for (const c of cases) {
        if (c.action === 'warn') stats.warns++;
        else if (c.action === 'mute' || c.action === 'timeout') stats.mutes++;
        else if (c.action === 'kick') stats.kicks++;
        else if (c.action === 'ban' || c.action === 'tempban' || c.action === 'softban') stats.bans++;
        else if (c.action === 'note') stats.notes++;
      }
      return stats;
    }

    await storage._ready;
    const rows = await allAsync(`SELECT action, COUNT(*) as count FROM cases WHERE guildId = ? GROUP BY action`, [guildId]);
    const stats = { total: 0, warns: 0, mutes: 0, kicks: 0, bans: 0, notes: 0 };
    for (const r of rows) {
      const count = Number(r.count || 0);
      stats.total += count;
      if (r.action === 'warn') stats.warns += count;
      else if (r.action === 'mute' || r.action === 'timeout') stats.mutes += count;
      else if (r.action === 'kick') stats.kicks += count;
      else if (r.action === 'ban' || r.action === 'tempban' || r.action === 'softban') stats.bans += count;
      else if (r.action === 'note') stats.notes += count;
    }
    return stats;
  },

  // SCHEDULED TASKS
  async saveScheduledTask(task) {
    if (isMongoReady()) {
      await mongooseModels.ModScheduled.create({
        guildId: task.guildId,
        userId: task.userId,
        action: task.action,
        expiresAt: task.expiresAt,
        caseId: task.caseId
      });
      return;
    }

    await storage._ready;
    return runAsync(
      `INSERT INTO scheduled_tasks (guildId, userId, action, expiresAt, caseId)
       VALUES (?, ?, ?, ?, ?)`,
      [task.guildId, task.userId, task.action, task.expiresAt, task.caseId]
    );
  },

  async getDueScheduledTasks(beforeTimestamp) {
    if (isMongoReady()) {
      const docs = await mongooseModels.ModScheduled.find({ expiresAt: { $lte: beforeTimestamp } }).lean();
      return docs.map(doc => ({ ...doc, id: doc._id.toString() })); // Mock ID
    }

    await storage._ready;
    return allAsync(`SELECT * FROM scheduled_tasks WHERE expiresAt <= ?`, [beforeTimestamp]);
  },

  async markTaskComplete(taskId) {
    if (isMongoReady()) {
      await mongooseModels.ModScheduled.findByIdAndDelete(taskId).catch(() => null);
      return;
    }

    await storage._ready;
    return runAsync(`DELETE FROM scheduled_tasks WHERE id = ?`, [taskId]);
  },

  // MOD ROLES
  async getModRoles(guildId) {
    if (isMongoReady()) {
      const docs = await mongooseModels.ModRole.find({ guildId });
      return docs.map(d => d.roleId);
    }

    await storage._ready;
    const rows = await allAsync(`SELECT roleId FROM mod_roles WHERE guildId = ?`, [guildId]);
    return rows.map(r => r.roleId);
  },

  async addModRole(guildId, roleId) {
    if (isMongoReady()) {
      try {
        await mongooseModels.ModRole.create({ guildId, roleId });
      } catch (e) {
        if (e.code !== 11000) throw e;
      }
      return;
    }

    await storage._ready;
    return runAsync(`INSERT INTO mod_roles (guildId, roleId) VALUES (?, ?)`, [guildId, roleId]);
  },

  async removeModRole(guildId, roleId) {
    if (isMongoReady()) {
      await mongooseModels.ModRole.deleteOne({ guildId, roleId });
      return;
    }

    await storage._ready;
    return runAsync(`DELETE FROM mod_roles WHERE guildId = ? AND roleId = ?`, [guildId, roleId]);
  },

  // SETTINGS
  async getLogChannel(guildId) {
    if (isMongoReady()) {
      const doc = await mongooseModels.ModSetting.findOne({ guildId });
      return doc?.logChannel || null;
    }

    await storage._ready;
    const row = await getAsync(`SELECT logChannel FROM settings WHERE guildId = ?`, [guildId]);
    return row?.logChannel || null;
  },

  async setLogChannel(guildId, channelId) {
    if (isMongoReady()) {
      await mongooseModels.ModSetting.findOneAndUpdate({ guildId }, { logChannel: channelId }, { upsert: true });
      return;
    }

    await storage._ready;
    return runAsync(
      `INSERT INTO settings (guildId, logChannel)
       VALUES (?, ?)
       ON CONFLICT(guildId) DO UPDATE SET logChannel = excluded.logChannel`,
      [guildId, channelId]
    );
  },

  async getMutedRoleId(guildId) {
    if (isMongoReady()) {
      const doc = await mongooseModels.ModSetting.findOne({ guildId });
      return doc?.mutedRole || null;
    }

    await storage._ready;
    const row = await getAsync(`SELECT mutedRole FROM settings WHERE guildId = ?`, [guildId]);
    return row?.mutedRole || null;
  },

  async setMutedRoleId(guildId, roleId) {
    if (isMongoReady()) {
      await mongooseModels.ModSetting.findOneAndUpdate({ guildId }, { mutedRole: roleId }, { upsert: true });
      return;
    }

    await storage._ready;
    return runAsync(
      `INSERT INTO settings (guildId, mutedRole)
       VALUES (?, ?)
       ON CONFLICT(guildId) DO UPDATE SET mutedRole = excluded.mutedRole`,
      [guildId, roleId]
    );
  },

  // Debug helper
  async checkTables(verbose = false) {
    if (isMongoReady()) {
      const info = {
        cases: { exists: true, count: await mongooseModels.ModCase.countDocuments() },
        scheduled_tasks: { exists: true, count: await mongooseModels.ModScheduled.countDocuments() },
        mod_roles: { exists: true, count: await mongooseModels.ModRole.countDocuments() },
        settings: { exists: true, count: await mongooseModels.ModSetting.countDocuments() }
      };
      if (verbose) console.log('modStorage (MongoDB) info:', info);
      return info;
    }

    await storage._ready;
    const tables = ['cases', 'scheduled_tasks', 'mod_roles', 'settings'];
    const info = {};
    for (const t of tables) {
      const rows = await allAsync(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`, [t]);
      if (!rows.length) {
        info[t] = { exists: false, count: 0 };
        continue;
      }
      const row = await getAsync(`SELECT COUNT(*) as count FROM ${t}`);
      info[t] = { exists: true, count: Number(row?.count || 0) };
    }
    if (verbose) console.log('modStorage table info:', info);
    return info;
  }
};

module.exports = storage;