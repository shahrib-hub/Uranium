// src/economy/constants.js — Uranium Economy Engine v2.0

// ═══════════════════════════════════════
// ⚛️ BANK SCALING (Exponential)
// ═══════════════════════════════════════
const BANK_BASE = 10000;
const BANK_GROWTH = 1.35;
const BANK_MAX_TIER = 10;
// maxBank(tier) = floor(BANK_BASE * BANK_GROWTH^tier)
// Tier 0: 10,000 | Tier 5: 44,840 | Tier 10: 201,135

// ═══════════════════════════════════════
// ⏱️ COOLDOWNS (ms)
// ═══════════════════════════════════════
const COOLDOWNS = {
  DAILY: 86400000, WORK: 30000, CRIME: 180000, BEG: 30000,
  SEARCH: 30000, ROB: 600000, HUNT: 45000, FISH: 45000,
  ADVENTURE: 300000, EXPLORE: 120000, GAMBLE: 5000,
  QUEST_REFRESH: 86400000,
  MINE: 60000, HACK: 120000, DUEL: 90000, HEIST: 300000,
  SCAVENGE: 45000, REACTOR: 180000, BOUNTY: 240000, DIG: 60000
};

// ═══════════════════════════════════════
// 🎨 RARITY SYSTEM
// ═══════════════════════════════════════
const RARITIES = {
  common:    { name: 'Common',    emoji: '⬜', color: 0x95a5a6, weight: 50 },
  uncommon:  { name: 'Uncommon',  emoji: '🟩', color: 0x2ecc71, weight: 25 },
  rare:      { name: 'Rare',      emoji: '🟦', color: 0x3498db, weight: 15 },
  epic:      { name: 'Epic',      emoji: '🟪', color: 0x9b59b6, weight: 7 },
  legendary: { name: 'Legendary', emoji: '🟧', color: 0xf39c12, weight: 2.5 },
  mythic:    { name: 'Mythic',    emoji: '🟥', color: 0xe74c3c, weight: 0.5 }
};

// ═══════════════════════════════════════
// 📈 LEVEL & XP SYSTEM
// ═══════════════════════════════════════
const LEVEL = {
  XP_BASE: 100, XP_EXP: 1.5, MAX: 100,
  XP_FOR: n => Math.floor(100 * Math.pow(n, 1.5)),
  REWARDS: {
    daily: 25, work: 10, crime_success: 20, crime_fail: 5,
    beg: 3, search: 5, hunt: 15, fish: 12, adventure: 30,
    explore: 8, gamble_win: 10, gamble_lose: 3, quest: 50,
    rob_success: 15, rob_fail: 5, buy: 5, sell: 3,
    mine: 18, hack: 25, duel_win: 30, duel_lose: 8,
    heist_success: 40, heist_fail: 10, scavenge: 12,
    reactor: 35, bounty: 28, dig: 14
  }
};

// ═══════════════════════════════════════
// 🏆 PRESTIGE
// ═══════════════════════════════════════
const PRESTIGE = {
  MAX: 10, MULT_PER: 0.10, LEVEL_REQ: 50,
  BASE_COST: 100000, COST_SCALE: 1.5
};

// ═══════════════════════════════════════
// 🔥 DAILY STREAK BONUSES
// ═══════════════════════════════════════
const STREAKS = [
  { days: 3, mult: 1.5 }, { days: 7, mult: 2.0 },
  { days: 14, mult: 2.5 }, { days: 30, mult: 3.0 },
  { days: 60, mult: 4.0 }, { days: 100, mult: 5.0 }
];
function getStreakMultiplier(days) {
  let m = 1.0;
  for (const s of STREAKS) { if (days >= s.days) m = s.mult; }
  return m;
}

// ═══════════════════════════════════════
// 🗺️ ADVENTURE ZONES
// ═══════════════════════════════════════
const ZONES = [
  { id: 'forest', name: '🌲 Enchanted Forest', emoji: '🌲', lvl: 1, Atoms: [200, 800], xp: 20, rareChance: 0.05 },
  { id: 'cave', name: '🕳️ Crystal Cave', emoji: '🕳️', lvl: 5, Atoms: [400, 1500], xp: 35, rareChance: 0.08 },
  { id: 'ocean', name: '🌊 Deep Ocean', emoji: '🌊', lvl: 10, Atoms: [600, 2500], xp: 50, rareChance: 0.10 },
  { id: 'volcano', name: '🌋 Molten Volcano', emoji: '🌋', lvl: 20, Atoms: [1000, 4000], xp: 75, rareChance: 0.15 },
  { id: 'dungeon', name: '🏰 Shadow Dungeon', emoji: '🏰', lvl: 35, Atoms: [2000, 7000], xp: 100, rareChance: 0.20 },
  { id: 'void', name: '👁️ The Void', emoji: '👁️', lvl: 50, Atoms: [4000, 15000], xp: 150, rareChance: 0.30 },
  { id: 'nuclear', name: '☢️ Nuclear Fallout', emoji: '☢️', lvl: 75, Atoms: [25000, 100000], xp: 300, rareChance: 0.50 }
];

// ═══════════════════════════════════════
// 💼 JOBS (for /work)
// ═══════════════════════════════════════
const JOBS = [
  { name: 'Janitor', emoji: '🧹', min: 200, max: 400, lvl: 0 },
  { name: 'Waiter', emoji: '🍽️', min: 300, max: 500, lvl: 0 },
  { name: 'Cashier', emoji: '🏪', min: 350, max: 550, lvl: 0 },
  { name: 'Gardener', emoji: '🌻', min: 400, max: 650, lvl: 2 },
  { name: 'Streamer', emoji: '📺', min: 500, max: 800, lvl: 3 },
  { name: 'Designer', emoji: '🎨', min: 600, max: 950, lvl: 5 },
  { name: 'Chef', emoji: '👨‍🍳', min: 650, max: 1000, lvl: 7 },
  { name: 'Developer', emoji: '💻', min: 750, max: 1200, lvl: 10 },
  { name: 'Pilot', emoji: '✈️', min: 850, max: 1400, lvl: 12 },
  { name: 'Trader', emoji: '📈', min: 900, max: 1500, lvl: 15 },
  { name: 'Doctor', emoji: '🩺', min: 1000, max: 1800, lvl: 20 },
  { name: 'Lawyer', emoji: '⚖️', min: 1200, max: 2000, lvl: 25 },
  { name: 'Scientist', emoji: '🔬', min: 1500, max: 2500, lvl: 30 },
  { name: 'CEO', emoji: '🏢', min: 2000, max: 3500, lvl: 40 },
  { name: 'Astronaut', emoji: '🚀', min: 2500, max: 4000, lvl: 45 },
  { name: 'Dragon Slayer', emoji: '🐉', min: 3000, max: 6000, lvl: 50 }
];

