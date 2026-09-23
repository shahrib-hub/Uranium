// src/utils/welcomeStorage.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { isMongoReady } = require('../database/dbUtils');
const { WelcomeConfig, LeaveConfig } = require('../database/mongoose');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'welcome.db');
const db = new sqlite3.Database(dbPath);

// Promisified SQLite helpers
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
        enabled INTEGER DEFAULT 1,
        template INTEGER DEFAULT 1,
        message TEXT,
        dm INTEGER DEFAULT 0,
        createdAt INTEGER,
        updatedAt INTEGER,
        templates_json TEXT DEFAULT '[]',
        data_json TEXT DEFAULT '{}'
      );
    `);

    // Ensure columns exist for older DBs
    const cols = await allAsync(`PRAGMA table_info(welcome_settings)`);
    const colNames = (cols || []).map(c => c.name);

    const toAdd = [];
    if (!colNames.includes('createdAt')) toAdd.push(`createdAt INTEGER`);
    if (!colNames.includes('updatedAt')) toAdd.push(`updatedAt INTEGER`);
    if (!colNames.includes('templates_json')) toAdd.push(`templates_json TEXT DEFAULT '[]'`);
    if (!colNames.includes('data_json')) toAdd.push(`data_json TEXT DEFAULT '{}'`);

    for (const colDef of toAdd) {
      try {
        await runAsync(`ALTER TABLE welcome_settings ADD COLUMN ${colDef};`);
      } catch (err) {
        // Ignore race/duplicate errors
      }
    }
  })();

  return readyPromise;
}

// Default configuration for MEE6-inspired Welcome & Goodbye
function defaultConfig(guildId = '') {
  return {
    guildId,
    enabled: true, // Master toggle (Active switch in header)

    // Captcha Verification
    captchaEnabled: false,

    // 1. Send a message when a user joins the server
    welcomeChannelEnabled: true,
    welcomeChannelId: null,
    welcomeMessageType: 'text', // 'text' | 'embed'
    welcomeMessage: 'Hey {user}, welcome to **{server}**! 🎉 Welcome your stay here! Please checkout the rules and have fun! We now have {count} members!',
    welcomeCardEnabled: true,
    welcomeEmbed: {
      title: 'Welcome to {server}!',
      description: 'Welcome {user}! We are thrilled to have you here. You are member #{count}!',
      color: '#f43f5e',
      footer: 'Uranium Welcome System'
    },

    // 2. Customize your welcome card (100% Free)
    cardFont: 'Inter',
    cardTextColor: '#ffffff',
    cardBgColor: '#0e1017',
    cardOverlayOpacity: 40,
    cardBgImage: 'preset_obsidian', // 'preset_obsidian', 'preset_cyberpunk', 'preset_aurora', 'preset_minimal', 'preset_golden', 'preset_emerald' or URL
    cardTitle: '{username} just joined the server',
    cardSubtitle: 'Member #{count}',
    cardTheme: 'modern_obsidian',

    // 3. Send a private message (DM) to new users
    dmEnabled: false,
    dmMessageType: 'text',
    dmMessage: 'Hey! Thank you for joining {server}! Enjoy your stay and make sure to verify yourself to talk in the server.',
    dmCardEnabled: false,
    dmEmbed: {
      title: 'Welcome to {server}!',
      description: 'Thank you for joining our community.',
      color: '#f43f5e',
      footer: 'Uranium Welcome'
    },

    // 4. Give a role to new users (Autoroles on join)
    autoroleEnabled: false,
    autoroleIds: [],

    // 5. Send a message when a user leaves the server (Goodbye)
    goodbyeEnabled: false,
    goodbyeChannelId: null,
    goodbyeMessageType: 'text',
    goodbyeMessage: '**{username}** just left the server 😭 Hope it\'s a dream! We now have {count} members!',
    goodbyeCardEnabled: false,
    goodbyeEmbed: {
      title: 'Goodbye!',
      description: '{username} has left {server}.',
      color: '#717892',
      footer: 'Uranium Goodbye'
    },

    // Aliases & Nested Structures for Dashboard Frontend
    active: true,
    sendWelcomeMessage: true,
    sendWelcomeCard: true,
    sendWelcomeDm: false,
    sendWelcomeDmCard: false,
    autorolesEnabled: false,
    sendGoodbyeMessage: false,
    sendGoodbyeCard: false,
    welcomeCardConfig: {
      font: 'Segoe UI, Arial, sans-serif',
      textColor: '#ffffff',
      backgroundColor: '#0e1017',
      overlayOpacity: 0.75,
      theme: 'modern_obsidian',
      backgroundUrl: '',
      titleTemplate: '{username} just joined the server',
      subtitleTemplate: 'Member #{count}'
    }
  };
}

function parseJson(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

const storage = {
  _ready: ensureSchema(),

  async getSettings(guildId) {
    if (!guildId) return defaultConfig();
    await storage._ready;

    // Check MongoDB
    if (isMongoReady() && WelcomeConfig) {
      try {
        const doc = await WelcomeConfig.findOne({ guildId });
        if (doc) {
          const parsed = parseJson(doc.dataJson, {});
          const def = defaultConfig(guildId);
          return {
            ...def,
            ...parsed,
            guildId,
            enabled: doc.enabled !== undefined ? doc.enabled : (parsed.enabled !== undefined ? parsed.enabled : def.enabled),
            welcomeChannelId: doc.channelId || parsed.welcomeChannelId || null
          };
        }
      } catch (err) {
        console.warn('[welcomeStorage] Mongo fetch error:', err.message);
      }
    }

    // SQLite fallback
    const row = await getAsync(`SELECT * FROM welcome_settings WHERE guildId = ?`, [guildId]);
    if (!row) {
      return defaultConfig(guildId);
    }

    const dataJsonParsed = parseJson(row.data_json, {});
    const def = defaultConfig(guildId);

    // Merge row data with priority to data_json, then legacy columns, then default
    const merged = {
      ...def,
      ...dataJsonParsed,
      guildId,
      enabled: row.enabled !== null && row.enabled !== undefined ? Number(row.enabled) === 1 : def.enabled,
      welcomeChannelId: dataJsonParsed.welcomeChannelId !== undefined ? dataJsonParsed.welcomeChannelId : (row.channelId || null),
      welcomeChannelEnabled: dataJsonParsed.welcomeChannelEnabled !== undefined ? dataJsonParsed.welcomeChannelEnabled : (dataJsonParsed.sendWelcomeMessage !== undefined ? dataJsonParsed.sendWelcomeMessage : !!row.channelId),
      welcomeMessage: dataJsonParsed.welcomeMessage || row.message || def.welcomeMessage,
      dmEnabled: dataJsonParsed.dmEnabled !== undefined ? dataJsonParsed.dmEnabled : (dataJsonParsed.sendWelcomeDm !== undefined ? dataJsonParsed.sendWelcomeDm : (Number(row.dm) === 1))
    };

    // Provide friendly alias properties for both frontend and events
    merged.active = merged.enabled;
    merged.sendWelcomeMessage = merged.welcomeChannelEnabled;
    merged.sendWelcomeCard = merged.welcomeCardEnabled;
    merged.sendWelcomeDm = merged.dmEnabled;
    merged.sendWelcomeDmCard = merged.dmCardEnabled;
    merged.autorolesEnabled = merged.autoroleEnabled;
    merged.sendGoodbyeMessage = merged.goodbyeEnabled;
    merged.sendGoodbyeCard = merged.goodbyeCardEnabled;

    if (!merged.welcomeCardConfig) {
      merged.welcomeCardConfig = {
        font: merged.cardFont || 'Segoe UI, Arial, sans-serif',
        textColor: merged.cardTextColor || '#FFFFFF',
        backgroundColor: merged.cardBgColor || '#0B0D14',
        overlayOpacity: (merged.cardOverlayOpacity != null ? merged.cardOverlayOpacity / 100 : 0.75),
        theme: merged.cardTheme || 'modern_obsidian',
        backgroundUrl: (typeof merged.cardBgImage === 'string' && merged.cardBgImage.startsWith('http')) ? merged.cardBgImage : '',
        titleTemplate: merged.cardTitle || '{user} just joined the server',
        subtitleTemplate: merged.cardSubtitle || 'Member #{count}'
      };
    }

    return merged;
  },

  async setConfig(guildId, updates = {}) {
    if (!guildId) return;
    await storage._ready;
    const now = Date.now();
    const current = await storage.getSettings(guildId);

    // Normalize incoming updates
    const normalized = { ...updates };
    if (updates.active !== undefined) normalized.enabled = updates.active;
    if (updates.sendWelcomeMessage !== undefined) normalized.welcomeChannelEnabled = updates.sendWelcomeMessage;
    if (updates.sendWelcomeCard !== undefined) normalized.welcomeCardEnabled = updates.sendWelcomeCard;
    if (updates.sendWelcomeDm !== undefined) normalized.dmEnabled = updates.sendWelcomeDm;
    if (updates.sendWelcomeDmCard !== undefined) normalized.dmCardEnabled = updates.sendWelcomeDmCard;
    if (updates.autorolesEnabled !== undefined) normalized.autoroleEnabled = updates.autorolesEnabled;
    if (updates.sendGoodbyeMessage !== undefined) normalized.goodbyeEnabled = updates.sendGoodbyeMessage;
    if (updates.sendGoodbyeCard !== undefined) normalized.goodbyeCardEnabled = updates.sendGoodbyeCard;

    if (updates.welcomeCardConfig) {
      const cc = updates.welcomeCardConfig;
      if (cc.font) normalized.cardFont = cc.font;
      if (cc.textColor) normalized.cardTextColor = cc.textColor;
      if (cc.backgroundColor) normalized.cardBgColor = cc.backgroundColor;
      if (cc.overlayOpacity !== undefined) normalized.cardOverlayOpacity = Math.round(cc.overlayOpacity * 100);
      if (cc.theme) normalized.cardTheme = cc.theme;
      if (cc.backgroundUrl !== undefined) normalized.cardBgImage = cc.backgroundUrl;
      if (cc.titleTemplate !== undefined) normalized.cardTitle = cc.titleTemplate;
      if (cc.subtitleTemplate !== undefined) normalized.cardSubtitle = cc.subtitleTemplate;
    }

    const merged = {
      ...current,
      ...normalized,
      guildId,
      updatedAt: now
    };

    const dataJsonStr = JSON.stringify(merged);
    const enabledNum = merged.enabled ? 1 : 0;
    const channelId = merged.welcomeChannelId || null;
    const message = merged.welcomeMessage || null;
    const dmNum = merged.dmEnabled ? 1 : 0;
    const template = 1;

    // MongoDB save
    if (isMongoReady() && WelcomeConfig) {
      try {
        await WelcomeConfig.findOneAndUpdate(
          { guildId },
          {
            channelId,
            enabled: merged.enabled,
            dataJson: dataJsonStr,
            updatedAt: now,
            $setOnInsert: { createdAt: now }
          },
          { upsert: true }
        );
      } catch (err) {
        console.warn('[welcomeStorage] Mongo update error:', err.message);
      }
    }

    // SQLite save
    return runAsync(
      `INSERT INTO welcome_settings (guildId, channelId, enabled, template, message, dm, createdAt, updatedAt, templates_json, data_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?)
       ON CONFLICT(guildId) DO UPDATE SET
         channelId = excluded.channelId,
         enabled = excluded.enabled,
         template = excluded.template,
         message = excluded.message,
         dm = excluded.dm,
         updatedAt = excluded.updatedAt,
         data_json = excluded.data_json`,
      [guildId, channelId, enabledNum, template, message, dmNum, current.createdAt || now, now, dataJsonStr]
    );
  },

  async setWelcomeChannel(guildId, channelId) {
    return storage.setConfig(guildId, {
      welcomeChannelId: channelId,
      welcomeChannelEnabled: true,
      enabled: true
    });
  },

  async removeWelcomeChannel(guildId) {
    return storage.setConfig(guildId, {
      welcomeChannelId: null,
      welcomeChannelEnabled: false
    });
  },

  defaultConfig
};

module.exports = storage;