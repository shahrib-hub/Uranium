// src/economy/levelSystem.js — Uranium XP, Leveling & Prestige Engine
const { LEVEL, PRESTIGE } = require('./constants');
const { getStat, setStat, bumpStat } = require('../utils/economyStorage');

/** Calculate total XP needed for a given level */
function xpForLevel(level) {
  if (level <= 0) return 0;
  return LEVEL.XP_FOR(level);
}

/** Calculate level from total XP */
function levelFromXP(totalXP) {
  let lvl = 0;
  let xpNeeded = 0;
  while (lvl < LEVEL.MAX) {
    xpNeeded = xpForLevel(lvl + 1);
    if (totalXP < xpNeeded) break;
    totalXP -= xpNeeded;
    lvl++;
  }
  return { level: lvl, currentXP: totalXP, nextLevelXP: xpForLevel(lvl + 1) };
}

/** Get user's level info */
async function getUserLevel(userId) {
  const totalXP = await getStat(userId, 'xp') || 0;
  const prestige = await getStat(userId, 'prestige') || 0;
  const info = levelFromXP(totalXP);
  return { ...info, totalXP, prestige, multiplier: 1 + prestige * PRESTIGE.MULT_PER };
}

/**
 * Award XP and check for level-up
 * @returns {{ leveledUp: boolean, oldLevel: number, newLevel: number, xpGained: number }}
 */
async function addXP(userId, amount) {
  const prestige = await getStat(userId, 'prestige') || 0;
  const mult = 1 + prestige * PRESTIGE.MULT_PER;
  const adjusted = Math.floor(amount * mult);

  const oldXP = await getStat(userId, 'xp') || 0;
  const oldInfo = levelFromXP(oldXP);
  await bumpStat(userId, 'xp', adjusted);
  const newXP = oldXP + adjusted;
  const newInfo = levelFromXP(newXP);

  return {
    leveledUp: newInfo.level > oldInfo.level,
    oldLevel: oldInfo.level,
    newLevel: newInfo.level,
    xpGained: adjusted,
    currentXP: newInfo.currentXP,
    nextLevelXP: newInfo.nextLevelXP
  };
}

/** Award XP for a specific action type */
async function awardActionXP(userId, action) {
  const xpAmount = LEVEL.REWARDS[action] || 5;
  return addXP(userId, xpAmount);
}

/** Check if user can prestige */
async function canPrestige(userId) {
  const info = await getUserLevel(userId);
  if (info.level < PRESTIGE.LEVEL_REQ) return { can: false, reason: `Need level ${PRESTIGE.LEVEL_REQ} (you're ${info.level})` };
  if (info.prestige >= PRESTIGE.MAX) return { can: false, reason: `Already at max prestige (${PRESTIGE.MAX})` };
  const cost = Math.floor(PRESTIGE.BASE_COST * Math.pow(PRESTIGE.COST_SCALE, info.prestige));
  return { can: true, cost, currentPrestige: info.prestige, newPrestige: info.prestige + 1 };
}

/** Execute prestige — resets XP, bumps prestige level */
async function doPrestige(userId) {
  const check = await canPrestige(userId);
  if (!check.can) return check;
  await setStat(userId, 'xp', 0);
  await bumpStat(userId, 'prestige', 1);
  return { can: true, newPrestige: check.newPrestige, multiplier: 1 + check.newPrestige * PRESTIGE.MULT_PER };
}

module.exports = {
  xpForLevel, levelFromXP, getUserLevel, addXP,
  awardActionXP, canPrestige, doPrestige
};
