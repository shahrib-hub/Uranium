const fs = require('fs');
const path = require('path');

// Paths to separate data files
const guildsPath = path.join(__dirname, '..', 'data', 'premiumGuilds.json');
const usersPath = path.join(__dirname, '..', 'data', 'premiumUsers.json');
const codesPath = path.join(__dirname, '..', 'data', 'premiumCodes.json');

// Utility: Load and save JSON
function load(filePath) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '{}');
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function save(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Utility: Parse duration like "1d 5h 10s"
function parseDuration(input) {
  const regex = /(\d+)([smhdwy])/g;
  let ms = 0;
  let match;
  while ((match = regex.exec(input)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's': ms += value * 1000; break;
      case 'm': ms += value * 60000; break;
      case 'h': ms += value * 3600000; break;
      case 'd': ms += value * 86400000; break;
      case 'w': ms += value * 604800000; break;
      case 'y': ms += value * 31536000000; break;
    }
  }
  return ms;
}

// ✅ Premium Checks
function isPremiumGuild(guildId) {
  const guilds = load(guildsPath);
  const entry = guilds[guildId];
  return entry && new Date(entry.expiresAt) > new Date();
}

function isPremiumUser(userId) {
  const users = load(usersPath);
  const entry = users[userId];
  return entry && new Date(entry.expiresAt) > new Date();
}

// ✅ Add/Remove Premium
function addPremiumGuild(guildId, addedBy, expiresAt) {
  const guilds = load(guildsPath);
  guilds[guildId] = {
    addedBy,
    addedAt: new Date().toISOString(),
    expiresAt
  };
  save(guildsPath, guilds);
}

function removePremiumGuild(guildId) {
  const guilds = load(guildsPath);
  delete guilds[guildId];
  save(guildsPath, guilds);
}

function addPremiumUser(userId, addedBy, expiresAt) {
  const users = load(usersPath);
  users[userId] = {
    addedBy,
    addedAt: new Date().toISOString(),
    expiresAt
  };
  save(usersPath, users);
}

function removePremiumUser(userId) {
  const users = load(usersPath);
  delete users[userId];
  save(usersPath, users);
}

// ✅ Code Management
function generateCode(code, createdBy, durationStr, uses) {
  const codes = load(codesPath);
  const ms = parseDuration(durationStr);
  const validUntil = new Date(Date.now() + ms).toISOString();

  codes[code] = {
    createdBy,
    validUntil,
    usesLeft: uses
  };

  save(codesPath, codes);
}

function redeemCode(rawCode, guildId, userId) {
  const codes = load(codesPath);
  const guilds = load(guildsPath);
  const users = load(usersPath);

  const query = String(rawCode || '').trim().toLowerCase();
  if (!query) return { success: false, reason: 'Invalid code.' };

  const matchedKey = Object.keys(codes).find(k => k.trim().toLowerCase() === query);
  if (!matchedKey) return { success: false, reason: 'Invalid code.' };

  const entry = codes[matchedKey];
  if (!entry) return { success: false, reason: 'Invalid code.' };
  if (new Date(entry.validUntil) < new Date()) return { success: false, reason: 'Code expired.' };
  if (entry.usesLeft <= 0) return { success: false, reason: 'Code has no uses left.' };

  const expiresAt = entry.validUntil;

  guilds[guildId] = {
    addedBy: userId,
    addedAt: new Date().toISOString(),
    expiresAt
  };

  users[userId] = {
    addedBy: userId,
    addedAt: new Date().toISOString(),
    expiresAt
  };

  entry.usesLeft -= 1;
  if (entry.usesLeft <= 0) delete codes[matchedKey];

  save(guildsPath, guilds);
  save(usersPath, users);
  save(codesPath, codes);

  return { success: true, expiresAt };
}

function deleteCode(rawCode) {
  const codes = load(codesPath);
  const query = String(rawCode || '').trim().toLowerCase();
  const matchedKey = Object.keys(codes).find(k => k.trim().toLowerCase() === query);
  if (matchedKey) {
    delete codes[matchedKey];
    save(codesPath, codes);
  }
}

// ✅ Listing
function listPremiumGuilds() {
  return load(guildsPath);
}

function listPremiumUsers() {
  return load(usersPath);
}

function listCodes() {
  return load(codesPath);
}

module.exports = {
  isPremiumGuild,
  isPremiumUser,
  addPremiumGuild,
  removePremiumGuild,
  addPremiumUser,
  removePremiumUser,
  generateCode,
  redeemCode,
  deleteCode,
  listPremiumGuilds,
  listPremiumUsers,
  listCodes,
  parseDuration
};
