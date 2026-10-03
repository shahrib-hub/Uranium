// src/utils/starboardStorage.js
const { StarboardConfig, StarboardMessage } = require('../database/mongoose');
const { isMongoReady } = require('../database/dbUtils');

// Fast in-memory cache for starboard configuration (guildId -> { config, expiry })
const configCache = new Map();
const CACHE_TTL = 60000; // 1 minute

async function getStarboardConfig(guildId) {
  const cached = configCache.get(guildId);
  if (cached && cached.expiry > Date.now()) {
    return cached.config;
  }

  if (!isMongoReady()) {
    return null;
  }

  try {
    let doc = await StarboardConfig.findOne({ guildId }).lean();
    if (!doc) {
      doc = null;
    }
    configCache.set(guildId, { config: doc, expiry: Date.now() + CACHE_TTL });
    return doc;
  } catch (err) {
    console.error('[StarboardStorage] getStarboardConfig error:', err.message);
    return null;
  }
}

async function setStarboardConfig(guildId, data) {
  if (!isMongoReady()) return null;

  try {
    const updated = await StarboardConfig.findOneAndUpdate(
      { guildId },
      { $set: data },
      { upsert: true, new: true }
    ).lean();

    configCache.set(guildId, { config: updated, expiry: Date.now() + CACHE_TTL });
    return updated;
  } catch (err) {
    console.error('[StarboardStorage] setStarboardConfig error:', err.message);
    return null;
  }
}

async function getStarboardMessage(guildId, originalMessageId) {
  if (!isMongoReady()) return null;
  try {
    return await StarboardMessage.findOne({ guildId, originalMessageId }).lean();
  } catch (err) {
    console.error('[StarboardStorage] getStarboardMessage error:', err.message);
    return null;
  }
}

async function saveStarboardMessage(data) {
  if (!isMongoReady()) return null;
  try {
    return await StarboardMessage.findOneAndUpdate(
      { guildId: data.guildId, originalMessageId: data.originalMessageId },
      { $set: data },
      { upsert: true, new: true }
    ).lean();
  } catch (err) {
    console.error('[StarboardStorage] saveStarboardMessage error:', err.message);
    return null;
  }
}

async function removeStarboardMessage(guildId, originalMessageId) {
  if (!isMongoReady()) return false;
  try {
    await StarboardMessage.deleteOne({ guildId, originalMessageId });
    return true;
  } catch (err) {
    console.error('[StarboardStorage] removeStarboardMessage error:', err.message);
    return false;
  }
}

module.exports = {
  getStarboardConfig,
  setStarboardConfig,
  getStarboardMessage,
  saveStarboardMessage,
  removeStarboardMessage
};
