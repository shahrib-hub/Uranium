// src/dashboard/routes/backups.js — Server Backup & Snapshot API
const { Router } = require('express');
const backupStorage = require('../../utils/backupStorage');
const { serializeGuild, applyBackup } = require('../../utils/backupSerializer');
const { isPremiumGuild } = require('../../utils/premium');

const COOLDOWN_FREE = 7 * 24 * 60 * 60 * 1000; // 7 days (Free tier)
const COOLDOWN_PREMIUM = 24 * 60 * 60 * 1000;   // 1 day (Premium tier)
const SLOTS_FREE = 1;
const SLOTS_PREMIUM = 3;

module.exports = function createBackupsRouter(client, { requireGuildAccess, requireGuildAdmin, requireGuildMod }) {
  const router = Router();

  // 1. GET Backups Overview & Cooldown status
  router.get('/guild/:guildId/backups', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { guild } = req;
      const isPremium = isPremiumGuild(guild.id);
      const maxSlots = isPremium ? SLOTS_PREMIUM : SLOTS_FREE;
      const cooldownMs = isPremium ? COOLDOWN_PREMIUM : COOLDOWN_FREE;

      const rawBackups = (await backupStorage.getBackupsByGuild(guild.id)) || [];
      const lastCreatedAt = (await backupStorage.getLastCreatedAt(guild.id)) || 0;
      const now = Date.now();
      const elapsed = now - Number(lastCreatedAt || 0);
      const cooldownRemainingMs = elapsed < cooldownMs ? cooldownMs - elapsed : 0;
      const canCreate = cooldownRemainingMs <= 0;

      // Format backup entries
      const backups = rawBackups.map(b => {
        let parsedData = null;
        let roleCount = 0;
        let channelCount = 0;
        try {
          parsedData = typeof b.data === 'string' ? JSON.parse(b.data) : b.data;
          roleCount = parsedData?.roles?.length || 0;
          channelCount = parsedData?.channels?.length || 0;
        } catch {}

        return {
          slot: b.slot,
          name: b.name,
          created_at: b.created_at,
          created_by: b.created_by,
          is_premium: !!b.is_premium,
          stats: {
            roles: roleCount,
            channels: channelCount,
            guildName: parsedData?.guild?.name || guild.name
          }
        };
      });

      res.json({
        isPremium,
        limits: {
          maxSlots,
          cooldownMs,
          cooldownDays: isPremium ? 1 : 7
        },
        lastCreatedAt,
        cooldownRemainingMs,
        canCreate,
        backups
      });
    } catch (err) {
      console.error('[Backups API] GET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. POST Create Backup Snapshot
  router.post('/guild/:guildId/backups/create', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const isPremium = isPremiumGuild(guild.id);
      const maxSlots = isPremium ? SLOTS_PREMIUM : SLOTS_FREE;
      const cooldownMs = isPremium ? COOLDOWN_PREMIUM : COOLDOWN_FREE;

      const slot = parseInt(req.body.slot || 1, 10);
      if (isNaN(slot) || slot < 1 || slot > maxSlots) {
        return res.status(400).json({
          error: isPremium
            ? `Invalid slot. Premium allows slots 1 to ${maxSlots}.`
            : `Free tier is limited to slot 1 only. Upgrade to Premium for 3 backup slots.`
        });
      }

      // Check cooldown
      const lastCreatedAt = (await backupStorage.getLastCreatedAt(guild.id)) || 0;
      const now = Date.now();
      const elapsed = now - Number(lastCreatedAt || 0);
      if (elapsed < cooldownMs) {
        const remainingHours = Math.ceil((cooldownMs - elapsed) / (1000 * 60 * 60));
        return res.status(429).json({
          error: `Backup cooldown active. You can create another backup in ${remainingHours} hour(s). (${isPremium ? '1 day cooldown for Premium' : '7 days cooldown for Free tier'})`
        });
      }

      const backupName = (req.body.name || `Backup Slot ${slot}`).trim().slice(0, 50);
      const serialized = serializeGuild(guild);

      await backupStorage.saveBackup({
        guildId: guild.id,
        slot,
        name: backupName,
        createdBy: req.user?.id || 'Dashboard',
        isPremium,
        data: serialized
      });

      await backupStorage.setLastCreatedAt(guild.id, now);

      res.json({
        success: true,
        message: `Backup #${slot} "${backupName}" successfully saved!`,
        backup: {
          slot,
          name: backupName,
          created_at: now,
          created_by: req.user?.id || 'Dashboard',
          is_premium: isPremium,
          stats: {
            roles: serialized.roles.length,
            channels: serialized.channels.length,
            guildName: serialized.guild.name
          }
        }
      });
    } catch (err) {
      console.error('[Backups API] CREATE error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. POST Restore Backup
  router.post('/guild/:guildId/backups/restore/:slot', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const slot = parseInt(req.params.slot, 10);
      if (isNaN(slot)) {
        return res.status(400).json({ error: 'Invalid backup slot.' });
      }

      const record = await backupStorage.getBackup(guild.id, slot);
      if (!record) {
        return res.status(404).json({ error: `No backup found in slot #${slot}.` });
      }

      let data = record.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          return res.status(500).json({ error: 'Failed to parse backup data.' });
        }
      }

      // Execute restoration
      const summary = await applyBackup(guild, data);

      res.json({
        success: true,
        message: `Backup #${slot} successfully restored!`,
        summary
      });
    } catch (err) {
      console.error('[Backups API] RESTORE error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. DELETE Backup
  router.delete('/guild/:guildId/backups/:slot', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const slot = parseInt(req.params.slot, 10);
      if (isNaN(slot)) {
        return res.status(400).json({ error: 'Invalid backup slot.' });
      }

      const deleted = await backupStorage.deleteBackup(guild.id, slot);
      if (!deleted) {
        return res.status(404).json({ error: `No backup found in slot #${slot}.` });
      }

      res.json({ success: true, message: `Backup in slot #${slot} deleted.` });
    } catch (err) {
      console.error('[Backups API] DELETE error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
