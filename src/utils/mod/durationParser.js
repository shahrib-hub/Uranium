// src/utils/mod/durationParser.js
const ms = require('ms');

function parseDuration(input) {
  if (!input || typeof input !== 'string') return null;

  try {
    const normalized = input.replace(/\s+/g, '');
    const durationMs = ms(normalized);
    if (!durationMs || durationMs < 1000) return null;
    return durationMs;
  } catch {
    return null;
  }
}

function formatDuration(msValue) {
  if (!msValue || typeof msValue !== 'number') return 'Unknown';

  const seconds = Math.floor(msValue / 1000);
  const parts = [];

  const units = [
    { label: 'w', value: 604800 },
    { label: 'd', value: 86400 },
    { label: 'h', value: 3600 },
    { label: 'm', value: 60 },
    { label: 's', value: 1 }
  ];

  let remaining = seconds;
  for (const { label, value } of units) {
    const amount = Math.floor(remaining / value);
    if (amount > 0) {
      parts.push(`${amount}${label}`);
      remaining %= value;
    }
  }

  return parts.join(' ');
}

module.exports = { parseDuration, formatDuration };