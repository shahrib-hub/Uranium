const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { useMongoDB } = require('../config/database');
const { Autoresponse } = require('../database/mongoose');

const dbPath = path.join(__dirname, '..', '..', 'data', 'autoresponse.db');
const db = new sqlite3.Database(dbPath);

// ✅ Initialize table
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS autoresponses (
    guild_id TEXT,
    trigger TEXT,
    response TEXT,
    embed INTEGER,
    PRIMARY KEY (guild_id, trigger)
  )`);
});

// ✅ Get all triggers for a guild
async function getAutoResponses(guildId) {
  if (useMongoDB) {
    const docs = await Autoresponse.find({ guildId });
    return docs.map(d => ({
      guild_id: d.guildId,
      trigger: d.trigger,
      response: d.response,
      embed: d.embed ? 1 : 0
    }));
  }

  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM autoresponses WHERE guild_id = ?`, [guildId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// ✅ Get a specific trigger
async function getAutoResponse(guildId, trigger) {
  if (useMongoDB) {
    const doc = await Autoresponse.findOne({ guildId, trigger });
    if (!doc) return null;
    return {
      guild_id: doc.guildId,
      trigger: doc.trigger,
      response: doc.response,
      embed: doc.embed ? 1 : 0
    };
  }

  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM autoresponses WHERE guild_id = ? AND trigger = ?`, [guildId, trigger], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// ✅ Add a new trigger
async function addAutoResponse(guildId, trigger, response, embed) {
  if (useMongoDB) {
    await Autoresponse.findOneAndUpdate(
      { guildId, trigger },
      { response, embed: !!embed },
      { upsert: true }
    );
    return;
  }

  return new Promise((resolve, reject) => {
    db.run(`INSERT OR REPLACE INTO autoresponses (guild_id, trigger, response, embed)
            VALUES (?, ?, ?, ?)`,
      [guildId, trigger, response, embed ? 1 : 0],
      err => err ? reject(err) : resolve()
    );
  });
}

// ✅ Remove a trigger
async function removeAutoResponse(guildId, trigger) {
  if (useMongoDB) {
    await Autoresponse.findOneAndDelete({ guildId, trigger });
    return;
  }

  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM autoresponses WHERE guild_id = ? AND trigger = ?`,
      [guildId, trigger],
      err => err ? reject(err) : resolve()
    );
  });
}

// ✅ Count triggers for a guild
async function countAutoResponses(guildId) {
  if (useMongoDB) {
    return Autoresponse.countDocuments({ guildId });
  }

  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) AS count FROM autoresponses WHERE guild_id = ?`, [guildId], (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
}

module.exports = {
  getAutoResponses,
  getAutoResponse,
  addAutoResponse,
  removeAutoResponse,
  countAutoResponses
};
