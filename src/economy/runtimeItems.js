const { getAllItems, findItem: baseFindItem } = require('./items');
const { RARITIES } = require('./constants');

const ITEM_RUNTIME_OVERRIDES = {
  boost_earn_2x: { usable: true, data: { key: 'all', multiplier: 2, durationMs: 1800000 } },
  boost_work_mega: { usable: true },
  boost_work_large: { usable: true },
  boost_work_small: { usable: true },
  boost_work_tiny: { usable: true },
  boost_daily: { usable: true, data: { effect: 'daily_double' } },
  boost_fish: { usable: true },
  boost_adventure: { usable: true },
  boost_xp: { usable: true, data: { key: 'xp', multiplier: 1.5, durationMs: 3600000 } },
  boost_xp_small: { usable: true },
  boost_xp_huge: { usable: true },
  boost_luck: { usable: true, data: { key: 'luck', multiplier: 1.15, durationMs: 3600000 } },
  boost_luck_small: { usable: true },
  boost_crime: { usable: true },
  boost_hunt_small: { usable: true },
  boost_hunt_yield: { usable: true },
  boost_gamble_luck: { usable: true, data: { key: 'gamble', multiplier: 1.2, durationMs: 3600000 } },
  boost_quest_xp: { usable: true, data: { key: 'quest', multiplier: 2, durationMs: 7200000 } },
  boost_fish_speed: { usable: true },
  boost_all_2x: { usable: true, data: { key: 'all', multiplier: 2, durationMs: 3600000 } },
  crate_common: { usable: true },
  crate_rare: { usable: true },
  crate_epic: { usable: true },
  crate_legendary: { usable: true },
  crate_mythic: { usable: true },
  prot_padlock: { usable: true },
  prot_landmine: { usable: true },
  prot_shield: { usable: true },
  prot_alarm: { usable: true },
  prot_guard_dog: { usable: true },
  prot_laser: { usable: true },
  prot_guard: { usable: true },
  prot_bunker: { usable: true },
  prot_cloak: { usable: true },
  prot_safe: { usable: true },
  prot_safe_box: { usable: true },
  con_energy: { usable: true },
  con_potion: { usable: true },
  con_banknote: { usable: true },
  con_reroll: { usable: true },
  con_multitool: { usable: true },
  con_energy_bar: { usable: true, data: { effect: 'reduce_cooldown', target: 'WORK', ms: 300000 } },
  con_luck_dice: { usable: true, data: { effect: 'gamble_buff', chanceBonus: 0.2, uses: 1 } },
  con_medkit: { usable: true, data: { effect: 'heal_fine' } },
  con_fix_kit: { usable: true, data: { effect: 'repair', amount: 50 } },
  con_smoke_bomb: { usable: true, data: { effect: 'adventure_escape', uses: 1 } },
  con_xp_vial: { usable: true, data: { effect: 'add_xp', amount: 5000 } },
  con_net_heavy: { usable: true, data: { effect: 'hunt_rarity', guaranteedRarity: 'legendary', uses: 1 } },
  prot_mask: { usable: true, data: { key: 'crime', multiplier: 1.2, durationMs: 3600000 } },
  con_bait_mega: { usable: true, data: { effect: 'fish_rarity', guaranteedRarity: 'rare', uses: 1 } },
  veh_bicycle: { usable: true, data: { speed: 1.05 } },
  veh_scooter: { usable: true, data: { speed: 1.12 } },
  veh_moto: { usable: true, data: { speed: 1.2, passive: 'crime', boost: 0.05 } },
  veh_atv: { usable: true, data: { speed: 1.25, passive: 'explore', boost: 0.08 } },
  veh_sedan: { usable: true, data: { speed: 1.35 } },
  veh_truck: { usable: true, data: { speed: 1.45, passive: 'scavenge', boost: 0.08 } },
  veh_sports: { usable: true, data: { speed: 1.6 } },
  veh_limo: { usable: true, data: { speed: 1.75, passive: 'work', boost: 0.06 } },
  veh_car: { usable: true },
  veh_super: { usable: true, data: { speed: 1.9 } },
  veh_sports_car: { usable: true },
  veh_hyper: { usable: true, data: { speed: 2.3, passive: 'all', boost: 0.05 } },
  veh_heli: { usable: true },
  veh_jet: { usable: true, data: { speed: 4, passive: 'bounty', boost: 0.15 } },
  veh_yacht: { usable: true, data: { speed: 2.5, passive: 'fish', boost: 0.15 } },
  veh_sub: { usable: true, data: { speed: 2.8, passive: 'fish', boost: 0.2 } },
  veh_space: { usable: true, data: { speed: 4.5, passive: 'adventure', boost: 0.2 } },
  veh_uranium: { usable: true, data: { speed: 5, passive: 'all', boost: 0.12 } },
  pet_hamster: { usable: true, data: { passive: 'beg', boost: 0.03 } },
  pet_fish: { usable: true, data: { passive: 'luck', boost: 0.04 } },
  pet_rabbit: { usable: true, data: { passive: 'search', boost: 0.04 } },
  pet_cat: { usable: true, data: { passive: 'luck', boost: 0.05 } },
  pet_dog: { usable: true, data: { passive: 'hunt', boost: 0.05 } },
  pet_fox: { usable: true, data: { passive: 'crime', boost: 0.06 } },
  pet_bird: { usable: true },
  pet_owl: { usable: true, data: { passive: 'xp', boost: 0.08 } },
  pet_eagle: { usable: true, data: { passive: 'hunt', boost: 0.1 } },
  pet_monkey: { usable: true },
  pet_tiger: { usable: true, data: { passive: 'hunt', boost: 0.12 } },
  pet_wolf: { usable: true, data: { passive: 'hunt', boost: 0.14 } },
  pet_griffin: { usable: true, data: { passive: 'adventure', boost: 0.15 } },
  pet_dragon: { usable: true, data: { passive: 'all', boost: 0.1 } },
  pet_phoenix: { usable: true, data: { passive: 'xp', boost: 0.15 } },
  pet_cyber: { usable: true, data: { passive: 'hack', boost: 0.12 } },
  pet_uranium: { usable: true, data: { passive: 'all', boost: 0.18 } },
  prot_decoy: { usable: true, data: { blocks: 1, counter_pct: 0.05 } },
  prot_jammer: { usable: true, data: { robPenalty: 0.5, durationMs: 86400000 } },
  prot_vault: { usable: true, data: { stash_limit: 1000000 } },
  prot_satellite: { usable: true, data: { blocks: 2, durationMs: 86400000 } },
  prot_cloak: { usable: true, data: { durationMs: 604800000 } }
};

