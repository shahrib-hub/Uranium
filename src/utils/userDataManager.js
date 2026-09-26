// src/utils/userDataManager.js
// Compliance module for Discord Developer Policy Section 2: User Data Deletion & Privacy Rights

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const models = require('../database/mongoose');
const { getDbStatus } = require('../database/mongoose');

/**
 * Execute a write query on an SQLite database safely
 */
function runSqlite(dbPath, sql, params = []) {
  return new Promise((resolve) => {
    if (!fs.existsSync(dbPath)) return resolve(0);
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) return resolve(0);
    });

    db.run(sql, params, function (err) {
      db.close();
      if (err) return resolve(0);
      resolve(this.changes || 0);
    });
  });
}

/**
 * Delete all user-specific data associated with a Discord User ID
 * across both MongoDB and local SQLite databases.
 * 
 * @param {string} userId - The Discord snowflake ID of the user requesting deletion
 * @returns {Promise<{ success: boolean, recordsDeleted: number, error?: string }>}
 */
async function deleteUserData(userId) {
  if (!userId) {
    return { success: false, recordsDeleted: 0, error: 'User ID is required' };
  }

  let totalDeleted = 0;

  // 1. Delete from MongoDB
  try {
    if (getDbStatus()) {
      const deleteOps = [
        models.AFKUser?.deleteMany({ userId }),
        models.Birthday?.deleteMany({ userId }),
        models.EcoUser?.deleteMany({ userId }),
        models.EcoStat?.deleteMany({ userId }),
        models.EcoInventory?.deleteMany({ userId }),
        models.EcoCooldown?.deleteMany({ userId }),
        models.EcoCosmetic?.deleteMany({ userId }),
        models.EcoItemInstance?.deleteMany({ userId }),
        models.EcoEffect?.deleteMany({ userId }),
        models.EcoLoadout?.deleteMany({ userId }),
        models.EcoQuestState?.deleteMany({ userId }),
        models.RankUser?.deleteMany({ userId }),
        models.SocialUser?.deleteMany({ userId }),
        models.FamilyUser?.deleteMany({ userId }),
        models.FamilyPartner?.deleteMany({ $or: [{ userA: userId }, { userB: userId }] }),
        models.FamilyParentChild?.deleteMany({ $or: [{ parentId: userId }, { childId: userId }] }),
        models.FamilyPending?.deleteMany({ $or: [{ requesterId: userId }, { targetId: userId }] }),
        models.UserPlaylist?.deleteMany({ userId })
      ];

      const results = await Promise.allSettled(deleteOps.filter(Boolean));
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value?.deletedCount) {
          totalDeleted += res.value.deletedCount;
        }
      }
    }
  } catch (err) {
    console.error('[userDataManager] Error deleting user data from MongoDB:', err);
  }

  // 2. Delete from SQLite if databases exist
  const dataDir = path.join(__dirname, '..', '..', 'data');
  try {
    if (fs.existsSync(dataDir)) {
      // Economy
      const ecoDb = path.join(dataDir, 'economy.db');
      totalDeleted += await runSqlite(ecoDb, 'DELETE FROM users WHERE user_id = ?', [userId]);
      totalDeleted += await runSqlite(ecoDb, 'DELETE FROM inventory WHERE user_id = ?', [userId]);
      totalDeleted += await runSqlite(ecoDb, 'DELETE FROM cooldowns WHERE user_id = ?', [userId]);

      // AFK
      const afkDb = path.join(dataDir, 'afk_storage.db');
      totalDeleted += await runSqlite(afkDb, 'DELETE FROM afk_users WHERE user_id = ?', [userId]);

      // Ghost Ping Counts
      const ghostDb = path.join(dataDir, 'ghostping.db');
      totalDeleted += await runSqlite(ghostDb, 'DELETE FROM ghost_counts WHERE user_id = ?', [userId]);
    }
  } catch (err) {
    console.error('[userDataManager] Error deleting user data from SQLite:', err);
  }

  return { success: true, recordsDeleted: totalDeleted };
}

