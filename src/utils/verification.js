const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { isMongoReady } = require('../database/dbUtils');
const { VerificationConfig, VerifiedUser, OtpCode } = require('../database/mongoose');
const dbPath = path.join(__dirname, '..', 'data', 'verification.db');

const db = new sqlite3.Database(dbPath);

// ✅ Initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS verification_configs (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT,
    role_id TEXT,
    embed_message TEXT,
    type TEXT,
    data_json TEXT
  )`);

  // Migrate older tables that lack data_json
  db.run(`ALTER TABLE verification_configs ADD COLUMN data_json TEXT`, () => {});

  db.run(`CREATE TABLE IF NOT EXISTS verified_users (
    guild_id TEXT,
    user_id TEXT,
    verified_at TEXT,
    PRIMARY KEY (guild_id, user_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS otp_codes (
    guild_id TEXT,
    user_id TEXT,
    code TEXT,
    expires_at INTEGER,
    PRIMARY KEY (guild_id, user_id)
  )`);
});

// ✅ Config functions
async function getVerificationConfig(guildId) {
  let raw = null;
  if (isMongoReady()) {
    const doc = await VerificationConfig.findOne({ guildId });
    if (doc) {
      let extra = {};
      try { extra = JSON.parse(doc.dataJson || '{}'); } catch (_) {}
      return {
        guild_id: doc.guildId,
        channel_id: doc.channelId,
        role_id: doc.roleId,
        unverified_role_id: doc.unverifiedRoleId || extra.unverified_role_id || null,
        log_channel_id: doc.logChannelId || extra.log_channel_id || null,
        embed_title: doc.embedTitle || extra.embed_title || 'Verify Yourself',
        embed_message: doc.embedMessage || extra.embed_message || 'Click the button below to verify yourself and gain access to the server.',
        embed_color: doc.embedColor || extra.embed_color || '#10b981',
        embed_image: doc.embedImage || extra.embed_image || null,
        embed_footer: doc.embedFooter || extra.embed_footer || 'Uranium Security Verification',
        type: doc.type || extra.type || 'button',
        button_label: doc.buttonLabel || extra.button_label || 'Verify',
        button_style: doc.buttonStyle || extra.button_style || 'Success',
        button_emoji: doc.buttonEmoji || extra.button_emoji || '✅',
        send_dm: doc.sendDm !== undefined ? doc.sendDm : (extra.send_dm || false),
        dm_message: doc.dmMessage || extra.dm_message || 'You have been successfully verified in **{server}**!',
        enabled: doc.enabled !== undefined ? doc.enabled : true,
        data_json: doc.dataJson || '{}'
      };
    }
  }

  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM verification_configs WHERE guild_id = ?`, [guildId], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(undefined);
      let extra = {};
      try { extra = JSON.parse(row.data_json || '{}'); } catch (_) {}
      resolve({
        guild_id: row.guild_id,
        channel_id: row.channel_id,
        role_id: row.role_id,
        unverified_role_id: extra.unverified_role_id || null,
        log_channel_id: extra.log_channel_id || null,
        embed_title: extra.embed_title || 'Verify Yourself',
        embed_message: row.embed_message || extra.embed_message || 'Click the button below to verify yourself and gain access to the server.',
        embed_color: extra.embed_color || '#10b981',
        embed_image: extra.embed_image || null,
        embed_footer: extra.embed_footer || 'Uranium Security Verification',
        type: row.type || extra.type || 'button',
        button_label: extra.button_label || 'Verify',
        button_style: extra.button_style || 'Success',
        button_emoji: extra.button_emoji || '✅',
        send_dm: !!extra.send_dm,
        dm_message: extra.dm_message || 'You have been successfully verified in **{server}**!',
        enabled: extra.enabled !== false,
        data_json: row.data_json || '{}'
      });
    });
  });
}

async function saveVerificationConfig(guildId, config) {
  const dataPayload = {
    unverified_role_id: config.unverified_role_id || null,
    log_channel_id: config.log_channel_id || null,
    embed_title: config.embed_title || 'Verify Yourself',
    embed_message: config.embed_message || 'Click the button below to verify yourself and gain access to the server.',
    embed_color: config.embed_color || '#10b981',
    embed_image: config.embed_image || null,
    embed_footer: config.embed_footer || 'Uranium Security Verification',
    type: config.type || 'button',
    button_label: config.button_label || 'Verify',
    button_style: config.button_style || 'Success',
    button_emoji: config.button_emoji || '✅',
    send_dm: !!config.send_dm,
    dm_message: config.dm_message || 'You have been successfully verified in **{server}**!',
    enabled: config.enabled !== false
  };

  const jsonStr = JSON.stringify(dataPayload);

  if (isMongoReady()) {
    await VerificationConfig.findOneAndUpdate(
      { guildId },
      {
        channelId: config.channel_id,
        roleId: config.role_id,
        unverifiedRoleId: dataPayload.unverified_role_id,
        logChannelId: dataPayload.log_channel_id,
        embedTitle: dataPayload.embed_title,
        embedMessage: dataPayload.embed_message,
        embedColor: dataPayload.embed_color,
        embedImage: dataPayload.embed_image,
        embedFooter: dataPayload.embed_footer,
        type: dataPayload.type,
        buttonLabel: dataPayload.button_label,
        buttonStyle: dataPayload.button_style,
        buttonEmoji: dataPayload.button_emoji,
        sendDm: dataPayload.send_dm,
        dmMessage: dataPayload.dm_message,
        enabled: dataPayload.enabled,
        dataJson: jsonStr
      },
      { upsert: true }
    );
    return;
  }

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO verification_configs (guild_id, channel_id, role_id, embed_message, type, data_json)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET
         channel_id=excluded.channel_id,
         role_id=excluded.role_id,
         embed_message=excluded.embed_message,
         type=excluded.type,
         data_json=excluded.data_json`,
      [guildId, config.channel_id, config.role_id, dataPayload.embed_message, dataPayload.type, jsonStr],
      err => err ? reject(err) : resolve()
    );
  });
}

async function deleteVerificationConfig(guildId) {
  if (isMongoReady()) {
    await VerificationConfig.findOneAndDelete({ guildId });
    return;
  }

  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM verification_configs WHERE guild_id = ?`, [guildId], err => err ? reject(err) : resolve());
  });
}