// ═══════════════════════════════════════
// 🔫 CRIME SCENARIOS
// ═══════════════════════════════════════
const CRIMES = [
  { name: 'Pickpocketing', emoji: '🤏', min: 300, max: 800, fine: [200, 500], chance: 0.65, lvl: 0 },
  { name: 'Shoplifting', emoji: '🏪', min: 500, max: 1200, fine: [300, 700], chance: 0.55, lvl: 3 },
  { name: 'Car Theft', emoji: '🚗', min: 800, max: 2000, fine: [500, 1200], chance: 0.50, lvl: 5 },
  { name: 'Hacking', emoji: '💻', min: 1000, max: 3000, fine: [800, 2000], chance: 0.45, lvl: 10 },
  { name: 'Bank Heist', emoji: '🏦', min: 2000, max: 5000, fine: [1500, 3000], chance: 0.35, lvl: 20 },
  { name: 'Art Heist', emoji: '🖼️', min: 3000, max: 8000, fine: [2000, 5000], chance: 0.30, lvl: 30 },
  { name: 'Casino Robbery', emoji: '🎰', min: 5000, max: 15000, fine: [3000, 8000], chance: 0.25, lvl: 40 },
  { name: 'Nuclear Heist', emoji: '☢️', min: 8000, max: 25000, fine: [5000, 15000], chance: 0.20, lvl: 50 }
];

// ═══════════════════════════════════════
// 🙏 BEG RESPONSES
// ═══════════════════════════════════════
const BEG_RESPONSES = [
  { text: 'A kind stranger tosses you some Atoms.', min: 50, max: 300, chance: 0.40 },
  { text: 'Nobody even looks at you... pathetic.', min: 0, max: 0, chance: 0.25 },
  { text: 'Someone throws a shoe at you! You find Atoms in it.', min: 100, max: 500, chance: 0.15 },
  { text: 'A celebrity walks by and drops their wallet. Finders keepers!', min: 500, max: 2000, chance: 0.05 },
  { text: 'An old lady gives you her spare change.', min: 20, max: 150, chance: 0.10 },
  { text: 'You find a wallet on the ground with some cash!', min: 200, max: 800, chance: 0.05 }
];

// ═══════════════════════════════════════
// 🔍 SEARCH LOCATIONS
// ═══════════════════════════════════════
const SEARCH_LOCATIONS = [
  { name: 'Couch Cushions', emoji: '🛋️', min: 50, max: 250 },
  { name: 'Dumpster', emoji: '🗑️', min: 100, max: 400 },
  { name: 'Park Bench', emoji: '🪑', min: 150, max: 500 },
  { name: 'Abandoned Car', emoji: '🚙', min: 200, max: 800 },
  { name: 'Old Factory', emoji: '🏭', min: 300, max: 1200 },
  { name: 'Haunted House', emoji: '👻', min: 500, max: 2000 },
  { name: 'Secret Vault', emoji: '🔐', min: 1000, max: 5000 },
  { name: 'Dragon\'s Lair', emoji: '🐲', min: 2000, max: 8000 }
];

// ═══════════════════════════════════════
// 🐾 HUNT ANIMALS
// ═══════════════════════════════════════
const ANIMALS = [
  { name: 'Rabbit', emoji: '🐇', value: 100, rarity: 'common' },
  { name: 'Duck', emoji: '🦆', value: 150, rarity: 'common' },
  { name: 'Fox', emoji: '🦊', value: 300, rarity: 'uncommon' },
  { name: 'Deer', emoji: '🦌', value: 500, rarity: 'uncommon' },
  { name: 'Wolf', emoji: '🐺', value: 800, rarity: 'rare' },
  { name: 'Bear', emoji: '🐻', value: 1500, rarity: 'rare' },
  { name: 'Tiger', emoji: '🐅', value: 3000, rarity: 'epic' },
  { name: 'Unicorn', emoji: '🦄', value: 8000, rarity: 'legendary' },
  { name: 'Dragon', emoji: '🐉', value: 15000, rarity: 'legendary' },
  { name: 'Phoenix', emoji: '🔥', value: 50000, rarity: 'mythic' }
];

// ═══════════════════════════════════════
// 🐟 FISH TABLE
// ═══════════════════════════════════════
const FISH = [
  { name: 'Old Boot', emoji: '👢', value: 5, rarity: 'common' },
  { name: 'Sardine', emoji: '🐟', value: 80, rarity: 'common' },
  { name: 'Trout', emoji: '🐠', value: 200, rarity: 'common' },
  { name: 'Salmon', emoji: '🍣', value: 400, rarity: 'uncommon' },
  { name: 'Pufferfish', emoji: '🐡', value: 700, rarity: 'uncommon' },
  { name: 'Swordfish', emoji: '⚔️', value: 1200, rarity: 'rare' },
  { name: 'Electric Eel', emoji: '⚡', value: 2000, rarity: 'rare' },
  { name: 'Whale', emoji: '🐋', value: 5000, rarity: 'epic' },
  { name: 'Kraken Tentacle', emoji: '🦑', value: 12000, rarity: 'legendary' },
  { name: 'Golden Leviathan', emoji: '✨', value: 40000, rarity: 'mythic' }
];

// ═══════════════════════════════════════
// 💸 MONEY SINKS & TAXES
// ═══════════════════════════════════════
const TAXES = {
  GAMBLE: 0.05,      // 5% house tax on gambling wins
  TRANSFER: 0.02,    // 2% transfer fee
  SELL_RATIO: 0.50,  // Items sell for 50% of buy price
  REPAIR_RATIO: 0.15 // Repair costs 15% of item price
};

