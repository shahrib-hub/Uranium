// src/utils/automodCache.js
// In-memory sliding windows and join tracking. Lightweight and easy to clear.

const spamMap = new Map(); // guildId -> Map<userId, [timestamps]>
const joinMap = new Map(); // guildId -> [timestamps]

function ensureGuildSpam(guildId) {
  if (!spamMap.has(guildId)) spamMap.set(guildId, new Map());
  return spamMap.get(guildId);
}

function addMessageTimestamp(guildId, userId, ts = Date.now()) {
  const g = ensureGuildSpam(guildId);
  if (!g.has(userId)) g.set(userId, []);
  const arr = g.get(userId);
  arr.push(ts);
  return arr;
}

function getMessageTimestamps(guildId, userId) {
  const g = spamMap.get(guildId);
  return g ? (g.get(userId) || []) : [];
}

function pruneMessageTimestamps(guildId, windowMs) {
  const g = spamMap.get(guildId);
  if (!g) return;
  const cutoff = Date.now() - windowMs;
  for (const [userId, arr] of g) {
    const filtered = arr.filter(t => t >= cutoff);
    if (filtered.length) g.set(userId, filtered);
    else g.delete(userId);
  }
}

function addJoin(guildId, ts = Date.now()) {
  if (!joinMap.has(guildId)) joinMap.set(guildId, []);
  joinMap.get(guildId).push(ts);
}

function getRecentJoins(guildId, windowMs) {
  const arr = joinMap.get(guildId) || [];
  const cutoff = Date.now() - windowMs;
  return arr.filter(t => t >= cutoff);
}

function pruneJoins(windowMs = 60_000 * 60) {
  const cutoff = Date.now() - windowMs;
  for (const [guildId, arr] of joinMap) {
    const filtered = arr.filter(t => t >= cutoff);
    if (filtered.length) joinMap.set(guildId, filtered);
    else joinMap.delete(guildId);
  }
}

function clearJoins(guildId) {
  joinMap.delete(guildId);
}

// periodic cleanup every 10s
setInterval(() => {
  pruneJoins(1000 * 60 * 60); // keep joins for 1 hr max
  // prune message timestamps for all guilds using a conservative window (e.g., 10 min)
  for (const guildId of spamMap.keys()) {
    pruneMessageTimestamps(guildId, 1000 * 60 * 10);
  }
}, 10_000);

module.exports = {
  addMessageTimestamp,
  getMessageTimestamps,
  pruneMessageTimestamps,
  addJoin,
  getRecentJoins,
  pruneJoins,
  clearJoins
};