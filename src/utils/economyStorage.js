const fs = require('fs');
const path = require('path');
const { randomUUID } = require('node:crypto');
const sqlite3 = require('sqlite3').verbose();
const logger = require('./logger');
const { isMongoReady } = require('../database/dbUtils');
const {
  EcoUser,
  EcoStat,
  EcoInventory,
  EcoCooldown,
  EcoCosmetic,
  EcoMeta,
  EcoItemInstance,
  EcoEffect,
  EcoLoadout,
  EcoQuestState
} = require('../database/mongoose');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'economy.db');
const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
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

function encodeJson(value) {
  return JSON.stringify(value ?? {});
}

function decodeJson(value, fallback = {}) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function encodeStatValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return `__JSON__${JSON.stringify(value)}`;
}

function decodeStatValue(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string' && value.startsWith('__JSON__')) {
    return decodeJson(value.slice('__JSON__'.length), 0);
  }
  return value;
}

function buildInventoryRow(itemId, quantity, extras = {}) {
  return {
    itemId,
    quantity,
    id: itemId,
    amount: quantity,
    ...extras
  };
}

let INIT_PROMISE = null;

async function initEconomy() {
  if (INIT_PROMISE) return INIT_PROMISE;

  INIT_PROMISE = (async () => {
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        wallet INTEGER NOT NULL DEFAULT 0,
        bank INTEGER NOT NULL DEFAULT 0,
        createdAt INTEGER,
        updatedAt INTEGER
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS stats (
        userId TEXT NOT NULL,
        key TEXT NOT NULL,
        value NOT NULL DEFAULT 0,
        PRIMARY KEY (userId, key)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS inventory (
        userId TEXT NOT NULL,
        itemId TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (userId, itemId)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS cooldowns (
        userId TEXT NOT NULL,
        key TEXT NOT NULL,
        lastUsed INTEGER NOT NULL,
        PRIMARY KEY (userId, key)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS cosmetics (
        userId TEXT PRIMARY KEY,
        title TEXT,
        badge TEXT,
        frame TEXT,
        color TEXT
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS item_instances (
        instanceId TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        itemId TEXT NOT NULL,
        durability INTEGER,
        maxDurability INTEGER,
        equippedSlot TEXT,
        metadataJson TEXT,
        createdAt INTEGER,
        updatedAt INTEGER
      )
    `);
    await run(`CREATE INDEX IF NOT EXISTS idx_item_instances_user_item ON item_instances(userId, itemId)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_item_instances_user_slot ON item_instances(userId, equippedSlot)`);

    await run(`
      CREATE TABLE IF NOT EXISTS active_effects (
        effectId TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        key TEXT NOT NULL,
        itemId TEXT,
        sourceType TEXT,
        expiresAt INTEGER,
        usesRemaining INTEGER,
        stacks INTEGER NOT NULL DEFAULT 1,
        metadataJson TEXT,
        createdAt INTEGER,
        updatedAt INTEGER
      )
    `);
    await run(`CREATE INDEX IF NOT EXISTS idx_active_effects_user_key ON active_effects(userId, key)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_active_effects_user_expiry ON active_effects(userId, expiresAt)`);

    await run(`
      CREATE TABLE IF NOT EXISTS loadouts (
        userId TEXT NOT NULL,
        slot TEXT NOT NULL,
        itemId TEXT NOT NULL,
        instanceId TEXT,
        metadataJson TEXT,
        updatedAt INTEGER,
        PRIMARY KEY (userId, slot)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS quest_states (
        userId TEXT PRIMARY KEY,
        activeIdsJson TEXT,
        claimedIdsJson TEXT,
        lastRefresh INTEGER,
        updatedAt INTEGER
      )
    `);
  })();

  return INIT_PROMISE;
}

async function ensureUserRow(userId) {
  if (isMongoReady()) {
    try {
      const doc = await EcoUser.findOne({ userId });
      if (!doc) {
        const now = Date.now();
        await EcoUser.create({ userId, wallet: 0, bank: 0, createdAt: now, updatedAt: now });
      }
      return;
    } catch (error) {
      logger.error('[Economy] MongoDB ensureUserRow failed: %s', error.message);
    }
  }

  await initEconomy();
  const now = Date.now();
  await run(
    `INSERT OR IGNORE INTO users (userId, wallet, bank, createdAt, updatedAt) VALUES (?, 0, 0, ?, ?)`,
    [userId, now, now]
  );
}

async function getBalance(userId) {
  await ensureUserRow(userId);

  if (isMongoReady()) {
    try {
      const doc = await EcoUser.findOne({ userId });
      return { wallet: doc?.wallet ?? 0, bank: doc?.bank ?? 0 };
    } catch (error) {
      logger.error('[Economy] MongoDB getBalance failed: %s', error.message);
    }
  }

  await initEconomy();
  const row = await get(`SELECT wallet, bank FROM users WHERE userId = ?`, [userId]);
  return { wallet: row?.wallet ?? 0, bank: row?.bank ?? 0 };
}

async function setBalance(userId, { wallet, bank }) {
  await ensureUserRow(userId);
  const current = await getBalance(userId);
  const next = {
    wallet: typeof wallet === 'number' ? wallet : current.wallet,
    bank: typeof bank === 'number' ? bank : current.bank
  };
  const now = Date.now();

  if (isMongoReady()) {
    try {
      await EcoUser.updateOne({ userId }, { wallet: next.wallet, bank: next.bank, updatedAt: now });
      return next;
    } catch (error) {
      logger.error('[Economy] MongoDB setBalance failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(`UPDATE users SET wallet = ?, bank = ?, updatedAt = ? WHERE userId = ?`, [next.wallet, next.bank, now, userId]);
  return next;
}

async function addWallet(userId, delta) {
  await ensureUserRow(userId);
  const now = Date.now();

  if (isMongoReady()) {
    try {
      const bal = await getBalance(userId);
      const next = Math.max(0, bal.wallet + delta);
      await EcoUser.updateOne({ userId }, { wallet: next, updatedAt: now });
      return { wallet: next, bank: bal.bank };
    } catch (error) {
      logger.error('[Economy] MongoDB addWallet failed: %s', error.message);
    }
  }

  await initEconomy();
  const bal = await getBalance(userId);
  const next = Math.max(0, bal.wallet + delta);
  await run(`UPDATE users SET wallet = ?, updatedAt = ? WHERE userId = ?`, [next, now, userId]);
  return { wallet: next, bank: bal.bank };
}

async function addBank(userId, delta) {
  await ensureUserRow(userId);
  const now = Date.now();

  if (isMongoReady()) {
    try {
      const bal = await getBalance(userId);
      const next = Math.max(0, bal.bank + delta);
      await EcoUser.updateOne({ userId }, { bank: next, updatedAt: now });
      return { wallet: bal.wallet, bank: next };
    } catch (error) {
      logger.error('[Economy] MongoDB addBank failed: %s', error.message);
    }
  }

  await initEconomy();
  const bal = await getBalance(userId);
  const next = Math.max(0, bal.bank + delta);
  await run(`UPDATE users SET bank = ?, updatedAt = ? WHERE userId = ?`, [next, now, userId]);
  return { wallet: bal.wallet, bank: next };
}

async function getStats(userId) {
  if (isMongoReady()) {
    try {
      const docs = await EcoStat.find({ userId });
      const out = {};
      for (const doc of docs) out[doc.key] = doc.value;
      return out;
    } catch (error) {
      logger.error('[Economy] MongoDB getStats failed: %s', error.message);
    }
  }

  await initEconomy();
  const rows = await all(`SELECT key, value FROM stats WHERE userId = ?`, [userId]);
  const out = {};
  for (const row of rows) out[row.key] = decodeStatValue(row.value);
  return out;
}

async function getStat(userId, key) {
  if (isMongoReady()) {
    try {
      const doc = await EcoStat.findOne({ userId, key });
      return doc ? doc.value : 0;
    } catch (error) {
      logger.error('[Economy] MongoDB getStat failed: %s', error.message);
    }
  }

  await initEconomy();
  const row = await get(`SELECT value FROM stats WHERE userId = ? AND key = ?`, [userId, key]);
  return row ? decodeStatValue(row.value) : 0;
}

async function setStat(userId, key, value) {
  if (isMongoReady()) {
    try {
      await EcoStat.findOneAndUpdate({ userId, key }, { value }, { upsert: true });
      return value;
    } catch (error) {
      logger.error('[Economy] MongoDB setStat failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(
    `INSERT INTO stats (userId, key, value) VALUES (?, ?, ?) ON CONFLICT(userId, key) DO UPDATE SET value = excluded.value`,
    [userId, key, encodeStatValue(value)]
  );
  return value;
}

async function bumpStat(userId, key, delta = 1) {
  if (isMongoReady()) {
    try {
      const existing = await EcoStat.findOne({ userId, key });
      const current = typeof existing?.value === 'number' ? existing.value : Number(existing?.value || 0);
      await EcoStat.findOneAndUpdate({ userId, key }, { value: current + delta }, { upsert: true });
      return current + delta;
    } catch (error) {
      logger.error('[Economy] MongoDB bumpStat failed: %s', error.message);
    }
  }

  await initEconomy();
  const current = Number(await getStat(userId, key) || 0);
  const next = current + delta;
  await setStat(userId, key, next);
  return next;
}

async function getCooldown(userId, key) {
  if (isMongoReady()) {
    try {
      const doc = await EcoCooldown.findOne({ userId, key });
      return doc ? doc.lastUsed : null;
    } catch (error) {
      logger.error('[Economy] MongoDB getCooldown failed: %s', error.message);
    }
  }

  await initEconomy();
  const row = await get(`SELECT lastUsed FROM cooldowns WHERE userId = ? AND key = ?`, [userId, key]);
  return row ? row.lastUsed : null;
}

async function setCooldown(userId, key, timestampMs) {
  if (isMongoReady()) {
    try {
      await EcoCooldown.findOneAndUpdate({ userId, key }, { lastUsed: timestampMs }, { upsert: true });
      return;
    } catch (error) {
      logger.error('[Economy] MongoDB setCooldown failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(
    `INSERT INTO cooldowns (userId, key, lastUsed) VALUES (?, ?, ?) ON CONFLICT(userId, key) DO UPDATE SET lastUsed = excluded.lastUsed`,
    [userId, key, timestampMs]
  );
}

async function getCosmetics(userId) {
  if (isMongoReady()) {
    try {
      const doc = await EcoCosmetic.findOne({ userId });
      return doc ? { title: doc.title, badge: doc.badge, frame: doc.frame, color: doc.color } : {};
    } catch (error) {
      logger.error('[Economy] MongoDB getCosmetics failed: %s', error.message);
    }
  }

  await initEconomy();
  const row = await get(`SELECT title, badge, frame, color FROM cosmetics WHERE userId = ?`, [userId]);
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
    try {
      await EcoCosmetic.findOneAndUpdate({ userId }, merged, { upsert: true });
      return merged;
    } catch (error) {
      logger.error('[Economy] MongoDB setCosmetics failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(
    `INSERT INTO cosmetics (userId, title, badge, frame, color) VALUES (?, ?, ?, ?, ?) ON CONFLICT(userId) DO UPDATE SET title = excluded.title, badge = excluded.badge, frame = excluded.frame, color = excluded.color`,
    [userId, merged.title, merged.badge, merged.frame, merged.color]
  );
  return merged;
}

async function getMeta(key) {
  if (isMongoReady()) {
    try {
      const doc = await EcoMeta.findOne({ key });
      return doc ? doc.value : null;
    } catch (error) {
      logger.error('[Economy] MongoDB getMeta failed: %s', error.message);
    }
  }

  await initEconomy();
  const row = await get(`SELECT value FROM meta WHERE key = ?`, [key]);
  return row ? row.value : null;
}

async function setMeta(key, value) {
  const next = String(value);

  if (isMongoReady()) {
    try {
      await EcoMeta.findOneAndUpdate({ key }, { value: next }, { upsert: true });
      return;
    } catch (error) {
      logger.error('[Economy] MongoDB setMeta failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(
    `INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, next]
  );
}

async function getGlobalEconomyDisabled() {
  const value = await getMeta('economy_disabled');
  return value === '1';
}

async function setGlobalEconomyDisabled(disabled) {
  await setMeta('economy_disabled', disabled ? '1' : '0');
}

function normalizeInstanceDoc(doc) {
  if (!doc) return null;
  return {
    instanceId: doc.instanceId,
    userId: doc.userId,
    itemId: doc.itemId,
    durability: doc.durability ?? null,
    maxDurability: doc.maxDurability ?? null,
    equippedSlot: doc.equippedSlot ?? null,
    metadata: decodeJson(doc.metadataJson ?? doc.metadata, {}),
    createdAt: doc.createdAt ?? 0,
    updatedAt: doc.updatedAt ?? 0
  };
}

async function createItemInstance(userId, itemId, patch = {}) {
  const now = Date.now();
  const instance = {
    instanceId: patch.instanceId || randomUUID(),
    userId,
    itemId,
    durability: patch.durability ?? null,
    maxDurability: patch.maxDurability ?? null,
    equippedSlot: patch.equippedSlot ?? null,
    metadata: patch.metadata ?? {},
    createdAt: patch.createdAt || now,
    updatedAt: now
  };

  if (isMongoReady()) {
    try {
      await EcoItemInstance.create(instance);
      return instance;
    } catch (error) {
      logger.error('[Economy] MongoDB createItemInstance failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(
    `INSERT INTO item_instances (instanceId, userId, itemId, durability, maxDurability, equippedSlot, metadataJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      instance.instanceId,
      instance.userId,
      instance.itemId,
      instance.durability,
      instance.maxDurability,
      instance.equippedSlot,
      encodeJson(instance.metadata),
      instance.createdAt,
      instance.updatedAt
    ]
  );
  return instance;
}

async function getItemInstance(instanceId) {
  if (isMongoReady()) {
    try {
      const doc = await EcoItemInstance.findOne({ instanceId });
      return normalizeInstanceDoc(doc);
    } catch (error) {
      logger.error('[Economy] MongoDB getItemInstance failed: %s', error.message);
    }
  }

  await initEconomy();
  const row = await get(`SELECT * FROM item_instances WHERE instanceId = ?`, [instanceId]);
  return normalizeInstanceDoc(row);
}

async function getItemInstances(userId, filters = {}) {
  if (isMongoReady()) {
    try {
      const query = { userId };
      if (filters.itemId) query.itemId = filters.itemId;
      if (filters.equippedSlot) query.equippedSlot = filters.equippedSlot;
      const docs = await EcoItemInstance.find(query).sort({ createdAt: 1 });
      return docs.map(normalizeInstanceDoc);
    } catch (error) {
      logger.error('[Economy] MongoDB getItemInstances failed: %s', error.message);
    }
  }

  await initEconomy();
  const clauses = ['userId = ?'];
  const params = [userId];
  if (filters.itemId) {
    clauses.push('itemId = ?');
    params.push(filters.itemId);
  }
  if (filters.equippedSlot) {
    clauses.push('equippedSlot = ?');
    params.push(filters.equippedSlot);
  }
  const rows = await all(`SELECT * FROM item_instances WHERE ${clauses.join(' AND ')} ORDER BY createdAt ASC`, params);
  return rows.map(normalizeInstanceDoc);
}

async function updateItemInstance(instanceId, patch = {}) {
  const existing = await getItemInstance(instanceId);
  if (!existing) return null;
  const next = {
    ...existing,
    durability: patch.durability !== undefined ? patch.durability : existing.durability,
    maxDurability: patch.maxDurability !== undefined ? patch.maxDurability : existing.maxDurability,
    equippedSlot: patch.equippedSlot !== undefined ? patch.equippedSlot : existing.equippedSlot,
    metadata: patch.metadata !== undefined ? patch.metadata : existing.metadata,
    updatedAt: Date.now()
  };

  if (isMongoReady()) {
    try {
      await EcoItemInstance.updateOne({ instanceId }, next);
      return next;
    } catch (error) {
      logger.error('[Economy] MongoDB updateItemInstance failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(
    `UPDATE item_instances SET durability = ?, maxDurability = ?, equippedSlot = ?, metadataJson = ?, updatedAt = ? WHERE instanceId = ?`,
    [next.durability, next.maxDurability, next.equippedSlot, encodeJson(next.metadata), next.updatedAt, instanceId]
  );
  return next;
}

async function deleteItemInstance(instanceId) {
  if (isMongoReady()) {
    try {
      await EcoItemInstance.deleteOne({ instanceId });
      return;
    } catch (error) {
      logger.error('[Economy] MongoDB deleteItemInstance failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(`DELETE FROM item_instances WHERE instanceId = ?`, [instanceId]);
}

async function getInventorySnapshot(userId) {
  let stackRows = [];
  let instances = [];

  if (isMongoReady()) {
    try {
      const stackDocs = await EcoInventory.find({ userId, quantity: { $gt: 0 } });
      const instanceDocs = await EcoItemInstance.find({ userId }).sort({ createdAt: 1 });
      stackRows = stackDocs.map((doc) => ({ itemId: doc.itemId, quantity: doc.quantity }));
      instances = instanceDocs.map(normalizeInstanceDoc);
    } catch (error) {
      logger.error('[Economy] MongoDB getInventorySnapshot failed: %s', error.message);
    }
  }

  if (!stackRows.length && !instances.length) {
    await initEconomy();
    stackRows = await all(`SELECT itemId, quantity FROM inventory WHERE userId = ? AND quantity > 0`, [userId]);
    instances = (await all(`SELECT * FROM item_instances WHERE userId = ? ORDER BY createdAt ASC`, [userId])).map(normalizeInstanceDoc);
  }

  const aggregated = new Map();
  for (const row of stackRows) {
    aggregated.set(row.itemId, buildInventoryRow(row.itemId, row.quantity, { stackCount: row.quantity, instanceCount: 0 }));
  }
  for (const instance of instances) {
    const existing = aggregated.get(instance.itemId) || buildInventoryRow(instance.itemId, 0, { stackCount: 0, instanceCount: 0 });
    existing.quantity += 1;
    existing.amount = existing.quantity;
    existing.instanceCount += 1;
    aggregated.set(instance.itemId, existing);
  }

  return {
    rows: Array.from(aggregated.values()).sort((a, b) => a.itemId.localeCompare(b.itemId)),
    stacks: stackRows,
    instances
  };
}

async function getInventory(userId) {
  const snapshot = await getInventorySnapshot(userId);
  return snapshot.rows;
}

async function getInventoryItemCount(userId, itemId) {
  const inventory = await getInventory(userId);
  const row = inventory.find((entry) => entry.itemId === itemId || entry.id === itemId);
  return row ? row.quantity : 0;
}

async function setInventoryStack(userId, itemId, quantity) {
  if (isMongoReady()) {
    try {
      if (quantity <= 0) {
        await EcoInventory.deleteOne({ userId, itemId });
      } else {
        await EcoInventory.findOneAndUpdate({ userId, itemId }, { quantity }, { upsert: true });
      }
      return;
    } catch (error) {
      logger.error('[Economy] MongoDB setInventoryStack failed: %s', error.message);
    }
  }

  await initEconomy();
  if (quantity <= 0) {
    await run(`DELETE FROM inventory WHERE userId = ? AND itemId = ?`, [userId, itemId]);
    return;
  }
  await run(
    `INSERT INTO inventory (userId, itemId, quantity) VALUES (?, ?, ?) ON CONFLICT(userId, itemId) DO UPDATE SET quantity = excluded.quantity`,
    [userId, itemId, quantity]
  );
}

function getItemDefinition(itemId) {
  try {
    const { findItem } = require('../economy/items');
    return findItem(itemId);
  } catch {
    return null;
  }
}

function buildDefaultInstancePatch(item) {
  return {
    durability: item?.data?.durability ?? null,
    maxDurability: item?.data?.durability ?? null,
    metadata: {}
  };
}

async function addInventoryItem(userId, itemId, qty = 1, options = {}) {
  if (!qty) return null;
  if (qty < 0) return consumeInventoryItem(userId, itemId, Math.abs(qty), options);

  const item = getItemDefinition(itemId);
  const forceInstance = options.forceInstance === true;
  const stackable = forceInstance ? false : item?.stackable !== false;

  if (stackable) {
    const current = await getInventoryItemCount(userId, itemId);
    await setInventoryStack(userId, itemId, current + qty);
    return buildInventoryRow(itemId, current + qty);
  }

  const created = [];
  const instancePatch = {
    ...buildDefaultInstancePatch(item),
    ...(options.instancePatch || {})
  };
  for (let index = 0; index < qty; index += 1) {
    created.push(await createItemInstance(userId, itemId, instancePatch));
  }
  return created;
}

async function consumeInventoryItem(userId, itemId, qty = 1) {
  if (qty <= 0) return false;

  const item = getItemDefinition(itemId);
  const stackable = item?.stackable !== false;

  if (stackable) {
    const current = await getInventoryItemCount(userId, itemId);
    if (current < qty) return false;
    await setInventoryStack(userId, itemId, current - qty);
    return true;
  }

  const instances = await getItemInstances(userId, { itemId });
  if (instances.length < qty) return false;
  for (const instance of instances.slice(0, qty)) {
    await deleteItemInstance(instance.instanceId);
  }
  return true;
}

async function removeInventoryItem(userId, itemId, qty = 1) {
  return consumeInventoryItem(userId, itemId, qty);
}

async function getLoadout(userId) {
  if (isMongoReady()) {
    try {
      const docs = await EcoLoadout.find({ userId });
      const out = {};
      for (const doc of docs) {
        out[doc.slot] = {
          itemId: doc.itemId,
          instanceId: doc.instanceId ?? null,
          metadata: doc.metadata ?? {}
        };
      }
      return out;
    } catch (error) {
      logger.error('[Economy] MongoDB getLoadout failed: %s', error.message);
    }
  }

  await initEconomy();
  const rows = await all(`SELECT * FROM loadouts WHERE userId = ?`, [userId]);
  const out = {};
  for (const row of rows) {
    out[row.slot] = {
      itemId: row.itemId,
      instanceId: row.instanceId ?? null,
      metadata: decodeJson(row.metadataJson, {})
    };
  }
  return out;
}

async function setLoadout(userId, slot, payload) {
  const record = {
    userId,
    slot,
    itemId: payload.itemId,
    instanceId: payload.instanceId ?? null,
    metadata: payload.metadata ?? {},
    updatedAt: Date.now()
  };

  if (isMongoReady()) {
    try {
      await EcoLoadout.findOneAndUpdate({ userId, slot }, record, { upsert: true });
      return record;
    } catch (error) {
      logger.error('[Economy] MongoDB setLoadout failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(
    `INSERT INTO loadouts (userId, slot, itemId, instanceId, metadataJson, updatedAt) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(userId, slot) DO UPDATE SET itemId = excluded.itemId, instanceId = excluded.instanceId, metadataJson = excluded.metadataJson, updatedAt = excluded.updatedAt`,
    [record.userId, record.slot, record.itemId, record.instanceId, encodeJson(record.metadata), record.updatedAt]
  );
  return record;
}

async function clearLoadout(userId, slot) {
  if (isMongoReady()) {
    try {
      await EcoLoadout.deleteOne({ userId, slot });
      return;
    } catch (error) {
      logger.error('[Economy] MongoDB clearLoadout failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(`DELETE FROM loadouts WHERE userId = ? AND slot = ?`, [userId, slot]);
}

function normalizeEffectDoc(doc) {
  if (!doc) return null;
  return {
    effectId: doc.effectId,
    userId: doc.userId,
    key: doc.key,
    itemId: doc.itemId ?? null,
    sourceType: doc.sourceType ?? 'item',
    expiresAt: doc.expiresAt ?? null,
    usesRemaining: doc.usesRemaining ?? null,
    stacks: doc.stacks ?? 1,
    metadata: decodeJson(doc.metadataJson ?? doc.metadata, {}),
    createdAt: doc.createdAt ?? 0,
    updatedAt: doc.updatedAt ?? 0
  };
}

async function createEffect(userId, effect) {
  const now = Date.now();
  const record = {
    effectId: effect.effectId || randomUUID(),
    userId,
    key: effect.key,
    itemId: effect.itemId ?? null,
    sourceType: effect.sourceType || 'item',
    expiresAt: effect.expiresAt ?? null,
    usesRemaining: effect.usesRemaining ?? null,
    stacks: effect.stacks ?? 1,
    metadata: effect.metadata ?? {},
    createdAt: effect.createdAt || now,
    updatedAt: now
  };

  if (isMongoReady()) {
    try {
      await EcoEffect.create(record);
      return record;
    } catch (error) {
      logger.error('[Economy] MongoDB createEffect failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(
    `INSERT INTO active_effects (effectId, userId, key, itemId, sourceType, expiresAt, usesRemaining, stacks, metadataJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.effectId,
      record.userId,
      record.key,
      record.itemId,
      record.sourceType,
      record.expiresAt,
      record.usesRemaining,
      record.stacks,
      encodeJson(record.metadata),
      record.createdAt,
      record.updatedAt
    ]
  );
  return record;
}

async function getActiveEffects(userId, options = {}) {
  const now = Date.now();
  let effects = [];

  if (isMongoReady()) {
    try {
      const query = { userId };
      if (!options.includeExpired) {
        query.$or = [{ expiresAt: null }, { expiresAt: { $gt: now } }];
      }
      const docs = await EcoEffect.find(query).sort({ createdAt: 1 });
      effects = docs.map(normalizeEffectDoc);
    } catch (error) {
      logger.error('[Economy] MongoDB getActiveEffects failed: %s', error.message);
    }
  }

  if (!effects.length) {
    await initEconomy();
    const clauses = ['userId = ?'];
    const params = [userId];
    if (!options.includeExpired) {
      clauses.push('(expiresAt IS NULL OR expiresAt > ?)');
      params.push(now);
    }
    const rows = await all(`SELECT * FROM active_effects WHERE ${clauses.join(' AND ')} ORDER BY createdAt ASC`, params);
    effects = rows.map(normalizeEffectDoc);
  }

  return effects;
}

async function getEffect(effectId) {
  if (isMongoReady()) {
    try {
      const doc = await EcoEffect.findOne({ effectId });
      return normalizeEffectDoc(doc);
    } catch (error) {
      logger.error('[Economy] MongoDB getEffect failed: %s', error.message);
    }
  }

  await initEconomy();
  const row = await get(`SELECT * FROM active_effects WHERE effectId = ?`, [effectId]);
  return normalizeEffectDoc(row);
}

async function updateEffect(effectId, patch = {}) {
  const existing = await getEffect(effectId);
  if (!existing) return null;
  const next = {
    ...existing,
    key: patch.key !== undefined ? patch.key : existing.key,
    itemId: patch.itemId !== undefined ? patch.itemId : existing.itemId,
    sourceType: patch.sourceType !== undefined ? patch.sourceType : existing.sourceType,
    expiresAt: patch.expiresAt !== undefined ? patch.expiresAt : existing.expiresAt,
    usesRemaining: patch.usesRemaining !== undefined ? patch.usesRemaining : existing.usesRemaining,
    stacks: patch.stacks !== undefined ? patch.stacks : existing.stacks,
    metadata: patch.metadata !== undefined ? patch.metadata : existing.metadata,
    updatedAt: Date.now()
  };

  if (isMongoReady()) {
    try {
      await EcoEffect.updateOne({ effectId }, next);
      return next;
    } catch (error) {
      logger.error('[Economy] MongoDB updateEffect failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(
    `UPDATE active_effects SET key = ?, itemId = ?, sourceType = ?, expiresAt = ?, usesRemaining = ?, stacks = ?, metadataJson = ?, updatedAt = ? WHERE effectId = ?`,
    [next.key, next.itemId, next.sourceType, next.expiresAt, next.usesRemaining, next.stacks, encodeJson(next.metadata), next.updatedAt, effectId]
  );
  return next;
}

async function deleteEffect(effectId) {
  if (isMongoReady()) {
    try {
      await EcoEffect.deleteOne({ effectId });
      return;
    } catch (error) {
      logger.error('[Economy] MongoDB deleteEffect failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(`DELETE FROM active_effects WHERE effectId = ?`, [effectId]);
}

async function clearExpiredEffects(userId) {
  const now = Date.now();
  if (isMongoReady()) {
    try {
      await EcoEffect.deleteMany({ userId, expiresAt: { $ne: null, $lte: now } });
      return;
    } catch (error) {
      logger.error('[Economy] MongoDB clearExpiredEffects failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(`DELETE FROM active_effects WHERE userId = ? AND expiresAt IS NOT NULL AND expiresAt <= ?`, [userId, now]);
}

async function getQuestState(userId) {
  if (isMongoReady()) {
    try {
      const doc = await EcoQuestState.findOne({ userId });
      if (doc) {
        return {
          activeIds: doc.activeIds || [],
          claimedIds: doc.claimedIds || [],
          lastRefresh: doc.lastRefresh || 0
        };
      }
    } catch (error) {
      logger.error('[Economy] MongoDB getQuestState failed: %s', error.message);
    }
  }

  await initEconomy();
  const row = await get(`SELECT * FROM quest_states WHERE userId = ?`, [userId]);
  if (row) {
    return {
      activeIds: decodeJson(row.activeIdsJson, []),
      claimedIds: decodeJson(row.claimedIdsJson, []),
      lastRefresh: row.lastRefresh || 0
    };
  }

  const legacyActive = await getStat(userId, 'quest_active_ids');
  const legacyLastRefresh = Number(await getStat(userId, 'quest_last_refresh') || 0);
  if (Array.isArray(legacyActive) && legacyActive.length) {
    return { activeIds: legacyActive, claimedIds: [], lastRefresh: legacyLastRefresh };
  }
  return { activeIds: [], claimedIds: [], lastRefresh: 0 };
}

async function setQuestState(userId, state) {
  const record = {
    activeIds: Array.isArray(state.activeIds) ? state.activeIds : [],
    claimedIds: Array.isArray(state.claimedIds) ? state.claimedIds : [],
    lastRefresh: Number(state.lastRefresh || 0),
    updatedAt: Date.now()
  };

  if (isMongoReady()) {
    try {
      await EcoQuestState.findOneAndUpdate({ userId }, { userId, ...record }, { upsert: true });
      return record;
    } catch (error) {
      logger.error('[Economy] MongoDB setQuestState failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(
    `INSERT INTO quest_states (userId, activeIdsJson, claimedIdsJson, lastRefresh, updatedAt) VALUES (?, ?, ?, ?, ?) ON CONFLICT(userId) DO UPDATE SET activeIdsJson = excluded.activeIdsJson, claimedIdsJson = excluded.claimedIdsJson, lastRefresh = excluded.lastRefresh, updatedAt = excluded.updatedAt`,
    [userId, encodeJson(record.activeIds), encodeJson(record.claimedIds), record.lastRefresh, record.updatedAt]
  );
  return record;
}

async function getLeaderboard(type = 'net', limit = 10) {
  if (isMongoReady()) {
    try {
      const docs = await EcoUser.aggregate([
        { $project: { userId: 1, wallet: 1, bank: 1, net: { $add: ['$wallet', '$bank'] } } },
        { $sort: type === 'wallet' ? { wallet: -1 } : type === 'bank' ? { bank: -1 } : { net: -1 } },
        { $limit: limit }
      ]);
      return docs.map((doc) => ({ userId: doc.userId, wallet: doc.wallet, bank: doc.bank, net: doc.net }));
    } catch (error) {
      logger.error('[Economy] MongoDB getLeaderboard failed: %s', error.message);
    }
  }

  await initEconomy();
  let sql = `SELECT userId, wallet, bank, (wallet + bank) AS net FROM users ORDER BY net DESC LIMIT ?`;
  if (type === 'wallet') sql = `SELECT userId, wallet, bank, (wallet + bank) AS net FROM users ORDER BY wallet DESC LIMIT ?`;
  if (type === 'bank') sql = `SELECT userId, wallet, bank, (wallet + bank) AS net FROM users ORDER BY bank DESC LIMIT ?`;
  return all(sql, [limit]);
}

async function resetUserEconomy(userId) {
  if (isMongoReady()) {
    try {
      await EcoStat.deleteMany({ userId });
      await EcoInventory.deleteMany({ userId });
      await EcoCooldown.deleteMany({ userId });
      await EcoCosmetic.deleteOne({ userId });
      await EcoItemInstance.deleteMany({ userId });
      await EcoEffect.deleteMany({ userId });
      await EcoLoadout.deleteMany({ userId });
      await EcoQuestState.deleteOne({ userId });
      await EcoUser.updateOne({ userId }, { wallet: 0, bank: 0, updatedAt: Date.now() }, { upsert: true });
      return;
    } catch (error) {
      logger.error('[Economy] MongoDB resetUserEconomy failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(`DELETE FROM stats WHERE userId = ?`, [userId]);
  await run(`DELETE FROM inventory WHERE userId = ?`, [userId]);
  await run(`DELETE FROM cooldowns WHERE userId = ?`, [userId]);
  await run(`DELETE FROM cosmetics WHERE userId = ?`, [userId]);
  await run(`DELETE FROM item_instances WHERE userId = ?`, [userId]);
  await run(`DELETE FROM active_effects WHERE userId = ?`, [userId]);
  await run(`DELETE FROM loadouts WHERE userId = ?`, [userId]);
  await run(`DELETE FROM quest_states WHERE userId = ?`, [userId]);
  await run(`INSERT OR IGNORE INTO users (userId, wallet, bank, createdAt, updatedAt) VALUES (?, 0, 0, ?, ?)`, [userId, Date.now(), Date.now()]);
  await run(`UPDATE users SET wallet = 0, bank = 0, updatedAt = ? WHERE userId = ?`, [Date.now(), userId]);
}

async function wipeEverything() {
  if (isMongoReady()) {
    try {
      await EcoStat.deleteMany({});
      await EcoInventory.deleteMany({});
      await EcoCooldown.deleteMany({});
      await EcoCosmetic.deleteMany({});
      await EcoItemInstance.deleteMany({});
      await EcoEffect.deleteMany({});
      await EcoLoadout.deleteMany({});
      await EcoQuestState.deleteMany({});
      await EcoUser.deleteMany({});
      await EcoMeta.deleteMany({});
      return;
    } catch (error) {
      logger.error('[Economy] MongoDB wipeEverything failed: %s', error.message);
    }
  }

  await initEconomy();
  await run(`DELETE FROM stats`);
  await run(`DELETE FROM inventory`);
  await run(`DELETE FROM cooldowns`);
  await run(`DELETE FROM cosmetics`);
  await run(`DELETE FROM item_instances`);
  await run(`DELETE FROM active_effects`);
  await run(`DELETE FROM loadouts`);
  await run(`DELETE FROM quest_states`);
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
  getStat,
  setStat,
  bumpStat,
  getCooldown,
  setCooldown,
  getCosmetics,
  setCosmetics,
  getMeta,
  setMeta,
  getGlobalEconomyDisabled,
  setGlobalEconomyDisabled,
  getInventory,
  getInventorySnapshot,
  getInventoryItemCount,
  addInventoryItem,
  consumeInventoryItem,
  removeInventoryItem,
  createItemInstance,
  getItemInstance,
  getItemInstances,
  updateItemInstance,
  deleteItemInstance,
  getLoadout,
  setLoadout,
  clearLoadout,
  createEffect,
  getEffect,
  getActiveEffects,
  updateEffect,
  deleteEffect,
  clearExpiredEffects,
  getQuestState,
  setQuestState,
  getLeaderboard,
  resetUserEconomy,
  wipeEverything
};
