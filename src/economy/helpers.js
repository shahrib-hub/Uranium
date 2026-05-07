// src/economy/helpers.js — Uranium Economy Helpers v2.0
const {
  getBalance, addWallet, addBank, getStat, setStat,
  bumpStat, getCooldown, setCooldown
} = require('../utils/economyStorage');

const {
  BANK_BASE, BANK_GROWTH, BANK_MAX_TIER, COOLDOWNS, getStreakMultiplier
} = require('./constants');

function formatMs(ms) {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (sec && parts.length < 2) parts.push(`${sec}s`);
  return parts.join(' ') || '0s';
}

function formatCoins(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ═══════════════════════════════════════
// 🏦 BANK (Exponential Scaling)
// ═══════════════════════════════════════
async function getBankTier(userId) {
  const tier = await getStat(userId, 'bank_tier');
  return Math.min(Math.max(tier || 0, 0), BANK_MAX_TIER);
}

async function setBankTier(userId, tier) {
  const clamped = Math.min(Math.max(tier, 0), BANK_MAX_TIER);
  await setStat(userId, 'bank_tier', clamped);
  return clamped;
}

async function getBankLimit(userId) {
  const tier = await getBankTier(userId);
  // Exponential: 10000 * 1.35^tier
  return Math.floor(BANK_BASE * Math.pow(BANK_GROWTH, tier));
}

// ═══════════════════════════════════════
// ⏱️ COOLDOWNS
// ═══════════════════════════════════════
async function canUseCooldown(userId, key, now = Date.now()) {
  const last = await getCooldown(userId, key);
  if (!last) return { ok: true, remaining: 0 };
  const cdMs = COOLDOWNS[key.toUpperCase()];
  if (!cdMs) return { ok: true, remaining: 0 };
  const diff = now - last;
  if (diff >= cdMs) return { ok: true, remaining: 0 };
  return { ok: false, remaining: cdMs - diff };
}

async function setUsedCooldown(userId, key, now = Date.now()) {
  await setCooldown(userId, key, now);
}

// ═══════════════════════════════════════
// ⚛️ SAFE WALLET/BANK OPS
// ═══════════════════════════════════════
async function addWalletSafe(userId, amount) {
  await addWallet(userId, amount);
  await bumpStat(userId, amount >= 0 ? 'money_earned' : 'money_spent', Math.abs(amount));
  return getBalance(userId);
}

async function addBankSafe(userId, amount) {
  await addBank(userId, amount);
  await bumpStat(userId, amount >= 0 ? 'money_earned' : 'money_spent', Math.abs(amount));
  return getBalance(userId);
}

// ═══════════════════════════════════════
// 🔥 DAILY STREAKS
// ═══════════════════════════════════════
async function getDailyStreak(userId) {
  const streak = await getStat(userId, 'daily_streak') || 0;
  const lastDaily = await getStat(userId, 'daily_last_ts') || 0;
  return { streak, lastDaily, multiplier: getStreakMultiplier(streak) };
}

async function updateDailyStreak(userId) {
  const lastTs = await getStat(userId, 'daily_last_ts') || 0;
  const now = Date.now();
  const hoursSinceLast = (now - lastTs) / 3600000;

  if (hoursSinceLast <= 48) {
    // Within 48h = continue streak
    await bumpStat(userId, 'daily_streak', 1);
  } else {
    // Streak broken
    await setStat(userId, 'daily_streak', 1);
  }
  await setStat(userId, 'daily_last_ts', now);
  const newStreak = await getStat(userId, 'daily_streak');
  return { streak: newStreak, multiplier: getStreakMultiplier(newStreak) };
}

module.exports = {
  formatMs, formatCoins,
  getBankTier, setBankTier, getBankLimit,
  canUseCooldown, setUsedCooldown,
  addWalletSafe, addBankSafe,
  getDailyStreak, updateDailyStreak
};