// ═══════════════════════════════════════
// 🎯 QUEST TEMPLATES (30+)
// ═══════════════════════════════════════
const QUEST_TEMPLATES = [
  {"id":"q_auto_0","name":"Gamble Master 0","desc":"Perform gamble 15 times.","key":"gamble_used","target":15,"Atoms":8248,"xp":75,"diff":"easy"},
  {"id":"q_auto_1","name":"Rob Master 1","desc":"Perform rob 37 times.","key":"rob_used","target":37,"Atoms":18558,"xp":185,"diff":"hard"},
  {"id":"q_auto_2","name":"Fish Master 2","desc":"Perform fish 31 times.","key":"fish_used","target":31,"Atoms":15671,"xp":155,"diff":"hard"},
  {"id":"q_auto_3","name":"Work Master 3","desc":"Perform work 11 times.","key":"work_used","target":11,"Atoms":5635,"xp":55,"diff":"easy"},
  {"id":"q_auto_4","name":"Hunt Master 4","desc":"Perform hunt 30 times.","key":"hunt_used","target":30,"Atoms":15684,"xp":150,"diff":"medium"},
  {"id":"q_auto_5","name":"Hunt Master 5","desc":"Perform hunt 25 times.","key":"hunt_used","target":25,"Atoms":12799,"xp":125,"diff":"medium"},
  {"id":"q_auto_6","name":"Work Master 6","desc":"Perform work 37 times.","key":"work_used","target":37,"Atoms":18837,"xp":185,"diff":"hard"},
  {"id":"q_auto_7","name":"Hunt Master 7","desc":"Perform hunt 45 times.","key":"hunt_used","target":45,"Atoms":23019,"xp":225,"diff":"hard"},
  {"id":"q_auto_8","name":"Fish Master 8","desc":"Perform fish 28 times.","key":"fish_used","target":28,"Atoms":14107,"xp":140,"diff":"medium"},
  {"id":"q_auto_9","name":"Search Master 9","desc":"Perform search 30 times.","key":"search_used","target":30,"Atoms":15950,"xp":150,"diff":"medium"},
  {"id":"q_auto_10","name":"Fish Master 10","desc":"Perform fish 47 times.","key":"fish_used","target":47,"Atoms":23710,"xp":235,"diff":"hard"},
  {"id":"q_auto_11","name":"Rob Master 11","desc":"Perform rob 46 times.","key":"rob_used","target":46,"Atoms":23469,"xp":230,"diff":"hard"},
  {"id":"q_auto_12","name":"Rob Master 12","desc":"Perform rob 44 times.","key":"rob_used","target":44,"Atoms":22997,"xp":220,"diff":"hard"},
  {"id":"q_auto_13","name":"Beg Master 13","desc":"Perform beg 16 times.","key":"beg_used","target":16,"Atoms":8077,"xp":80,"diff":"medium"},
  {"id":"q_auto_14","name":"Search Master 14","desc":"Perform search 25 times.","key":"search_used","target":25,"Atoms":13145,"xp":125,"diff":"medium"},
  {"id":"q_auto_15","name":"Work Master 15","desc":"Perform work 12 times.","key":"work_used","target":12,"Atoms":6299,"xp":60,"diff":"easy"},
  {"id":"q_auto_16","name":"Fish Master 16","desc":"Perform fish 20 times.","key":"fish_used","target":20,"Atoms":10221,"xp":100,"diff":"medium"},
  {"id":"q_auto_17","name":"Beg Master 17","desc":"Perform beg 14 times.","key":"beg_used","target":14,"Atoms":7957,"xp":70,"diff":"easy"},
  {"id":"q_auto_18","name":"Adventure Master 18","desc":"Perform adventure 35 times.","key":"adventure_used","target":35,"Atoms":17668,"xp":175,"diff":"hard"},
  {"id":"q_auto_19","name":"Search Master 19","desc":"Perform search 18 times.","key":"search_used","target":18,"Atoms":9101,"xp":90,"diff":"medium"},
  {"id":"q_auto_20","name":"Hunt Master 20","desc":"Perform hunt 38 times.","key":"hunt_used","target":38,"Atoms":19326,"xp":190,"diff":"hard"},
  {"id":"q_auto_21","name":"Hunt Master 21","desc":"Perform hunt 21 times.","key":"hunt_used","target":21,"Atoms":10778,"xp":105,"diff":"medium"},
  {"id":"q_auto_22","name":"Work Master 22","desc":"Perform work 37 times.","key":"work_used","target":37,"Atoms":19065,"xp":185,"diff":"hard"},
  {"id":"q_auto_23","name":"Beg Master 23","desc":"Perform beg 10 times.","key":"beg_used","target":10,"Atoms":5311,"xp":50,"diff":"easy"},
  {"id":"q_auto_24","name":"Adventure Master 24","desc":"Perform adventure 21 times.","key":"adventure_used","target":21,"Atoms":11060,"xp":105,"diff":"medium"},
  {"id":"q_auto_25","name":"Adventure Master 25","desc":"Perform adventure 38 times.","key":"adventure_used","target":38,"Atoms":19710,"xp":190,"diff":"hard"},
  {"id":"q_auto_26","name":"Adventure Master 26","desc":"Perform adventure 15 times.","key":"adventure_used","target":15,"Atoms":7528,"xp":75,"diff":"easy"},
  {"id":"q_auto_27","name":"Hunt Master 27","desc":"Perform hunt 37 times.","key":"hunt_used","target":37,"Atoms":19360,"xp":185,"diff":"hard"},
  {"id":"q_auto_28","name":"Beg Master 28","desc":"Perform beg 24 times.","key":"beg_used","target":24,"Atoms":12195,"xp":120,"diff":"medium"},
  {"id":"q_auto_29","name":"Fish Master 29","desc":"Perform fish 25 times.","key":"fish_used","target":25,"Atoms":12778,"xp":125,"diff":"medium"},
  {"id":"q_auto_30","name":"Fish Master 30","desc":"Perform fish 40 times.","key":"fish_used","target":40,"Atoms":20750,"xp":200,"diff":"hard"},
  {"id":"q_auto_31","name":"Beg Master 31","desc":"Perform beg 12 times.","key":"beg_used","target":12,"Atoms":6746,"xp":60,"diff":"easy"},
  {"id":"q_auto_32","name":"Fish Master 32","desc":"Perform fish 49 times.","key":"fish_used","target":49,"Atoms":25438,"xp":245,"diff":"hard"},
  {"id":"q_auto_33","name":"Fish Master 33","desc":"Perform fish 25 times.","key":"fish_used","target":25,"Atoms":13094,"xp":125,"diff":"medium"},
  {"id":"q_auto_34","name":"Gamble Master 34","desc":"Perform gamble 39 times.","key":"gamble_used","target":39,"Atoms":19704,"xp":195,"diff":"hard"},
  {"id":"q_auto_35","name":"Search Master 35","desc":"Perform search 35 times.","key":"search_used","target":35,"Atoms":18003,"xp":175,"diff":"hard"},
  {"id":"q_auto_36","name":"Fish Master 36","desc":"Perform fish 23 times.","key":"fish_used","target":23,"Atoms":12176,"xp":115,"diff":"medium"},
  {"id":"q_auto_37","name":"Beg Master 37","desc":"Perform beg 17 times.","key":"beg_used","target":17,"Atoms":9354,"xp":85,"diff":"medium"},
  {"id":"q_auto_38","name":"Rob Master 38","desc":"Perform rob 29 times.","key":"rob_used","target":29,"Atoms":15163,"xp":145,"diff":"medium"},
  {"id":"q_auto_39","name":"Daily Master 39","desc":"Perform daily 20 times.","key":"daily_claims","target":20,"Atoms":10124,"xp":100,"diff":"medium"},
  {"id":"q_auto_40","name":"Adventure Master 40","desc":"Perform adventure 33 times.","key":"adventure_used","target":33,"Atoms":17201,"xp":165,"diff":"hard"},
  {"id":"q_auto_41","name":"Hunt Master 41","desc":"Perform hunt 35 times.","key":"hunt_used","target":35,"Atoms":18368,"xp":175,"diff":"hard"},
  {"id":"q_auto_42","name":"Adventure Master 42","desc":"Perform adventure 16 times.","key":"adventure_used","target":16,"Atoms":8497,"xp":80,"diff":"medium"},
  {"id":"q_auto_43","name":"Fish Master 43","desc":"Perform fish 23 times.","key":"fish_used","target":23,"Atoms":12228,"xp":115,"diff":"medium"},
  {"id":"q_auto_44","name":"Fish Master 44","desc":"Perform fish 31 times.","key":"fish_used","target":31,"Atoms":16319,"xp":155,"diff":"hard"},
  {"id":"q_auto_45","name":"Fish Master 45","desc":"Perform fish 17 times.","key":"fish_used","target":17,"Atoms":8853,"xp":85,"diff":"medium"},
  {"id":"q_auto_46","name":"Work Master 46","desc":"Perform work 33 times.","key":"work_used","target":33,"Atoms":16871,"xp":165,"diff":"hard"},
  {"id":"q_auto_47","name":"Daily Master 47","desc":"Perform daily 26 times.","key":"daily_claims","target":26,"Atoms":13109,"xp":130,"diff":"medium"},
  {"id":"q_auto_48","name":"Rob Master 48","desc":"Perform rob 10 times.","key":"rob_used","target":10,"Atoms":5058,"xp":50,"diff":"easy"},
  {"id":"q_auto_49","name":"Work Master 49","desc":"Perform work 31 times.","key":"work_used","target":31,"Atoms":16487,"xp":155,"diff":"hard"},
  {"id":"q_auto_50","name":"Gamble Master 50","desc":"Perform gamble 37 times.","key":"gamble_used","target":37,"Atoms":18924,"xp":185,"diff":"hard"},
  {"id":"q_auto_51","name":"Search Master 51","desc":"Perform search 45 times.","key":"search_used","target":45,"Atoms":23438,"xp":225,"diff":"hard"},
  {"id":"q_auto_52","name":"Hunt Master 52","desc":"Perform hunt 32 times.","key":"hunt_used","target":32,"Atoms":16167,"xp":160,"diff":"hard"},
  {"id":"q_auto_53","name":"Hunt Master 53","desc":"Perform hunt 16 times.","key":"hunt_used","target":16,"Atoms":8727,"xp":80,"diff":"medium"},
  {"id":"q_auto_54","name":"Hunt Master 54","desc":"Perform hunt 17 times.","key":"hunt_used","target":17,"Atoms":8503,"xp":85,"diff":"medium"},
  {"id":"q_auto_55","name":"Search Master 55","desc":"Perform search 49 times.","key":"search_used","target":49,"Atoms":24577,"xp":245,"diff":"hard"},
  {"id":"q_auto_56","name":"Search Master 56","desc":"Perform search 19 times.","key":"search_used","target":19,"Atoms":9688,"xp":95,"diff":"medium"},
  {"id":"q_auto_57","name":"Rob Master 57","desc":"Perform rob 43 times.","key":"rob_used","target":43,"Atoms":22187,"xp":215,"diff":"hard"},
  {"id":"q_auto_58","name":"Beg Master 58","desc":"Perform beg 26 times.","key":"beg_used","target":26,"Atoms":13203,"xp":130,"diff":"medium"},
  {"id":"q_auto_59","name":"Daily Master 59","desc":"Perform daily 22 times.","key":"daily_claims","target":22,"Atoms":11923,"xp":110,"diff":"medium"},
  {"id":"q_auto_60","name":"Beg Master 60","desc":"Perform beg 24 times.","key":"beg_used","target":24,"Atoms":12423,"xp":120,"diff":"medium"},
  {"id":"q_auto_61","name":"Gamble Master 61","desc":"Perform gamble 45 times.","key":"gamble_used","target":45,"Atoms":22780,"xp":225,"diff":"hard"},
  {"id":"q_auto_62","name":"Beg Master 62","desc":"Perform beg 39 times.","key":"beg_used","target":39,"Atoms":20344,"xp":195,"diff":"hard"},
  {"id":"q_auto_63","name":"Hunt Master 63","desc":"Perform hunt 45 times.","key":"hunt_used","target":45,"Atoms":23155,"xp":225,"diff":"hard"},
  {"id":"q_auto_64","name":"Work Master 64","desc":"Perform work 49 times.","key":"work_used","target":49,"Atoms":25060,"xp":245,"diff":"hard"},
  {"id":"q_auto_65","name":"Rob Master 65","desc":"Perform rob 43 times.","key":"rob_used","target":43,"Atoms":21619,"xp":215,"diff":"hard"},
  {"id":"q_auto_66","name":"Search Master 66","desc":"Perform search 30 times.","key":"search_used","target":30,"Atoms":15090,"xp":150,"diff":"medium"},
  {"id":"q_auto_67","name":"Daily Master 67","desc":"Perform daily 47 times.","key":"daily_claims","target":47,"Atoms":24090,"xp":235,"diff":"hard"},
  {"id":"q_auto_68","name":"Adventure Master 68","desc":"Perform adventure 15 times.","key":"adventure_used","target":15,"Atoms":7954,"xp":75,"diff":"easy"},
  {"id":"q_auto_69","name":"Fish Master 69","desc":"Perform fish 49 times.","key":"fish_used","target":49,"Atoms":25162,"xp":245,"diff":"hard"},
  {"id":"q_auto_70","name":"Work Master 70","desc":"Perform work 25 times.","key":"work_used","target":25,"Atoms":12736,"xp":125,"diff":"medium"},
  {"id":"q_auto_71","name":"Beg Master 71","desc":"Perform beg 10 times.","key":"beg_used","target":10,"Atoms":5720,"xp":50,"diff":"easy"},
  {"id":"q_auto_72","name":"Adventure Master 72","desc":"Perform adventure 40 times.","key":"adventure_used","target":40,"Atoms":20670,"xp":200,"diff":"hard"},
  {"id":"q_auto_73","name":"Beg Master 73","desc":"Perform beg 16 times.","key":"beg_used","target":16,"Atoms":8462,"xp":80,"diff":"medium"},
  {"id":"q_auto_74","name":"Fish Master 74","desc":"Perform fish 30 times.","key":"fish_used","target":30,"Atoms":15692,"xp":150,"diff":"medium"},
  {"id":"q_auto_75","name":"Hunt Master 75","desc":"Perform hunt 20 times.","key":"hunt_used","target":20,"Atoms":10996,"xp":100,"diff":"medium"},
  {"id":"q_auto_76","name":"Search Master 76","desc":"Perform search 19 times.","key":"search_used","target":19,"Atoms":9742,"xp":95,"diff":"medium"},
  {"id":"q_auto_77","name":"Search Master 77","desc":"Perform search 45 times.","key":"search_used","target":45,"Atoms":23486,"xp":225,"diff":"hard"},
  {"id":"q_auto_78","name":"Beg Master 78","desc":"Perform beg 47 times.","key":"beg_used","target":47,"Atoms":23807,"xp":235,"diff":"hard"},
  {"id":"q_auto_79","name":"Work Master 79","desc":"Perform work 37 times.","key":"work_used","target":37,"Atoms":19382,"xp":185,"diff":"hard"},
  {"id":"q_auto_80","name":"Daily Master 80","desc":"Perform daily 42 times.","key":"daily_claims","target":42,"Atoms":21033,"xp":210,"diff":"hard"},
  {"id":"q_auto_81","name":"Hunt Master 81","desc":"Perform hunt 27 times.","key":"hunt_used","target":27,"Atoms":14068,"xp":135,"diff":"medium"},
  {"id":"q_auto_82","name":"Hunt Master 82","desc":"Perform hunt 24 times.","key":"hunt_used","target":24,"Atoms":12205,"xp":120,"diff":"medium"},
  {"id":"q_auto_83","name":"Hunt Master 83","desc":"Perform hunt 12 times.","key":"hunt_used","target":12,"Atoms":6463,"xp":60,"diff":"easy"},
  {"id":"q_auto_84","name":"Rob Master 84","desc":"Perform rob 35 times.","key":"rob_used","target":35,"Atoms":18044,"xp":175,"diff":"hard"},

  // Easy
  { id: 'q_daily', name: 'Daily Grind', desc: 'Claim your daily reward.', key: 'daily_claims', target: 1, Atoms: 1500, xp: 15, diff: 'easy' },
  { id: 'q_work3', name: 'Hard Worker', desc: 'Work 3 times.', key: 'work_used', target: 3, Atoms: 2000, xp: 25, diff: 'easy' },
  { id: 'q_beg5', name: 'Street Life', desc: 'Beg 5 times.', key: 'beg_used', target: 5, Atoms: 1000, xp: 15, diff: 'easy' },
  { id: 'q_search3', name: 'Treasure Hunter', desc: 'Search 3 locations.', key: 'search_used', target: 3, Atoms: 1500, xp: 20, diff: 'easy' },
  { id: 'q_game3', name: 'Lucky Break', desc: 'Play 3 gambling games.', key: 'games_played', target: 3, Atoms: 2000, xp: 20, diff: 'easy' },
  // Medium
  { id: 'q_work10', name: 'Overtime', desc: 'Work 10 times.', key: 'work_used', target: 10, Atoms: 5000, xp: 50, diff: 'medium' },
  { id: 'q_crime3', name: 'Life of Crime', desc: 'Attempt 3 crimes.', key: 'crime_used', target: 3, Atoms: 4000, xp: 40, diff: 'medium' },
  { id: 'q_hunt5', name: 'Big Game Hunter', desc: 'Hunt 5 animals.', key: 'hunt_used', target: 5, Atoms: 3500, xp: 45, diff: 'medium' },
  { id: 'q_fish5', name: 'Fisher King', desc: 'Catch 5 fish.', key: 'fish_used', target: 5, Atoms: 3500, xp: 45, diff: 'medium' },
  { id: 'q_adv2', name: 'Explorer', desc: 'Complete 2 adventures.', key: 'adventure_used', target: 2, Atoms: 5000, xp: 60, diff: 'medium' },
  { id: 'q_earn10k', name: 'Moneybags', desc: 'Earn 10,000 Atoms total.', key: 'money_earned', target: 10000, Atoms: 5000, xp: 50, diff: 'medium' },
  { id: 'q_game10', name: 'Gambler', desc: 'Play 10 gambling games.', key: 'games_played', target: 10, Atoms: 4000, xp: 40, diff: 'medium' },
  // Hard
  { id: 'q_work25', name: 'Workaholic', desc: 'Work 25 times.', key: 'work_used', target: 25, Atoms: 12000, xp: 100, diff: 'hard' },
  { id: 'q_crime10', name: 'Crime Lord', desc: 'Attempt 10 crimes.', key: 'crime_used', target: 10, Atoms: 10000, xp: 80, diff: 'hard' },
  { id: 'q_hunt15', name: 'Master Hunter', desc: 'Hunt 15 animals.', key: 'hunt_used', target: 15, Atoms: 8000, xp: 90, diff: 'hard' },
  { id: 'q_adv5', name: 'Adventurer', desc: 'Complete 5 adventures.', key: 'adventure_used', target: 5, Atoms: 15000, xp: 120, diff: 'hard' },
  { id: 'q_rob3', name: 'Heist Master', desc: 'Successfully rob 3 users.', key: 'rob_success', target: 3, Atoms: 12000, xp: 100, diff: 'hard' },
  { id: 'q_earn50k', name: 'Rich Kid', desc: 'Earn 50,000 Atoms total.', key: 'money_earned', target: 50000, Atoms: 15000, xp: 120, diff: 'hard' },
  // Extreme
  { id: 'q_adv10', name: 'Legendary Explorer', desc: 'Complete 10 adventures.', key: 'adventure_used', target: 10, Atoms: 30000, xp: 250, diff: 'extreme' },
  { id: 'q_earn200k', name: 'Tycoon', desc: 'Earn 200,000 Atoms total.', key: 'money_earned', target: 200000, Atoms: 50000, xp: 300, diff: 'extreme' },
  { id: 'q_crime25', name: 'Kingpin', desc: 'Attempt 25 crimes.', key: 'crime_used', target: 25, Atoms: 25000, xp: 200, diff: 'extreme' },
  { id: 'q_streak7', name: 'Streak Master', desc: 'Reach a 7-day daily streak.', key: 'daily_streak', target: 7, Atoms: 20000, xp: 150, diff: 'extreme' },
  // Ultra Extreme
  { id: 'q_work50', name: 'Employee of the Century', desc: 'Work 50 times.', key: 'work_used', target: 50, Atoms: 50000, xp: 400, diff: 'extreme' },
  { id: 'q_fish50', name: 'Legendary Angler', desc: 'Fish 50 times.', key: 'fish_used', target: 50, Atoms: 40000, xp: 350, diff: 'extreme' },
  { id: 'q_hunt50', name: 'Apex Predator', desc: 'Hunt 50 times.', key: 'hunt_used', target: 50, Atoms: 40000, xp: 350, diff: 'extreme' },
  { id: 'q_search100', name: 'Hoarder', desc: 'Search 100 times.', key: 'search_used', target: 100, Atoms: 75000, xp: 600, diff: 'extreme' },
  { id: 'q_explore75', name: 'Interstellar Pilot', desc: 'Explore 75 times.', key: 'explore_used', target: 75, Atoms: 100000, xp: 700, diff: 'extreme' },
  { id: 'q_rob25', name: 'Mastermind', desc: 'Successfully rob 25 users.', key: 'rob_success', target: 25, Atoms: 200000, xp: 1000, diff: 'extreme' },
  { id: 'q_crime200', name: 'Crime Lord', desc: 'Attempt 200 crimes.', key: 'crime_used', target: 200, Atoms: 400000, xp: 2000, diff: 'extreme' },
  { id: 'q_earn10m', name: 'Multimillionaire', desc: 'Earn 10,000,000 Atoms total.', key: 'money_earned', target: 10000000, Atoms: 1000000, xp: 5000, diff: 'extreme' },
  { id: 'q_adv100', name: 'God of Adventure', desc: 'Complete 100 adventures.', key: 'adventure_used', target: 100, Atoms: 500000, xp: 3000, diff: 'extreme' },
  { id: 'q_streak100', name: 'Centennial Streak', desc: 'Reach a 100-day daily streak.', key: 'daily_streak', target: 100, Atoms: 2500000, xp: 10000, diff: 'extreme' }
];

