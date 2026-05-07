// src/utils/autoroleStorage.js
const rrdb = require('./rrdb'); // reuse your rrdb helper
const now = () => Math.floor(Date.now() / 1000);

async function initAutoroleStorage() {
  await rrdb.init(); // ensure DB exists & common tables created
  // create autorole tables if missing
  await rrdb.instance.exec(`
    CREATE TABLE IF NOT EXISTS autorole_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT,
      enabled INTEGER DEFAULT 1,
      delay_seconds INTEGER DEFAULT 0,
      welcome_message TEXT,
      is_default INTEGER DEFAULT 0,
      created_by TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_autorole_guild ON autorole_sets (guild_id);

    CREATE TABLE IF NOT EXISTS autorole_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      set_id INTEGER NOT NULL,
      role_id TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      created_at INTEGER,
      FOREIGN KEY(set_id) REFERENCES autorole_sets(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_autorole_set ON autorole_items (set_id);

    CREATE TABLE IF NOT EXISTS autorole_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      user_id TEXT,
      role_id TEXT,
      set_id INTEGER,
      action TEXT,
      reason TEXT,
      ts INTEGER
    );
  `);
}

async function createSet({ guildId, name = null, delaySeconds = 0, welcomeMessage = null, creatorId = null }) {
  const ts = now();
  const res = await rrdb.instance.run(
    `INSERT INTO autorole_sets (guild_id, name, delay_seconds, welcome_message, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [guildId, name, delaySeconds, welcomeMessage, creatorId, ts, ts]
  );
  return res.lastID;
}

async function getSetById(setId) {
  return rrdb.instance.get(`SELECT * FROM autorole_sets WHERE id = ?;`, [setId]);
}

async function listSetsForGuild(guildId) {
  return rrdb.instance.all(`SELECT * FROM autorole_sets WHERE guild_id = ? ORDER BY created_at DESC;`, [guildId]);
}

async function deleteSet(setId) {
  return rrdb.instance.run(`DELETE FROM autorole_sets WHERE id = ?;`, [setId]);
}

async function updateSet(setId, fields = {}) {
  const allowed = ['name', 'enabled', 'delay_seconds', 'welcome_message', 'is_default'];
  const columns = [];
  const params = [];
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, k)) {
      columns.push(`${k} = ?`);
      params.push(fields[k]);
    }
  }
  if (columns.length === 0) return;
  params.push(now(), setId);
  const sql = `UPDATE autorole_sets SET ${columns.join(', ')}, updated_at = ? WHERE id = ?;`;
  return rrdb.instance.run(sql, params);
}

async function addRoleToSet({ setId, roleId }) {
  const ts = now();
  const maxPosRow = await rrdb.instance.get(`SELECT MAX(position) as maxpos FROM autorole_items WHERE set_id = ?;`, [setId]);
  const pos = (maxPosRow && maxPosRow.maxpos != null) ? (maxPosRow.maxpos + 1) : 0;
  const res = await rrdb.instance.run(
    `INSERT INTO autorole_items (set_id, role_id, position, created_at) VALUES (?, ?, ?, ?);`,
    [setId, roleId, pos, ts]
  );
  return res.lastID;
}

async function removeRoleItem(itemId) {
  return rrdb.instance.run(`DELETE FROM autorole_items WHERE id = ?;`, [itemId]);
}

async function listItemsForSet(setId) {
  return rrdb.instance.all(`SELECT * FROM autorole_items WHERE set_id = ? ORDER BY position ASC, id ASC;`, [setId]);
}

async function findItemInSet(setId, roleId) {
  return rrdb.instance.get(`SELECT * FROM autorole_items WHERE set_id = ? AND role_id = ? LIMIT 1;`, [setId, roleId]);
}

async function setDefaultSet(guildId, setId) {
  // clear existing default then set
  await rrdb.instance.run(`UPDATE autorole_sets SET is_default = 0 WHERE guild_id = ?;`, [guildId]);
  return rrdb.instance.run(`UPDATE autorole_sets SET is_default = 1 WHERE id = ?;`, [setId]);
}

async function getDefaultSetForGuild(guildId) {
  return rrdb.instance.get(`SELECT * FROM autorole_sets WHERE guild_id = ? AND is_default = 1 LIMIT 1;`, [guildId]);
}

async function logAction({ guildId, userId, roleId, setId, action, reason = null }) {
  await rrdb.instance.run(
    `INSERT INTO autorole_logs (guild_id, user_id, role_id, set_id, action, reason, ts) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [guildId, userId, roleId, setId, action, reason, now()]
  );
}

module.exports = {
  initAutoroleStorage,
  createSet,
  getSetById,
  listSetsForGuild,
  deleteSet,
  updateSet,
  addRoleToSet,
  removeRoleItem,
  listItemsForSet,
  findItemInSet,
  setDefaultSet,
  getDefaultSetForGuild,
  logAction
};