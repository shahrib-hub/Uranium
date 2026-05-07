// src/economy/questEngine.js
const { getStat, setStat } = require('../utils/economyStorage');
const { QUEST_TEMPLATES } = require('./constants');
const { rollRange } = require('./rng');

// 3 days in milliseconds
const REFRESH_INTERVAL = 3 * 24 * 60 * 60 * 1000;

/**
 * Gets the active quests for a user.
 * If 3 days have passed since last refresh, or if they have no quests, generates 5 new ones.
 */
async function getActiveQuests(userId) {
  let lastRefresh = await getStat(userId, 'quest_last_refresh') || 0;
  let activeIds = await getStat(userId, 'quest_active_ids') || [];

  const now = Date.now();
  if (!activeIds.length || (now - lastRefresh) > REFRESH_INTERVAL) {
    activeIds = await refreshQuests(userId, now);
  }

  // Map IDs to template objects
  return activeIds.map(id => QUEST_TEMPLATES.find(q => q.id === id)).filter(Boolean);
}

/**
 * Forces a refresh of the user's active quests.
 */
async function refreshQuests(userId, timestamp = Date.now()) {
  // Clear old claimed status
  const oldIds = await getStat(userId, 'quest_active_ids') || [];
  for (const id of oldIds) {
    await setStat(userId, `quest_claimed_${id}`, 0);
  }

  // Pick 5 random quests
  const shuffled = [...QUEST_TEMPLATES].sort(() => 0.5 - Math.random());
  const newQuests = shuffled.slice(0, 5).map(q => q.id);

  // Save state
  await setStat(userId, 'quest_active_ids', newQuests);
  await setStat(userId, 'quest_last_refresh', timestamp);

  return newQuests;
}

/**
 * Checks time until next free refresh.
 */
async function getQuestRefreshTime(userId) {
  const lastRefresh = await getStat(userId, 'quest_last_refresh') || 0;
  const nextRefresh = lastRefresh + REFRESH_INTERVAL;
  return Math.max(0, nextRefresh - Date.now());
}

module.exports = {
  getActiveQuests,
  refreshQuests,
  getQuestRefreshTime
};
