// src/economy/items.js — Uranium Item Registry
const fs = require('fs');
const path = require('path');

const SHOP_FILE = path.join(__dirname, 'shop.json');
let shopData = { items: [], categories: [] };
let _index = {};

function loadShop() {
  try {
    const raw = fs.readFileSync(SHOP_FILE, 'utf8');
    shopData = JSON.parse(raw);
    _index = {};
    for (const item of shopData.items) _index[item.id] = item;
  } catch (err) {
    console.error('[items.js] Failed to load shop.json:', err);
  }
}

// Initial load
loadShop();

function findItem(id) { return _index[id] || null; }
function getItemsByCategory(cat) { return shopData.items.filter(i => i.category === cat); }
function getItemsByRarity(rarity) { return shopData.items.filter(i => i.rarity === rarity); }
function getItemsByType(type) { return shopData.items.filter(i => i.type === type); }
function getAllItems() { return shopData.items; }
function getCategories() { return shopData.categories; }

function getShopData() {
  return {
    categories: shopData.categories.map(cat => ({
      ...cat,
      items: getItemsByCategory(cat.id)
    }))
  };
}

module.exports = {
  loadShop, findItem, getItemsByCategory, getItemsByRarity,
  getItemsByType, getAllItems, getCategories, getShopData
};
