// src/utils/rrdb.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.RR_DB_PATH || path.join(__dirname, '..', 'data', 'reaction_roles.db');

function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

class RRDB {
  constructor() {
    ensureDataDir();
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) console.error('[rrdb] Failed to open DB', err);
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

const instance = new RRDB();

  async function init() {
    await instance.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');

    // Create tables if not exist
    await instance.exec(`
      CREATE TABLE IF NOT EXISTS rr_setups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT,
        mode TEXT NOT NULL CHECK(mode IN ('buttons','reactions','dropdown')),
        title TEXT,
        description TEXT,
        creator_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        active INTEGER DEFAULT 1,
        config TEXT DEFAULT '{}',
        UNIQUE(guild_id, message_id)
      );
      CREATE INDEX IF NOT EXISTS idx_rr_guild ON rr_setups (guild_id);
      CREATE INDEX IF NOT EXISTS idx_rr_message ON rr_setups (message_id);

      CREATE TABLE IF NOT EXISTS rr_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setup_id INTEGER NOT NULL,
        emoji TEXT NOT NULL,
        emoji_identifier TEXT NOT NULL,
        label TEXT,
        role_id TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        description TEXT DEFAULT NULL,
        style INTEGER DEFAULT 0,
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY(setup_id) REFERENCES rr_setups(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_rr_setup ON rr_items (setup_id);
      CREATE INDEX IF NOT EXISTS idx_rr_role ON rr_items (role_id);

      CREATE TABLE IF NOT EXISTS rr_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        setup_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        ts INTEGER NOT NULL,
        error TEXT DEFAULT NULL,
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY(setup_id) REFERENCES rr_setups(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_rr_logs_guild_ts ON rr_logs (guild_id, ts DESC);
      CREATE INDEX IF NOT EXISTS idx_rr_logs_user ON rr_logs (user_id, guild_id);
      CREATE INDEX IF NOT EXISTS idx_rr_logs_setup ON rr_logs (setup_id, ts DESC);
    `);

    // Migrate existing tables: add new columns if missing
    try {
      await instance.exec("ALTER TABLE rr_setups ADD COLUMN config TEXT DEFAULT '{}';");
    } catch (_) {}
    try {
      await instance.exec("ALTER TABLE rr_items ADD COLUMN description TEXT;");
    } catch (_) {}
    try {
      await instance.exec("ALTER TABLE rr_items ADD COLUMN style INTEGER DEFAULT 0;");
    } catch (_) {}
    try {
      await instance.exec("ALTER TABLE rr_items ADD COLUMN metadata TEXT DEFAULT '{}';");
    } catch (_) {}
    try {
      await instance.exec("ALTER TABLE rr_logs ADD COLUMN error TEXT;");
    } catch (_) {}
    try {
      await instance.exec("ALTER TABLE rr_logs ADD COLUMN metadata TEXT DEFAULT '{}';");
    } catch (_) {}

    // Add new indexes if they don't exist (best effort)
    try { await instance.exec("CREATE INDEX IF NOT EXISTS idx_rr_message ON rr_setups (message_id);"); } catch (_) {}
    try { await instance.exec("CREATE INDEX IF NOT EXISTS idx_rr_role ON rr_items (role_id);"); } catch (_) {}
    try { await instance.exec("CREATE INDEX IF NOT EXISTS idx_rr_logs_guild_ts ON rr_logs (guild_id, ts DESC);"); } catch (_) {}
    try { await instance.exec("CREATE INDEX IF NOT EXISTS idx_rr_logs_user ON rr_logs (user_id, guild_id);"); } catch (_) {}
    try { await instance.exec("CREATE INDEX IF NOT EXISTS idx_rr_logs_setup ON rr_logs (setup_id, ts DESC);"); } catch (_) {}
  }

module.exports = {
  instance,
  init
};