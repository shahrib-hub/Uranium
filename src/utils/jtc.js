const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// ✅ Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ✅ Initialize the database connection
const dbPath = path.join(dataDir, 'join-to-create.db');
const db = new sqlite3.Database(dbPath);

// ✅ Create tables if they don't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS join_to_create_setups (
      guild_id TEXT PRIMARY KEY,
      trigger_voice_id TEXT NOT NULL,
      target_category_id TEXT NOT NULL,
      user_limit INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS temp_voice_channels (
      channel_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
});

module.exports = db;
