// src/utils/birthdayStorage.js
const rrdb = require('./rrdb'); // reuse existing sqlite helper
const { isMongoReady } = require('../database/dbUtils');
const { Birthday } = require('../database/mongoose');
const now = () => Math.floor(Date.now() / 1000);

async function initBirthdayStorage() {
  await rrdb.init();
  await rrdb.instance.exec(`
    CREATE TABLE IF NOT EXISTS birthdays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      year INTEGER,
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE (guild_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_bday_guild ON birthdays (guild_id);
    CREATE INDEX IF NOT EXISTS idx_bday_monthday ON birthdays (month, day);
  `);
}

async function setBirthday({ guildId, userId, year = null, month, day, note = null }) {
  const ts = now();

  if (isMongoReady()) {
    const doc = await Birthday.findOneAndUpdate(
      { guildId, userId },
      { year, month, day, note, createdAt: ts },
      { upsert: true, new: true }
    );
    return doc._id.toString(); // Just return something truthy for id
  }

  // upsert
  const existing = await rrdb.instance.get(
    `SELECT id FROM birthdays WHERE guild_id = ? AND user_id = ?;`,
    [guildId, userId]
  );

  if (existing) {
    await rrdb.instance.run(
      `UPDATE birthdays SET year = ?, month = ?, day = ?, note = ?, created_at = ? WHERE id = ?;`,
      [year, month, day, note, ts, existing.id]
    );
    return existing.id;
  } else {
    const res = await rrdb.instance.run(
      `INSERT INTO birthdays (guild_id, user_id, year, month, day, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [guildId, userId, year, month, day, note, ts]
    );
    return res.lastID;
  }
}

async function removeBirthday(guildId, userId) {
  if (isMongoReady()) {
    return Birthday.findOneAndDelete({ guildId, userId });
  }

  return rrdb.instance.run(`DELETE FROM birthdays WHERE guild_id = ? AND user_id = ?;`, [guildId, userId]);
}

async function getBirthday(guildId, userId) {
  if (isMongoReady()) {
    const doc = await Birthday.findOne({ guildId, userId });
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      guild_id: doc.guildId,
      user_id: doc.userId,
      year: doc.year,
      month: doc.month,
      day: doc.day,
      note: doc.note,
      created_at: doc.createdAt
    };
  }

  return rrdb.instance.get(`SELECT * FROM birthdays WHERE guild_id = ? AND user_id = ? LIMIT 1;`, [guildId, userId]);
}

async function listBirthdaysForGuild(guildId) {
  if (isMongoReady()) {
    const docs = await Birthday.find({ guildId }).sort({ month: 1, day: 1 });
    return docs.map(doc => ({
      id: doc._id.toString(),
      guild_id: doc.guildId,
      user_id: doc.userId,
      year: doc.year,
      month: doc.month,
      day: doc.day,
      note: doc.note,
      created_at: doc.createdAt
    }));
  }

  return rrdb.instance.all(`SELECT * FROM birthdays WHERE guild_id = ? ORDER BY month ASC, day ASC;`, [guildId]);
}

/**
 * upcomingBirthdays - returns rows whose date falls within the next \`daysAhead\`
 * relative to \`nowDate\` (a JS Date). Handles year wrap.
 *
 * Returns array of { id, guild_id, user_id, year, month, day, note }
 */
async function upcomingBirthdays(guildId, daysAhead = 7, nowDate = new Date()) {
  // Normalize time to local date used by bot (no timezone conversions)
  const results = await listBirthdaysForGuild(guildId);
  if (!results || results.length === 0) return [];

  // create a set of upcoming month-day strings
  const upcoming = [];
  const start = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const mm = d.getMonth() + 1;
    const dd = d.getDate();
    upcoming.push(`${mm.toString().padStart(2, '0')}-${dd.toString().padStart(2, '0')}`);
  }

  // filter
  const out = results.filter(r => {
    const key = `${String(r.month).padStart(2, '0')}-${String(r.day).padStart(2, '0')}`;
    return upcoming.includes(key);
  });

  // For better UX, sort by upcoming order
  out.sort((a, b) => {
    const aKey = `${String(a.month).padStart(2, '0')}-${String(a.day).padStart(2, '0')}`;
    const bKey = `${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`;
    return upcoming.indexOf(aKey) - upcoming.indexOf(bKey);
  });

  return out;
}

module.exports = {
  initBirthdayStorage,
  setBirthday,
  removeBirthday,
  getBirthday,
  listBirthdaysForGuild,
  upcomingBirthdays
};