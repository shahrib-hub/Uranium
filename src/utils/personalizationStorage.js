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

// Track avatar update timestamps per guild to prevent triggering Discord's AVATAR_RATE_LIMIT (2 per 10 minutes)
const avatarHistory = new Map(); // guildId -> number[] (timestamps)
const AVATAR_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_AVATAR_CHANGES_PER_WINDOW = 2;

function getAvatarCooldown(guildId) {
  if (!guildId) {
    return {
      isLocked: false,
      remainingChanges: MAX_AVATAR_CHANGES_PER_WINDOW,
      remainingMs: 0,
      remainingSeconds: 0,
      remainingMinutes: 0
    };
  }
  const now = Date.now();
  const history = (avatarHistory.get(guildId) || []).filter(ts => (now - ts) < AVATAR_LIMIT_WINDOW_MS);
  avatarHistory.set(guildId, history);

  const remainingChanges = Math.max(0, MAX_AVATAR_CHANGES_PER_WINDOW - history.length);

  if (history.length >= MAX_AVATAR_CHANGES_PER_WINDOW) {
    const oldestInWindow = history[0];
    const remainingMs = Math.max(0, (oldestInWindow + AVATAR_LIMIT_WINDOW_MS) - now);
    return {
      isLocked: true,
      remainingChanges: 0,
      remainingMs,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      remainingMinutes: Math.ceil(remainingMs / 60000)
    };
  }
  return {
    isLocked: false,
    remainingChanges,
    remainingMs: 0,
    remainingSeconds: 0,
    remainingMinutes: 0
  };
}

function recordAvatarChange(guildId, timestamp = Date.now()) {
  if (!guildId) return;
  const now = timestamp;
  const history = (avatarHistory.get(guildId) || []).filter(ts => (now - ts) < AVATAR_LIMIT_WINDOW_MS);
  history.push(now);
  avatarHistory.set(guildId, history);
}

function lockAvatarCooldown(guildId) {
  if (!guildId) return;
  const now = Date.now();
  // Fill history so it remains locked for the window duration
  avatarHistory.set(guildId, [now, now]);
}

module.exports = {
  getPersonalization,
  setPersonalization,
  getDefaultPersonalization,
  getAvatarCooldown,
  recordAvatarChange,
  lockAvatarCooldown
};