// ═══════════════════════════════════════
// 🎰 SLOT SYMBOLS
// ═══════════════════════════════════════
const SLOT_SYMBOLS = ['🍒', '🍋', '🍀', '💎', '⭐', '7️⃣', '☢️'];
const SLOT_JACKPOT_MULT = 5;
const SLOT_PAIR_MULT = 1.5;

// ═══════════════════════════════════════
// 🃏 BLACKJACK
// ═══════════════════════════════════════
const BLACKJACK = {
  DECK: ['A','2','3','4','5','6','7','8','9','10','J','Q','K'],
  SUITS: ['♠','♥','♦','♣'],
  BJ_MULT: 2.5, WIN_MULT: 2.0
};

// ═══════════════════════════════════════
// 🎲 RANDOM EVENT CHANCE (during commands)
// ═══════════════════════════════════════
const RANDOM_EVENT_CHANCE = 0.08; // 8% chance per command
const RANDOM_EVENTS = [
  { text: '⚛️ You found a bag of Atoms on the ground!', Atoms: [500, 2000] },
  { text: '🎁 A mystery gift appeared! You received bonus Atoms!', Atoms: [1000, 5000] },
  { text: '☢️ You found a uranium shard! It\'s worth something!', Atoms: [2000, 8000] },
  { text: '😈 A thief stole some Atoms from your wallet!', Atoms: [-500, -200] },
  { text: '🧪 You stepped on a weird potion... you feel lucky!', Atoms: [100, 500] },
  { text: '🌟 The economy gods smile upon you!', Atoms: [1500, 6000] }
];