/**
 * Delete all server configuration and logs for a Guild ID
 * 
 * @param {string} guildId - The Discord snowflake ID of the guild
 * @returns {Promise<{ success: boolean, recordsDeleted: number }>}
 */
async function deleteGuildData(guildId) {
  if (!guildId) return { success: false, recordsDeleted: 0 };

  let totalDeleted = 0;

  try {
    if (getDbStatus()) {
      const deleteOps = [
        models.AFKGuildConfig?.deleteMany({ guildId }),
        models.AFKIgnoredChannel?.deleteMany({ guildId }),
        models.AFKUser?.deleteMany({ guildId }),
        models.AntiNukeConfig?.deleteMany({ guildId }),
        models.AntiNukeWhitelist?.deleteMany({ guildId }),
        models.AntiNukeLimit?.deleteMany({ guildId }),
        models.AutoModRule?.deleteMany({ guildId }),
        models.AutoModLog?.deleteMany({ guildId }),
        models.AutomodSettings?.deleteMany({ guildId }),
        models.AutomodIgnored?.deleteMany({ guildId }),
        models.AutoRole?.deleteMany({ guildId }),
        models.Autoresponse?.deleteMany({ guildId }),
        models.ServerBackup?.deleteMany({ guildId }),
        models.BackupCooldown?.deleteMany({ guildId }),
        models.Birthday?.deleteMany({ guildId }),
        models.BirthdayConfig?.deleteMany({ guildId }),
        models.JoinPingConfig?.deleteMany({ guildId }),
        models.GhostConfig?.deleteMany({ guildId }),
        models.GhostCount?.deleteMany({ guildId }),
        models.JTCConfig?.deleteMany({ guildId }),
        models.JTCSession?.deleteMany({ guildId }),
        models.ModConfig?.deleteMany({ guildId }),
        models.ModCase?.deleteMany({ guildId }),
        models.ModScheduled?.deleteMany({ guildId }),
        models.ModRole?.deleteMany({ guildId }),
        models.ModSetting?.deleteMany({ guildId }),
        models.ActiveMute?.deleteMany({ guildId }),
        models.Warning?.deleteMany({ guildId }),
        models.RankUser?.deleteMany({ guildId }),
        models.RankConfig?.deleteMany({ guildId }),
        models.RankRoleReward?.deleteMany({ guildId }),
        models.RRSetup?.deleteMany({ guildId }),
        models.RRItem?.deleteMany({ guildId }),
        models.RRLog?.deleteMany({ guildId }),
        models.RRCounter?.deleteMany({ guildId }),
        models.Sticky?.deleteMany({ guildId }),
        models.StickyConfig?.deleteMany({ guildId }),
        models.TicketConfig?.deleteMany({ guildId }),
        models.TicketPanel?.deleteMany({ guildId }),
        models.TicketCategory?.deleteMany({ guildId }),
        models.Ticket?.deleteMany({ guildId }),
        models.TicketMember?.deleteMany({ guildId }),
        models.TicketCounter?.deleteMany({ guildId }),
        models.VerificationConfig?.deleteMany({ guildId }),
        models.VerifiedUser?.deleteMany({ guildId }),
        models.WelcomeConfig?.deleteMany({ guildId }),
        models.LeaveConfig?.deleteMany({ guildId }),
        models.YTVerify?.deleteMany({ guildId }),
        models.AIChannel?.deleteMany({ guildId }),
        models.AIStats?.deleteMany({ guildId }),
        models.AISetting?.deleteMany({ guildId }),
        models.LogConfig?.deleteMany({ guildId }),
        models.LogEvent?.deleteMany({ guildId }),
        models.LogIgnoredChannel?.deleteMany({ guildId }),
        models.ServerSettings?.deleteMany({ guildId }),
        models.BotPersonalization?.deleteMany({ guildId })
      ];

      const results = await Promise.allSettled(deleteOps.filter(Boolean));
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value?.deletedCount) {
          totalDeleted += res.value.deletedCount;
        }
      }
    }
  } catch (err) {
    console.error('[userDataManager] Error deleting guild data from MongoDB:', err);
  }

  return { success: true, recordsDeleted: totalDeleted };
}

module.exports = {
  deleteUserData,
  deleteGuildData
};
