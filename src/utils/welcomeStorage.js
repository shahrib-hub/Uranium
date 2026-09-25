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

// Comprehensive normalizer that guarantees 100% synchronization of all alias pairs
function normalizeSettings(data = {}, guildId = '') {
  const def = defaultConfig(guildId);
  const raw = { ...def, ...data };

  // Master active toggle
  const isEnabled = raw.active !== undefined 
    ? Boolean(raw.active) 
    : (raw.enabled !== undefined ? (typeof raw.enabled === 'number' ? raw.enabled === 1 : Boolean(raw.enabled)) : true);

  // Welcome channel message toggle
  const isWelcomeChannelEnabled = raw.sendWelcomeMessage !== undefined
    ? Boolean(raw.sendWelcomeMessage)
    : (raw.welcomeChannelEnabled !== undefined ? Boolean(raw.welcomeChannelEnabled) : Boolean(raw.channelId || raw.welcomeChannelId));

  // Welcome channel ID
  const welcomeChannelId = raw.welcomeChannelId || raw.channelId || null;

  // Welcome message text & type
  const welcomeMessage = raw.welcomeMessage || raw.message || def.welcomeMessage;
  const welcomeMessageType = raw.welcomeMessageType === 'embed' ? 'embed' : 'text';

  // Welcome card toggle
  const isWelcomeCardEnabled = raw.sendWelcomeCard !== undefined
    ? Boolean(raw.sendWelcomeCard)
    : (raw.welcomeCardEnabled !== undefined ? Boolean(raw.welcomeCardEnabled) : true);

  // DM settings
  const isDmEnabled = raw.sendWelcomeDm !== undefined
    ? Boolean(raw.sendWelcomeDm)
    : (raw.dmEnabled !== undefined ? Boolean(raw.dmEnabled) : (Number(raw.dm) === 1));

  const dmMessageType = raw.welcomeDmMessageType || raw.dmMessageType || 'text';
  const dmMessage = raw.welcomeDmMessage || raw.dmMessage || def.dmMessage;

  const isDmCardEnabled = raw.sendWelcomeDmCard !== undefined
    ? Boolean(raw.sendWelcomeDmCard)
    : (raw.dmCardEnabled !== undefined ? Boolean(raw.dmCardEnabled) : false);

  // Autorole settings
  const isAutoroleEnabled = raw.autorolesEnabled !== undefined
    ? Boolean(raw.autorolesEnabled)
    : (raw.autoroleEnabled !== undefined ? Boolean(raw.autoroleEnabled) : false);

  const autoroleIds = Array.isArray(raw.autoroleIds) ? raw.autoroleIds : [];

  // Goodbye settings
  const isGoodbyeEnabled = raw.sendGoodbyeMessage !== undefined
    ? Boolean(raw.sendGoodbyeMessage)
    : (raw.goodbyeEnabled !== undefined ? Boolean(raw.goodbyeEnabled) : false);

  const goodbyeChannelId = raw.goodbyeChannelId || null;
  const goodbyeMessageType = raw.goodbyeMessageType === 'embed' ? 'embed' : 'text';
  const goodbyeMessage = raw.goodbyeMessage || def.goodbyeMessage;

  const isGoodbyeCardEnabled = raw.sendGoodbyeCard !== undefined
    ? Boolean(raw.sendGoodbyeCard)
    : (raw.goodbyeCardEnabled !== undefined ? Boolean(raw.goodbyeCardEnabled) : false);

  // Card configuration
  const cc = raw.welcomeCardConfig || {};
  const font = cc.font || raw.cardFont || 'Segoe UI, Arial, sans-serif';
  const textColor = cc.textColor || raw.cardTextColor || '#FFFFFF';
  const backgroundColor = cc.backgroundColor || raw.cardBgColor || '#0B0D14';

  let rawOpacity = cc.overlayOpacity !== undefined 
    ? cc.overlayOpacity 
    : (raw.cardOverlayOpacity != null ? raw.cardOverlayOpacity : 75);

  let overlayOpacityDecimal = 0.75;
  if (typeof rawOpacity === 'number') {
    if (rawOpacity > 1) {
      overlayOpacityDecimal = rawOpacity / 100;
    } else {
      overlayOpacityDecimal = rawOpacity;
    }
  }
  const overlayOpacityPercent = Math.round(overlayOpacityDecimal * 100);

  const theme = cc.theme || raw.cardTheme || 'modern_obsidian';
  const backgroundUrl = cc.backgroundUrl !== undefined 
    ? cc.backgroundUrl 
    : ((typeof raw.cardBgImage === 'string' && raw.cardBgImage.startsWith('http')) ? raw.cardBgImage : '');

  const titleTemplate = cc.titleTemplate || raw.cardTitle || '{user} just joined the server';
  const subtitleTemplate = cc.subtitleTemplate || raw.cardSubtitle || 'Member #{count}';

  // Embed configs
  const welcomeEmbed = {
    title: raw.welcomeEmbed?.title || 'Welcome to {server}!',
    description: raw.welcomeEmbed?.description || 'Hey {user}, welcome to our server! Make sure to read the rules and have fun.',
    color: raw.welcomeEmbed?.color || '#f43f5e',
    footer: raw.welcomeEmbed?.footer || 'Uranium Welcome System'
  };

  const goodbyeEmbed = {
    title: raw.goodbyeEmbed?.title || 'Goodbye!',
    description: raw.goodbyeEmbed?.description || '**{username}** has departed from **{server}**.',
    color: raw.goodbyeEmbed?.color || '#64748b',
    footer: raw.goodbyeEmbed?.footer || 'Uranium Goodbye'
  };

  const dmEmbed = {
    title: raw.dmEmbed?.title || 'Welcome to {server}!',
    description: raw.dmEmbed?.description || 'Thank you for joining our community.',
    color: raw.dmEmbed?.color || '#f43f5e',
    footer: raw.dmEmbed?.footer || 'Uranium Welcome'
  };

  const welcomeCardConfig = {
    font,
    textColor,
    backgroundColor,
    overlayOpacity: overlayOpacityDecimal,
    theme,
    backgroundUrl,
    titleTemplate,
    subtitleTemplate
  };

  return {
    guildId: guildId || raw.guildId || '',
    captchaEnabled: Boolean(raw.captchaEnabled),

    // Unified toggle state (accessible via either name)
    enabled: isEnabled,
    active: isEnabled,

    // Welcome Channel Message
    welcomeChannelEnabled: isWelcomeChannelEnabled,
    sendWelcomeMessage: isWelcomeChannelEnabled,
    welcomeChannelId,
    channelId: welcomeChannelId,
    welcomeMessageType,
    welcomeMessage,
    message: welcomeMessage,
    welcomeCardEnabled: isWelcomeCardEnabled,
    sendWelcomeCard: isWelcomeCardEnabled,
    welcomeEmbed,

    // Card styling
    cardFont: font,
    cardTextColor: textColor,
    cardBgColor: backgroundColor,
    cardOverlayOpacity: overlayOpacityPercent,
    cardTheme: theme,
    cardBgImage: backgroundUrl || `preset_${theme}`,
    cardTitle: titleTemplate,
    cardSubtitle: subtitleTemplate,
    welcomeCardConfig,

    // DM Message
    dmEnabled: isDmEnabled,
    sendWelcomeDm: isDmEnabled,
    dmMessageType,
    welcomeDmMessageType: dmMessageType,
    dmMessage,
    welcomeDmMessage: dmMessage,
    dmCardEnabled: isDmCardEnabled,
    sendWelcomeDmCard: isDmCardEnabled,
    dmEmbed,

    // Autoroles
    autoroleEnabled: isAutoroleEnabled,
    autorolesEnabled: isAutoroleEnabled,
    autoroleIds,

    // Goodbye Message
    goodbyeEnabled: isGoodbyeEnabled,
    sendGoodbyeMessage: isGoodbyeEnabled,
    goodbyeChannelId,
    goodbyeMessageType,
    goodbyeMessage,
    goodbyeCardEnabled: isGoodbyeCardEnabled,
    sendGoodbyeCard: isGoodbyeCardEnabled,
    goodbyeEmbed,

    createdAt: raw.createdAt || Date.now(),
    updatedAt: raw.updatedAt || Date.now()
  };
}

