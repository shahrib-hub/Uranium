const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { useMongoDB } = require('../config/database');
const { YTVerify } = require('../database/mongoose');
const dbPath = path.resolve(__dirname, '..', 'data', 'yt_verify.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS yt_verify_settings (
    guild_id TEXT PRIMARY KEY,
    channel_name TEXT NOT NULL,
    grant_roles TEXT NOT NULL,
    verify_channel_id TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1
  )`);
});

module.exports = {
  async getSettings(guildId, cb) {
    if (useMongoDB) {
      const doc = await YTVerify.findOne({ guildId });
      if (!doc) return cb(null);
      return cb({
        guild_id: doc.guildId,
        channel_name: doc.channelName,
        grant_roles: doc.grantRoles,
        verify_channel_id: doc.verifyChannelId,
        enabled: doc.enabled ? 1 : 0
      });
    }

    db.get(`SELECT * FROM yt_verify_settings WHERE guild_id = ?`, [guildId], (err, row) => cb(row || null));
  },
  async setSettings(guildId, { channel_name, grant_roles, verify_channel_id }) {
    const rolesCsv = Array.isArray(grant_roles) ? grant_roles.join(',') : grant_roles;

    if (useMongoDB) {
      await YTVerify.findOneAndUpdate(
        { guildId },
        {
          channelName: channel_name,
          grantRoles: rolesCsv,
          verifyChannelId: verify_channel_id,
          enabled: true
        },
        { upsert: true }
      );
      return;
    }

    db.run(
      `INSERT INTO yt_verify_settings (guild_id, channel_name, grant_roles, verify_channel_id, enabled)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(guild_id) DO UPDATE SET channel_name=excluded.channel_name, grant_roles=excluded.grant_roles, verify_channel_id=excluded.verify_channel_id, enabled=1`,
      [guildId, channel_name, rolesCsv, verify_channel_id]
    );
  },
  async disable(guildId) {
    if (useMongoDB) {
      await YTVerify.findOneAndUpdate({ guildId }, { enabled: false });
      return;
    }

    db.run(`UPDATE yt_verify_settings SET enabled = 0 WHERE guild_id = ?`, [guildId]);
  },
  async isEnabled(guildId, cb) {
    if (useMongoDB) {
      const doc = await YTVerify.findOne({ guildId });
      return cb(!!(doc && doc.enabled));
    }

    db.get(`SELECT enabled FROM yt_verify_settings WHERE guild_id = ?`, [guildId], (err, row) => cb(!!(row && row.enabled)));
  },
  async getVerifyChannel(guildId, cb) {
    if (useMongoDB) {
      const doc = await YTVerify.findOne({ guildId });
      return cb(doc ? doc.verifyChannelId : null);
    }

    db.get(`SELECT verify_channel_id FROM yt_verify_settings WHERE guild_id = ?`, [guildId], (err, row) => cb(row ? row.verify_channel_id : null));
  }
};
