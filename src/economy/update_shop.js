const fs = require('fs');
const path = require('path');

const shopPath = path.join(__dirname, 'shop.json');
const shopData = JSON.parse(fs.readFileSync(shopPath, 'utf8'));

// 1. Flag items
shopData.items.forEach(item => {
    // Things that are NOT consumables, boosters, or lootboxes shouldn't be usable
    if (['tool', 'protection', 'bank_upgrade', 'title', 'theme', 'color', 'relic', 'collectible'].includes(item.type) || 
        ['tools', 'protection', 'bank', 'cosmetics', 'vehicles', 'pets', 'relics', 'collectibles'].includes(item.category)) {
        item.usable = false;
    }
});

// 2. Add 50+ new items
const newItems = [
    // 10 Early game tools
    { id: 'tool_wooden_pickaxe', name: 'Wooden Pickaxe', emoji: '⛏️', price: 500, sellPrice: 250, description: 'Basic pickaxe. 10 uses.', type: 'tool', rarity: 'common', category: 'tools', levelReq: 0, stackable: false, tradeable: true, usable: false, data: { durability: 10, slot: 'mine' } },
    { id: 'tool_stone_pickaxe', name: 'Stone Pickaxe', emoji: '⛏️', price: 1500, sellPrice: 750, description: 'Better pickaxe. 25 uses.', type: 'tool', rarity: 'common', category: 'tools', levelReq: 2, stackable: false, tradeable: true, usable: false, data: { durability: 25, slot: 'mine' } },
    { id: 'tool_wooden_axe', name: 'Wooden Axe', emoji: '🪓', price: 600, sellPrice: 300, description: 'Basic axe for chopping. 15 uses.', type: 'tool', rarity: 'common', category: 'tools', levelReq: 0, stackable: false, tradeable: true, usable: false, data: { durability: 15, slot: 'chop' } },
    { id: 'tool_stone_axe', name: 'Stone Axe', emoji: '🪓', price: 1800, sellPrice: 900, description: 'Stone axe. 30 uses.', type: 'tool', rarity: 'common', category: 'tools', levelReq: 3, stackable: false, tradeable: true, usable: false, data: { durability: 30, slot: 'chop' } },
    { id: 'tool_basic_rod', name: 'Wooden Rod', emoji: '🎣', price: 400, sellPrice: 200, description: 'Simple fishing rod. 15 uses.', type: 'tool', rarity: 'common', category: 'tools', levelReq: 0, stackable: false, tradeable: true, usable: false, data: { durability: 15, slot: 'fish' } },
    { id: 'tool_iron_rod', name: 'Iron Rod', emoji: '🎣', price: 2000, sellPrice: 1000, description: 'Sturdy rod. 40 uses.', type: 'tool', rarity: 'uncommon', category: 'tools', levelReq: 4, stackable: false, tradeable: true, usable: false, data: { durability: 40, slot: 'fish' } },
    { id: 'tool_slingshot', name: 'Slingshot', emoji: '🏹', price: 800, sellPrice: 400, description: 'Hunt small animals. 20 uses.', type: 'tool', rarity: 'common', category: 'tools', levelReq: 1, stackable: false, tradeable: true, usable: false, data: { durability: 20, slot: 'hunt' } },
    { id: 'tool_bow', name: 'Hunter Bow', emoji: '🏹', price: 2500, sellPrice: 1250, description: 'Hunt bigger animals. 35 uses.', type: 'tool', rarity: 'uncommon', category: 'tools', levelReq: 4, stackable: false, tradeable: true, usable: false, data: { durability: 35, slot: 'hunt' } },
    { id: 'tool_trowel', name: 'Hand Trowel', emoji: '🥄', price: 300, sellPrice: 150, description: 'Dig for scraps. 15 uses.', type: 'tool', rarity: 'common', category: 'tools', levelReq: 0, stackable: false, tradeable: true, usable: false, data: { durability: 15, slot: 'dig' } },
    { id: 'tool_spade', name: 'Iron Spade', emoji: '⛏️', price: 1200, sellPrice: 600, description: 'Dig deeper. 30 uses.', type: 'tool', rarity: 'common', category: 'tools', levelReq: 2, stackable: false, tradeable: true, usable: false, data: { durability: 30, slot: 'dig' } },

    // 10 Consumables / Boosters
    { id: 'con_apple', name: 'Apple', emoji: '🍎', price: 100, sellPrice: 50, description: 'A tasty apple. +5 XP.', type: 'consumable', rarity: 'common', category: 'consumables', levelReq: 0, stackable: true, tradeable: true, usable: true, data: { effect: 'add_xp', amount: 5 } },
    { id: 'con_bread', name: 'Bread', emoji: '🍞', price: 250, sellPrice: 125, description: 'A loaf of bread. +15 XP.', type: 'consumable', rarity: 'common', category: 'consumables', levelReq: 1, stackable: true, tradeable: true, usable: true, data: { effect: 'add_xp', amount: 15 } },
    { id: 'con_coffee', name: 'Coffee', emoji: '☕', price: 500, sellPrice: 250, description: 'Reduces work cooldowns by 10 mins.', type: 'consumable', rarity: 'common', category: 'consumables', levelReq: 2, stackable: true, tradeable: true, usable: true, data: { effect: 'reduce_cooldown', target: 'WORK', ms: 600000 } },
    { id: 'con_tea', name: 'Green Tea', emoji: '🍵', price: 600, sellPrice: 300, description: 'Reduces crime cooldowns by 10 mins.', type: 'consumable', rarity: 'common', category: 'consumables', levelReq: 2, stackable: true, tradeable: true, usable: true, data: { effect: 'reduce_cooldown', target: 'CRIME', ms: 600000 } },
    { id: 'boost_work_tiny', name: 'Work Booster (+5%)', emoji: '💼', price: 1000, sellPrice: 500, description: 'Increases work earnings by 5% for 1 hour.', type: 'booster', rarity: 'common', category: 'boosters', levelReq: 0, stackable: true, tradeable: true, usable: true, data: { key: 'work', multiplier: 1.05, durationMs: 3600000 } },
    { id: 'boost_xp_small', name: 'XP Booster (1.2x)', emoji: '✨', price: 2000, sellPrice: 1000, description: '20% extra XP for 1 hour.', type: 'booster', rarity: 'common', category: 'boosters', levelReq: 1, stackable: true, tradeable: true, usable: true, data: { key: 'xp', multiplier: 1.2, durationMs: 3600000 } },
    { id: 'con_medkit', name: 'Medkit', emoji: '🩹', price: 1500, sellPrice: 750, description: 'Heals fine penalty by 50%.', type: 'consumable', rarity: 'uncommon', category: 'consumables', levelReq: 3, stackable: true, tradeable: true, usable: true, data: { effect: 'heal_fine_partial', percent: 0.5 } },
    { id: 'boost_hunt_small', name: 'Hunt Booster (+10%)', emoji: '🐾', price: 2000, sellPrice: 1000, description: 'Better hunt success for 1 hour.', type: 'booster', rarity: 'common', category: 'boosters', levelReq: 2, stackable: true, tradeable: true, usable: true, data: { key: 'hunt', multiplier: 1.1, durationMs: 3600000 } },
    { id: 'con_donut', name: 'Donut', emoji: '🍩', price: 300, sellPrice: 150, description: 'A sweet donut. +20 XP.', type: 'consumable', rarity: 'common', category: 'consumables', levelReq: 0, stackable: true, tradeable: true, usable: true, data: { effect: 'add_xp', amount: 20 } },
    { id: 'boost_luck_small', name: 'Tiny Charm', emoji: '🍀', price: 3000, sellPrice: 1500, description: 'Increases luck slightly for 1 hour.', type: 'booster', rarity: 'common', category: 'boosters', levelReq: 1, stackable: true, tradeable: true, usable: true, data: { key: 'luck', multiplier: 1.05, durationMs: 3600000 } },

    // 10 Early game Collectibles
    { id: 'col_seashell', name: 'Seashell', emoji: '🐚', price: 200, sellPrice: 100, description: 'A pretty shell.', type: 'collectible', rarity: 'common', category: 'collectibles', levelReq: 0, stackable: true, tradeable: true, usable: false, data: {} },
    { id: 'col_shiny_pebble', name: 'Shiny Pebble', emoji: '🪨', price: 300, sellPrice: 150, description: 'It glows a bit.', type: 'collectible', rarity: 'common', category: 'collectibles', levelReq: 0, stackable: true, tradeable: true, usable: false, data: {} },
    { id: 'col_old_coin', name: 'Old Coin', emoji: '🪙', price: 500, sellPrice: 250, description: 'An old rusted coin.', type: 'collectible', rarity: 'common', category: 'collectibles', levelReq: 0, stackable: true, tradeable: true, usable: false, data: {} },
    { id: 'col_broken_watch', name: 'Broken Watch', emoji: '⌚', price: 700, sellPrice: 350, description: 'A broken watch.', type: 'collectible', rarity: 'common', category: 'collectibles', levelReq: 0, stackable: true, tradeable: true, usable: false, data: {} },
    { id: 'col_cool_leaf', name: 'Cool Leaf', emoji: '🍁', price: 150, sellPrice: 75, description: 'A very cool leaf.', type: 'collectible', rarity: 'common', category: 'collectibles', levelReq: 0, stackable: true, tradeable: true, usable: false, data: {} },
    { id: 'col_glass_shard', name: 'Glass Shard', emoji: '💎', price: 400, sellPrice: 200, description: 'Looks like a gem but it is glass.', type: 'collectible', rarity: 'common', category: 'collectibles', levelReq: 0, stackable: true, tradeable: true, usable: false, data: {} },
    { id: 'col_rusty_key', name: 'Rusty Key', emoji: '🗝️', price: 600, sellPrice: 300, description: 'A rusty old key.', type: 'collectible', rarity: 'common', category: 'collectibles', levelReq: 0, stackable: true, tradeable: true, usable: false, data: {} },
    { id: 'col_toy_car', name: 'Toy Car', emoji: '🚗', price: 1000, sellPrice: 500, description: 'A small toy car.', type: 'collectible', rarity: 'common', category: 'collectibles', levelReq: 0, stackable: true, tradeable: true, usable: false, data: {} },
    { id: 'col_marbles', name: 'Bag of Marbles', emoji: '🔮', price: 800, sellPrice: 400, description: 'A bag of glass marbles.', type: 'collectible', rarity: 'common', category: 'collectibles', levelReq: 0, stackable: true, tradeable: true, usable: false, data: {} },
    { id: 'col_comic_book', name: 'Comic Book', emoji: '🦸', price: 1200, sellPrice: 600, description: 'Issue #1.', type: 'collectible', rarity: 'common', category: 'collectibles', levelReq: 0, stackable: true, tradeable: true, usable: false, data: {} },

    // 10 Mid game items
    { id: 'tool_steel_pickaxe', name: 'Steel Pickaxe', emoji: '⛏️', price: 8000, sellPrice: 4000, description: 'Strong pickaxe. 50 uses.', type: 'tool', rarity: 'rare', category: 'tools', levelReq: 10, stackable: false, tradeable: true, usable: false, data: { durability: 50, slot: 'mine' } },
    { id: 'tool_steel_axe', name: 'Steel Axe', emoji: '🪓', price: 9000, sellPrice: 4500, description: 'Strong axe. 60 uses.', type: 'tool', rarity: 'rare', category: 'tools', levelReq: 10, stackable: false, tradeable: true, usable: false, data: { durability: 60, slot: 'chop' } },
    { id: 'tool_pro_rod', name: 'Pro Fishing Rod', emoji: '🎣', price: 12000, sellPrice: 6000, description: 'Great rod. 75 uses.', type: 'tool', rarity: 'rare', category: 'tools', levelReq: 12, stackable: false, tradeable: true, usable: false, data: { durability: 75, slot: 'fish' } },
    { id: 'tool_crossbow', name: 'Crossbow', emoji: '🏹', price: 15000, sellPrice: 7500, description: 'For big game. 50 uses.', type: 'tool', rarity: 'rare', category: 'tools', levelReq: 15, stackable: false, tradeable: true, usable: false, data: { durability: 50, slot: 'hunt' } },
    { id: 'tool_metal_spade', name: 'Steel Spade', emoji: '⛏️', price: 7500, sellPrice: 3750, description: 'Dig up anything. 60 uses.', type: 'tool', rarity: 'rare', category: 'tools', levelReq: 10, stackable: false, tradeable: true, usable: false, data: { durability: 60, slot: 'dig' } },
    { id: 'prot_guard_dog', name: 'Guard Dog', emoji: '🐕', price: 30000, sellPrice: 15000, description: 'Blocks 3 rob attempts.', type: 'protection', rarity: 'epic', category: 'protection', levelReq: 15, stackable: true, tradeable: true, usable: false, data: { blocks: 3 } },
    { id: 'prot_alarm', name: 'House Alarm', emoji: '🚨', price: 20000, sellPrice: 10000, description: 'Alerts you and blocks 2 robs.', type: 'protection', rarity: 'rare', category: 'protection', levelReq: 12, stackable: true, tradeable: true, usable: false, data: { blocks: 2 } },
    { id: 'boost_work_mega', name: 'Mega Work Booster (+50%)', emoji: '💼', price: 25000, sellPrice: 12500, description: '+50% work earnings for 1 hour.', type: 'booster', rarity: 'epic', category: 'boosters', levelReq: 15, stackable: true, tradeable: true, usable: true, data: { key: 'work', multiplier: 1.5, durationMs: 3600000 } },
    { id: 'con_feast', name: 'Grand Feast', emoji: '🍗', price: 10000, sellPrice: 5000, description: 'Massive XP boost (+500 XP).', type: 'consumable', rarity: 'rare', category: 'consumables', levelReq: 10, stackable: true, tradeable: true, usable: true, data: { effect: 'add_xp', amount: 500 } },
    { id: 'con_brain_pill', name: 'Brain Pill', emoji: '🧠', price: 15000, sellPrice: 7500, description: 'Reduces hack cooldowns.', type: 'consumable', rarity: 'rare', category: 'consumables', levelReq: 15, stackable: true, tradeable: true, usable: true, data: { effect: 'reduce_cooldown', target: 'HACK', ms: 1200000 } },

    // 10 Pets & Vehicles
    { id: 'pet_cat', name: 'Stray Cat', emoji: '🐈', price: 50000, sellPrice: 25000, description: 'A cute cat. +5% passive luck.', type: 'pet', rarity: 'uncommon', category: 'pets', levelReq: 10, stackable: false, tradeable: true, usable: false, data: { passive: 'luck', boost: 0.05 } },
    { id: 'pet_dog', name: 'Loyal Dog', emoji: '🐕', price: 75000, sellPrice: 37500, description: 'A loyal dog. +5% passive xp.', type: 'pet', rarity: 'rare', category: 'pets', levelReq: 15, stackable: false, tradeable: true, usable: false, data: { passive: 'xp', boost: 0.05 } },
    { id: 'pet_bird', name: 'Parrot', emoji: '🦜', price: 60000, sellPrice: 30000, description: 'A smart parrot. +5% passive work.', type: 'pet', rarity: 'rare', category: 'pets', levelReq: 12, stackable: false, tradeable: true, usable: false, data: { passive: 'work', boost: 0.05 } },
    { id: 'pet_monkey', name: 'Thief Monkey', emoji: '🐒', price: 120000, sellPrice: 60000, description: '+10% crime earnings.', type: 'pet', rarity: 'epic', category: 'pets', levelReq: 20, stackable: false, tradeable: true, usable: false, data: { passive: 'crime', boost: 0.1 } },
    { id: 'pet_dragon', name: 'Baby Dragon', emoji: '🐉', price: 500000, sellPrice: 250000, description: '+20% all earnings.', type: 'pet', rarity: 'legendary', category: 'pets', levelReq: 30, stackable: false, tradeable: true, usable: false, data: { passive: 'all_earn', boost: 0.2 } },
    { id: 'veh_bicycle', name: 'Bicycle', emoji: '🚲', price: 40000, sellPrice: 20000, description: 'Reduces travel times.', type: 'vehicle', rarity: 'uncommon', category: 'vehicles', levelReq: 10, stackable: false, tradeable: true, usable: false, data: { speed: 1.1 } },
    { id: 'veh_scooter', name: 'Electric Scooter', emoji: '🛴', price: 80000, sellPrice: 40000, description: 'A fast scooter.', type: 'vehicle', rarity: 'rare', category: 'vehicles', levelReq: 15, stackable: false, tradeable: true, usable: false, data: { speed: 1.25 } },
    { id: 'veh_car', name: 'Used Car', emoji: '🚗', price: 200000, sellPrice: 100000, description: 'A reliable car.', type: 'vehicle', rarity: 'epic', category: 'vehicles', levelReq: 25, stackable: false, tradeable: true, usable: false, data: { speed: 1.5 } },
    { id: 'veh_sports_car', name: 'Sports Car', emoji: '🏎️', price: 800000, sellPrice: 400000, description: 'Extremely fast!', type: 'vehicle', rarity: 'legendary', category: 'vehicles', levelReq: 35, stackable: false, tradeable: true, usable: false, data: { speed: 2.0 } },
    { id: 'veh_heli', name: 'Helicopter', emoji: '🚁', price: 2500000, sellPrice: 1250000, description: 'Fly over everything.', type: 'vehicle', rarity: 'mythic', category: 'vehicles', levelReq: 50, stackable: false, tradeable: true, usable: false, data: { speed: 3.0 } },

    // 10 High tier items
    { id: 'tool_diamond_pickaxe', name: 'Diamond Pickaxe', emoji: '⛏️', price: 150000, sellPrice: 75000, description: 'Ultimate pickaxe. 250 uses.', type: 'tool', rarity: 'legendary', category: 'tools', levelReq: 40, stackable: false, tradeable: true, usable: false, data: { durability: 250, slot: 'mine' } },
    { id: 'tool_sniper', name: 'Sniper Rifle', emoji: '🎯', price: 200000, sellPrice: 100000, description: 'Never miss. 150 uses.', type: 'tool', rarity: 'legendary', category: 'tools', levelReq: 45, stackable: false, tradeable: true, usable: false, data: { durability: 150, slot: 'hunt', bonus: 0.5 } },
    { id: 'prot_bunker', name: 'Underground Bunker', emoji: '🚪', price: 500000, sellPrice: 250000, description: 'Blocks 10 robs.', type: 'protection', rarity: 'legendary', category: 'protection', levelReq: 40, stackable: true, tradeable: true, usable: false, data: { blocks: 10 } },
    { id: 'boost_xp_huge', name: 'Huge XP Booster (3x)', emoji: '🌟', price: 100000, sellPrice: 50000, description: '3x XP for 2 hours.', type: 'booster', rarity: 'epic', category: 'boosters', levelReq: 30, stackable: true, tradeable: true, usable: true, data: { key: 'xp', multiplier: 3.0, durationMs: 7200000 } },
    { id: 'title_uranium', name: 'Title: Uranium Baron', emoji: '☢️', price: 1000000, sellPrice: 0, description: 'The ultimate flex title.', type: 'title', rarity: 'mythic', category: 'cosmetics', levelReq: 50, stackable: false, tradeable: false, usable: false, data: { title: '☢️ Uranium Baron' } },
    { id: 'crate_omega', name: 'Omega Crate', emoji: '🌌', price: 1000000, sellPrice: 500000, description: 'Guaranteed Mythic item.', type: 'lootbox', rarity: 'mythic', category: 'lootboxes', levelReq: 50, stackable: true, tradeable: true, usable: true, data: { tier: 'mythic', Atoms: [250000, 1000000] } },
    { id: 'bank_tier_15', name: 'Bank Tier 15', emoji: '🏦', price: 2500000, sellPrice: 0, description: 'Upgrade bank to Tier 15.', type: 'bank_upgrade', rarity: 'mythic', category: 'bank', levelReq: 50, stackable: false, tradeable: false, usable: false, data: { tier: 15 } },
    { id: 'bank_tier_20', name: 'Bank Tier 20 (ABSOLUTE MAX)', emoji: '🏛️', price: 10000000, sellPrice: 0, description: 'The highest possible bank tier.', type: 'bank_upgrade', rarity: 'mythic', category: 'bank', levelReq: 100, stackable: false, tradeable: false, usable: false, data: { tier: 20 } },
    { id: 'col_alien_artifact', name: 'Alien Artifact', emoji: '🛸', price: 500000, sellPrice: 250000, description: 'Found in a crater.', type: 'collectible', rarity: 'legendary', category: 'collectibles', levelReq: 40, stackable: true, tradeable: true, usable: false, data: {} },
    { id: 'col_uranium_rod', name: 'Pure Uranium Rod', emoji: '☢️', price: 2000000, sellPrice: 1000000, description: 'Highly radioactive.', type: 'collectible', rarity: 'mythic', category: 'collectibles', levelReq: 60, stackable: true, tradeable: true, usable: false, data: {} }
];

// Add the new items but prevent duplicates if running twice
const existingIds = new Set(shopData.items.map(i => i.id));
newItems.forEach(item => {
    if (!existingIds.has(item.id)) {
        shopData.items.push(item);
    }
});

// Sort shopData.items by levelReq ascending
shopData.items.sort((a, b) => a.levelReq - b.levelReq);

fs.writeFileSync(shopPath, JSON.stringify(shopData, null, 2));
console.log('Shop updated successfully.');
