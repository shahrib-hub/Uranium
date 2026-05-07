const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { useMongoDB } = require('../config/database');
const { EmbedTemplate } = require('../database/mongoose');

const dbPath = path.join(__dirname, '..', '..', 'data', 'embedtemplates.db');
const db = new sqlite3.Database(dbPath); // ✅ Initialize the database connection

// ✅ Ensure table exists
db.run(`
  CREATE TABLE IF NOT EXISTS embed_templates (
    guild_id TEXT,
    user_id TEXT,
    name TEXT,
    data TEXT,
    PRIMARY KEY (guild_id, name)
  )
`);

async function saveTemplate(guildId, userId, name, data) {
  const json = JSON.stringify(data);

  if (useMongoDB) {
    await EmbedTemplate.findOneAndUpdate(
      { guildId, name },
      { userId, dataJson: json },
      { upsert: true }
    );
    return;
  }

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO embed_templates (guild_id, user_id, name, data) VALUES (?, ?, ?, ?)`,
      [guildId, userId, name, json],
      err => (err ? reject(err) : resolve())
    );
  });
}

async function countTemplates(guildId) {
  if (useMongoDB) {
    return EmbedTemplate.countDocuments({ guildId });
  }

  return new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) AS count FROM embed_templates WHERE guild_id = ?`,
      [guildId],
      (err, row) => (err ? reject(err) : resolve(row.count))
    );
  });
}

async function getTemplateNames(guildId) {
  if (useMongoDB) {
    const docs = await EmbedTemplate.find({ guildId });
    return docs.map(d => d.name);
  }

  return new Promise((resolve, reject) => {
    db.all(
      `SELECT name FROM embed_templates WHERE guild_id = ?`,
      [guildId],
      (err, rows) => (err ? reject(err) : resolve(rows.map(r => r.name)))
    );
  });
}

async function getTemplateByName(guildId, name) {
  if (useMongoDB) {
    const doc = await EmbedTemplate.findOne({ guildId, name });
    return doc ? doc.dataJson : null;
  }

  return new Promise((resolve, reject) => {
    db.get(
      `SELECT data FROM embed_templates WHERE guild_id = ? AND name = ?`,
      [guildId, name],
      (err, row) => (err ? reject(err) : resolve(row?.data || null))
    );
  });
}

async function deleteTemplate(guildId, name) {
  if (useMongoDB) {
    const doc = await EmbedTemplate.findOneAndDelete({ guildId, name });
    return !!doc;
  }

  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM embed_templates WHERE guild_id = ? AND name = ?`,
      [guildId, name],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      }
    );
  });
}

module.exports = {
  saveTemplate,
  countTemplates,
  getTemplateNames,
  getTemplateByName,
  deleteTemplate
};