const CRATE_RARITY_POOLS = {
  common: ['common', 'uncommon'],
  rare: ['uncommon', 'rare'],
  epic: ['rare', 'epic'],
  legendary: ['epic', 'legendary'],
  mythic: ['legendary', 'mythic']
};

function mergeData(base = {}, patch = {}) {
  return { ...(base || {}), ...(patch || {}) };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resolveRuntimeItem(itemOrId) {
  const item = typeof itemOrId === 'string' ? baseFindItem(itemOrId) : itemOrId;
  if (!item) return null;

  const override = ITEM_RUNTIME_OVERRIDES[item.id] || {};
  const merged = {
    ...clone(item),
    ...override,
    data: mergeData(item.data, override.data)
  };

  if (merged.type === 'lootbox' && merged.usable === undefined) merged.usable = true;
  if (merged.type === 'booster' && merged.usable === undefined) merged.usable = true;
  if (['pet', 'vehicle', 'protection', 'badge', 'frame', 'title', 'color'].includes(merged.type) && merged.usable === undefined) {
    merged.usable = true;
  }
  if (merged.stackable === undefined) merged.stackable = merged.type !== 'tool' && merged.type !== 'vehicle' && merged.type !== 'pet' && merged.type !== 'bank_upgrade';
  return merged;
}

function getRuntimeItem(itemId) {
  return resolveRuntimeItem(itemId);
}

function getAllRuntimeItems() {
  return getAllItems().map(resolveRuntimeItem);
}

function getCrateRewardPool(tier) {
  const rarities = CRATE_RARITY_POOLS[tier] || ['common'];
  return getAllRuntimeItems().filter((item) => {
    if (item.type === 'lootbox') return false;
    if (item.price <= 0 && !item.sellPrice) return false;
    return rarities.includes(item.rarity);
  });
}

function getCrateRewardSpec(item) {
  const tier = item?.data?.tier || 'common';
  const rarityPool = CRATE_RARITY_POOLS[tier] || ['common'];
  const pool = getCrateRewardPool(tier);
  const itemCount = tier === 'common' ? 1 : tier === 'rare' ? 1 : tier === 'epic' ? 2 : tier === 'legendary' ? 2 : 3;
  const AtomsRange = item?.data?.Atoms || [500, 2000];
  return { tier, rarityPool, itemCount, AtomsRange, pool };
}

function validateRuntimeItems() {
  const issues = [];
  for (const item of getAllRuntimeItems()) {
    if (!item.id || !item.name || !item.type || !item.category) {
      issues.push({ id: item.id || '(missing)', issue: 'missing required identity fields' });
    }

    if (item.levelReq < 0) issues.push({ id: item.id, issue: 'negative level requirement' });
    if (item.sellPrice < 0) issues.push({ id: item.id, issue: 'negative sell price' });
    if (!RARITIES[item.rarity]) issues.push({ id: item.id, issue: `unknown rarity ${item.rarity}` });

    if (item.type === 'tool' && !item.data?.slot) issues.push({ id: item.id, issue: 'tool missing slot' });
    if (item.type === 'tool' && !item.data?.durability) issues.push({ id: item.id, issue: 'tool missing durability' });

    if (item.type === 'booster' && !item.data?.key) issues.push({ id: item.id, issue: 'booster missing effect key' });
    if (item.type === 'booster' && !item.data?.multiplier) issues.push({ id: item.id, issue: 'booster missing multiplier' });
    if (item.type === 'booster' && !item.data?.durationMs) issues.push({ id: item.id, issue: 'booster missing duration' });

    if (item.type === 'lootbox' && !item.data?.tier) issues.push({ id: item.id, issue: 'crate missing tier' });
    if (item.type === 'consumable' && item.data?.effect === 'add_xp' && !item.data?.amount) issues.push({ id: item.id, issue: 'xp consumable missing amount' });
  }
  return issues;
}

module.exports = {
  ITEM_RUNTIME_OVERRIDES,
  resolveRuntimeItem,
  getRuntimeItem,
  getAllRuntimeItems,
  getCrateRewardPool,
  getCrateRewardSpec,
  validateRuntimeItems
};
