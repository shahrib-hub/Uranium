const {
  addWallet,
  addBank,
  getBalance,
  getStat,
  setStat,
  bumpStat,
  getCooldown,
  setCooldown,
  getInventory,
  getInventorySnapshot,
  getInventoryItemCount,
  addInventoryItem,
  consumeInventoryItem,
  createItemInstance,
  getItemInstances,
  getItemInstance,
  updateItemInstance,
  deleteItemInstance,
  getLoadout,
  setLoadout,
  clearLoadout,
  getActiveEffects,
  createEffect,
  updateEffect,
  deleteEffect,
  clearExpiredEffects,
  getQuestState,
  setQuestState,
  getCosmetics,
  setCosmetics
} = require('../utils/economyStorage');
const { COOLDOWNS, TAXES, BANK_BASE, BANK_GROWTH, BANK_MAX_TIER, QUEST_TEMPLATES, RARITIES } = require('./constants');
const { getRuntimeItem, getAllRuntimeItems, getCrateRewardSpec, validateRuntimeItems } = require('./runtimeItems');
const { addXP, getUserLevel, awardActionXP } = require('./levelSystem');

const ITEM_HANDLER_EFFECTS = new Set([
  'add_xp',
  'daily_double',
  'reset_cooldown',
  'reduce_cooldown',
  'heal_fine',
  'bank_expand',
  'quest_reroll',
  'adventure',
  'repair',
  'gamble_buff',
  'adventure_escape',
  'fish_rarity',
  'hunt_rarity'
]);

const TOOL_SLOT_ALIASES = {
  FISH: ['fish'],
  HUNT: ['hunt', 'hunt_bonus'],
  MINE: ['mine'],
  CHOP: ['chop'],
  DIG: ['dig'],
  SEARCH: ['search', 'search_bonus'],
  EXPLORE: ['explore']
};

const COLLECTION_CATEGORIES = ['collectibles', 'relics'];
const EARNING_ACTIONS = new Set([
  'daily',
  'work',
  'crime',
  'beg',
  'search',
  'hunt',
  'fish',
  'adventure',
  'explore',
  'mine',
  'hack',
  'duel',
  'heist',
  'scavenge',
  'reactor',
  'bounty',
  'dig',
  'chop',
  'drill',
  'rob'
]);
const COOLDOWN_EFFECT_KEYS = {
  DAILY: ['daily_cd', 'speed'],
  WORK: ['work_cd', 'speed'],
  CRIME: ['crime_cd', 'speed'],
  BEG: ['beg_cd', 'speed'],
  SEARCH: ['search_cd', 'speed'],
  ROB: ['rob_cd', 'speed'],
  HUNT: ['hunt_cd', 'speed'],
  FISH: ['fish_cd', 'speed'],
  ADVENTURE: ['adventure_cd', 'speed'],
  EXPLORE: ['explore_cd', 'speed'],
  QUEST_REFRESH: ['quest_cd', 'speed'],
  MINE: ['mine_cd', 'speed'],
  HACK: ['hack_cd', 'speed'],
  DUEL: ['duel_cd', 'speed'],
  HEIST: ['heist_cd', 'speed'],
  SCAVENGE: ['scavenge_cd', 'speed'],
  REACTOR: ['reactor_cd', 'speed'],
  BOUNTY: ['bounty_cd', 'speed'],
  DIG: ['dig_cd', 'speed'],
  CHOP: ['chop_cd', 'speed'],
  DRILL: ['drill_cd', 'speed']
};

function rollRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getBankLimitForTier(tier, extraLimit = 0) {
  return Math.floor(BANK_BASE * Math.pow(BANK_GROWTH, Math.min(Math.max(tier, 0), BANK_MAX_TIER))) + extraLimit;
}

async function getBankTier(userId) {
  return Math.min(Math.max(Number(await getStat(userId, 'bank_tier') || 0), 0), BANK_MAX_TIER);
}

async function setBankTier(userId, tier) {
  const clamped = Math.min(Math.max(Number(tier || 0), 0), BANK_MAX_TIER);
  await setStat(userId, 'bank_tier', clamped);
  return clamped;
}

async function getBankLimit(userId) {
  const tier = await getBankTier(userId);
  const extraLimit = Number(await getStat(userId, 'bank_extra_limit') || 0);
  return getBankLimitForTier(tier, extraLimit);
}

