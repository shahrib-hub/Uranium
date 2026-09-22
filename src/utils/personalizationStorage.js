const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { isMongoReady } = require('../database/dbUtils');
const { BotPersonalization } = require('../database/mongoose');

const dbPath = path.resolve(__dirname, '..', 'data', 'bot_personalization.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS bot_personalization (
    guild_id TEXT PRIMARY KEY,
    nickname TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    bio TEXT,
    updated_at TEXT
  )`);
});

function getDefaultPersonalization() {
  return {
    nickname: '',
    avatarUrl: '',
    bannerUrl: '',
    bio: '',
    updatedAt: null
  };
}

async function getPersonalization(guildId) {
  if (!guildId) return getDefaultPersonalization();

  if (isMongoReady() && BotPersonalization) {
    try {
      const doc = await BotPersonalization.findOne({ guildId });
      if (doc) {
        return {
          nickname: doc.nickname || '',
          avatarUrl: doc.avatarUrl || '',
          bannerUrl: doc.bannerUrl || '',
          bio: doc.bio || '',
          updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null
        };
      }
      return getDefaultPersonalization();
    } catch (err) {
      console.warn('[Personalization] Mongo read failed, falling back to SQLite:', err.message);
    }
  }

  return new Promise((resolve) => {
    db.get(
      'SELECT nickname, avatar_url as avatarUrl, banner_url as bannerUrl, bio, updated_at as updatedAt FROM bot_personalization WHERE guild_id = ?',
      [guildId],
      (err, row) => {
        if (err || !row) return resolve(getDefaultPersonalization());
        resolve({
          nickname: row.nickname || '',
          avatarUrl: row.avatarUrl || '',
          bannerUrl: row.bannerUrl || '',
          bio: row.bio || '',
          updatedAt: row.updatedAt || null
        });
      }
    );
  });
}

async function setPersonalization(guildId, data = {}) {
  if (!guildId) return null;

  const current = await getPersonalization(guildId);
  const updated = {
    nickname: typeof data.nickname === 'string' ? data.nickname.trim() : (current.nickname || ''),
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl.trim() : (current.avatarUrl || ''),
    bannerUrl: typeof data.bannerUrl === 'string' ? data.bannerUrl.trim() : (current.bannerUrl || ''),
    bio: typeof data.bio === 'string' ? data.bio.trim() : (current.bio || ''),
    updatedAt: new Date().toISOString()
  };

  if (isMongoReady() && BotPersonalization) {
    try {
      await BotPersonalization.findOneAndUpdate(
        { guildId },
        { ...updated, updatedAt: new Date() },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (err) {
      console.warn('[Personalization] Mongo write failed, continuing with SQLite:', err.message);
    }
  }

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO bot_personalization (guild_id, nickname, avatar_url, banner_url, bio, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET
         nickname=excluded.nickname,
         avatar_url=excluded.avatar_url,
         banner_url=excluded.banner_url,
         bio=excluded.bio,
         updated_at=excluded.updated_at`,
      [guildId, updated.nickname, updated.avatarUrl, updated.bannerUrl, updated.bio, updated.updatedAt],
      function (err) {
        if (err) {
          console.error('[PersonalizationStorage] SQLite error:', err.message);
          return reject(err);
        }
        resolve(updated);
      }
    );
  });
}

module.exports = {
  getPersonalization,
  setPersonalization,
  getDefaultPersonalization
};