// ✅ Verification tracking
async function markUserVerified(guildId, userId) {
  const verifiedAt = new Date().toISOString();
  if (isMongoReady()) {
    await VerifiedUser.findOneAndUpdate({ guildId, userId }, { verifiedAt }, { upsert: true });
    return;
  }

  return new Promise((resolve, reject) => {
    db.run(`INSERT OR REPLACE INTO verified_users (guild_id, user_id, verified_at)
            VALUES (?, ?, ?)`,
      [guildId, userId, verifiedAt],
      err => err ? reject(err) : resolve()
    );
  });
}

async function getVerifiedUser(guildId, userId) {
  if (isMongoReady()) {
    const doc = await VerifiedUser.findOne({ guildId, userId });
    if (!doc) return undefined;
    return {
      guild_id: doc.guildId,
      user_id: doc.userId,
      verified_at: doc.verifiedAt
    };
  }

  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM verified_users WHERE guild_id = ? AND user_id = ?`,
      [guildId, userId],
      (err, row) => err ? reject(err) : resolve(row)
    );
  });
}

async function removeUserVerification(guildId, userId) {
  if (isMongoReady()) {
    await VerifiedUser.findOneAndDelete({ guildId, userId });
    return;
  }

  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM verified_users WHERE guild_id = ? AND user_id = ?`,
      [guildId, userId],
      err => err ? reject(err) : resolve()
    );
  });
}

// ✅ OTP functions
function generateOTP() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let otp = '';
  for (let i = 0; i < 5; i++) {
    otp += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return otp;
}

async function setOTPCooldown(guildId, userId, code) {
  const expiresAt = Date.now() + 30000; // 30 seconds
  if (isMongoReady()) {
    await OtpCode.findOneAndUpdate(
      { guildId, userId },
      { code, expiresAt },
      { upsert: true }
    );
    return;
  }

  return new Promise((resolve, reject) => {
    db.run(`INSERT OR REPLACE INTO otp_codes (guild_id, user_id, code, expires_at)
            VALUES (?, ?, ?, ?)`,
      [guildId, userId, code, expiresAt],
      err => err ? reject(err) : resolve()
    );
  });
}

async function isOTPCooldownActive(guildId, userId) {
  if (isMongoReady()) {
    const doc = await OtpCode.findOne({ guildId, userId });
    if (!doc) return false;
    return Date.now() < doc.expiresAt;
  }

  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM otp_codes WHERE guild_id = ? AND user_id = ?`,
      [guildId, userId],
      (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(false);
        resolve(Date.now() < row.expires_at);
      }
    );
  });
}

async function validateOTP(guildId, userId, inputCode) {
  if (isMongoReady()) {
    const doc = await OtpCode.findOne({ guildId, userId });
    if (!doc || doc.code !== inputCode) return false;
    await OtpCode.deleteOne({ guildId, userId });
    return true;
  }

  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM otp_codes WHERE guild_id = ? AND user_id = ?`,
      [guildId, userId],
      (err, row) => {
        if (err) return reject(err);
        if (!row || row.code !== inputCode) return resolve(false);
        db.run(`DELETE FROM otp_codes WHERE guild_id = ? AND user_id = ?`,
          [guildId, userId],
          err => err ? reject(err) : resolve(true)
        );
      }
    );
  });
}

async function getVerifiedUsersCount(guildId) {
  if (isMongoReady()) {
    return await VerifiedUser.countDocuments({ guildId }).catch(() => 0);
  }
  return new Promise((resolve) => {
    db.get(`SELECT COUNT(*) as count FROM verified_users WHERE guild_id = ?`, [guildId], (err, row) => {
      if (err || !row) return resolve(0);
      resolve(row.count || 0);
    });
  });
}

module.exports = {
  getVerificationConfig,
  saveVerificationConfig,
  deleteVerificationConfig,
  markUserVerified,
  getVerifiedUser,
  removeUserVerification,
  getVerifiedUsersCount,
  generateOTP,
  setOTPCooldown,
  isOTPCooldownActive,
  validateOTP
};
