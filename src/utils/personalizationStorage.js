const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const storagePath = path.join(dataDir, 'bot_personalization.json');

function ensureFile() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(storagePath)) {
      fs.writeFileSync(storagePath, '{}', 'utf8');
    }
  } catch (err) {
    console.error('[PersonalizationStorage] Failed to ensure storage file:', err.message);
  }
}

function loadAll() {
  ensureFile();
  try {
    const raw = fs.readFileSync(storagePath, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    console.error('[PersonalizationStorage] Failed to read storage:', err.message);
    return {};
  }
}

function saveAll(data) {
  ensureFile();
  try {
    fs.writeFileSync(storagePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[PersonalizationStorage] Failed to save storage:', err.message);
    return false;
  }
}

function getPersonalization(guildId) {
  if (!guildId) return getDefaultPersonalization();
  const all = loadAll();
  const entry = all[guildId] || {};
  return {
    nickname: entry.nickname || '',
    avatarUrl: entry.avatarUrl || '',
    bannerUrl: entry.bannerUrl || '',
    bio: entry.bio || '',
    updatedAt: entry.updatedAt || null
  };
}

function setPersonalization(guildId, data = {}) {
  if (!guildId) return null;
  const all = loadAll();
  const current = all[guildId] || {};
  const updated = {
    ...current,
    nickname: typeof data.nickname === 'string' ? data.nickname.trim() : (current.nickname || ''),
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl.trim() : (current.avatarUrl || ''),
    bannerUrl: typeof data.bannerUrl === 'string' ? data.bannerUrl.trim() : (current.bannerUrl || ''),
    bio: typeof data.bio === 'string' ? data.bio.trim() : (current.bio || ''),
    updatedAt: new Date().toISOString()
  };

  all[guildId] = updated;
  saveAll(all);
  return updated;
}

function getDefaultPersonalization() {
  return {
    nickname: '',
    avatarUrl: '',
    bannerUrl: '',
    bio: '',
    updatedAt: null
  };
}

module.exports = {
  getPersonalization,
  setPersonalization,
  getDefaultPersonalization
};
