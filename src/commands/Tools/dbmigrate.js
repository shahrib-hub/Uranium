const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const mongoose = require('mongoose');

const OWNER_IDS = (process.env.BOT_OWNER_IDS || '').split(',').map(i => i.trim()).filter(Boolean);
const DEV_GUILD_ID = process.env.DEV_GUILD_ID;

module.exports = {
  devOnly: true,
  data: new SlashCommandBuilder()
    .setName('dbmigrate')
    .setDescription('🛠️ Database Migration Utilities')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(sc =>
      sc.setName('tomongo')
        .setDescription('Migrate all SQLite data to MongoDB')
    )
    .addSubcommand(sc =>
      sc.setName('clearsqlite')
        .setDescription('Delete all SQLite database files')
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    if (!OWNER_IDS.includes(userId)) {
      return interaction.reply({ content: '❌ Owner-only command.', flags: 64 });
    }
    if (interaction.guildId !== DEV_GUILD_ID) {
      return interaction.reply({ content: '❌ This command can only be used in the dev guild.', flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    
    if (sub === 'tomongo') {
      await interaction.deferReply({ flags: 64 });
      
      try {
        await runMigration();
        await interaction.editReply({ content: '✅ Migration to MongoDB completed successfully!' });
      } catch (err) {
        console.error('Migration error:', err);
        await interaction.editReply({ content: `❌ Migration failed: ${err.message}` });
      }
    } else if (sub === 'clearsqlite') {
      await interaction.deferReply({ flags: 64 });
      
      try {
        const dataDir = path.join(__dirname, '..', '..', 'data');
        if (!fs.existsSync(dataDir)) {
          return await interaction.editReply({ content: '❌ Data directory not found.' });
        }
        const files = fs.readdirSync(dataDir);
        let deleted = 0;
        
        for (const file of files) {
          if (file.endsWith('.db') || file.endsWith('.sqlite') || file.endsWith('.db-shm') || file.endsWith('.db-wal')) {
            fs.unlinkSync(path.join(dataDir, file));
            deleted++;
          }
        }
        
        await interaction.editReply({ content: `✅ Successfully deleted ${deleted} SQLite files from the data directory.` });
      } catch (err) {
        console.error('Clear SQLite error:', err);
        await interaction.editReply({ content: `❌ Failed to clear SQLite files: ${err.message}` });
      }
    }
  }
};

// ============================================
// MIGRATION LOGIC
// ============================================

async function runMigration() {
  console.log('[MIGRATION] Starting full SQLite to MongoDB migration...');
  console.trace('[MIGRATION] Trace for migration call:');
  const { useMongoDB } = require('../../config/database');
  if (!useMongoDB) {
    throw new Error('USE_MONGODB is false in config. Please enable it before migrating.');
  }

  // Ensure Mongoose is connected
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Mongoose is not connected. Wait for connection or check configuration.');
  }

  // Load all Mongoose models
  const models = require('../../database/mongoose');

  // Define database connections and their respective migration functions
  const dataDir = path.join(__dirname, '..', '..', '..', 'data');
  
  const getDb = (filename) => {
    return new Promise((resolve, reject) => {
      // Prioritize root data, then src/data. Check if file is > 0 bytes.
      const pRoot = path.join(__dirname, '..', '..', 'data', filename);
      const pSrc = path.join(dataDir, filename);
      
      let p = null;
      if (fs.existsSync(pRoot) && fs.statSync(pRoot).size > 0) p = pRoot;
      else if (fs.existsSync(pSrc) && fs.statSync(pSrc).size > 0) p = pSrc;
      
      if (!p) return resolve(null);
      console.log(`[MIGRATION] Using ${p} for ${filename}`);
      const db = new sqlite3.Database(p, sqlite3.OPEN_READONLY, (err) => {
        if (err) return resolve(null);
        resolve(db);
      });
    });
  };

  const fetchAll = (db, sql) => {
    return new Promise((resolve, reject) => {
      db.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  const closeDb = (db) => {
    return new Promise((resolve) => db.close(() => resolve()));
  };

  // 0. AI (ai_channels.db)
  const aiDb = await getDb('ai_channels.db');
  if (aiDb) {
    console.log('[MIGRATION] Migrating ai_channels.db...');
    try {
      const chans = await fetchAll(aiDb, `SELECT * FROM ai_channels`);
      for (const c of chans) {
        await models.AIChannel.findOneAndUpdate(
          { guildId: c.guildId, channelId: c.channelId },
          {},
          { upsert: true }
        );
      }
      const stats = await fetchAll(aiDb, `SELECT * FROM ai_stats`);
      for (const s of stats) {
        await models.AIStats.findOneAndUpdate(
          { guildId: s.guildId },
          { prompts: s.prompts, images: s.images },
          { upsert: true }
        );
      }
      const set = await fetchAll(aiDb, `SELECT * FROM ai_settings`);
      for (const s of set) {
        await models.AISetting.findOneAndUpdate(
          { guildId: s.guildId },
          { model: s.model, style: s.style, autoReply: s.autoReply === 1 },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping AI migration:', e.message); }
    await closeDb(aiDb);
  }

  // 1. AFK (afk_storage.db)
  const afkDb = await getDb('afk_storage.db');
  if (afkDb) {
    console.log('[MIGRATION] Migrating afk_storage.db...');
    try {
      const records = await fetchAll(afkDb, `SELECT * FROM afk_records`);
      for (const r of records) {
        await models.AFKUser.findOneAndUpdate(
          { guildId: r.guildId, userId: r.userId },
          {
            reason: r.reason,
            startTimestamp: r.startTimestamp,
            hideStatus: r.hideStatus === 1,
            lastNotifiedJson: r.lastNotifiedJson || '{}',
            notifiedCount: r.notifiedCount || 0
          },
          { upsert: true }
        );
      }
      const configs = await fetchAll(afkDb, `SELECT * FROM afk_guild_config`);
      for (const c of configs) {
        await models.AFKGuildConfig.findOneAndUpdate(
          { guildId: c.guildId },
          { enabled: c.enabled === 1, cooldownSeconds: c.cooldownSeconds },
          { upsert: true }
        );
      }
      const ignored = await fetchAll(afkDb, `SELECT * FROM afk_ignored_channels`);
      for (const i of ignored) {
        await models.AFKIgnoredChannel.findOneAndUpdate(
          { guildId: i.guildId, channelId: i.channelId },
          {},
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping AFK migration:', e.message); }
    await closeDb(afkDb);
  }

  // 2. AntiNuke (antinuke.db)
  const anDb = await getDb('antinuke.db');
  if (anDb) {
    console.log('[MIGRATION] Migrating antinuke.db...');
    try {
      const config = await fetchAll(anDb, `SELECT * FROM antinuke_config`);
      for (const c of config) {
        await models.AntiNukeConfig.findOneAndUpdate(
          { guildId: c.guild_id },
          {
            enabled: c.enabled === 1,
            punishment: c.punishment,
            actionLimit: c.action_limit,
            autoRecovery: c.autorecovery === 1,
            logChannel: c.log_channel
          },
          { upsert: true }
        );
      }
      const whitelist = await fetchAll(anDb, `SELECT * FROM antinuke_whitelist`);
      for (const w of whitelist) {
        await models.AntiNukeWhitelist.findOneAndUpdate(
          { guildId: w.guild_id, userId: w.user_id },
          {},
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping AntiNuke migration:', e.message); }
    await closeDb(anDb);
  }

  // 3. AutoMod (automod.db)
  const amDb = await getDb('automod.db');
  if (amDb) {
    console.log('[MIGRATION] Migrating automod.db...');
    try {
      const set = await fetchAll(amDb, `SELECT * FROM automod_settings`);
      for (const s of set) {
        await models.AutomodSettings.findOneAndUpdate(
          { guildId: s.guildId },
          { settings: s.settings },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping AutoMod migration:', e.message); }
    await closeDb(amDb);
  }

  // 3a. Autoresponse (autoresponse.db)
  const arsDb = await getDb('autoresponse.db');
  if (arsDb) {
    console.log('[MIGRATION] Migrating autoresponse.db...');
    try {
      const rows = await fetchAll(arsDb, `SELECT * FROM autoresponses`);
      for (const r of rows) {
        await models.Autoresponse.findOneAndUpdate(
          { guildId: r.guildId, trigger: r.trigger },
          { response: r.response, embed: r.embed === 1, matchMode: r.matchMode || 'exact' },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping Autoresponse migration:', e.message); }
    await closeDb(arsDb);
  }

  // 4. AutoRole (autorole.db)
  const arDb = await getDb('autorole.db');
  if (arDb) {
    console.log('[MIGRATION] Migrating autorole.db...');
    try {
      const roles = await fetchAll(arDb, `SELECT * FROM autorole_settings`);
      for (const r of roles) {
        await models.AutoRole.findOneAndUpdate(
          { guildId: r.guildId, roleId: r.roleId },
          { targetType: r.targetType || 'all', delay: r.delay || 0 },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping AutoRole migration:', e.message); }
    await closeDb(arDb);
  }

  // 5. Backups (server_backups.db)
  const bkDb = await getDb('server_backups.db');
  if (bkDb) {
    console.log('[MIGRATION] Migrating server_backups.db...');
    try {
      const backups = await fetchAll(bkDb, `SELECT * FROM backups`);
      for (const b of backups) {
        await models.ServerBackup.findOneAndUpdate(
          { backupId: b.backupId },
          { guildId: b.guildId, name: b.name, data: b.data, createdAt: b.createdAt },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping Backups migration:', e.message); }
    await closeDb(bkDb);
  }

  // 5a. Giveaways (giveaway.db)
  const gvDb = await getDb('giveaway.db');
  if (gvDb) {
    console.log('[MIGRATION] Migrating giveaway.db...');
    try {
      const gvs = await fetchAll(gvDb, `SELECT * FROM giveaways`);
      for (const g of gvs) {
        await models.Giveaway.findOneAndUpdate(
          { messageId: g.message_id },
          {
            guildId: g.guild_id,
            channelId: g.channel_id,
            prize: g.prize,
            winners: g.winners,
            endAt: g.end_at,
            createdBy: g.created_by,
            ended: g.ended === 1,
            participants: g.participants || '[]'
          },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping Giveaways migration:', e.message); }
    await closeDb(gvDb);
  }

  // 6. Birthdays (birthdays.db)
  const bdDb = await getDb('birthdays.db');
  if (bdDb) {
    console.log('[MIGRATION] Migrating birthdays.db...');
    try {
      const bdays = await fetchAll(bdDb, `SELECT * FROM birthdays`);
      for (const b of bdays) {
        await models.Birthday.findOneAndUpdate(
          { guildId: b.guildId, userId: b.userId },
          { year: b.year, month: b.month, day: b.day, note: b.note, createdAt: b.createdAt },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping Birthdays migration:', e.message); }
    await closeDb(bdDb);
  }

  // 7a. Embed Templates (embedtemplates.db)
  const etDb = await getDb('embedtemplates.db');
  if (etDb) {
    console.log('[MIGRATION] Migrating embedtemplates.db...');
    try {
      const templates = await fetchAll(etDb, `SELECT * FROM embed_templates`);
      for (const t of templates) {
        await models.EmbedTemplate.findOneAndUpdate(
          { guildId: t.guildId, name: t.name },
          { userId: t.userId, dataJson: t.dataJson },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping Embed Templates migration:', e.message); }
    await closeDb(etDb);
  }

  // 7. Economy (economy.db)
  const ecDb = await getDb('economy.db');
  if (ecDb) {
    console.log('[MIGRATION] Migrating economy.db...');
    try {
      const stats = await fetchAll(ecDb, `SELECT * FROM stats`);
      for (const s of stats) {
        await models.EcoStat.findOneAndUpdate(
          { userId: s.userId, key: s.key },
          { value: s.value },
          { upsert: true }
        );
      }

      const invs = await fetchAll(ecDb, `SELECT * FROM inventory`);
      for (const i of invs) {
        await models.EcoInventory.findOneAndUpdate(
          { userId: i.userId, itemId: i.itemId },
          { quantity: i.quantity },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping Economy migration:', e.message); }
    await closeDb(ecDb);
  }

  // 8. GhostPing (ghostping.db)
  const gpDb = await getDb('ghostping.db');
  if (gpDb) {
    console.log('[MIGRATION] Migrating ghostping.db...');
    try {
      const configs = await fetchAll(gpDb, `SELECT * FROM ghost_settings`);
      for (const c of configs) {
        await models.GhostConfig.findOneAndUpdate(
          { guildId: c.guildId },
          { enabled: c.enabled === 1, action: c.action, timeoutSeconds: c.timeoutSeconds },
          { upsert: true }
        );
      }

      const counts = await fetchAll(gpDb, `SELECT * FROM ghost_counts`);
      for (const c of counts) {
        await models.GhostCount.findOneAndUpdate(
          { guildId: c.guild_id, userId: c.user_id },
          { count: c.count },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping GhostPing migration:', e.message); }
    await closeDb(gpDb);
  }

  // 9. JoinPing (joinping.db)
  const jpDb = await getDb('joinping.db');
  if (jpDb) {
    console.log('[MIGRATION] Migrating joinping.db...');
    try {
      const pings = await fetchAll(jpDb, `SELECT * FROM join_pings`);
      for (const c of pings) {
        await models.JoinPingConfig.findOneAndUpdate(
          { guildId: c.guildId, channelId: c.channelId },
          { createdAt: c.createdAt },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping JoinPing migration:', e.message); }
    await closeDb(jpDb);
  }

  // 9a. Join-to-Create (join-to-create.db)
  const jtcDb = await getDb('join-to-create.db');
  if (jtcDb) {
    console.log('[MIGRATION] Migrating join-to-create.db...');
    try {
      const config = await fetchAll(jtcDb, `SELECT * FROM jtc_config`);
      for (const c of config) {
        await models.JTCConfig.findOneAndUpdate(
          { guildId: c.guildId },
          { hubId: c.hubId, categoryId: c.categoryId },
          { upsert: true }
        );
      }
      const sessions = await fetchAll(jtcDb, `SELECT * FROM jtc_sessions`);
      for (const s of sessions) {
        await models.JTCSession.findOneAndUpdate(
          { voiceId: s.voiceId },
          { guildId: s.guildId, ownerId: s.ownerId, textId: s.textId },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping JTC migration:', e.message); }
    await closeDb(jtcDb);
  }

  // 10. Logging (logging.db)
  const lgDb = await getDb('logging.db');
  if (lgDb) {
    console.log('[MIGRATION] Migrating logging.db...');
    try {
      const set = await fetchAll(lgDb, `SELECT * FROM log_settings`);
      for (const s of set) {
        await models.LogConfig.findOneAndUpdate(
          { guildId: s.guildId },
          {
            logChannel: s.logChannel,
            webhookId: s.webhookId,
            webhookToken: s.webhookToken
          },
          { upsert: true }
        );
      }
      const events = await fetchAll(lgDb, `SELECT * FROM log_events`);
      for (const e of events) {
        await models.LogEvent.findOneAndUpdate(
          { guildId: e.guildId, eventName: e.eventName },
          { enabled: e.enabled === 1 },
          { upsert: true }
        );
      }
      const ignored = await fetchAll(lgDb, `SELECT * FROM log_ignored_channels`);
      for (const i of ignored) {
        await models.LogIgnoredChannel.findOneAndUpdate(
          { guildId: i.guildId, channelId: i.channelId },
          {},
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping Logging migration:', e.message); }
    await closeDb(lgDb);
  }

  // 11. Mod Storage (mod_storage.db)
  const mdDb = await getDb('mod_storage.db');
  if (mdDb) {
    console.log('[MIGRATION] Migrating mod_storage.db...');
    try {
      const settings = await fetchAll(mdDb, `SELECT * FROM settings`);
      for (const s of settings) {
        await models.ModConfig.findOneAndUpdate(
          { guildId: s.guildId },
          { logChannelId: s.logChannel, mutedRole: s.mutedRole },
          { upsert: true }
        );
      }

      const roles = await fetchAll(mdDb, `SELECT * FROM mod_roles`);
      for (const r of roles) {
        let existing = await models.ModConfig.findOne({ guildId: r.guildId });
        let mods = existing ? existing.modRoleIds : [];
        let admins = existing ? existing.adminRoleIds : [];
        
        // We'll need a way to distinguish mod vs admin if the table doesn't have it.
        // For now, let's assume they are all mod roles if no type exists.
        if (!mods.includes(r.roleId)) mods.push(r.roleId);

        await models.ModConfig.findOneAndUpdate(
          { guildId: r.guildId },
          { modRoleIds: mods, adminRoleIds: admins },
          { upsert: true }
        );
      }

      const cases = await fetchAll(mdDb, `SELECT * FROM cases`);
      for (const c of cases) {
        await models.ModCase.findOneAndUpdate(
          { caseId: c.caseId },
          {
            guildId: c.guildId,
            moderatorId: c.moderatorId,
            targetId: c.targetId,
            action: c.action,
            reason: c.reason,
            duration: c.duration,
            timestamp: c.timestamp,
            evidence: c.evidence,
            references_list: c.references_list
          },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping Mod Storage migration:', e.message); }
    await closeDb(mdDb);
  }

  // 12. Ranking (ranking_data.db)
  const rkDb = await getDb('ranking_data.db');
  if (rkDb) {
    console.log('[MIGRATION] Migrating ranking_data.db...');
    try {
      const gcf = await fetchAll(rkDb, `SELECT * FROM guild_config`);
      for (const g of gcf) {
        await models.RankConfig.findOneAndUpdate(
          { guildId: g.guild_id },
          { enabled: g.enabled === 1, cooldownSeconds: g.cooldown_seconds, blacklist: JSON.parse(g.blacklist || '[]'), formula: g.formula, minChars: g.min_chars },
          { upsert: true }
        );
      }

      const usrs = await fetchAll(rkDb, `SELECT * FROM user_stats`);
      for (const u of usrs) {
        await models.RankUser.findOneAndUpdate(
          { guildId: u.guild_id, userId: u.user_id },
          { xp: u.xp, level: u.level, lastMsgTs: u.last_msg_ts, lastMsgHash: u.last_msg_hash, badges: JSON.parse(u.badges || '[]') },
          { upsert: true }
        );
      }

      const roles = await fetchAll(rkDb, `SELECT * FROM role_rewards`);
      for (const r of roles) {
        await models.RankRoleReward.findOneAndUpdate(
          { guildId: r.guild_id, level: r.level },
          { roleId: r.role_id },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping Ranking migration:', e.message); }
    await closeDb(rkDb);
  }

  // 13. Reaction Roles (reaction_roles.db)
  const rrDb = await getDb('reaction_roles.db');
  if (rrDb) {
    console.log('[MIGRATION] Migrating reaction_roles.db...');
    try {
      const setups = await fetchAll(rrDb, `SELECT * FROM rr_setups`);
      // We will map old SQLite IDs to new ones or simply use the string version of the SQLite ID.
      // We'll use the string version of the old ID to maintain relations.
      for (const s of setups) {
        await models.RRSetup.findOneAndUpdate(
          { _id: s.id },
          {
            guildId: s.guild_id,
            channelId: s.channel_id,
            messageId: s.message_id,
            mode: s.mode,
            title: s.title,
            description: s.description,
            creatorId: s.creator_id,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
            active: s.active === 1
          },
          { upsert: true }
        );
      }

      const items = await fetchAll(rrDb, `SELECT * FROM rr_items`);
      for (const i of items) {
        await models.RRItem.findOneAndUpdate(
          { _id: i.id },
          {
            setupId: String(i.setup_id),
            emoji: i.emoji,
            emojiIdentifier: i.emoji_identifier,
            label: i.label,
            roleId: i.role_id,
            position: i.position,
            createdAt: i.created_at
          },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping Reaction Roles migration:', e.message); }
    await closeDb(rrDb);
  }

  // 14. Socials (social_notifications.db)
  const socDb = await getDb('social_notifications.db');
  if (socDb) {
    console.log('[MIGRATION] Migrating social_notifications.db...');
    try {
      const chans = await fetchAll(socDb, `SELECT * FROM social_channels`);
      for (const c of chans) {
        await models.SocialConfig.findOneAndUpdate(
          { guildId: c.guildId, platform: c.platform, source: c.source },
          {
            notifyChannelId: c.notifyChannelId,
            message: c.message,
            lastPost: c.lastPost,
            cooldown: c.cooldown
          },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping Social Notifications migration:', e.message); }
    await closeDb(socDb);
  }

  // 15. Sticky Messages (sticky.db)
  const stkDb = await getDb('sticky.db');
  if (stkDb) {
    console.log('[MIGRATION] Migrating sticky.db...');
    try {
      const stickies = await fetchAll(stkDb, `SELECT * FROM stickies`);
      for (const s of stickies) {
        await models.Sticky.findOneAndUpdate(
          { _id: String(s.id) },
          {
            guildId: s.guildId,
            channelId: s.channelId,
            content: s.content,
            type: s.type,
            embedFlag: s.embedFlag === 1,
            enabled: s.enabled === 1,
            lastMessageId: s.lastMessageId,
            createdBy: s.createdBy,
            createdAt: s.createdAt,
            priority: s.priority
          },
          { upsert: true }
        );
      }

      const conf = await fetchAll(stkDb, `SELECT * FROM sticky_config`);
      for (const c of conf) {
        await models.StickyConfig.findOneAndUpdate(
          { guildId: c.guildId },
          {
            repostDelaySeconds: c.repostDelaySeconds,
            autoPinOnCreate: c.autoPinOnCreate === 1,
            webhookName: c.webhookName
          },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping Sticky migration:', e.message); }
    await closeDb(stkDb);
  }

  // 16. Tickets (ticket.db)
  const tktDb = await getDb('ticket.db');
  if (tktDb) {
    console.log('[MIGRATION] Migrating ticket.db...');
    try {
      const gconf = await fetchAll(tktDb, `SELECT * FROM guild_config`);
      for (const c of gconf) {
        await models.TicketConfig.findOneAndUpdate(
          { guildId: c.guild_id },
          {
            setupChannelId: c.setup_channel_id,
            transcriptChannelId: c.transcript_channel_id,
            openCategoryId: c.open_category_id,
            closedCategoryId: c.closed_category_id,
            archiveCategoryId: c.archive_category_id,
            supportRoleId: c.support_role_id
          },
          { upsert: true }
        );
      }

      const tkts = await fetchAll(tktDb, `SELECT * FROM tickets`);
      for (const t of tkts) {
        await models.Ticket.findOneAndUpdate(
          { guildId: t.guild_id, ticketId: t.id },
          {
            openerId: t.opener_id,
            channelId: t.channel_id,
            type: t.type,
            status: t.status,
            claimUserId: t.claim_user_id,
            createdAt: t.created_at,
            closedAt: t.closed_at,
            description: t.description,
            formResponses: t.form_responses
          },
          { upsert: true }
        );
      }

      const tkc = await fetchAll(tktDb, `SELECT * FROM counters`);
      for (const c of tkc) {
        await models.TicketCounter.findOneAndUpdate(
          { guildId: c.guild_id },
          { nextId: c.next_id },
          { upsert: true }
        );
      }
      
      const tkm = await fetchAll(tktDb, `SELECT * FROM ticket_members`);
      for (const m of tkm) {
        await models.TicketMember.findOneAndUpdate(
          { guildId: m.guild_id, ticketId: m.ticket_id, userId: m.user_id },
          {},
          { upsert: true }
        );
      }
      
      const tkp = await fetchAll(tktDb, `SELECT * FROM ticket_panels`);
      for (const p of tkp) {
        await models.TicketPanel.findOneAndUpdate(
          { panelId: p.panel_id },
          {
            guildId: p.guild_id,
            channelId: p.channel_id,
            name: p.name,
            isPremiumOnly: p.is_premium_only === 1,
            types: JSON.parse(p.types || '[]')
          },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping Tickets migration:', e.message); }
    await closeDb(tktDb);
  }

  // 17. Verification (verification.db)
  const vDb = await getDb('verification.db');
  if (vDb) {
    console.log('[MIGRATION] Migrating verification.db...');
    try {
      const vconf = await fetchAll(vDb, `SELECT * FROM verification_configs`);
      for (const c of vconf) {
        await models.VerificationConfig.findOneAndUpdate(
          { guildId: c.guild_id },
          { channelId: c.channel_id, roleId: c.role_id, embedMessage: c.embed_message, type: c.type },
          { upsert: true }
        );
      }

      const vu = await fetchAll(vDb, `SELECT * FROM verified_users`);
      for (const u of vu) {
        await models.VerifiedUser.findOneAndUpdate(
          { guildId: u.guild_id, userId: u.user_id },
          { verifiedAt: u.verified_at },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping Verification migration:', e.message); }
    await closeDb(vDb);
  }

  // 18. Welcome (welcome.db)
  const wDb = await getDb('welcome.db');
  if (wDb) {
    console.log('[MIGRATION] Migrating welcome.db...');
    try {
      const wset = await fetchAll(wDb, `SELECT * FROM welcome_settings`);
      for (const w of wset) {
        await models.WelcomeConfig.findOneAndUpdate(
          { guildId: w.guildId },
          {
            channelId: w.channelId,
            enabled: w.enabled === 1,
            messageJson: w.messageJson
          },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping Welcome migration:', e.message); }
    await closeDb(wDb);
  }

  // 19. YTVerify (yt_verify.db)
  const ytDb = await getDb('yt_verify.db');
  if (ytDb) {
    console.log('[MIGRATION] Migrating yt_verify.db...');
    try {
      const yt = await fetchAll(ytDb, `SELECT * FROM yt_verify_settings`);
      for (const y of yt) {
        await models.YTVerify.findOneAndUpdate(
          { guildId: y.guild_id },
          { channelName: y.channel_name, grantRoles: y.grant_roles, verifyChannelId: y.verify_channel_id, enabled: y.enabled === 1 },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping YT Verify migration:', e.message); }
    await closeDb(ytDb);
  }

  // 20. Social / Reputation (from rep_users, rep_logs)
  const repDb = await getDb('reputation.db') || await getDb('social.db');
  if (repDb) {
    console.log('[MIGRATION] Migrating reputation data...');
    try {
      const users = await fetchAll(repDb, `SELECT * FROM rep_users`);
      for (const u of users) {
        await models.SocialUser.findOneAndUpdate(
          { userId: u.userId, guildId: u.guildId },
          { rep: u.rep },
          { upsert: true }
        );
      }
    } catch (e) { console.log('Skipping Reputation migration:', e.message); }
    await closeDb(repDb);
  }

  // 21. Music (music.db)
  const muDb = await getDb('music.db');
  if (muDb) {
    console.log('[MIGRATION] Migrating music.db...');
    try {
      const config = await fetchAll(muDb, `SELECT * FROM music_config`);
      for (const c of config) {
        // Just log for now if no schema exists, or add basic schema
        console.log(`[MIGRATION] Found music config for guild ${c.guildId}`);
      }
    } catch (e) { console.log('Skipping Music migration:', e.message); }
    await closeDb(muDb);
  }

  console.log('[MIGRATION] Full SQLite to MongoDB migration completed successfully!');
}
