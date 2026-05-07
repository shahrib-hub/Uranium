const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { useMongoDB } = require('../config/database');
const { SocialConfig } = require('../database/mongoose');

const db = new sqlite3.Database(
  path.join(__dirname, '..', '..', 'data', 'social_notifications.db')
);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS social_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT,
      platform TEXT,
      source TEXT,
      notifyChannelId TEXT,
      message TEXT,
      lastPost TEXT,
      cooldown INTEGER
    )
  `);
});

module.exports = {
  db,

  add(data) {
    if (useMongoDB) {
      return SocialConfig.create({
        guildId: data.guildId,
        platform: data.platform,
        source: data.source,
        notifyChannelId: data.notifyChannelId,
        message: data.message,
        cooldown: data.cooldown
      });
    }

    return new Promise((res, rej) => {
      db.run(
        `INSERT INTO social_channels 
        (guildId, platform, source, notifyChannelId, message, lastPost, cooldown)
        VALUES (?, ?, ?, ?, ?, NULL, ?)`,
        [
          data.guildId,
          data.platform,
          data.source,
          data.notifyChannelId,
          data.message,
          data.cooldown
        ],
        err => (err ? rej(err) : res())
      );
    });
  },

  list(guildId) {
    if (useMongoDB) {
      return SocialConfig.find({ guildId }).then(docs => 
        docs.map(doc => ({
          id: doc._id.toString(),
          guildId: doc.guildId,
          platform: doc.platform,
          source: doc.source,
          notifyChannelId: doc.notifyChannelId,
          message: doc.message,
          lastPost: doc.lastPost,
          cooldown: doc.cooldown
        }))
      );
    }

    return new Promise((res, rej) => {
      db.all(
        `SELECT * FROM social_channels WHERE guildId = ?`,
        [guildId],
        (e, r) => (e ? rej(e) : res(r))
      );
    });
  },

  all() {
    if (useMongoDB) {
      return SocialConfig.find({}).then(docs => 
        docs.map(doc => ({
          id: doc._id.toString(),
          guildId: doc.guildId,
          platform: doc.platform,
          source: doc.source,
          notifyChannelId: doc.notifyChannelId,
          message: doc.message,
          lastPost: doc.lastPost,
          cooldown: doc.cooldown
        }))
      );
    }

    return new Promise((res, rej) => {
      db.all(`SELECT * FROM social_channels`, (e, r) =>
        e ? rej(e) : res(r)
      );
    });
  },

  updateLast(id, value) {
    if (useMongoDB) {
      SocialConfig.findByIdAndUpdate(id, { lastPost: value }).catch(() => null);
      return;
    }

    db.run(`UPDATE social_channels SET lastPost = ? WHERE id = ?`, [
      value,
      id
    ]);
  },

  remove(id, guildId) {
    if (useMongoDB) {
      SocialConfig.findOneAndDelete({ _id: id, guildId }).catch(() => null);
      return;
    }

    db.run(
      `DELETE FROM social_channels WHERE id = ? AND guildId = ?`,
      [id, guildId]
    );
  }
};
