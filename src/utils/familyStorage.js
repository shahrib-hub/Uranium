// src/utils/familyStorage.js
const rrdb = require('./rrdb'); // your shared sqlite helper
const { useMongoDB } = require('../config/database');
const { FamilyUser, FamilyPartner, FamilyParentChild, FamilyPending } = require('../database/mongoose');
const now = () => Math.floor(Date.now() / 1000);

async function initFamilyStorage() {
  await rrdb.init(); // ensure core DB
  await rrdb.instance.exec(`
    CREATE TABLE IF NOT EXISTS family_users (
      user_id TEXT PRIMARY KEY,
      allow_requests INTEGER DEFAULT 1,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS family_partners (
      user_id TEXT PRIMARY KEY,
      partner_id TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS family_parent_child (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id TEXT,
      child_id TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS family_pending (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'marry' or 'adopt'
      requester_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      note TEXT,
      created_at INTEGER
    );
  `);
}

// user
async function ensureUser(userId) {
  if (useMongoDB) {
    const doc = await FamilyUser.findOne({ userId });
    if (!doc) {
      await FamilyUser.create({ userId, allowRequests: true, createdAt: now() });
    }
    return;
  }

  const row = await rrdb.instance.get(`SELECT * FROM family_users WHERE user_id = ?;`, [userId]);
  if (!row) {
    await rrdb.instance.run(`INSERT INTO family_users (user_id, allow_requests, created_at) VALUES (?, ?, ?);`, [userId, 1, now()]);
  }
}

async function setAllowRequests(userId, allow) {
  await ensureUser(userId);
  if (useMongoDB) {
    await FamilyUser.updateOne({ userId }, { allowRequests: !!allow });
    return;
  }
  return rrdb.instance.run(`UPDATE family_users SET allow_requests = ? WHERE user_id = ?;`, [allow ? 1 : 0, userId]);
}

async function getAllowRequests(userId) {
  if (useMongoDB) {
    const doc = await FamilyUser.findOne({ userId });
    return doc ? doc.allowRequests : true;
  }
  const row = await rrdb.instance.get(`SELECT allow_requests FROM family_users WHERE user_id = ?;`, [userId]);
  return row ? Boolean(row.allow_requests) : true;
}

// partners
async function getPartner(userId) {
  if (useMongoDB) {
    const doc = await FamilyPartner.findOne({ userId });
    return doc ? doc.partnerId : null;
  }
  const row = await rrdb.instance.get(`SELECT partner_id FROM family_partners WHERE user_id = ?;`, [userId]);
  return row ? row.partner_id : null;
}

async function setPartner(userId, partnerId) {
  const ts = now();
  if (useMongoDB) {
    await FamilyPartner.findOneAndUpdate({ userId }, { partnerId, createdAt: ts }, { upsert: true });
    return;
  }
  // upsert for both sides
  await rrdb.instance.run(`INSERT OR REPLACE INTO family_partners (user_id, partner_id, created_at) VALUES (?, ?, ?);`, [userId, partnerId, ts]);
}

async function removePartner(userId) {
  if (useMongoDB) {
    await FamilyPartner.findOneAndDelete({ userId });
    return;
  }
  await rrdb.instance.run(`DELETE FROM family_partners WHERE user_id = ?;`, [userId]);
}

// parent-child
async function addParentChild(parentId, childId) {
  const ts = now();
  if (useMongoDB) {
    await FamilyParentChild.create({ parentId, childId, createdAt: ts });
    return;
  }
  return rrdb.instance.run(`INSERT INTO family_parent_child (parent_id, child_id, created_at) VALUES (?, ?, ?);`, [parentId, childId, ts]);
}

async function removeParentChild(parentId, childId) {
  if (useMongoDB) {
    await FamilyParentChild.findOneAndDelete({ parentId, childId });
    return;
  }
  return rrdb.instance.run(`DELETE FROM family_parent_child WHERE parent_id = ? AND child_id = ?;`, [parentId, childId]);
}

async function listChildrenOf(parentId) {
  if (useMongoDB) {
    const docs = await FamilyParentChild.find({ parentId }).sort({ createdAt: 1 });
    return docs.map(d => ({ child_id: d.childId }));
  }
  return rrdb.instance.all(`SELECT child_id FROM family_parent_child WHERE parent_id = ? ORDER BY created_at ASC;`, [parentId]);
}

async function listParentsOf(childId) {
  if (useMongoDB) {
    const docs = await FamilyParentChild.find({ childId }).sort({ createdAt: 1 });
    return docs.map(d => ({ parent_id: d.parentId }));
  }
  return rrdb.instance.all(`SELECT parent_id FROM family_parent_child WHERE child_id = ? ORDER BY created_at ASC;`, [childId]);
}

// pending
async function createPending(type, requesterId, targetId, note = null) {
  const ts = now();
  if (useMongoDB) {
    const doc = await FamilyPending.create({ type, requesterId, targetId, note, createdAt: ts });
    return doc._id.toString();
  }
  const res = await rrdb.instance.run(
    `INSERT INTO family_pending (type, requester_id, target_id, note, created_at) VALUES (?, ?, ?, ?, ?);`,
    [type, requesterId, targetId, note, ts]
  );
  return res.lastID;
}

async function getPendingById(id) {
  if (useMongoDB) {
    const doc = await FamilyPending.findById(id).catch(() => null);
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      type: doc.type,
      requester_id: doc.requesterId,
      target_id: doc.targetId,
      note: doc.note,
      created_at: doc.createdAt
    };
  }
  return rrdb.instance.get(`SELECT * FROM family_pending WHERE id = ?;`, [id]);
}

async function findPending(type, requesterId, targetId) {
  if (useMongoDB) {
    const doc = await FamilyPending.findOne({ type, requesterId, targetId });
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      type: doc.type,
      requester_id: doc.requesterId,
      target_id: doc.targetId,
      note: doc.note,
      created_at: doc.createdAt
    };
  }
  return rrdb.instance.get(`SELECT * FROM family_pending WHERE type = ? AND requester_id = ? AND target_id = ? LIMIT 1;`, [type, requesterId, targetId]);
}

async function deletePending(id) {
  if (useMongoDB) {
    await FamilyPending.findByIdAndDelete(id).catch(() => null);
    return;
  }
  return rrdb.instance.run(`DELETE FROM family_pending WHERE id = ?;`, [id]);
}

// helpers
async function areMarried(userA, userB) {
  const p = await getPartner(userA);
  return p === userB;
}

async function isParentOf(parentId, childId) {
  if (useMongoDB) {
    const doc = await FamilyParentChild.findOne({ parentId, childId });
    return !!doc;
  }
  const row = await rrdb.instance.get(`SELECT id FROM family_parent_child WHERE parent_id = ? AND child_id = ? LIMIT 1;`, [parentId, childId]);
  return !!row;
}

module.exports = {
  initFamilyStorage,
  ensureUser,
  setAllowRequests,
  getAllowRequests,
  getPartner,
  setPartner,
  removePartner,
  addParentChild,
  removeParentChild,
  listChildrenOf,
  listParentsOf,
  createPending,
  getPendingById,
  findPending,
  deletePending,
  areMarried,
  isParentOf
};