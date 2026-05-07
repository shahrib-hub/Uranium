const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'data', 'ai_channels.db');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Channels where AI is enabled
  db.run(`CREATE TABLE IF NOT EXISTS ai_channels (
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    PRIMARY KEY (guild_id, channel_id)
  )`);

  // Stats tracking
  db.run(`CREATE TABLE IF NOT EXISTS ai_stats (
    guild_id TEXT NOT NULL,
    prompts INTEGER DEFAULT 0,
    images INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id)
  )`);

  // Style + model + auto-reply settings
  db.run(`CREATE TABLE IF NOT EXISTS ai_settings (
    guild_id TEXT NOT NULL,
    model TEXT DEFAULT 'mixtral',
    style TEXT DEFAULT 'default',
    auto_reply INTEGER DEFAULT 1,
    PRIMARY KEY (guild_id)
  )`);
});

module.exports = db;
