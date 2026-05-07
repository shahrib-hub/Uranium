// src/utils/welcomeStorage.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { useMongoDB } = require('../config/database');
const { WelcomeConfig } = require('../database/mongoose');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'welcome.db');
const db = new sqlite3.Database(dbPath);

// promisified helpers
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}
function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}
function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

let readyPromise = null;

async function ensureSchema() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    await runAsync('PRAGMA foreign_keys = ON;');
    await runAsync('PRAGMA journal_mode = WAL;');
    await runAsync('PRAGMA synchronous = NORMAL;');

    await runAsync(`
      CREATE TABLE IF NOT EXISTS welcome_settings (
        guildId TEXT PRIMARY KEY,
        channelId TEXT,
        enabled INTEGER DEFAULT 0,
        template INTEGER DEFAULT 1,
        message TEXT,
        dm INTEGER DEFAULT 0,
        createdAt INTEGER,
        updatedAt INTEGER,
        templates_json TEXT DEFAULT '[]'
      );
    `);

    // ensure columns exist for older DBs
    const cols = await allAsync(`PRAGMA table_info(welcome_settings)`);
    const colNames = (cols || []).map(c => c.name);

    const toAdd = [];
    if (!colNames.includes('createdAt')) toAdd.push(`createdAt INTEGER`);
    if (!colNames.includes('updatedAt')) toAdd.push(`updatedAt INTEGER`);
    if (!colNames.includes('templates_json')) toAdd.push(`templates_json TEXT DEFAULT '[]'`);

    for (const colDef of toAdd) {
      try {
        await runAsync(`ALTER TABLE welcome_settings ADD COLUMN ${colDef};`);
      } catch (err) {
        // ignore race/duplicate errors
        console.warn('[welcomeStorage] ALTER TABLE add column failed (ignored):', err?.message || err);
      }
    }

    // backfill
    try {
      const now = Date.now();
      await runAsync(`UPDATE welcome_settings SET createdAt = ? WHERE createdAt IS NULL`, [now]);
      await runAsync(`UPDATE welcome_settings SET updatedAt = ? WHERE updatedAt IS NULL`, [now]);
      await runAsync(`UPDATE welcome_settings SET templates_json = '[]' WHERE templates_json IS NULL`, []);
    } catch (err) {
      console.warn('[welcomeStorage] backfill warning:', err?.message || err);
    }
  })();

  return readyPromise;
}

// JSON helpers
function serializeTemplates(arr) {
  try { return JSON.stringify(arr || []); } catch { return '[]'; }
}
function deserializeTemplates(str) {
  try { return JSON.parse(str || '[]'); } catch { return []; }
}

// Default lightweight template descriptors (you can change to full canvas assets later)
// Each template object is a descriptor — your card generator can use `template.id` or `template.name`
function getDefaultTemplates() {
  return [
    { id: 1, name: 'Aurora', description: 'Dark gradient, big username, subtle vignette' },
    { id: 2, name: 'Neon', description: 'Neon glow, rounded avatar, bold level text' },
    { id: 3, name: 'Minimal', description: 'Clean white card with thin borders' },
    { id: 4, name: 'Retro', description: 'Pixel style frame with badge area' },
    { id: 5, name: 'Elegant', description: 'Gold accents, serif welcome text' }
  ];
}

