const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// ✅ Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ✅ Initialize the giveaway database
const dbPath = path.join(dataDir, 'giveaway.db');
const db = new sqlite3.Database(dbPath);

// ✅ Create giveaways table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS giveaways (
      message_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      prize TEXT NOT NULL,
      winners INTEGER NOT NULL,
      end_at INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      ended INTEGER DEFAULT 0,
      participants TEXT DEFAULT '[]',
      config TEXT DEFAULT '{}'
    )
  `);
  // Ensure config column exists in existing tables
  db.run(`ALTER TABLE giveaways ADD COLUMN config TEXT DEFAULT '{}'`, () => {});
});

module.exports = db;
