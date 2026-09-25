// src/utils/pluginStorage.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { isMongoReady } = require('../database/dbUtils');
const mongoose = require('mongoose');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'plugins.db');
const db = new sqlite3.Database(dbPath);

// In-memory cache for ultra-fast check during command dispatch: guildId -> { [pluginId]: boolean }
const cache = new Map();

// Plugin Registry Definition
const PLUGIN_REGISTRY = [
  {
    id: 'welcome',
    name: 'Welcome & Goodbye',
    category: 'Essentials',
    description: 'Custom canvas welcome cards, greetings, autoroles, and goodbye notices.',
    icon: 'UserPlus',
    href: '/dashboard/welcome',
    hasDedicatedPage: true,
    commands: ['welcome', 'goodbye', 'autorole']
  },
  {
    id: 'ranking',
    name: 'Levels & Ranking',
    category: 'Essentials',
    description: 'Server XP progression, customizable rank cards, level-up alerts, and role rewards.',
    icon: 'Trophy',
    href: '/dashboard/ranking',
    hasDedicatedPage: true,
    commands: ['rank', 'leaderboard', 'xp']
  },
  {
    id: 'logging',
    name: 'Server Logging',
    category: 'Server Management',
    description: 'Audit trail for message edits/deletions, member joins/leaves, role changes, and webhooks.',
    icon: 'FileText',
    href: '/dashboard/logging',
    hasDedicatedPage: true,
    commands: ['log', 'logs', 'logging']
  },
  {
    id: 'customcommands',
    name: 'Custom Commands',
    category: 'Server Management',
    description: 'Create custom bot commands with automated embed responses, random choices, and permission rules.',
    icon: 'Terminal',
    href: '/dashboard/customcommands',
    hasDedicatedPage: true,
    commands: ['customcommand']
  },
  {
    id: 'autoresponse',
    name: 'Auto Responses',
    category: 'Server Management',
    description: 'Automatically reply to specific triggers, keywords, or phrases sent in server chat.',
    icon: 'MessageSquare',
    href: '/dashboard/customcommands',
    hasDedicatedPage: true,
    commands: ['autoresponse']
  },
  {
    id: 'family',
    name: 'Family System',
    category: 'Social & Engagement',
    description: 'Interactive marriage, adoption, family trees, and partnership interactions.',
    icon: 'HeartHandshake',
    href: null, // "FAMILY SYSTEM - toggle settings only no sidebar only plugins section"
    hasDedicatedPage: false,
    commands: ['family']
  },
  {
    id: 'moderation',
    name: 'Moderator & AutoMod',
    category: 'Server Management',
    description: 'Anti-raid, anti-spam, link purges, user warnings, and strike system.',
    icon: 'ShieldAlert',
    href: '/dashboard/moderation',
    hasDedicatedPage: true,
    commands: ['ban', 'kick', 'timeout', 'warn', 'warnings', 'clearwarn', 'purge', 'lock', 'unlock', 'slowmode', 'automod', 'antilink', 'antispam', 'antighost']
  },
  {
    id: 'verification',
    name: 'Server Verification',
    category: 'Server Management',
    description: 'Gatekeeper system with one-click, captcha, and 2FA OTP security.',
    icon: 'ShieldCheck',
    href: '/dashboard/verification',
    hasDedicatedPage: true,
    commands: ['verify', 'verification']
  },
  {
    id: 'rr',
    name: 'Reaction Roles',
    category: 'Essentials',
    description: 'Interactive role self-assignment buttons and dropdown menus.',
    icon: 'Users',
    href: '/dashboard/rr',
    hasDedicatedPage: true,
    commands: ['reactionrole', 'rr']
  },
  {
    id: 'giveaways',
    name: 'Giveaways',
    category: 'Essentials',
    description: 'Role-gated giveaways with real-time countdowns and automatic rerolls.',
    icon: 'Gift',
    href: '/dashboard/giveaways',
    hasDedicatedPage: true,
    commands: ['giveaway', 'gstart', 'gend', 'greroll']
  },
  {
    id: 'music',
    name: 'Music & Audio Studio',
    category: 'Utilities',
    description: 'Lossless 320kbps audio streaming with BassBoost and sound filters.',
    icon: 'Music2',
    href: '/dashboard/music',
    hasDedicatedPage: true,
    commands: ['play', 'pause', 'skip', 'stop', 'queue', 'nowplaying', 'volume', 'filter', 'lyrics']
  },
  {
    id: 'games',
    name: 'Mini-Games & Casino',
    category: 'Social & Engagement',
    description: 'Engaging mini-games like dice rolls, slot machines, coin flip, and trivia.',
    icon: 'Gamepad2',
    href: null,
    hasDedicatedPage: false,
    commands: ['dice', 'slots', 'coinflip', 'rps', 'tictactoe', 'trivia', 'connect4']
  },
  {
    id: 'economy',
    name: 'Economy System',
    category: 'Social & Engagement',
    description: 'Server currency, daily rewards, work, rob, bank, and customizable store.',
    icon: 'Coins',
    href: null,
    hasDedicatedPage: false,
    commands: ['balance', 'bal', 'pay', 'work', 'daily', 'shop', 'buy', 'inventory', 'rob', 'deposit', 'withdraw']
  },
  {
    id: 'ai',
    name: 'AI Assistance',
    category: 'Utilities',
    description: 'Next-generation AI chat, image generation, and summarization.',
    icon: 'Sparkles',
    href: null,
    hasDedicatedPage: false,
    commands: ['ai', 'ask', 'imagine', 'summarize']
  }
];