// ═══════════════════════════════════════
// ⛏️ MINE ORES (for /mine)
// ═══════════════════════════════════════
const MINE_ORES = [
  { name: 'Coal', emoji: '⬛', value: 50, rarity: 'common', weight: 35 },
  { name: 'Copper', emoji: '🟤', value: 120, rarity: 'common', weight: 25 },
  { name: 'Iron', emoji: '⬜', value: 250, rarity: 'common', weight: 20 },
  { name: 'Silver', emoji: '🩶', value: 500, rarity: 'uncommon', weight: 12 },
  { name: 'Gold', emoji: '🟡', value: 1200, rarity: 'uncommon', weight: 8 },
  { name: 'Ruby', emoji: '🔴', value: 2500, rarity: 'rare', weight: 5 },
  { name: 'Emerald', emoji: '🟢', value: 4000, rarity: 'rare', weight: 3 },
  { name: 'Diamond', emoji: '💎', value: 8000, rarity: 'epic', weight: 2 },
  { name: 'Uranium Ore', emoji: '☢️', value: 20000, rarity: 'legendary', weight: 0.8 },
  { name: 'Quantum Crystal', emoji: '🔮', value: 50000, rarity: 'mythic', weight: 0.2 }
];

const MINE_EVENTS = [
  { text: 'Your pickaxe struck something hard!', type: 'bonus', mult: 1.5 },
  { text: 'A cave-in nearly crushed you!', type: 'danger', mult: 0.5 },
  { text: 'You found a hidden vein of minerals!', type: 'jackpot', mult: 2.0 },
  { text: 'Your headlamp flickered... something moved in the dark.', type: 'scare', mult: 0.8 },
  { text: 'You broke through to a crystal chamber!', type: 'bonus', mult: 1.8 },
  { text: 'Nothing special, just steady mining.', type: 'normal', mult: 1.0 }
];

