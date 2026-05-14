const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { isMongoReady } = require('./dbUtils');
const { ServerSettings } = require('./mongoose');

const dbPath = path.resolve(__dirname, '..', 'data', 'server_settings.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS server_settings (
    guild_id TEXT PRIMARY KEY,
    bot_language TEXT DEFAULT 'en'
  )`);
});

/**
 * Gets the server settings for a guild
 * @param {string} guildId 
 * @returns {Promise<{ botLanguage: string }>}
 */
async function getServerSettings(guildId) {
  if (isMongoReady()) {
    let settings = await ServerSettings.findOne({ guildId });
    if (!settings) {
      settings = new ServerSettings({ guildId, botLanguage: 'en' });
      await settings.save();
    }
    return { botLanguage: settings.botLanguage };
  } else {
    return new Promise((resolve, reject) => {
      db.get('SELECT bot_language as botLanguage FROM server_settings WHERE guild_id = ?', [guildId], (err, row) => {
        if (err) return reject(err);
        if (row) return resolve({ botLanguage: row.botLanguage });
        resolve({ botLanguage: 'en' }); // default
      });
    });
  }
}

/**
 * Sets the bot language for a guild
 * @param {string} guildId 
 * @param {string} botLanguage 
 * @returns {Promise<void>}
 */
async function setBotLanguage(guildId, botLanguage) {
  if (isMongoReady()) {
    await ServerSettings.findOneAndUpdate(
      { guildId },
      { botLanguage },
      { upsert: true, returnDocument: 'after' }
    );
  } else {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO server_settings (guild_id, bot_language) VALUES (?, ?)
         ON CONFLICT(guild_id) DO UPDATE SET bot_language=excluded.bot_language`,
        [guildId, botLanguage],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }
}

module.exports = {
  getServerSettings,
  setBotLanguage
};