const storage = {
  _ready: ensureSchema(),

  async getSettings(guildId) {
    if (!guildId) return normalizeSettings({}, '');
    await storage._ready;

    // Check MongoDB
    if (isMongoReady() && WelcomeConfig) {
      try {
        const doc = await WelcomeConfig.findOne({ guildId });
        if (doc) {
          const parsed = parseJson(doc.dataJson, {});
          return normalizeSettings({
            ...parsed,
            guildId,
            enabled: doc.enabled !== undefined ? doc.enabled : parsed.enabled,
            welcomeChannelId: doc.channelId || parsed.welcomeChannelId || null
          }, guildId);
        }
      } catch (err) {
        console.warn('[welcomeStorage] Mongo fetch error:', err.message);
      }
    }

    // SQLite fallback
    const row = await getAsync(`SELECT * FROM welcome_settings WHERE guildId = ?`, [guildId]);
    if (!row) {
      return normalizeSettings({}, guildId);
    }

    const dataJsonParsed = parseJson(row.data_json, {});
    return normalizeSettings({
      ...dataJsonParsed,
      guildId,
      enabled: row.enabled !== null && row.enabled !== undefined ? Number(row.enabled) === 1 : dataJsonParsed.enabled,
      channelId: row.channelId || dataJsonParsed.channelId,
      welcomeChannelId: dataJsonParsed.welcomeChannelId || row.channelId || null,
      message: row.message || dataJsonParsed.message,
      welcomeMessage: dataJsonParsed.welcomeMessage || row.message,
      dm: row.dm,
      dmEnabled: dataJsonParsed.dmEnabled !== undefined ? dataJsonParsed.dmEnabled : Number(row.dm) === 1,
      createdAt: row.createdAt || dataJsonParsed.createdAt,
      updatedAt: row.updatedAt || dataJsonParsed.updatedAt
    }, guildId);
  },

  async setConfig(guildId, updates = {}) {
    if (!guildId) return;
    await storage._ready;
    const now = Date.now();
    const current = await storage.getSettings(guildId);

    // Merge current with updates through comprehensive normalizer
    const merged = normalizeSettings({
      ...current,
      ...updates,
      welcomeCardConfig: {
        ...(current.welcomeCardConfig || {}),
        ...(updates.welcomeCardConfig || {})
      },
      welcomeEmbed: {
        ...(current.welcomeEmbed || {}),
        ...(updates.welcomeEmbed || {})
      },
      goodbyeEmbed: {
        ...(current.goodbyeEmbed || {}),
        ...(updates.goodbyeEmbed || {})
      },
      guildId,
      updatedAt: now
    }, guildId);

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
            $setOnInsert: { createdAt: current.createdAt || now }
          },
          { upsert: true }
        );
      } catch (err) {
        console.warn('[welcomeStorage] Mongo update error:', err.message);
      }
    }

    // SQLite save
    await runAsync(
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

    return merged;
  },

  async setWelcomeChannel(guildId, channelId) {
    return storage.setConfig(guildId, {
      welcomeChannelId: channelId,
      welcomeChannelEnabled: true,
      sendWelcomeMessage: true,
      enabled: true,
      active: true
    });
  },

  async removeWelcomeChannel(guildId) {
    return storage.setConfig(guildId, {
      welcomeChannelId: null,
      channelId: null,
      welcomeChannelEnabled: false,
      sendWelcomeMessage: false
    });
  },

  defaultConfig,
  normalizeSettings
};

module.exports = storage;