async function addWalletSafe(userId, delta) {
  const next = await addWallet(userId, delta);
  await bumpStat(userId, delta >= 0 ? 'money_earned' : 'money_spent', Math.abs(delta));
  return next;
}

async function addBankSafe(userId, delta) {
  const next = await addBank(userId, delta);
  await bumpStat(userId, delta >= 0 ? 'money_earned' : 'money_spent', Math.abs(delta));
  return next;
}

async function canUseCooldown(userId, key, now = Date.now()) {
  const last = await getCooldown(userId, key);
  if (!last) return { ok: true, remaining: 0 };
  const cooldownKey = key.toUpperCase();
  let cdMs = COOLDOWNS[cooldownKey];
  if (!cdMs) return { ok: true, remaining: 0 };
  const effects = await getActionEffects(userId);
  for (const effectKey of COOLDOWN_EFFECT_KEYS[cooldownKey] || []) {
    for (const effect of effects[effectKey] || []) {
      cdMs = Math.max(1000, Math.floor(cdMs * Number(effect.metadata?.multiplier || 1)));
    }
  }
  const diff = now - last;
  if (diff >= cdMs) return { ok: true, remaining: 0 };
  return { ok: false, remaining: cdMs - diff };
}

async function setUsedCooldown(userId, key, now = Date.now()) {
  await setCooldown(userId, key, now);
}

async function getDailyStreak(userId) {
  const streak = Number(await getStat(userId, 'daily_streak') || 0);
  const lastDaily = Number(await getStat(userId, 'daily_last_ts') || 0);
  let multiplier = 1;
  if (streak >= 100) multiplier = 5;
  else if (streak >= 60) multiplier = 4;
  else if (streak >= 30) multiplier = 3;
  else if (streak >= 14) multiplier = 2.5;
  else if (streak >= 7) multiplier = 2;
  else if (streak >= 3) multiplier = 1.5;
  return { streak, lastDaily, multiplier };
}

async function updateDailyStreak(userId) {
  const last = Number(await getStat(userId, 'daily_last_ts') || 0);
  const now = Date.now();
  const hours = (now - last) / 3600000;
  if (hours <= 48) await bumpStat(userId, 'daily_streak', 1);
  else await setStat(userId, 'daily_streak', 1);
  await setStat(userId, 'daily_last_ts', now);
  return getDailyStreak(userId);
}

async function getQuestStateSafe(userId) {
  const state = await getQuestState(userId);
  return {
    activeIds: Array.isArray(state.activeIds) ? state.activeIds : [],
    claimedIds: Array.isArray(state.claimedIds) ? state.claimedIds : [],
    lastRefresh: Number(state.lastRefresh || 0)
  };
}

