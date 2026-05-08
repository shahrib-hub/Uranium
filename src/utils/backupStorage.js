// src/utils/backupStorage.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { useMongoDB } = require('../config/database');
const { ServerBackup: Backup, BackupCooldown, getDbStatus } = require('../database/mongoose');

// DB path: src/data/server_backups.db
const dbFolder = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dbFolder, 'server_backups.db');

// Ensure folder exists
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Backup DB failed to open:', err);
  } else {
    console.log('✅ Backup DB connected at:', dbPath);
  }
});

function init() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        slot INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        is_premium INTEGER NOT NULL,
        data TEXT NOT NULL,
        UNIQUE (guild_id, slot)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS backup_cooldowns (
        guild_id TEXT PRIMARY KEY,
        last_created_at INTEGER NOT NULL
      )
    `);
  });
}

function getBackupsByGuild(guildId) {
  if (useMongoDB) {
    if (!getDbStatus()) {
      console.error('[backupStorage] MongoDB is enabled but the connection is not ready.');
      return Promise.resolve([]);
    }
    return Backup.find({ guildId }).sort({ slot: 1 }).then(docs => {
      return docs.map(doc => ({
        guild_id: doc.guildId,
        slot: doc.slot,
        name: doc.name,
        created_at: doc.createdAt,
        created_by: doc.createdBy,
        is_premium: doc.isPremium ? 1 : 0,
        data: doc.data
      }));
    });
  }

  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM backups WHERE guild_id = ? ORDER BY slot ASC`,
      [guildId],
      (err, rows) => {
        if (err) {
          console.error('[backupStorage] getBackupsByGuild error:', err);
          return reject(err);
        }
        resolve(rows || []);
      }
    );
  });
}

function getBackup(guildId, slot) {
  if (useMongoDB) {
    if (!getDbStatus()) {
      console.error('[backupStorage] MongoDB is enabled but the connection is not ready.');
      return Promise.resolve(null);
    }
    return Backup.findOne({ guildId, slot }).then(doc => {
      if (!doc) return null;
      return {
        guild_id: doc.guildId,
        slot: doc.slot,
        name: doc.name,
        created_at: doc.createdAt,
        created_by: doc.createdBy,
        is_premium: doc.isPremium ? 1 : 0,
        data: doc.data
      };
    });
  }

  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM backups WHERE guild_id = ? AND slot = ?`,
      [guildId, slot],
      (err, row) => {
        if (err) {
          console.error('[backupStorage] getBackup error:', err);
          return reject(err);
        }
        resolve(row || null);
      }
    );
  });
}

function saveBackup({ guildId, slot, name, createdBy, isPremium, data }) {
  const json = JSON.stringify(data);

  if (useMongoDB) {
    if (!getDbStatus()) return Promise.resolve(false);
    return Backup.findOneAndUpdate(
      { guildId, slot },
      { name, createdAt: Date.now(), createdBy, isPremium: !!isPremium, data: json },
      { upsert: true }
    ).then(() => true);
  }

  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO backups (guild_id, slot, name, created_at, created_by, is_premium, data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id, slot) DO UPDATE SET
        name = excluded.name,
        created_at = excluded.created_at,
        created_by = excluded.created_by,
        is_premium = excluded.is_premium,
        data = excluded.data
      `,
      [
        guildId,
        slot,
        name,
        Date.now(),
        createdBy,
        isPremium ? 1 : 0,
        json
      ],
      function (err) {
        if (err) {
          console.error('[backupStorage] saveBackup error:', err);
          return reject(err);
        }
        resolve(true);
      }
    );
  });
}

function deleteBackup(guildId, slot) {
  if (useMongoDB) {
    if (!getDbStatus()) return Promise.resolve(false);
    return Backup.findOneAndDelete({ guildId, slot }).then(doc => !!doc);
  }

  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM backups WHERE guild_id = ? AND slot = ?`,
      [guildId, slot],
      function (err) {
        if (err) {
          console.error('[backupStorage] deleteBackup error:', err);
          return reject(err);
        }
        resolve(this.changes > 0);
      }
    );
  });
}

function getLastCreatedAt(guildId) {
  if (useMongoDB) {
    if (!getDbStatus()) return Promise.resolve(null);
    return BackupCooldown.findOne({ guildId }).then(doc => doc ? doc.lastCreatedAt : null);
  }

  return new Promise((resolve, reject) => {
    db.get(
      `SELECT last_created_at FROM backup_cooldowns WHERE guild_id = ?`,
      [guildId],
      (err, row) => {
        if (err) {
          console.error('[backupStorage] getLastCreatedAt error:', err);
          return reject(err);
        }
        resolve(row ? row.last_created_at : null);
      }
    );
  });
}

function setLastCreatedAt(guildId, ts) {
  if (useMongoDB) {
    if (!getDbStatus()) return Promise.resolve(false);
    return BackupCooldown.findOneAndUpdate(
      { guildId },
      { lastCreatedAt: ts },
      { upsert: true }
    ).then(() => true);
  }

  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO backup_cooldowns (guild_id, last_created_at)
      VALUES (?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        last_created_at = excluded.last_created_at
      `,
      [guildId, ts],
      function (err) {
        if (err) {
          console.error('[backupStorage] setLastCreatedAt error:', err);
          return reject(err);
        }
        resolve(true);
      }
    );
  });
}

init();

module.exports = {
  getBackupsByGuild,
  getBackup,
  saveBackup,
  deleteBackup,
  getLastCreatedAt,
  setLastCreatedAt,
};