const storage = {
  _ready: ensureSchema(),

  async getSettings(guildId) {
    if (useMongoDB) {
      const doc = await WelcomeConfig.findOne({ guildId });
      if (!doc) {
        return {
          guildId,
          channelId: null,
          enabled: false,
          template: 1,
          message: null,
          dm: false,
          createdAt: null,
          updatedAt: null,
          templates: getDefaultTemplates()
        };
      }
      return {
        guildId: doc.guildId,
        channelId: doc.channelId,
        enabled: doc.enabled,
        template: doc.template || 1,
        message: doc.message || null,
        dm: doc.dm,
        createdAt: doc.createdAt || null,
        updatedAt: doc.updatedAt || null,
        templates: deserializeTemplates(doc.templatesJson)
      };
    }

    await storage._ready;
    const row = await getAsync(`SELECT * FROM welcome_settings WHERE guildId = ?`, [guildId]);
    if (!row) {
      return {
        guildId,
        channelId: null,
        enabled: false,
        template: 1,
        message: null,
        dm: false,
        createdAt: null,
        updatedAt: null,
        templates: getDefaultTemplates()
      };
    }
    return {
      guildId: row.guildId,
      channelId: row.channelId,
      enabled: Number(row.enabled) === 1,
      template: Number(row.template) || 1,
      message: row.message || null,
      dm: Number(row.dm) === 1,
      createdAt: row.createdAt || null,
      updatedAt: row.updatedAt || null,
      templates: deserializeTemplates(row.templates_json)
    };
  },

  async setConfig(guildId, updates = {}) {
    const now = Date.now();
    const cur = await storage.getSettings(guildId);
    
    const record = {
      guildId,
      channelId: (updates.channelId !== undefined) ? updates.channelId : cur.channelId,
      enabled: (updates.enabled !== undefined) ? updates.enabled : cur.enabled,
      template: (updates.template !== undefined) ? updates.template : cur.template,
      message: (updates.message !== undefined) ? updates.message : cur.message,
      dm: (updates.dm !== undefined) ? updates.dm : cur.dm,
      templates_json: (updates.templates !== undefined) ? serializeTemplates(updates.templates) : serializeTemplates(cur.templates || getDefaultTemplates()),
      createdAt: cur.createdAt || now,
      updatedAt: now
    };

    if (useMongoDB) {
      await WelcomeConfig.findOneAndUpdate(
        { guildId },
        {
          channelId: record.channelId,
          enabled: record.enabled,
          template: record.template,
          message: record.message,
          dm: record.dm,
          templatesJson: record.templates_json,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt
        },
        { upsert: true }
      );
      return;
    }

    await storage._ready;
    return runAsync(
      `INSERT INTO welcome_settings (guildId, channelId, enabled, template, message, dm, createdAt, updatedAt, templates_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(guildId) DO UPDATE SET
         channelId = excluded.channelId,
         enabled = excluded.enabled,
         template = excluded.template,
         message = excluded.message,
         dm = excluded.dm,
         templates_json = excluded.templates_json,
         updatedAt = excluded.updatedAt`,
      [record.guildId, record.channelId, record.enabled ? 1 : 0, record.template, record.message, record.dm ? 1 : 0, record.createdAt, record.updatedAt, record.templates_json]
    );
  },

  async setWelcomeChannel(guildId, channelId) {
    const now = Date.now();
    if (useMongoDB) {
      await WelcomeConfig.findOneAndUpdate(
        { guildId },
        {
          channelId,
          enabled: true,
          updatedAt: now,
          $setOnInsert: { createdAt: now, templatesJson: serializeTemplates(getDefaultTemplates()) }
        },
        { upsert: true }
      );
      return;
    }

    await storage._ready;
    return runAsync(
      `INSERT INTO welcome_settings (guildId, channelId, enabled, createdAt, updatedAt, templates_json)
       VALUES (?, ?, 1, ?, ?, ?)
       ON CONFLICT(guildId) DO UPDATE SET
         channelId = excluded.channelId,
         enabled = 1,
         updatedAt = excluded.updatedAt`,
      [guildId, channelId, now, now, serializeTemplates(getDefaultTemplates())]
    );
  },

  async removeWelcomeChannel(guildId) {
    const now = Date.now();
    if (useMongoDB) {
      await WelcomeConfig.findOneAndUpdate(
        { guildId },
        {
          channelId: null,
          enabled: false,
          updatedAt: now,
          $setOnInsert: { createdAt: now, templatesJson: serializeTemplates(getDefaultTemplates()) }
        },
        { upsert: true }
      );
      return;
    }

    await storage._ready;
    return runAsync(
      `INSERT INTO welcome_settings (guildId, channelId, enabled, createdAt, updatedAt, templates_json)
       VALUES (?, NULL, 0, ?, ?, ?)
       ON CONFLICT(guildId) DO UPDATE SET
         channelId = NULL,
         enabled = 0,
         updatedAt = excluded.updatedAt`,
      [guildId, now, now, serializeTemplates(getDefaultTemplates())]
    );
  },

  /**
   * Ensure a settings row exists and that default templates are present.
   * Returns the normalized settings object after ensuring defaults.
   *
   * This is the function that was missing in your module.
   */
  async ensureDefaults(guildId) {
    if (useMongoDB) {
      const doc = await WelcomeConfig.findOne({ guildId });
      if (!doc) {
        await storage.setConfig(guildId, { templates: getDefaultTemplates(), enabled: false });
      } else {
        const templates = deserializeTemplates(doc.templatesJson);
        if (!Array.isArray(templates) || templates.length === 0) {
          await WelcomeConfig.findOneAndUpdate({ guildId }, { templatesJson: serializeTemplates(getDefaultTemplates()) });
        }
      }
      return storage.getSettings(guildId);
    }

    await storage._ready;
    // create row if missing (using setConfig with no updates will create default row)
    const exists = await getAsync(`SELECT guildId, templates_json FROM welcome_settings WHERE guildId = ?`, [guildId]);
    if (!exists) {
      await storage.setConfig(guildId, { templates: getDefaultTemplates(), enabled: false });
    } else {
      // ensure templates_json not empty
      const templates = deserializeTemplates(exists.templates_json);
      if (!Array.isArray(templates) || templates.length === 0) {
        await runAsync(`UPDATE welcome_settings SET templates_json = ? WHERE guildId = ?`, [serializeTemplates(getDefaultTemplates()), guildId]);
      }
    }
    return storage.getSettings(guildId);
  },

  async setTemplates(guildId, templatesArray) {
    if (useMongoDB) {
      await WelcomeConfig.findOneAndUpdate({ guildId }, { templatesJson: serializeTemplates(templatesArray), updatedAt: Date.now() }, { upsert: true });
      return;
    }

    await storage._ready;
    return runAsync(`UPDATE welcome_settings SET templates_json = ? , updatedAt = ? WHERE guildId = ?`, [serializeTemplates(templatesArray), Date.now(), guildId]);
  },

  async checkTables(verbose = false) {
    if (useMongoDB) {
      return { welcome_settings: { exists: true, count: await WelcomeConfig.countDocuments(), cols: [] } };
    }

    await storage._ready;
    const tables = ['welcome_settings'];
    const info = {};
    for (const t of tables) {
      const rows = await allAsync(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`, [t]);
      if (!rows.length) {
        info[t] = { exists: false, count: 0, cols: [] };
        continue;
      }
      const cols = await allAsync(`PRAGMA table_info(${t})`);
      const row = await getAsync(`SELECT COUNT(*) as count FROM ${t}`);
      info[t] = { exists: true, count: Number(row?.count || 0), cols: cols.map(c => c.name) };
    }
    if (verbose) console.log('welcomeStorage table info:', info);
    return info;
  }
};

module.exports = storage;