// ═══════════════════════════════════════
// 💻 HACK TARGETS (for /hack)
// ═══════════════════════════════════════
const HACK_TARGETS = [
  { name: 'Local WiFi Router', emoji: '📡', diff: 1, min: 200, max: 600, lvl: 0 },
  { name: 'Coffee Shop POS', emoji: '☕', diff: 2, min: 400, max: 1000, lvl: 3 },
  { name: 'University Database', emoji: '🏫', diff: 3, min: 800, max: 2000, lvl: 5 },
  { name: 'Corporate Intranet', emoji: '🏢', diff: 4, min: 1500, max: 4000, lvl: 10 },
  { name: 'Government Server', emoji: '🏛️', diff: 5, min: 3000, max: 8000, lvl: 20 },
  { name: 'Military Mainframe', emoji: '🎖️', diff: 7, min: 5000, max: 15000, lvl: 30 },
  { name: 'NSA Black Site', emoji: '🕵️', diff: 9, min: 10000, max: 30000, lvl: 45 },
  { name: 'Quantum Supercomputer', emoji: '🧊', diff: 10, min: 25000, max: 80000, lvl: 60 }
];

const HACK_STEPS = [
  'Scanning ports...', 'Bypassing firewall...', 'Injecting payload...',
  'Decrypting keys...', 'Escalating privileges...', 'Extracting data...',
  'Covering tracks...', 'Exfiltrating loot...'
];

