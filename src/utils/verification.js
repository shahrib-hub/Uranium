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
    type TEXT
  )`);

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
  if (isMongoReady()) {
    const doc = await VerificationConfig.findOne({ guildId });
    if (!doc) return undefined;
    return {
      guild_id: doc.guildId,
      channel_id: doc.channelId,
      role_id: doc.roleId,
      embed_message: doc.embedMessage,
      type: doc.type
    };
  }

  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM verification_configs WHERE guild_id = ?`, [guildId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function saveVerificationConfig(guildId, config) {
  if (isMongoReady()) {
    await VerificationConfig.findOneAndUpdate(
      { guildId },
      {
        channelId: config.channel_id,
        roleId: config.role_id,
        embedMessage: config.embed_message,
        type: config.type
      },
      { upsert: true }
    );
    return;
  }

  return new Promise((resolve, reject) => {
    db.run(`INSERT OR REPLACE INTO verification_configs (guild_id, channel_id, role_id, embed_message, type)
            VALUES (?, ?, ?, ?, ?)`,
      [guildId, config.channel_id, config.role_id, config.embed_message, config.type],
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

module.exports = {
  getVerificationConfig,
  saveVerificationConfig,
  deleteVerificationConfig,
  markUserVerified,
  getVerifiedUser,
  removeUserVerification,
  generateOTP,
  setOTPCooldown,
  isOTPCooldownActive,
  validateOTP
};