function shuffle(array) {
  const next = [...array];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

async function refreshQuests(userId, timestamp = Date.now()) {
  const nextState = {
    activeIds: shuffle(QUEST_TEMPLATES).slice(0, 5).map((quest) => quest.id),
    claimedIds: [],
    lastRefresh: timestamp
  };
  await setQuestState(userId, nextState);
  return nextState;
}

async function getActiveQuests(userId) {
  const state = await getQuestStateSafe(userId);
  if (!state.activeIds.length || (Date.now() - state.lastRefresh) > 3 * 24 * 60 * 60 * 1000) {
    return (await refreshQuests(userId)).activeIds.map((id) => QUEST_TEMPLATES.find((quest) => quest.id === id)).filter(Boolean);
  }
  return state.activeIds.map((id) => QUEST_TEMPLATES.find((quest) => quest.id === id)).filter(Boolean);
}

async function getQuestRefreshTime(userId) {
  const state = await getQuestStateSafe(userId);
  const nextRefresh = state.lastRefresh + 3 * 24 * 60 * 60 * 1000;
  return Math.max(0, nextRefresh - Date.now());
}

async function claimCompletedQuests(userId) {
  const [state, stats] = await Promise.all([getQuestStateSafe(userId), require('../utils/economyStorage').getStats(userId)]);
  const completed = [];
  let totalAtoms = 0;
  let totalXp = 0;

  for (const id of state.activeIds) {
    if (state.claimedIds.includes(id)) continue;
    const quest = QUEST_TEMPLATES.find((entry) => entry.id === id);
    if (!quest) continue;
    const current = Number(stats[quest.key] || 0);
    if (current >= quest.target) {
      completed.push(quest);
      totalAtoms += quest.Atoms;
      totalXp += quest.xp;
    }
  }

  if (!completed.length) {
    return { claimed: [], totalAtoms: 0, totalXp: 0 };
  }

  state.claimedIds.push(...completed.map((quest) => quest.id));
  await setQuestState(userId, state);
  await addWalletSafe(userId, totalAtoms);
  const effects = await getActionEffects(userId);
  let questXpMultiplier = 1;
  for (const effect of [...(effects.quest || []), ...(effects.all || [])]) {
    questXpMultiplier *= Number(effect.metadata?.multiplier || 1);
  }
  const adjustedXp = Math.max(0, Math.floor(totalXp * questXpMultiplier));
  await addXP(userId, adjustedXp);
  return { claimed: completed, totalAtoms, totalXp: adjustedXp };
}

async function getActionEffects(userId) {
  await clearExpiredEffects(userId);
  const effects = await getActiveEffects(userId);
  const grouped = {};
  for (const effect of effects) {
    if (!grouped[effect.key]) grouped[effect.key] = [];
    grouped[effect.key].push(effect);
  }
  return grouped;
}

async function getActionMultiplier(userId, action) {
  const effects = await getActionEffects(userId);
  const loadout = await getLoadout(userId);
  let multiplier = 1;
  const actionKey = String(action).toLowerCase();
  const extraEffectKeys = [];
  if (EARNING_ACTIONS.has(actionKey)) extraEffectKeys.push('all_earn');
  if (actionKey === 'hunt') extraEffectKeys.push('hunt_yield');
  if (actionKey === 'fish') extraEffectKeys.push('fish_yield');
  if (actionKey === 'rob') extraEffectKeys.push('rob_success');
  const matchingEffects = [
    ...(effects[actionKey] || []),
    ...(effects.all || []),
    ...extraEffectKeys.flatMap((key) => effects[key] || [])
  ];
  for (const effect of matchingEffects) {
    multiplier *= Number(effect.metadata?.multiplier || 1);
  }

  if (loadout.pet?.itemId) {
    const pet = getRuntimeItem(loadout.pet.itemId);
    if (pet?.data?.passive === actionKey) multiplier *= 1 + Number(pet.data.boost || 0);
    if (pet?.data?.passive === 'luck' && ['hunt', 'fish', 'search', 'explore', 'mine', 'dig'].includes(actionKey)) multiplier *= 1 + Number(pet.data.boost || 0);
    if (pet?.data?.passive === 'all') multiplier *= 1 + Number(pet.data.boost || 0);
  }

  if (loadout.vehicle?.itemId) {
    const vehicle = getRuntimeItem(loadout.vehicle.itemId);
    const speed = Number(vehicle?.data?.speed || 1);
    if (['work', 'search', 'explore', 'scavenge', 'bounty', 'hack'].includes(actionKey)) {
      multiplier *= 1 + Math.max(0, speed - 1) * 0.15;
    }
    if (vehicle?.data?.passive === actionKey) multiplier *= 1 + Number(vehicle.data.boost || 0);
    if (vehicle?.data?.passive === 'all') multiplier *= 1 + Number(vehicle.data.boost || 0);
  }

  return { multiplier, effects, loadout };
}

async function chooseToolForAction(userId, action) {
  const slotKeys = TOOL_SLOT_ALIASES[String(action).toUpperCase()] || [];
  if (!slotKeys.length) return null;

  const loadout = await getLoadout(userId);
  for (const slot of slotKeys) {
    const equipped = loadout[`tool:${slot}`];
    if (equipped?.instanceId) {
      const instance = await getItemInstance(equipped.instanceId);
      if (instance) return instance;
    }
  }

  const instances = await getItemInstances(userId);
  for (const instance of instances) {
    const item = getRuntimeItem(instance.itemId);
    if (!item) continue;
    if (slotKeys.includes(item.data?.slot)) return instance;
  }
  return null;
}

async function useToolForAction(userId, action, { required = false } = {}) {
  const instance = await chooseToolForAction(userId, action);
  if (!instance) {
    if (required) {
      return { ok: false, reason: `You need a ${String(action).toLowerCase()} tool to do this.` };
    }
    return { ok: true, instance: null, broke: false, bonusMultiplier: 1 };
  }

  const item = getRuntimeItem(instance.itemId);
  const slot = item?.data?.slot;
  let bonusMultiplier = 1;
  if (instance.itemId === 'tool_shovel') bonusMultiplier = 2;
  if (instance.itemId === 'tool_metal_detector') bonusMultiplier = 1.5;
  if (instance.itemId === 'tool_pickaxe' && action === 'EXPLORE') bonusMultiplier = 1.35;
  if (item?.data?.bonus) bonusMultiplier = 1 + Number(item.data.bonus || 0);

  if (instance.maxDurability !== null && instance.maxDurability !== undefined) {
    const nextDurability = Math.max(0, Number(instance.durability || 0) - 1);
    if (nextDurability <= 0) {
      await deleteItemInstance(instance.instanceId);
      await clearLoadout(userId, `tool:${slot}`);
      return { ok: true, instance, broke: true, bonusMultiplier, item };
    }
    await updateItemInstance(instance.instanceId, { durability: nextDurability });
    return { ok: true, instance: { ...instance, durability: nextDurability }, broke: false, bonusMultiplier, item };
  }

  return { ok: true, instance, broke: false, bonusMultiplier, item };
}

async function activateEffectFromItem(userId, item) {
  const expiresAt = Date.now() + Number(item.data.durationMs || 0);
  const effectKey = item.data.key || item.data.effect;
  return createEffect(userId, {
    key: effectKey,
    itemId: item.id,
    expiresAt: Number.isFinite(expiresAt) && expiresAt > Date.now() ? expiresAt : null,
    usesRemaining: item.data.uses || null,
    metadata: {
      multiplier: item.data.multiplier,
      guaranteedRarity: item.data.guaranteedRarity || null,
      itemId: item.id
    }
  });
}

async function applyCrimeFailureProtection(userId, fineAmount) {
  const loadout = await getLoadout(userId);
  let adjusted = fineAmount;
  if (loadout.protection?.itemId) {
    const item = getRuntimeItem(loadout.protection.itemId);
    if (item?.data?.fine_reduction) {
      adjusted = Math.floor(adjusted * Number(item.data.fine_reduction));
      if (loadout.protection.instanceId) {
        const instance = await getItemInstance(loadout.protection.instanceId);
        const uses = Number(instance?.metadata?.usesRemaining ?? item.data.uses ?? 0);
        if (instance && uses > 0) {
          if (uses <= 1) {
            await deleteItemInstance(instance.instanceId);
            await clearLoadout(userId, 'protection');
          } else {
            await updateItemInstance(instance.instanceId, {
              metadata: { ...instance.metadata, usesRemaining: uses - 1 }
            });
          }
        }
      }
    }
  }
  await setStat(userId, 'crime_last_fine', adjusted);
  return adjusted;
}

async function handleRobProtection(attackerId, targetId, attemptedAmount) {
  await clearExpiredEffects(targetId);
  const effects = await getActiveEffects(targetId);
  const loadout = await getLoadout(targetId);

  const blockEffect = effects.find((effect) => ['protection', 'shield', 'all'].includes(effect.key) || effect.metadata?.blockRob === true);
  if (blockEffect) {
    if (blockEffect.usesRemaining !== null && blockEffect.usesRemaining !== undefined) {
      if (blockEffect.usesRemaining <= 1) await deleteEffect(blockEffect.effectId);
      else await updateEffect(blockEffect.effectId, { usesRemaining: blockEffect.usesRemaining - 1 });
    }
    return { blocked: true, counterLoss: 0, source: getRuntimeItem(blockEffect.itemId) };
  }

  if (loadout.protection?.itemId) {
    const item = getRuntimeItem(loadout.protection.itemId);
    if (item?.data?.stash_limit) {
      return { blocked: true, counterLoss: 0, source: item, note: `Protected by ${item.name}` };
    }
    if (item?.data?.robPenalty) {
      return { blocked: false, counterLoss: 0, successPenalty: Number(item.data.robPenalty), source: item };
    }
  }

  const padlockLike = effects.find((effect) => effect.metadata?.blocks);
  if (padlockLike) {
    const remaining = Number(padlockLike.metadata.blocks || 0);
    if (remaining <= 1) await deleteEffect(padlockLike.effectId);
    else await updateEffect(padlockLike.effectId, { metadata: { ...padlockLike.metadata, blocks: remaining - 1 } });
    return { blocked: true, counterLoss: 0, source: getRuntimeItem(padlockLike.itemId) };
  }

  if (loadout.protection?.itemId) {
    const item = getRuntimeItem(loadout.protection.itemId);
    if (item?.data?.counter_pct) {
      const attackerBal = await getBalance(attackerId);
      const counterLoss = Math.min(attackerBal.wallet, Math.floor(attackerBal.wallet * Number(item.data.counter_pct)));
      if (counterLoss > 0) await addWalletSafe(attackerId, -counterLoss);
      return { blocked: false, counterLoss, successPenalty: 0, source: item };
    }
  }

  return { blocked: false, counterLoss: 0, successPenalty: 0, source: null };
}

async function buyItem(userId, itemId) {
  const item = getRuntimeItem(itemId);
  if (!item) throw new Error('Item not found.');

  const levelInfo = await getUserLevel(userId);
  if (item.levelReq && levelInfo.level < item.levelReq) {
    throw new Error(`You need Level ${item.levelReq} to buy this item.`);
  }

  const balance = await getBalance(userId);
  if (balance.wallet < item.price) {
    throw new Error(`You need ${item.price.toLocaleString()} Atoms to buy this item.`);
  }

  if (item.type === 'bank_upgrade') {
    const currentTier = await getBankTier(userId);
    if (currentTier >= Number(item.data?.tier || 0)) {
      throw new Error(`You already have a better bank tier equipped.`);
    }
  }

  await addWalletSafe(userId, -item.price);

  if (['title', 'badge', 'frame', 'color'].includes(item.type)) {
    const patch = {};
    if (item.type === 'title') patch.title = item.data.title;
    if (item.type === 'badge') patch.badge = item.data.badge;
    if (item.type === 'frame') patch.frame = item.data.frame;
    if (item.type === 'color') patch.color = item.data.color;
    await setCosmetics(userId, patch);
    return { item, autoApplied: true };
  }

  if (item.type === 'bank_upgrade') {
    await setBankTier(userId, item.data.tier);
    return { item, autoApplied: true };
  }

  await addInventoryItem(userId, item.id, 1);
  await awardActionXP(userId, 'buy');
  return { item, autoApplied: false };
}

async function sellItem(userId, itemId, quantity = 1) {
  const item = getRuntimeItem(itemId);
  if (!item) throw new Error('Item not found.');
  if (!item.sellPrice) throw new Error('This item cannot be sold.');
  const removed = await consumeInventoryItem(userId, itemId, quantity);
  if (!removed) throw new Error('You do not have enough of that item.');
  const total = item.sellPrice * quantity;
  await addWalletSafe(userId, total);
  await awardActionXP(userId, 'sell');
  return { item, quantity, total };
}

async function equipItem(userId, itemId) {
  const item = getRuntimeItem(itemId);
  if (!item) throw new Error('Item not found.');
  const count = await getInventoryItemCount(userId, itemId);
  if (count <= 0) throw new Error('You do not own this item.');

  if (['title', 'badge', 'frame', 'color'].includes(item.type)) {
    const patch = {};
    if (item.type === 'title') patch.title = item.data.title;
    if (item.type === 'badge') patch.badge = item.data.badge;
    if (item.type === 'frame') patch.frame = item.data.frame;
    if (item.type === 'color') patch.color = item.data.color;
    await setCosmetics(userId, patch);
    return { slot: item.type, item };
  }

  let slot = null;
  let instance = null;

  if (item.type === 'tool') {
    slot = `tool:${item.data.slot}`;
    instance = (await getItemInstances(userId, { itemId }))[0] || null;
  } else if (item.type === 'pet') {
    slot = 'pet';
    instance = (await getItemInstances(userId, { itemId }))[0] || null;
  } else if (item.type === 'vehicle') {
    slot = 'vehicle';
    instance = (await getItemInstances(userId, { itemId }))[0] || null;
  } else if (item.type === 'protection' && item.stackable === false) {
    slot = 'protection';
    instance = (await getItemInstances(userId, { itemId }))[0] || null;
  } else {
    throw new Error('This item cannot be equipped.');
  }

  if (instance) await updateItemInstance(instance.instanceId, { equippedSlot: slot });
  await setLoadout(userId, slot, { itemId, instanceId: instance?.instanceId || null, metadata: {} });
  return { slot, item, instance };
}

async function discardItem(userId, itemId, quantity = 1) {
  const removed = await consumeInventoryItem(userId, itemId, quantity);
  if (!removed) throw new Error('You do not have enough of that item.');
  return { item: getRuntimeItem(itemId), quantity };
}

async function repairItem(userId, { itemId, instanceId, amount = null, skipCost = false } = {}) {
  let target = null;
  if (instanceId) target = await getItemInstance(instanceId);
  if (!target && itemId) target = (await getItemInstances(userId, { itemId }))[0] || null;
  if (!target) {
    const damaged = (await getItemInstances(userId)).find((instance) => instance.maxDurability && instance.durability < instance.maxDurability);
    target = damaged || null;
  }
  if (!target) throw new Error('No damaged tool found to repair.');

  const tool = getRuntimeItem(target.itemId);
  if (!tool?.data?.durability) throw new Error('That item cannot be repaired.');

  if (!skipCost) {
    const hasKit = await getInventoryItemCount(userId, 'con_multitool');
    if (hasKit > 0) {
      await consumeInventoryItem(userId, 'con_multitool', 1);
    } else {
      const cost = Math.max(1, Math.floor((tool.price || 1000) * TAXES.REPAIR_RATIO));
      const balance = await getBalance(userId);
      if (balance.wallet < cost) throw new Error(`Need ${cost.toLocaleString()} Atoms to repair ${tool.name}.`);
      await addWalletSafe(userId, -cost);
    }
  }

  const durability = amount === null
    ? target.maxDurability
    : Math.min(target.maxDurability, Number(target.durability || 0) + Number(amount || 0));
  await updateItemInstance(target.instanceId, { durability });
  return { tool, instanceId: target.instanceId, durability, maxDurability: target.maxDurability };
}

function chooseWeightedItem(pool) {
  const expanded = pool.flatMap((item) => {
    const rarity = RARITIES[item.rarity] || RARITIES.common;
    const weight = Math.max(1, Math.round(rarity.weight * 10));
    return new Array(weight).fill(item);
  });
  return pickRandom(expanded);
}

async function openCrate(userId, itemId) {
  const item = getRuntimeItem(itemId);
  if (!item || item.type !== 'lootbox') throw new Error('This is not a crate.');
  const removed = await consumeInventoryItem(userId, itemId, 1);
  if (!removed) throw new Error('You do not own this crate.');

  const spec = getCrateRewardSpec(item);
  const Atoms = rollRange(spec.AtomsRange[0], spec.AtomsRange[1]);
  const rewards = [];

  await addWalletSafe(userId, Atoms);

  const rewardedIds = new Set();
  for (let index = 0; index < spec.itemCount; index += 1) {
    const reward = chooseWeightedItem(spec.pool.filter((candidate) => !rewardedIds.has(candidate.id)));
    if (!reward) continue;
    rewardedIds.add(reward.id);
    await addInventoryItem(userId, reward.id, 1);
    rewards.push(reward);
  }

  await bumpStat(userId, 'crate_opened', 1);
  return { crate: item, Atoms, rewards };
}

async function useItem(userId, itemId, options = {}) {
  const item = getRuntimeItem(itemId);
  if (!item) throw new Error('Item not found.');

  if (['tool', 'pet', 'vehicle'].includes(item.type)) {
    return { mode: 'equip', ...(await equipItem(userId, itemId)) };
  }

  if (item.type === 'lootbox') {
    return { mode: 'open', ...(await openCrate(userId, itemId)) };
  }

  if (item.type === 'booster') {
    const consumed = await consumeInventoryItem(userId, itemId, 1);
    if (!consumed) throw new Error('You do not have this item.');
    const effect = await activateEffectFromItem(userId, item);
    return { mode: 'boost', item, effect };
  }

  if (item.type === 'protection') {
    const consumed = await consumeInventoryItem(userId, itemId, 1);
    if (!consumed) throw new Error('You do not have this item.');

    if (item.data?.stash_limit || item.data?.fine_reduction) {
      const created = await createItemInstance(userId, item.id, {
        metadata: {
          usesRemaining: item.data.uses || null,
          stash_limit: item.data.stash_limit || null,
          fine_reduction: item.data.fine_reduction || null,
          robPenalty: item.data.robPenalty || null
        }
      });
      await setLoadout(userId, 'protection', { itemId: item.id, instanceId: created.instanceId, metadata: created.metadata });
      return { mode: 'equip', item, instance: created };
    }

    const effect = await createEffect(userId, {
      key: item.data?.durationMs ? 'protection' : 'protection',
      itemId: item.id,
      expiresAt: item.data?.durationMs ? Date.now() + Number(item.data.durationMs) : null,
      metadata: {
        blocks: item.data?.blocks ?? null,
        counter_pct: item.data?.counter_pct ?? null,
        robPenalty: item.data?.robPenalty ?? null,
        blockRob: true
      }
    });
    return { mode: 'protect', item, effect };
  }

  if (['badge', 'frame', 'title', 'color'].includes(item.type)) {
    await equipItem(userId, itemId);
    return { mode: 'cosmetic', item };
  }

  if (item.type === 'bank_upgrade') {
    await buyItem(userId, itemId);
    return { mode: 'bank_upgrade', item };
  }

  const consumed = await consumeInventoryItem(userId, itemId, 1);
  if (!consumed) throw new Error('You do not have this item.');

  if (item.data?.effect === 'add_xp') {
    const xp = await addXP(userId, Number(item.data.amount || 0));
    return { mode: 'consume', item, xp };
  }

  if (item.data?.effect === 'daily_double') {
    const effect = await createEffect(userId, {
      key: 'daily',
      itemId: item.id,
      usesRemaining: 1,
      metadata: { multiplier: 2, consumeOnUse: true }
    });
    return { mode: 'consume', item, effect };
  }

  if (item.data?.effect === 'reset_cooldown') {
    await setCooldown(userId, String(item.data.target || '').toUpperCase(), 0);
    return { mode: 'consume', item };
  }

  if (item.data?.effect === 'reduce_cooldown') {
    const target = String(item.data.target || '').toUpperCase();
    const lastUsed = Number(await getCooldown(userId, target) || 0);
    const next = Math.max(0, lastUsed - Number(item.data.ms || 0));
    await setCooldown(userId, target, next);
    return { mode: 'consume', item };
  }

  if (item.data?.effect === 'heal_fine') {
    const refund = Number(await getStat(userId, 'crime_last_fine') || 0);
    if (refund > 0) {
      await addWalletSafe(userId, refund);
      await setStat(userId, 'crime_last_fine', 0);
    }
    return { mode: 'consume', item, refund };
  }

  if (item.data?.effect === 'bank_expand') {
    await bumpStat(userId, 'bank_extra_limit', Number(item.data.amount || 0));
    return { mode: 'consume', item, newLimit: await getBankLimit(userId) };
  }

  if (item.data?.effect === 'quest_reroll') {
    const state = await refreshQuests(userId);
    return { mode: 'consume', item, state };
  }

  if (item.data?.effect === 'repair') {
    const result = await repairItem(userId, { ...options, amount: item.data.amount || null, skipCost: true });
    return { mode: 'repair', item, result };
  }

  if (item.data?.effect === 'gamble_buff') {
    const effect = await createEffect(userId, {
      key: 'gamble_buff',
      itemId: item.id,
      usesRemaining: Number(item.data.uses || 1),
      metadata: { chanceBonus: Number(item.data.chanceBonus || 0), itemId: item.id }
    });
    return { mode: 'consume', item, effect };
  }

  if (item.data?.effect === 'adventure_escape') {
    const effect = await createEffect(userId, {
      key: 'adventure_escape',
      itemId: item.id,
      usesRemaining: Number(item.data.uses || 1),
      metadata: { itemId: item.id }
    });
    return { mode: 'consume', item, effect };
  }

  if (item.data?.effect === 'fish_rarity') {
    const effect = await createEffect(userId, {
      key: 'fish_rarity',
      itemId: item.id,
      usesRemaining: Number(item.data.uses || 1),
      metadata: { guaranteedRarity: item.data.guaranteedRarity || 'rare', itemId: item.id }
    });
    return { mode: 'consume', item, effect };
  }

  if (item.data?.effect === 'hunt_rarity') {
    const effect = await createEffect(userId, {
      key: 'hunt_rarity',
      itemId: item.id,
      usesRemaining: Number(item.data.uses || 1),
      metadata: { guaranteedRarity: item.data.guaranteedRarity || 'legendary', itemId: item.id }
    });
    return { mode: 'consume', item, effect };
  }

  if (item.data?.effect === 'adventure') {
    await addInventoryItem(userId, itemId, 1);
    throw new Error('Adventure Tickets are consumed when you start an adventure.');
  }

  await addInventoryItem(userId, itemId, 1);
  throw new Error(`No runtime handler exists for ${item.name}.`);
}

async function consumeAdventureTicket(userId) {
  const removed = await consumeInventoryItem(userId, 'adv_ticket', 1);
  if (!removed) throw new Error('You need an Adventure Ticket to start an adventure.');
}

async function getInventoryView(userId) {
  const [snapshot, loadout, effects, cosmetics] = await Promise.all([
    getInventorySnapshot(userId),
    getLoadout(userId),
    getActiveEffects(userId),
    getCosmetics(userId)
  ]);
  const rows = snapshot.rows.map((row) => {
    const item = getRuntimeItem(row.itemId);
    const instances = snapshot.instances.filter((instance) => instance.itemId === row.itemId);
    const equipped = Object.entries(loadout)
      .filter(([, value]) => value.itemId === row.itemId)
      .map(([slot]) => slot);
    return {
      ...row,
      item,
      instances,
      equipped,
      minDurability: instances.length ? Math.min(...instances.map((instance) => Number(instance.durability ?? instance.maxDurability ?? 0))) : null,
      maxDurability: instances.length ? Math.max(...instances.map((instance) => Number(instance.maxDurability ?? 0))) : null
    };
  });

  const collections = {};
  for (const category of COLLECTION_CATEGORIES) {
    const possible = getAllRuntimeItems().filter((item) => item.category === category).length;
    const owned = rows.filter((row) => row.item?.category === category).length;
    collections[category] = { owned, possible };
  }

  return { rows, loadout, effects, cosmetics, collections };
}

function getItemPrimaryAction(item) {
  if (!item) return { label: 'Inspect', mode: 'inspect' };
  if (item.type === 'lootbox') return { label: 'Open', mode: 'open' };
  if (['tool', 'pet', 'vehicle'].includes(item.type)) return { label: 'Equip', mode: 'equip' };
  if (item.type === 'protection') return { label: 'Activate', mode: 'activate' };
  if (item.data?.effect === 'repair') return { label: 'Repair', mode: 'repair' };
  if (item.usable) return { label: 'Use', mode: 'use' };
  return { label: 'Inspect', mode: 'inspect' };
}

function validateItemRegistry() {
  const issues = validateRuntimeItems();
  const runtimeItems = getAllRuntimeItems();
  for (const item of runtimeItems) {
    if (item.data?.effect && !ITEM_HANDLER_EFFECTS.has(item.data.effect)) {
      issues.push({ id: item.id, issue: `unsupported effect ${item.data.effect}` });
    }
  }
  return issues;
}

module.exports = {
  ITEM_HANDLER_EFFECTS,
  addWalletSafe,
  addBankSafe,
  canUseCooldown,
  setUsedCooldown,
  getBankTier,
  setBankTier,
  getBankLimit,
  getDailyStreak,
  updateDailyStreak,
  getActiveQuests,
  refreshQuests,
  getQuestRefreshTime,
  claimCompletedQuests,
  getActionMultiplier,
  chooseToolForAction,
  useToolForAction,
  applyCrimeFailureProtection,
  handleRobProtection,
  buyItem,
  sellItem,
  equipItem,
  discardItem,
  repairItem,
  openCrate,
  useItem,
  consumeAdventureTicket,
  getInventoryView,
  getItemPrimaryAction,
  validateItemRegistry
};