// Map command name (lowercase) to pluginId for lightning lookup
const commandToPluginMap = new Map();
for (const p of PLUGIN_REGISTRY) {
  for (const cmd of p.commands) {
    commandToPluginMap.set(cmd.toLowerCase(), p.id);
  }
}

// Database schema
let initPromise = null;
function init() {
  if (initPromise) return initPromise;
  initPromise = new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS guild_plugins (
        guild_id TEXT,
        plugin_id TEXT,
        enabled INTEGER DEFAULT 1,
        settings TEXT DEFAULT '{}',
        updated_at INTEGER,
        PRIMARY KEY (guild_id, plugin_id)
      )`,
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
  return initPromise;
}

// MongoDB schema if enabled
let MongoPluginModel = null;
function getMongoModel() {
  if (!isMongoReady()) return null;
  if (!MongoPluginModel) {
    const schema = new mongoose.Schema({
      guildId: { type: String, required: true },
      pluginId: { type: String, required: true },
      enabled: { type: Boolean, default: true },
      settings: { type: Object, default: {} },
      updatedAt: { type: Date, default: Date.now }
    });
    schema.index({ guildId: 1, pluginId: 1 }, { unique: true });
    MongoPluginModel = mongoose.models.GuildPlugin || mongoose.model('GuildPlugin', schema);
  }
  return MongoPluginModel;
}

/**
 * Check if a plugin is enabled for a guild (Defaults to TRUE)
 */
async function isPluginEnabled(guildId, pluginId) {
  if (!guildId || !pluginId) return true;

  // Check cache
  const guildCache = cache.get(guildId);
  if (guildCache && guildCache[pluginId] !== undefined) {
    return guildCache[pluginId];
  }

  // Fetch from Mongo if ready
  const Model = getMongoModel();
  if (Model) {
    try {
      const doc = await Model.findOne({ guildId, pluginId });
      const enabled = doc ? doc.enabled : true;
      if (!cache.has(guildId)) cache.set(guildId, {});
      cache.get(guildId)[pluginId] = enabled;
      return enabled;
    } catch {}
  }

  // SQLite fallback
  await init();
  return new Promise((resolve) => {
    db.get(
      `SELECT enabled FROM guild_plugins WHERE guild_id = ? AND plugin_id = ?`,
      [guildId, pluginId],
      (err, row) => {
        const enabled = row ? row.enabled === 1 : true;
        if (!cache.has(guildId)) cache.set(guildId, {});
        cache.get(guildId)[pluginId] = enabled;
        resolve(enabled);
      }
    );
  });
}

/**
 * Enable or disable a plugin
 */
async function setPluginEnabled(guildId, pluginId, enabled, settings = null) {
  if (!guildId || !pluginId) return;

  const isEnabled = !!enabled;

  // Update in-memory cache
  if (!cache.has(guildId)) cache.set(guildId, {});
  cache.get(guildId)[pluginId] = isEnabled;

  const now = Date.now();

  const Model = getMongoModel();
  if (Model) {
    try {
      const updateData = { enabled: isEnabled, updatedAt: new Date() };
      if (settings !== null) updateData.settings = settings;
      await Model.findOneAndUpdate(
        { guildId, pluginId },
        { $set: updateData },
        { upsert: true }
      );
    } catch (err) {
      console.warn('[PluginStorage] Mongo save failed:', err.message);
    }
  }

  await init();
  return new Promise((resolve, reject) => {
    const settingsJson = settings !== null ? JSON.stringify(settings) : '{}';
    db.run(
      `INSERT INTO guild_plugins (guild_id, plugin_id, enabled, settings, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(guild_id, plugin_id) DO UPDATE SET
         enabled = excluded.enabled,
         settings = CASE WHEN excluded.settings != '{}' THEN excluded.settings ELSE guild_plugins.settings END,
         updated_at = excluded.updated_at`,
      [guildId, pluginId, isEnabled ? 1 : 0, settingsJson, now],
      (err) => {
        if (err) return reject(err);
        resolve(isEnabled);
      }
    );
  });
}

/**
 * Get all plugins for a guild with active state and metadata
 */
async function getGuildPlugins(guildId) {
  await init();

  // Load configured states from SQLite
  const rows = await new Promise((resolve) => {
    db.all(
      `SELECT plugin_id, enabled, settings FROM guild_plugins WHERE guild_id = ?`,
      [guildId],
      (err, rows) => resolve(rows || [])
    );
  });

  const stateMap = {};
  for (const r of rows) {
    stateMap[r.plugin_id] = {
      enabled: r.enabled === 1,
      settings: (() => {
        try { return JSON.parse(r.settings || '{}'); } catch { return {}; }
      })()
    };
  }

  // Update cache
  if (!cache.has(guildId)) cache.set(guildId, {});
  const gCache = cache.get(guildId);

  return PLUGIN_REGISTRY.map((plugin) => {
    const state = stateMap[plugin.id];
    const enabled = state ? state.enabled : true;
    gCache[plugin.id] = enabled;

    return {
      ...plugin,
      enabled,
      settings: state ? state.settings : {}
    };
  });
}

/**
 * Map a command name to its plugin ID
 */
function getPluginForCommand(commandName) {
  if (!commandName) return null;
  return commandToPluginMap.get(commandName.toLowerCase()) || null;
}

/**
 * Get plugin metadata by ID
 */
function getPluginInfo(pluginId) {
  return PLUGIN_REGISTRY.find(p => p.id === pluginId) || null;
}

module.exports = {
  PLUGIN_REGISTRY,
  isPluginEnabled,
  setPluginEnabled,
  getGuildPlugins,
  getPluginForCommand,
  getPluginInfo
};
