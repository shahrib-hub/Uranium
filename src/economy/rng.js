// src/economy/rng.js — Uranium RNG Engine
const { RARITIES, RANDOM_EVENT_CHANCE, RANDOM_EVENTS } = require('./constants');

/**
 * Random integer between min and max (inclusive)
 */
function rollRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns true with given probability (0-1)
 */
function rollChance(probability) {
  return Math.random() < probability;
}

/**
 * Weighted random selection from array of { weight, ...data }
 * @param {Array} table - Array of objects with 'weight' property
 * @returns {Object} Selected item
 */
function weightedRandom(table) {
  const totalWeight = table.reduce((sum, item) => sum + (item.weight || 1), 0);
  let roll = Math.random() * totalWeight;
  for (const item of table) {
    roll -= (item.weight || 1);
    if (roll <= 0) return item;
  }
  return table[table.length - 1];
}

/**
 * Pick random element from array
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Roll a rarity tier based on global weights
 * @returns {string} Rarity key (common, uncommon, rare, epic, legendary, mythic)
 */
function rollRarity() {
  const table = Object.entries(RARITIES).map(([key, val]) => ({
    key, weight: val.weight
  }));
  return weightedRandom(table).key;
}

/**
 * Filter items by rarity and pick one randomly
 * @param {Array} items - Items with 'rarity' property
 * @param {string} [forcedRarity] - Force a specific rarity tier
 */
function rollFromTable(items, forcedRarity) {
  const rarity = forcedRarity || rollRarity();
  const pool = items.filter(i => i.rarity === rarity);
  if (!pool.length) {
    // Fallback to common if no items of that rarity exist
    const fallback = items.filter(i => i.rarity === 'common');
    return fallback.length ? pickRandom(fallback) : pickRandom(items);
  }
  return pickRandom(pool);
}

/**
 * Check if a random event should trigger and return it
 * @returns {Object|null} Event object or null
 */
function rollRandomEvent() {
  if (!rollChance(RANDOM_EVENT_CHANCE)) return null;
  const event = pickRandom(RANDOM_EVENTS);
  const Atoms = rollRange(
    Math.min(event.coins[0], event.coins[1]),
    Math.max(event.coins[0], event.coins[1])
  );
  return { text: event.text, Atoms };
}

/**
 * Simulate an adventure outcome
 * @param {Object} zone - Zone config from constants
 * @returns {Object} { outcome, Atoms, xp, loot }
 */
function rollAdventure(zone) {
  const outcomes = [
    { type: 'treasure', text: 'You discovered a hidden treasure chest!', emoji: '⚛️', mult: 1.5 },
    { type: 'monster', text: 'You defeated a fearsome monster!', emoji: '⚔️', mult: 1.2 },
    { type: 'explore', text: 'You explored uncharted territory!', emoji: '🗺️', mult: 1.0 },
    { type: 'trap', text: 'You fell into a trap but escaped!', emoji: '🪤', mult: 0.5 },
    { type: 'ambush', text: 'You were ambushed by bandits!', emoji: '💀', mult: 0.3 },
    { type: 'secret', text: 'You found a secret room full of riches!', emoji: '🔮', mult: 2.0 },
    { type: 'boss', text: 'You slew the zone boss!', emoji: '👑', mult: 2.5 },
    { type: 'nothing', text: 'The adventure was uneventful.', emoji: '😐', mult: 0.7 }
  ];

  // Weighted: good outcomes more likely
  const weights = [20, 20, 25, 12, 8, 5, 3, 7];
  const totalW = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * totalW;
  let outcome = outcomes[outcomes.length - 1];
  for (let i = 0; i < outcomes.length; i++) {
    r -= weights[i];
    if (r <= 0) { outcome = outcomes[i]; break; }
  }

  const baseCoin = rollRange(zone.Atoms[0], zone.Atoms[1]);
  const Atoms = Math.floor(baseCoin * outcome.mult);
  const xp = Math.floor(zone.xp * outcome.mult);
  const foundRare = rollChance(zone.rareChance * (outcome.mult > 1 ? 1.5 : 0.5));

  return {
    outcome: outcome.type,
    text: outcome.text,
    emoji: outcome.emoji,
    Atoms, xp, foundRare
  };
}

/**
 * Create a progress bar string
 * @param {number} current
 * @param {number} total
 * @param {number} [length=10]
 * @returns {string}
 */
function progressBar(current, total, length = 10) {
  const pct = Math.min(current / total, 1);
  const filled = Math.round(pct * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.floor(pct * 100)}%`;
}

module.exports = {
  rollRange, rollChance, weightedRandom, pickRandom,
  rollRarity, rollFromTable, rollRandomEvent, rollAdventure,
  progressBar
};
