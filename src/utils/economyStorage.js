// src/utils/economyStorage.js
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { isMongoReady } = require('../database/dbUtils');
const { EcoUser, EcoStat, EcoInventory, EcoCooldown, EcoCosmetic, EcoMeta } = require('../database/mongoose');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'economy.db');
const db = new sqlite3.Database(DB_PATH);

// --- small promise helpers ---
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// --- schema init ---
let INIT_PROMISE = null;

async function initEconomy() {
  if (INIT_PROMISE) return INIT_PROMISE;

  INIT_PROMISE = (async () => {
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        userId    TEXT PRIMARY KEY,
        wallet    INTEGER NOT NULL DEFAULT 0,
        bank      INTEGER NOT NULL DEFAULT 0,
        createdAt INTEGER,
        updatedAt INTEGER
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS stats (
        userId TEXT NOT NULL,
        key    TEXT NOT NULL,
        value  INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (userId, key)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS inventory (
        userId   TEXT NOT NULL,
        itemId   TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (userId, itemId)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS cooldowns (
        userId   TEXT NOT NULL,
        key      TEXT NOT NULL,
        lastUsed INTEGER NOT NULL,
        PRIMARY KEY (userId, key)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS cosmetics (
        userId TEXT PRIMARY KEY,
        title  TEXT,
        badge  TEXT,
        frame  TEXT,
        color  TEXT
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS meta (
        key   TEXT PRIMARY KEY,
        value TEXT
      )
    `);
  })();

  return INIT_PROMISE;
}

// --- users / balances ---

async function ensureUserRow(userId) {
  if (isMongoReady()) {
    const doc = await EcoUser.findOne({ userId });
    if (!doc) {
      const now = Date.now();
      await EcoUser.create({ userId, wallet: 0, bank: 0, createdAt: now, updatedAt: now });
    }
    return;
  }

  const now = Date.now();
  await run(
    `
    INSERT OR IGNORE INTO users (userId, wallet, bank, createdAt, updatedAt)
    VALUES (?, 0, 0, ?, ?)
  `,
    [userId, now, now]
  );
}

async function getBalance(userId) {
  await ensureUserRow(userId);
  if (isMongoReady()) {
    const doc = await EcoUser.findOne({ userId });
    return {
      wallet: doc?.wallet ?? 0,
      bank: doc?.bank ?? 0
    };
  }

  await initEconomy();
  const row = await get(
    `SELECT wallet, bank FROM users WHERE userId = ?`,
    [userId]
  );

  return {
    wallet: row?.wallet ?? 0,
    bank: row?.bank ?? 0
  };
}

async function setBalance(userId, { wallet, bank }) {
  await ensureUserRow(userId);
  const now = Date.now();

  if (isMongoReady()) {
    const bal = await getBalance(userId);
    const newWallet = typeof wallet === 'number' ? wallet : bal.wallet;
    const newBank = typeof bank === 'number' ? bank : bal.bank;
    await EcoUser.updateOne({ userId }, { wallet: newWallet, bank: newBank, updatedAt: now });
    return { wallet: newWallet, bank: newBank };
  }

  await initEconomy();
  const bal = await getBalance(userId);
  const newWallet = typeof wallet === 'number' ? wallet : bal.wallet;
  const newBank = typeof bank === 'number' ? bank : bal.bank;

  await run(
    `
    UPDATE users
    SET wallet = ?, bank = ?, updatedAt = ?
    WHERE userId = ?
  `,
    [newWallet, newBank, now, userId]
  );

  return { wallet: newWallet, bank: newBank };
}

async function addWallet(userId, delta) {
  await ensureUserRow(userId);
  const now = Date.now();

  if (isMongoReady()) {
    await EcoUser.updateOne({ userId }, { $inc: { wallet: delta }, $set: { updatedAt: now } });
    return getBalance(userId);
  }

  await initEconomy();
  await run(
    `
    UPDATE users
    SET wallet = wallet + ?, updatedAt = ?
    WHERE userId = ?
  `,
    [delta, now, userId]
  );

  return getBalance(userId);
}

async function addBank(userId, delta) {
  await ensureUserRow(userId);
  const now = Date.now();

  if (isMongoReady()) {
    await EcoUser.updateOne({ userId }, { $inc: { bank: delta }, $set: { updatedAt: now } });
    return getBalance(userId);
  }

  await initEconomy();
  await run(
    `
    UPDATE users
    SET bank = bank + ?, updatedAt = ?
    WHERE userId = ?
  `,
    [delta, now, userId]
  );

  return getBalance(userId);
}

// --- stats ---

async function getStats(userId) {
  if (isMongoReady()) {
    const docs = await EcoStat.find({ userId });
    const out = {};
    for (const doc of docs) out[doc.key] = doc.value;
    return out;
  }

  await initEconomy();
  const rows = await all(
    `SELECT key, value FROM stats WHERE userId = ?`,
    [userId]
  );

  const out = {};
  for (const r of rows) {
    out[r.key] = r.value;
  }
  return out;
}

async function bumpStat(userId, key, delta = 1) {
  if (isMongoReady()) {
    await EcoStat.findOneAndUpdate({ userId, key }, { $inc: { value: delta } }, { upsert: true });
    return;
  }

  await initEconomy();
  await run(
    `
    INSERT INTO stats (userId, key, value)
    VALUES (?, ?, ?)
    ON CONFLICT(userId, key) DO UPDATE
    SET value = value + excluded.value
  `,
    [userId, key, delta]
  );
}

async function setStat(userId, key, value) {
  if (isMongoReady()) {
    await EcoStat.findOneAndUpdate({ userId, key }, { value }, { upsert: true });
    return;
  }

  await initEconomy();
  await run(
    `
    INSERT INTO stats (userId, key, value)
    VALUES (?, ?, ?)
    ON CONFLICT(userId, key) DO UPDATE
    SET value = excluded.value
  `,
    [userId, key, value]
  );
}

async function getStat(userId, key) {
  if (isMongoReady()) {
    const doc = await EcoStat.findOne({ userId, key });
    return doc ? doc.value : 0;
  }

  await initEconomy();
  const row = await get(
    `SELECT value FROM stats WHERE userId = ? AND key = ?`,
    [userId, key]
  );
  return row ? row.value : 0;
}

// --- inventory ---

async function getInventory(userId) {
  if (isMongoReady()) {
    const docs = await EcoInventory.find({ userId, quantity: { $gt: 0 } });
    return docs.map(d => ({ itemId: d.itemId, quantity: d.quantity }));
  }

  await initEconomy();
  const rows = await all(
    `SELECT itemId, quantity FROM inventory WHERE userId = ? AND quantity > 0`,
    [userId]
  );
  return rows; // [{ itemId, quantity }]
}

async function addInventoryItem(userId, itemId, qty = 1) {
  if (qty === 0) return;

  if (isMongoReady()) {
    await EcoInventory.findOneAndUpdate(
      { userId, itemId },
      { $inc: { quantity: qty } },
      { upsert: true }
    );
    await EcoInventory.deleteMany({ userId, itemId, quantity: { $lte: 0 } });
    return;
  }

  await initEconomy();
  await run(
    `
    INSERT INTO inventory (userId, itemId, quantity)
    VALUES (?, ?, ?)
    ON CONFLICT(userId, itemId) DO UPDATE
    SET quantity = MAX(0, quantity + excluded.quantity)
  `,
    [userId, itemId, qty]
  );

  await run(
    `DELETE FROM inventory WHERE userId = ? AND itemId = ? AND quantity <= 0`,
    [userId, itemId]
  );
}

async function consumeInventoryItem(userId, itemId, qty = 1) {
  if (isMongoReady()) {
    const doc = await EcoInventory.findOne({ userId, itemId });
    if (!doc || doc.quantity < qty) return false;
    const newQty = doc.quantity - qty;
    if (newQty > 0) {
      await EcoInventory.updateOne({ userId, itemId }, { quantity: newQty });
    } else {
      await EcoInventory.deleteOne({ userId, itemId });
    }
    return true;
  }

  await initEconomy();
  const row = await get(
    `SELECT quantity FROM inventory WHERE userId = ? AND itemId = ?`,
    [userId, itemId]
  );

  if (!row || row.quantity < qty) return false;

  const newQty = row.quantity - qty;
  if (newQty > 0) {
    await run(
      `UPDATE inventory SET quantity = ? WHERE userId = ? AND itemId = ?`,
      [newQty, userId, itemId]
    );
  } else {
    await run(
      `DELETE FROM inventory WHERE userId = ? AND itemId = ?`,
      [userId, itemId]
    );
  }

  return true;
}

// --- cooldowns ---

async function getCooldown(userId, key) {
  if (isMongoReady()) {
    const doc = await EcoCooldown.findOne({ userId, key });
    return doc ? doc.lastUsed : null;
  }

  await initEconomy();
  const row = await get(
    `SELECT lastUsed FROM cooldowns WHERE userId = ? AND key = ?`,
    [userId, key]
  );
  return row ? row.lastUsed : null;
}

async function setCooldown(userId, key, timestampMs) {
  if (isMongoReady()) {
    await EcoCooldown.findOneAndUpdate({ userId, key }, { lastUsed: timestampMs }, { upsert: true });
    return;
  }

  await initEconomy();
  await run(
    `
    INSERT INTO cooldowns (userId, key, lastUsed)
    VALUES (?, ?, ?)
    ON CONFLICT(userId, key) DO UPDATE
    SET lastUsed = excluded.lastUsed
  `,
    [userId, key, timestampMs]
  );
}

// --- leaderboard ---

async function getLeaderboard(type = 'net', limit = 10) {
  if (isMongoReady()) {
    let sortObj = {};
    if (type === 'wallet') sortObj = { wallet: -1 };
    else if (type === 'bank') sortObj = { bank: -1 };
    else sortObj = { net: -1 };

    const docs = await EcoUser.aggregate([
      { $project: { userId: 1, wallet: 1, bank: 1, net: { $add: ["$wallet", "$bank"] } } },
      { $sort: sortObj },
      { $limit: limit }
    ]);
    return docs.map(d => ({ userId: d.userId, wallet: d.wallet, bank: d.bank, net: d.net }));
  }

  await initEconomy();
  let sql;
  if (type === 'wallet') {
    sql = `
      SELECT userId, wallet, bank, (wallet + bank) AS net
      FROM users
      ORDER BY wallet DESC
      LIMIT ?
    `;
  } else if (type === 'bank') {
    sql = `
      SELECT userId, wallet, bank, (wallet + bank) AS net
      FROM users
      ORDER BY bank DESC
      LIMIT ?
    `;
  } else {
    sql = `
      SELECT userId, wallet, bank, (wallet + bank) AS net
      FROM users
      ORDER BY net DESC
      LIMIT ?
    `;
  }

  const rows = await all(sql, [limit]);
  return rows;
}

// --- cosmetics ---

async function getCosmetics(userId) {
  if (isMongoReady()) {
    const doc = await EcoCosmetic.findOne({ userId });
    return doc ? { title: doc.title, badge: doc.badge, frame: doc.frame, color: doc.color } : {};
  }

  await initEconomy();
  const row = await get(
    `SELECT title, badge, frame, color FROM cosmetics WHERE userId = ?`,
    [userId]
  );
  return row || {};
}

async function setCosmetics(userId, patch = {}) {
  const existing = await getCosmetics(userId);
  const merged = {
    title: patch.title !== undefined ? patch.title : existing.title || null,
    badge: patch.badge !== undefined ? patch.badge : existing.badge || null,
    frame: patch.frame !== undefined ? patch.frame : existing.frame || null,
    color: patch.color !== undefined ? patch.color : existing.color || null
  };

  if (isMongoReady()) {
    await EcoCosmetic.findOneAndUpdate({ userId }, merged, { upsert: true });
    return merged;
  }

  await initEconomy();
  await run(
    `
    INSERT INTO cosmetics (userId, title, badge, frame, color)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(userId) DO UPDATE
    SET title = excluded.title,
        badge = excluded.badge,
        frame = excluded.frame,
        color = excluded.color
  `,
    [userId, merged.title, merged.badge, merged.frame, merged.color]
  );

  return merged;
}

// --- meta / global flags ---

async function getMeta(key) {
  if (isMongoReady()) {
    const doc = await EcoMeta.findOne({ key });
    return doc ? doc.value : null;
  }

  await initEconomy();
  const row = await get(`SELECT value FROM meta WHERE key = ?`, [key]);
  return row ? row.value : null;
}

async function setMeta(key, value) {
  if (isMongoReady()) {
    await EcoMeta.findOneAndUpdate({ key }, { value: String(value) }, { upsert: true });
    return;
  }

  await initEconomy();
  await run(
    `
    INSERT INTO meta (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE
    SET value = excluded.value
  `,
    [key, String(value)]
  );
}

async function getGlobalEconomyDisabled() {
  const v = await getMeta('economy_disabled');
  return v === '1';
}

async function setGlobalEconomyDisabled(disabled) {
  await setMeta('economy_disabled', disabled ? '1' : '0');
}

// --- admin ops ---

async function resetUserEconomy(userId) {
  if (isMongoReady()) {
    await EcoStat.deleteMany({ userId });
    await EcoInventory.deleteMany({ userId });
    await EcoCooldown.deleteMany({ userId });
    await EcoCosmetic.deleteOne({ userId });
    await EcoUser.updateOne({ userId }, { wallet: 0, bank: 0, updatedAt: Date.now() });
    return;
  }

  await initEconomy();
  await run(`DELETE FROM stats WHERE userId = ?`, [userId]);
  await run(`DELETE FROM inventory WHERE userId = ?`, [userId]);
  await run(`DELETE FROM cooldowns WHERE userId = ?`, [userId]);
  await run(`DELETE FROM cosmetics WHERE userId = ?`, [userId]);

  await run(
    `UPDATE users SET wallet = 0, bank = 0, updatedAt = ? WHERE userId = ?`,
    [Date.now(), userId]
  );
}

async function wipeEverything() {
  if (isMongoReady()) {
    await EcoStat.deleteMany({});
    await EcoInventory.deleteMany({});
    await EcoCooldown.deleteMany({});
    await EcoCosmetic.deleteMany({});
    await EcoUser.deleteMany({});
    await EcoMeta.deleteMany({});
    return;
  }

  await initEconomy();
  await run(`DELETE FROM stats`);
  await run(`DELETE FROM inventory`);
  await run(`DELETE FROM cooldowns`);
  await run(`DELETE FROM cosmetics`);
  await run(`DELETE FROM users`);
  await run(`DELETE FROM meta`);
}

module.exports = {
  initEconomy,

  getBalance,
  setBalance,
  addWallet,
  addBank,

  getStats,
  bumpStat,
  getStat,
  setStat,

  getInventory,
  addInventoryItem,
  consumeInventoryItem,

  getCooldown,
  setCooldown,

  getLeaderboard,

  getCosmetics,
  setCosmetics,

  getMeta,
  setMeta,
  getGlobalEconomyDisabled,
  setGlobalEconomyDisabled,

  resetUserEconomy,
  wipeEverything
};