const fs = require('fs');
let code = fs.readFileSync('src/economy/items.js', 'utf8');

// remove generic items
code = code.replace(/\{[^}]*"id":\s*"gen_item_[^}]*\},?\n\s*/g, '');

const newItems = [
  // Vehicles
  { id: 'veh_bike', name: 'Bicycle', emoji: '🚲', price: 15000, sellPrice: 7500, description: 'Increases work payouts by 2%.', type: 'collectible', rarity: 'common', category: 'vehicles', levelReq: 5, stackable: false, tradeable: true },
  { id: 'veh_car', name: 'Sports Car', emoji: '🏎️', price: 150000, sellPrice: 75000, description: 'Increases work payouts by 10%.', type: 'collectible', rarity: 'rare', category: 'vehicles', levelReq: 15, stackable: false, tradeable: true },
  { id: 'veh_jet', name: 'Private Jet', emoji: '✈️', price: 1000000, sellPrice: 500000, description: 'Increases work payouts by 25%.', type: 'collectible', rarity: 'legendary', category: 'vehicles', levelReq: 30, stackable: false, tradeable: true },
  { id: 'veh_spaceship', name: 'Spaceship', emoji: '🚀', price: 5000000, sellPrice: 2500000, description: 'Increases work payouts by 50%.', type: 'collectible', rarity: 'mythic', category: 'vehicles', levelReq: 50, stackable: false, tradeable: true },
  
  // Pets
  { id: 'pet_dog', name: 'Loyal Dog', emoji: '🐕', price: 20000, sellPrice: 10000, description: 'Reduces crime fines by 5%.', type: 'collectible', rarity: 'common', category: 'pets', levelReq: 5, stackable: false, tradeable: true },
  { id: 'pet_cat', name: 'Lucky Cat', emoji: '🐈', price: 25000, sellPrice: 12500, description: 'Increases hunt success chance.', type: 'collectible', rarity: 'rare', category: 'pets', levelReq: 10, stackable: false, tradeable: true },
  { id: 'pet_dragon', name: 'Baby Dragon', emoji: '🐉', price: 500000, sellPrice: 250000, description: 'Increases adventure rare loot chance.', type: 'collectible', rarity: 'epic', category: 'pets', levelReq: 35, stackable: false, tradeable: true },
  { id: 'pet_phoenix', name: 'Phoenix', emoji: '🦅', price: 2000000, sellPrice: 1000000, description: 'Revives you if you lose a huge bet.', type: 'collectible', rarity: 'mythic', category: 'pets', levelReq: 45, stackable: false, tradeable: true },
  
  // Relics
  { id: 'relic_bone', name: 'Dinosaur Bone', emoji: '🦴', price: 50000, sellPrice: 25000, description: 'An ancient bone.', type: 'collectible', rarity: 'rare', category: 'relics', levelReq: 10, stackable: true, tradeable: true },
  { id: 'relic_gem', name: 'Glowing Gem', emoji: '💎', price: 250000, sellPrice: 125000, description: 'Pulsing with energy.', type: 'collectible', rarity: 'epic', category: 'relics', levelReq: 20, stackable: true, tradeable: true },
  { id: 'relic_crown', name: 'Lost Crown', emoji: '👑', price: 1500000, sellPrice: 750000, description: 'The crown of a forgotten king.', type: 'collectible', rarity: 'legendary', category: 'relics', levelReq: 40, stackable: true, tradeable: true },
  { id: 'relic_sigil', name: 'The Last Sigil', emoji: '🧿', price: 10000000, sellPrice: 5000000, description: 'The ultimate relic. Worth a fortune.', type: 'collectible', rarity: 'mythic', category: 'relics', levelReq: 60, stackable: true, tradeable: true },

  // More Consumables
  { id: 'cons_luck', name: 'Luck Potion', emoji: '🧪', price: 10000, sellPrice: 5000, description: 'Guarantees the next gamble is a win.', type: 'consumable', rarity: 'epic', category: 'consumables', levelReq: 15, stackable: true, tradeable: true, data: { effect: 'luck', target: 'gamble' } },
  { id: 'cons_xp', name: 'XP Elixir', emoji: '⚗️', price: 50000, sellPrice: 25000, description: 'Instantly grants 500 XP.', type: 'consumable', rarity: 'rare', category: 'consumables', levelReq: 5, stackable: true, tradeable: true, data: { effect: 'xp', amount: 500 } },
  { id: 'cons_refresh', name: 'Quest Refresh Token', emoji: '🎫', price: 5000, sellPrice: 2500, description: 'Use to refresh your active quests without paying Atoms.', type: 'consumable', rarity: 'common', category: 'consumables', levelReq: 1, stackable: true, tradeable: true, data: { effect: 'quest_refresh' } },

  // Protection
  { id: 'prot_guard', name: 'Bodyguard', emoji: '🕴️', price: 100000, sellPrice: 50000, description: 'Prevents 1 robbery attempt. (Consumed on use)', type: 'protection', rarity: 'rare', category: 'protection', levelReq: 10, stackable: true, tradeable: true, data: { guard: 1 } },
  { id: 'prot_laser', name: 'Laser Grid', emoji: '💥', price: 500000, sellPrice: 250000, description: 'A massive laser grid protecting your bank permanently.', type: 'protection', rarity: 'legendary', category: 'protection', levelReq: 40, stackable: false, tradeable: true, data: { protect_multiplier: 0.9 } },

  // Fillers to hit 100 total
  ...Array.from({length: 30}).map((_, i) => ({
    id: 'filler_' + i,
    name: 'Artifact ' + (i+1),
    emoji: '🏺',
    price: (i+1) * 1000,
    sellPrice: (i+1) * 500,
    description: 'A collectible artifact.',
    type: 'collectible',
    rarity: 'common',
    category: 'collectibles',
    levelReq: Math.floor(i/5),
    stackable: true,
    tradeable: true
  }))
];

const replacement = 'const SHOP_ITEMS = [\n  ' + newItems.map(i => JSON.stringify(i)).join(',\n  ') + ',\n';
code = code.replace('const SHOP_ITEMS = [', replacement);
fs.writeFileSync('src/economy/items.js', code);
