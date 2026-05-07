const db = require('../utils/jtc');

// ✅ Get active setup for a guild
function getSetup(guildId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM join_to_create_setups WHERE guild_id = ?`,
      [guildId],
      (err, row) => (err ? reject(err) : resolve(row || null))
    );
  });
}

// ✅ Create a new setup
function createSetup({ guildId, triggerVoiceId, targetCategoryId, userLimit, createdBy }) {
  return new Promise((resolve, reject) => {
    const createdAt = Date.now();
    db.run(
      `INSERT INTO join_to_create_setups (guild_id, trigger_voice_id, target_category_id, user_limit, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [guildId, triggerVoiceId, targetCategoryId, userLimit, createdBy, createdAt],
      err => (err ? reject(err) : resolve())
    );
  });
}

// ✅ Delete setup and related temp channels
function deleteSetup(guildId) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM join_to_create_setups WHERE guild_id = ?`, [guildId], err => {
      if (err) return reject(err);
      db.run(`DELETE FROM temp_voice_channels WHERE guild_id = ?`, [guildId], err2 => {
        if (err2) return reject(err2);
        resolve();
      });
    });
  });
}

// ✅ Track a new temp VC
function trackTempChannel({ guildId, channelId, ownerId }) {
  return new Promise((resolve, reject) => {
    const createdAt = Date.now();
    db.run(
      `INSERT OR IGNORE INTO temp_voice_channels (channel_id, guild_id, owner_id, created_at)
       VALUES (?, ?, ?, ?)`,
      [channelId, guildId, ownerId, createdAt],
      err => (err ? reject(err) : resolve())
    );
  });
}

// ✅ Untrack a VC
function untrackTempChannel(channelId) {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM temp_voice_channels WHERE channel_id = ?`,
      [channelId],
      err => (err ? reject(err) : resolve())
    );
  });
}

// ✅ Check if a VC is tracked
function isTrackedTempChannel(channelId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT 1 FROM temp_voice_channels WHERE channel_id = ?`,
      [channelId],
      (err, row) => (err ? reject(err) : resolve(!!row))
    );
  });
}

module.exports = {
  getSetup,
  createSetup,
  deleteSetup,
  trackTempChannel,
  untrackTempChannel,
  isTrackedTempChannel
};