// ═══════════════════════════════════════
// ⚔️ DUEL NPCs (for /duel)
// ═══════════════════════════════════════
const DUEL_NPCS = [
  { name: 'Slime', emoji: '🟢', hp: 30, atk: [3, 8], def: 1, reward: [100, 300], lvl: 0 },
  { name: 'Goblin', emoji: '👺', hp: 50, atk: [5, 12], def: 2, reward: [200, 600], lvl: 2 },
  { name: 'Skeleton', emoji: '💀', hp: 70, atk: [8, 15], def: 3, reward: [400, 1000], lvl: 5 },
  { name: 'Orc Warrior', emoji: '👹', hp: 100, atk: [10, 20], def: 5, reward: [600, 1500], lvl: 10 },
  { name: 'Shadow Mage', emoji: '🧙', hp: 120, atk: [15, 25], def: 6, reward: [1000, 2500], lvl: 15 },
  { name: 'Vampire Lord', emoji: '🧛', hp: 160, atk: [18, 30], def: 8, reward: [1500, 4000], lvl: 20 },
  { name: 'Dragon Knight', emoji: '🐉', hp: 200, atk: [22, 35], def: 10, reward: [2500, 6000], lvl: 30 },
  { name: 'Lich King', emoji: '👑', hp: 280, atk: [28, 45], def: 14, reward: [4000, 10000], lvl: 40 },
  { name: 'Void Titan', emoji: '🌑', hp: 400, atk: [35, 55], def: 18, reward: [8000, 20000], lvl: 55 },
  { name: 'Nuclear Overlord', emoji: '☢️', hp: 600, atk: [45, 70], def: 25, reward: [15000, 50000], lvl: 70 }
];

// ═══════════════════════════════════════
// 🏦 HEIST STAGES (for /heist)
// ═══════════════════════════════════════
const HEIST_STAGES = [
  { name: 'Case the Joint', desc: 'Scout the target location.', successRate: 0.85, failText: 'You tripped an alarm while scouting!' },
  { name: 'Disable Security', desc: 'Disable cameras and alarms.', successRate: 0.70, failText: 'The security system had a backup you missed!' },
  { name: 'Crack the Vault', desc: 'Break into the vault.', successRate: 0.55, failText: 'The vault code was changed. You panic and flee!' },
  { name: 'Grab the Loot', desc: 'Fill your bags with treasure.', successRate: 0.75, failText: 'A guard caught you mid-grab!' },
  { name: 'The Escape', desc: 'Get out before cops arrive.', successRate: 0.65, failText: 'Road blocked! You had to abandon the loot!' }
];

const HEIST_TARGETS = [
  { name: 'Corner Store', emoji: '🏪', baseLoot: [500, 2000], lvl: 0 },
  { name: 'Jewelry Shop', emoji: '💍', baseLoot: [2000, 6000], lvl: 5 },
  { name: 'Art Museum', emoji: '🖼️', baseLoot: [5000, 15000], lvl: 15 },
  { name: 'Casino Vault', emoji: '🎰', baseLoot: [10000, 40000], lvl: 25 },
  { name: 'Federal Reserve', emoji: '🏛️', baseLoot: [30000, 100000], lvl: 40 },
  { name: 'Nuclear Facility', emoji: '☢️', baseLoot: [80000, 250000], lvl: 60 }
];

// ═══════════════════════════════════════
// 🔍 SCAVENGE FINDS (for /scavenge)
// ═══════════════════════════════════════
const SCAVENGE_AREAS = [
  { name: 'Abandoned Warehouse', emoji: '🏚️', finds: ['scrap_metal', 'old_wires', 'rusty_gears'] },
  { name: 'Shipwreck Beach', emoji: '🚢', finds: ['sea_glass', 'barnacle_gold', 'treasure_map'] },
  { name: 'Nuclear Wasteland', emoji: '☢️', finds: ['glowing_shard', 'mutant_hide', 'reactor_core'] },
  { name: 'Ancient Ruins', emoji: '🏛️', finds: ['stone_tablet', 'golden_idol', 'cursed_gem'] },
  { name: 'Crashed Satellite', emoji: '🛰️', finds: ['circuit_board', 'solar_cell', 'alien_alloy'] },
  { name: 'Underground Bunker', emoji: '🔒', finds: ['ammo_crate', 'ration_pack', 'classified_docs'] }
];

