// src/events/guildMemberAddAutomod.js
// Anti-raid detection: monitors join velocity and bulk-punishes all raid joiners.

const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const AutomodStorage = require('../utils/automodStorage');
const automodCache = require('../utils/automodCache');
const automodActions = require('../utils/automodActions');

// Per-guild cooldown to prevent re-triggering on every join during an active raid
const raidCooldowns = new Map(); // guildId -> timestamp when cooldown expires

// Track which members joined during the current raid window so we can act on ALL of them
const recentJoinMembers = new Map(); // guildId -> Map<memberId, GuildMember>

const RAID_COOLDOWN_MS = 30_000; // 30s cooldown after a raid is handled

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member, client) {
    try {
      const guildId = member.guild.id;
      const cfg = await AutomodStorage.getConfig(guildId);
      if (!cfg?.AntiRaid?.enabled) return;

      // ── Track this join ──────────────────────────────────────
      automodCache.addJoin(guildId, Date.now());
      await AutomodStorage.addJoinRecord(guildId, Date.now()).catch(() => {});

      // Store the actual member object so we can act on them later
      if (!recentJoinMembers.has(guildId)) recentJoinMembers.set(guildId, new Map());
      recentJoinMembers.get(guildId).set(member.id, member);

      // Auto-cleanup old member references after 2 minutes
      setTimeout(() => {
        const members = recentJoinMembers.get(guildId);
        if (members) members.delete(member.id);
      }, 120_000);

      // ── Check cooldown ───────────────────────────────────────
      const cooldownExpiry = raidCooldowns.get(guildId) || 0;
      if (Date.now() < cooldownExpiry) {
        // Still in cooldown from a previous raid trigger — auto-punish this joiner too
        const action = cfg.AntiRaid.action || 'kick';
        await executeRaidAction(action, member, client);
        return;
      }

      // ── Check threshold ──────────────────────────────────────
      const windowMs = (cfg.AntiRaid.timeWindow || 10) * 1000;
      const recent = automodCache.getRecentJoins(guildId, windowMs);
      const threshold = cfg.AntiRaid.joinThreshold || 5;

      if (recent.length < threshold) return; // not a raid yet

      // ════════════════════════════════════════════════════════
      //  🚨 RAID DETECTED — Act on ALL recent joiners
      // ════════════════════════════════════════════════════════

      // Set cooldown so subsequent joins during the raid are auto-handled
      raidCooldowns.set(guildId, Date.now() + RAID_COOLDOWN_MS);

      // Check bot permissions first
      const me = member.guild.members.me;
      const action = cfg.AntiRaid.action || 'kick';
      const requiredPerm = action === 'ban'
        ? PermissionsBitField.Flags.BanMembers
        : PermissionsBitField.Flags.KickMembers;

      if (!me?.permissions.has(requiredPerm)) {
        console.error(`[AntiRaid] Missing ${action === 'ban' ? 'BAN_MEMBERS' : 'KICK_MEMBERS'} permission in guild ${guildId}`);
        await sendRaidLog(member.guild, client, {
          action,
          success: 0,
          failed: recent.length,
          error: `Bot is missing the \`${action === 'ban' ? 'Ban Members' : 'Kick Members'}\` permission!`,
          threshold,
          windowSec: cfg.AntiRaid.timeWindow || 10
        });
        return;
      }

      // Gather all members who joined in this window
      const raidMembers = recentJoinMembers.get(guildId) || new Map();
      const targetMembers = [...raidMembers.values()];

      // Also include the current member if not already tracked
      if (!raidMembers.has(member.id)) {
        targetMembers.push(member);
      }

      let successCount = 0;
      let failCount = 0;
      const actedOn = [];

      // Execute action on ALL raid members concurrently (with a small concurrency limit)
      const actionPromises = targetMembers.map(async (raidMember) => {
        try {
          // Don't kick/ban bots or members with mod permissions
          if (raidMember.user?.bot) return;
          if (raidMember.permissions?.has(PermissionsBitField.Flags.ManageGuild)) return;

          // Try to DM the user before action
          try {
            await raidMember.user.send(
              `⚠️ You were ${action === 'ban' ? 'banned' : 'kicked'} from **${member.guild.name}** by the anti-raid system. ` +
              `If this was a mistake, please contact a server administrator.`
            ).catch(() => {});
          } catch {}

          let ok = false;
          if (action === 'kick') {
            ok = await automodActions.kickUser(raidMember, 'Anti-raid: bulk join detected', client);
          } else if (action === 'ban') {
            ok = await automodActions.banUser(raidMember.guild, raidMember.id, 'Anti-raid: bulk join detected', client);
          }

          if (ok) {
            successCount++;
            actedOn.push(raidMember.user?.tag || raidMember.id);
          } else {
            failCount++;
          }
        } catch (err) {
          failCount++;
          console.warn(`[AntiRaid] Failed to ${action} member ${raidMember.id}:`, err?.message || err);
        }
      });

      await Promise.allSettled(actionPromises);

      // ── Clear the join cache for this guild to prevent false positives ──
      automodCache.clearJoins(guildId);
      if (recentJoinMembers.has(guildId)) recentJoinMembers.get(guildId).clear();

      // ── Send raid log to staff ─────────────────────────────
      await sendRaidLog(member.guild, client, {
        action,
        success: successCount,
        failed: failCount,
        actedOn,
        threshold,
        windowSec: cfg.AntiRaid.timeWindow || 10
      });

      console.log(`[AntiRaid] Guild ${guildId}: ${action}ed ${successCount} users (${failCount} failed) — threshold ${threshold}/${cfg.AntiRaid.timeWindow}s`);

    } catch (err) {
      console.error('[guildMemberAddAutomod] error', err);
    }
  }
};

