const {
  addWalletSafe,
  addBankSafe,
  canUseCooldown,
  setUsedCooldown,
  getBankTier,
  setBankTier,
  getBankLimit,
  getDailyStreak,
  updateDailyStreak
} = require('./service');

function formatMs(ms) {
  if (ms <= 0) return '0s';
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (secs && parts.length < 2) parts.push(`${secs}s`);
  return parts.join(' ') || '0s';
}

function formatCoins(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return Number(n || 0).toLocaleString();
}

module.exports = {
  formatMs,
  formatCoins,
  addWalletSafe,
  addBankSafe,
  canUseCooldown,
  setUsedCooldown,
  getBankTier,
  setBankTier,
  getBankLimit,
  getDailyStreak,
  updateDailyStreak
};