const SCAVENGE_VALUES = {
  scrap_metal: { name: 'Scrap Metal', value: 80, emoji: '🔩' },
  old_wires: { name: 'Old Wires', value: 120, emoji: '🔌' },
  rusty_gears: { name: 'Rusty Gears', value: 200, emoji: '⚙️' },
  sea_glass: { name: 'Sea Glass', value: 150, emoji: '🫧' },
  barnacle_gold: { name: 'Barnacle Gold', value: 600, emoji: '✨' },
  treasure_map: { name: 'Treasure Map', value: 2000, emoji: '🗺️' },
  glowing_shard: { name: 'Glowing Shard', value: 800, emoji: '💚' },
  mutant_hide: { name: 'Mutant Hide', value: 1200, emoji: '🧬' },
  reactor_core: { name: 'Reactor Core', value: 5000, emoji: '⚛️' },
  stone_tablet: { name: 'Stone Tablet', value: 400, emoji: '🪨' },
  golden_idol: { name: 'Golden Idol', value: 3000, emoji: '🗿' },
  cursed_gem: { name: 'Cursed Gem', value: 4500, emoji: '💜' },
  circuit_board: { name: 'Circuit Board', value: 700, emoji: '🔲' },
  solar_cell: { name: 'Solar Cell', value: 1500, emoji: '🔆' },
  alien_alloy: { name: 'Alien Alloy', value: 8000, emoji: '🛸' },
  ammo_crate: { name: 'Ammo Crate', value: 500, emoji: '📦' },
  ration_pack: { name: 'Ration Pack', value: 300, emoji: '🥫' },
  classified_docs: { name: 'Classified Docs', value: 6000, emoji: '📑' }
};

// ═══════════════════════════════════════
// ☢️ REACTOR FUEL TYPES (for /reactor)
// ═══════════════════════════════════════
const REACTOR_FUELS = [
  { name: 'Deuterium', emoji: '🧪', efficiency: 1.0, meltdownRisk: 0.05, baseOutput: [500, 1500] },
  { name: 'Tritium', emoji: '⚗️', efficiency: 1.3, meltdownRisk: 0.10, baseOutput: [1000, 3000] },
  { name: 'Plutonium-239', emoji: '☢️', efficiency: 1.8, meltdownRisk: 0.18, baseOutput: [2500, 7000] },
  { name: 'Uranium-235', emoji: '⚛️', efficiency: 2.5, meltdownRisk: 0.25, baseOutput: [5000, 15000] },
  { name: 'Antimatter', emoji: '🌀', efficiency: 4.0, meltdownRisk: 0.35, baseOutput: [15000, 50000] }
];

// ═══════════════════════════════════════
// 🎯 BOUNTY TARGETS (for /bounty)
// ═══════════════════════════════════════
const BOUNTY_TARGETS = [
  { name: 'Petty Thief', emoji: '🤏', reward: [200, 800], difficulty: 1, escapeChance: 0.15 },
  { name: 'Gang Leader', emoji: '🔫', reward: [600, 2000], difficulty: 2, escapeChance: 0.20 },
  { name: 'Smuggler', emoji: '📦', reward: [1000, 3500], difficulty: 3, escapeChance: 0.25 },
  { name: 'Hacker Elite', emoji: '💻', reward: [2000, 6000], difficulty: 4, escapeChance: 0.30 },
  { name: 'Arms Dealer', emoji: '💣', reward: [3500, 10000], difficulty: 5, escapeChance: 0.35 },
  { name: 'Assassin', emoji: '🗡️', reward: [6000, 18000], difficulty: 7, escapeChance: 0.40 },
  { name: 'Cartel Boss', emoji: '👔', reward: [12000, 35000], difficulty: 8, escapeChance: 0.45 },
  { name: 'Warlord', emoji: '⚔️', reward: [25000, 80000], difficulty: 10, escapeChance: 0.50 }
];

// ═══════════════════════════════════════
// 🦴 DIG LAYERS (for /dig)
// ═══════════════════════════════════════
const DIG_LAYERS = [
  { depth: 'Surface', emoji: '🌱', finds: [
    { name: 'Old Coin', value: 50, chance: 0.40 },
    { name: 'Arrowhead', value: 150, chance: 0.30 },
    { name: 'Pottery Shard', value: 300, chance: 0.20 },
    { name: 'Bronze Ring', value: 800, chance: 0.10 }
  ]},
  { depth: 'Shallow', emoji: '🪨', finds: [
    { name: 'Iron Dagger', value: 200, chance: 0.35 },
    { name: 'Silver Brooch', value: 600, chance: 0.30 },
    { name: 'Ancient Scroll', value: 1200, chance: 0.20 },
    { name: 'Ruby Pendant', value: 3000, chance: 0.15 }
  ]},
  { depth: 'Deep', emoji: '⬛', finds: [
    { name: 'Gold Chalice', value: 800, chance: 0.30 },
    { name: 'Enchanted Bone', value: 2000, chance: 0.30 },
    { name: 'Diamond Tiara', value: 5000, chance: 0.25 },
    { name: 'Dragon Fossil', value: 12000, chance: 0.15 }
  ]},
  { depth: 'Bedrock', emoji: '💎', finds: [
    { name: 'Obsidian Blade', value: 3000, chance: 0.30 },
    { name: 'Uranium Relic', value: 8000, chance: 0.30 },
    { name: 'Void Fragment', value: 20000, chance: 0.25 },
    { name: 'Atom Core', value: 50000, chance: 0.15 }
  ]}
];

module.exports = {
  BANK_BASE, BANK_GROWTH, BANK_MAX_TIER, COOLDOWNS, RARITIES,
  LEVEL, PRESTIGE, STREAKS, getStreakMultiplier, ZONES,
  JOBS, CRIMES, BEG_RESPONSES, SEARCH_LOCATIONS,
  ANIMALS, FISH, TAXES, QUEST_TEMPLATES,
  SLOT_SYMBOLS, SLOT_JACKPOT_MULT, SLOT_PAIR_MULT, BLACKJACK,
  RANDOM_EVENT_CHANCE, RANDOM_EVENTS,
  MINE_ORES, MINE_EVENTS, HACK_TARGETS, HACK_STEPS,
  DUEL_NPCS, HEIST_STAGES, HEIST_TARGETS,
  SCAVENGE_AREAS, SCAVENGE_VALUES, REACTOR_FUELS,
  BOUNTY_TARGETS, DIG_LAYERS
};