/**
 * Execute a raid action on a single member (used during cooldown period).
 */
async function executeRaidAction(action, member, client) {
  try {
    if (member.user?.bot) return;
    if (member.permissions?.has(PermissionsBitField.Flags.ManageGuild)) return;

    // DM before action
    try {
      await member.user.send(
        `⚠️ You were ${action === 'ban' ? 'banned' : 'kicked'} from **${member.guild.name}** by the anti-raid system. ` +
        `If this was a mistake, please contact a server administrator.`
      ).catch(() => {});
    } catch {}

    if (action === 'kick') {
      await automodActions.kickUser(member, 'Anti-raid: joined during active raid cooldown', client);
    } else if (action === 'ban') {
      await automodActions.banUser(member.guild, member.id, 'Anti-raid: joined during active raid cooldown', client);
    }
  } catch (err) {
    console.warn(`[AntiRaid] Cooldown action failed for ${member.id}:`, err?.message || err);
  }
}

/**
 * Send a rich embed to the guild's log channel (via webhook or fallback).
 */
async function sendRaidLog(guild, client, data) {
  try {
    const logStorage = (() => { try { return require('../utils/logStorage'); } catch { return null; } })();
    const webhookHelper = (() => { try { return require('../utils/webhookHelper'); } catch { return null; } })();

    const embed = new EmbedBuilder()
      .setTitle('🚨 Anti-Raid Triggered')
      .setColor(0xFF0000)
      .setTimestamp()
      .setDescription(
        data.error
          ? `**Raid detected but action failed!**\n${data.error}`
          : `**Raid detected and handled.**`
      )
      .addFields(
        { name: '⚡ Action', value: data.action.toUpperCase(), inline: true },
        { name: '✅ Successful', value: `${data.success}`, inline: true },
        { name: '❌ Failed', value: `${data.failed}`, inline: true },
        { name: '📊 Threshold', value: `${data.threshold} joins / ${data.windowSec}s`, inline: true },
        { name: '⏱️ Cooldown', value: `${RAID_COOLDOWN_MS / 1000}s`, inline: true }
      );

    if (data.actedOn?.length > 0) {
      const userList = data.actedOn.slice(0, 20).join(', ');
      const extra = data.actedOn.length > 20 ? ` ...and ${data.actedOn.length - 20} more` : '';
      embed.addFields({ name: `🎯 Users ${data.action === 'ban' ? 'Banned' : 'Kicked'}`, value: userList + extra });
    }

    // Try webhook first, then fallback to log channel
    if (webhookHelper) {
      const ok = await webhookHelper.sendViaWebhookIfConfigured(client, guild.id, { embeds: [embed] });
      if (ok) return;
    }
    if (logStorage) {
      const chId = await logStorage.getLogChannel(guild.id);
      if (!chId) return;
      const channel = guild.channels.cache.get(String(chId));
      if (channel?.isTextBased?.()) {
        const me = guild.members.me;
        if (me && me.permissionsIn(channel).has(PermissionsBitField.Flags.SendMessages)) {
          await channel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('[AntiRaid] Failed to send raid log:', err?.message || err);
  }
}