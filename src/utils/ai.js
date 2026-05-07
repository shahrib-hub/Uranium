// src/utils/ai.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'ai_channels.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('[ai] Failed to open DB:', err);
});

// Create tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS ai_channels (
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    PRIMARY KEY (guild_id, channel_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ai_stats (
    guild_id TEXT NOT NULL,
    prompts INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ai_settings (
    guild_id TEXT NOT NULL,
    model TEXT DEFAULT 'llama-3.1-8b-instant',
    style TEXT DEFAULT 'default',
    auto_reply INTEGER DEFAULT 1,
    PRIMARY KEY (guild_id)
  )`);
});

module.exports = {
  addChannel(guildId, channelId) {
    try {
      db.run(
        `INSERT OR IGNORE INTO ai_channels (guild_id, channel_id) VALUES (?, ?)`,
        [guildId, channelId],
        (err) => {
          if (err) console.error('[ai.addChannel] DB error:', err);
        }
      );
    } catch (e) {
      console.error('[ai.addChannel] error:', e);
    }
  },

  removeChannel(guildId, channelId) {
    try {
      if (channelId === 'ALL') {
        db.run(`DELETE FROM ai_channels WHERE guild_id = ?`, [guildId], (err) => {
          if (err) console.error('[ai.removeChannel] DB error:', err);
        });
      } else {
        db.run(
          `DELETE FROM ai_channels WHERE guild_id = ? AND channel_id = ?`,
          [guildId, channelId],
          (err) => {
            if (err) console.error('[ai.removeChannel] DB error:', err);
          }
        );
      }
    } catch (e) {
      console.error('[ai.removeChannel] error:', e);
    }
  },

  isChannelEnabled(guildId, channelId, callback) {
    try {
      db.get(
        `SELECT 1 FROM ai_channels WHERE guild_id = ? AND channel_id = ?`,
        [guildId, channelId],
        (err, row) => {
          if (err) {
            console.error('[ai.isChannelEnabled] DB error:', err);
            return callback(false);
          }
          callback(!!row);
        }
      );
    } catch (e) {
      console.error('[ai.isChannelEnabled] error:', e);
      callback(false);
    }
  },

  getStats(guildId, callback) {
    try {
      db.get(`SELECT * FROM ai_stats WHERE guild_id = ?`, [guildId], (err, row) => {
        if (err) {
          console.error('[ai.getStats] DB error:', err);
          return callback(null);
        }
        callback(row);
      });
    } catch (e) {
      console.error('[ai.getStats] error:', e);
      callback(null);
    }
  },

  incrementStat(guildId, type) {
    try {
      if (type === 'prompts') {
        db.run(
          `INSERT INTO ai_stats (guild_id, prompts) VALUES (?, 1)
           ON CONFLICT(guild_id) DO UPDATE SET prompts = prompts + 1`,
          [guildId],
          (err) => {
            if (err) console.error('[ai.incrementStat] DB error:', err);
          }
        );
      }
    } catch (e) {
      console.error('[ai.incrementStat] error:', e);
    }
  },

  /**
   * getSettings(guildId, callback)
   * - Calls callback(row) with the settings row, inserting defaults if needed.
   * - Keeps existing callback API for compatibility.
   */
  getSettings(guildId, callback) {
    try {
      db.get(`SELECT * FROM ai_settings WHERE guild_id = ?`, [guildId], (err, row) => {
        if (err) {
          console.error('[ai.getSettings] DB error:', err);
          return callback({ model: 'llama-3.1-8b-instant', style: 'default', auto_reply: 1 });
        }
        if (!row) {
          // Insert default row and invoke callback after insert completes
          db.run(
            `INSERT INTO ai_settings (guild_id, model, style, auto_reply) VALUES (?, 'llama-3.1-8b-instant', 'default', 1)`,
            [guildId],
            (insertErr) => {
              if (insertErr) {
                console.error('[ai.getSettings] DB insert error:', insertErr);
                return callback({ model: 'llama-3.1-8b-instant', style: 'default', auto_reply: 1 });
              }
              // Return defaults
              return callback({ model: 'llama-3.1-8b-instant', style: 'default', auto_reply: 1 });
            }
          );
          return;
        }
        callback(row);
      });
    } catch (e) {
      console.error('[ai.getSettings] error:', e);
      callback({ model: 'llama-3.1-8b-instant', style: 'default', auto_reply: 1 });
    }
  },

  setSettings(guildId, updates) {
    try {
      const fields = [];
      const values = [];

      for (const key in updates) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }

      values.push(guildId);

      if (fields.length === 0) return;

      db.run(`UPDATE ai_settings SET ${fields.join(', ')} WHERE guild_id = ?`, values, (err) => {
        if (err) console.error('[ai.setSettings] DB error:', err);
      });
    } catch (e) {
      console.error('[ai.setSettings] error:', e);
    }
  },

  resetSettings(guildId) {
    try {
      db.run(`DELETE FROM ai_settings WHERE guild_id = ?`, [guildId], (err) => {
        if (err) console.error('[ai.resetSettings] DB error:', err);
      });
      db.run(`DELETE FROM ai_channels WHERE guild_id = ?`, [guildId], (err) => {
        if (err) console.error('[ai.resetSettings] DB error:', err);
      });
    } catch (e) {
      console.error('[ai.resetSettings] error:', e);
    }
  }
};
