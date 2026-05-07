const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { useMongoDB } = require('../config/database');
const { RankConfig, RankUser, RankRoleReward } = require('../database/mongoose');

const dbPath = path.join(__dirname, '../data/ranking_data.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new sqlite3.Database(dbPath);

// Promisified query helpers
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

// Initialize tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      cooldown_seconds INTEGER NOT NULL DEFAULT 60,
      blacklist TEXT NOT NULL DEFAULT '[]',
      formula TEXT NOT NULL DEFAULT '50 * level * level + 50 * level',
      min_chars INTEGER NOT NULL DEFAULT 5
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS user_stats (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 0,
      last_msg_ts INTEGER NOT NULL DEFAULT 0,
      last_msg_hash TEXT,
      badges TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (guild_id, user_id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS role_rewards (
      guild_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, level)
    )
  `);
});

// Core functions
async function getConfig(guildId) {
  if (useMongoDB) {
    const doc = await RankConfig.findOne({ guildId });
    if (doc) {
      return {
        guild_id: guildId,
        enabled: doc.enabled,
        cooldown_seconds: doc.cooldownSeconds,
        blacklist: doc.blacklist,
        formula: doc.formula,
        min_chars: doc.minChars
      };
    }
    return {
      guild_id: guildId,
      enabled: true,
      cooldown_seconds: 60,
      blacklist: [],
      formula: '50 * level * level + 50 * level',
      min_chars: 5
    };
  }

  const row = await get(`SELECT * FROM guild_config WHERE guild_id = ?`, [guildId]);
  if (row) {
    return {
      ...row,
      enabled: !!row.enabled,
      blacklist: JSON.parse(row.blacklist || '[]'),
      formula: row.formula || '50 * level * level + 50 * level'
    };
  }
  return {
    guild_id: guildId,
    enabled: true,
    cooldown_seconds: 60,
    blacklist: [],
    formula: '50 * level * level + 50 * level',
    min_chars: 5
  };
}

async function setConfig(guildId, patch) {
  if (useMongoDB) {
    const cur = await getConfig(guildId);
    const merged = {
      ...cur,
      ...patch,
      enabled: patch.enabled === undefined ? cur.enabled : !!patch.enabled,
      blacklist: patch.blacklist ?? cur.blacklist
    };
    await RankConfig.findOneAndUpdate(
      { guildId },
      {
        enabled: merged.enabled,
        cooldownSeconds: merged.cooldown_seconds,
        blacklist: merged.blacklist,
        formula: merged.formula,
        minChars: merged.min_chars
      },
      { upsert: true }
    );
    return getConfig(guildId);
  }

  const cur = await getConfig(guildId);
  const merged = {
    ...cur,
    ...patch,
    enabled: patch.enabled === undefined ? cur.enabled : !!patch.enabled,
    blacklist: JSON.stringify(patch.blacklist ?? cur.blacklist)
  };
  await run(`
    INSERT INTO guild_config (guild_id, enabled, cooldown_seconds, blacklist, formula, min_chars)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      enabled=excluded.enabled,
      cooldown_seconds=excluded.cooldown_seconds,
      blacklist=excluded.blacklist,
      formula=excluded.formula,
      min_chars=excluded.min_chars
  `, [
    merged.guild_id,
    merged.enabled ? 1 : 0,
    merged.cooldown_seconds,
    merged.blacklist,
    merged.formula,
    merged.min_chars
  ]);
  return getConfig(guildId);
}

async function getUser(guildId, userId) {
  if (useMongoDB) {
    const doc = await RankUser.findOne({ guildId, userId });
    return doc ? {
      guild_id: doc.guildId,
      user_id: doc.userId,
      xp: doc.xp,
      level: doc.level,
      last_msg_ts: doc.lastMsgTs,
      last_msg_hash: doc.lastMsgHash,
      badges: JSON.stringify(doc.badges || [])
    } : {
      guild_id: guildId,
      user_id: userId,
      xp: 0,
      level: 0,
      last_msg_ts: 0,
      last_msg_hash: null,
      badges: '[]'
    };
  }

  const row = await get(`SELECT * FROM user_stats WHERE guild_id = ? AND user_id = ?`, [guildId, userId]);
  return row || {
    guild_id: guildId,
    user_id: userId,
    xp: 0,
    level: 0,
    last_msg_ts: 0,
    last_msg_hash: null,
    badges: '[]'
  };
}

async function upsertUser(data) {
  if (useMongoDB) {
    await RankUser.findOneAndUpdate(
      { guildId: data.guild_id, userId: data.user_id },
      {
        xp: data.xp,
        level: data.level,
        lastMsgTs: data.last_msg_ts,
        lastMsgHash: data.last_msg_hash,
        badges: JSON.parse(data.badges || '[]')
      },
      { upsert: true }
    );
    return;
  }

  await run(`
    INSERT INTO user_stats (guild_id, user_id, xp, level, last_msg_ts, last_msg_hash, badges)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      xp=excluded.xp,
      level=excluded.level,
      last_msg_ts=excluded.last_msg_ts,
      last_msg_hash=excluded.last_msg_hash,
      badges=excluded.badges
  `, [
    data.guild_id,
    data.user_id,
    data.xp,
    data.level,
    data.last_msg_ts,
    data.last_msg_hash,
    data.badges
  ]);
}

async function addXp(guildId, userId, amount) {
  if (useMongoDB) {
    await RankUser.findOneAndUpdate({ guildId, userId }, { $inc: { xp: amount } }, { upsert: true });
    return;
  }
  await run(`UPDATE user_stats SET xp = xp + ? WHERE guild_id = ? AND user_id = ?`, [amount, guildId, userId]);
}

async function setLevel(guildId, userId, level) {
  if (useMongoDB) {
    await RankUser.findOneAndUpdate({ guildId, userId }, { level }, { upsert: true });
    return;
  }
  await run(`UPDATE user_stats SET level = ? WHERE guild_id = ? AND user_id = ?`, [level, guildId, userId]);
}

async function setXp(guildId, userId, xp) {
  if (useMongoDB) {
    await RankUser.findOneAndUpdate({ guildId, userId }, { xp }, { upsert: true });
    return;
  }
  await run(`UPDATE user_stats SET xp = ? WHERE guild_id = ? AND user_id = ?`, [xp, guildId, userId]);
}

async function resetUser(guildId, userId) {
  if (useMongoDB) {
    await RankUser.deleteOne({ guildId, userId });
    return;
  }
  await run(`DELETE FROM user_stats WHERE guild_id = ? AND user_id = ?`, [guildId, userId]);
}

async function resetAll(guildId) {
  if (useMongoDB) {
    await RankUser.deleteMany({ guildId });
    return;
  }
  await run(`DELETE FROM user_stats WHERE guild_id = ?`, [guildId]);
}

async function topUsers(guildId, page = 1, pageSize = 10) {
  const offset = (page - 1) * pageSize;
  if (useMongoDB) {
    const docs = await RankUser.find({ guildId }).sort({ xp: -1 }).skip(offset).limit(pageSize);
    return docs.map(d => ({ user_id: d.userId, xp: d.xp, level: d.level }));
  }

  return await all(`
    SELECT user_id, xp, level
    FROM user_stats
    WHERE guild_id = ?
    ORDER BY xp DESC
    LIMIT ? OFFSET ?
  `, [guildId, pageSize, offset]);
}

async function getRankPosition(guildId, userId) {
  if (useMongoDB) {
    const docs = await RankUser.find({ guildId }).sort({ xp: -1 }).select('userId');
    const index = docs.findIndex(d => d.userId === userId);
    return index >= 0 ? index + 1 : null;
  }

  const rows = await all(`SELECT user_id FROM user_stats WHERE guild_id = ? ORDER BY xp DESC`, [guildId]);
  const index = rows.findIndex(r => r.user_id === userId);
  return index >= 0 ? index + 1 : null;
}

async function setRoleReward(guildId, level, roleId) {
  if (useMongoDB) {
    await RankRoleReward.findOneAndUpdate({ guildId, level }, { roleId }, { upsert: true });
    return;
  }

  await run(`
    INSERT INTO role_rewards (guild_id, level, role_id)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id, level) DO UPDATE SET role_id=excluded.role_id
  `, [guildId, level, roleId]);
}

async function removeRoleReward(guildId, level) {
  if (useMongoDB) {
    await RankRoleReward.deleteOne({ guildId, level });
    return;
  }

  await run(`DELETE FROM role_rewards WHERE guild_id = ? AND level = ?`, [guildId, level]);
}

async function listRoleRewards(guildId) {
  if (useMongoDB) {
    const docs = await RankRoleReward.find({ guildId }).sort({ level: 1 });
    return docs.map(d => ({ level: d.level, role_id: d.roleId }));
  }

  return await all(`SELECT level, role_id FROM role_rewards WHERE guild_id = ? ORDER BY level ASC`, [guildId]);
}

module.exports = {
  getConfig,
  setConfig,
  getUser,
  upsertUser,
  addXp,
  setLevel,
  setXp,
  resetUser,
  resetAll,
  topUsers,
  getRankPosition,
  setRoleReward,
  removeRoleReward,
  listRoleRewards
};
