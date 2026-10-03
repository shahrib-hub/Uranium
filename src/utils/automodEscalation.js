// src/utils/automodEscalation.js
const { AutoModStrike, AutoModEscalationRule } = require('../database/mongoose');
const { isMongoReady } = require('../database/dbUtils');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

const DEFAULT_ESCALATION_RULES = [
  { strikes: 2, action: 'timeout', durationMs: 10 * 60 * 1000 }, // 2 strikes = 10 min timeout
  { strikes: 3, action: 'timeout', durationMs: 60 * 60 * 1000 }, // 3 strikes = 1 hr timeout
  { strikes: 4, action: 'kick', durationMs: 0 },                  // 4 strikes = Kick
  { strikes: 5, action: 'ban', durationMs: 0 }                    // 5 strikes = Ban
];

async function getEscalationRules(guildId) {
  if (!isMongoReady()) return DEFAULT_ESCALATION_RULES;
  try {
    const rules = await AutoModEscalationRule.find({ guildId }).sort({ strikes: 1 }).lean();
    if (!rules || rules.length === 0) return DEFAULT_ESCALATION_RULES;
    return rules;
  } catch (err) {
    console.error('[AutoModEscalation] getEscalationRules error:', err.message);
    return DEFAULT_ESCALATION_RULES;
  }
}

async function setEscalationRule(guildId, strikes, action, durationMs = 0) {
  if (!isMongoReady()) return null;
  try {
    return await AutoModEscalationRule.findOneAndUpdate(
      { guildId, strikes },
      { $set: { action, durationMs } },
      { upsert: true, new: true }
    ).lean();
  } catch (err) {
    console.error('[AutoModEscalation] setEscalationRule error:', err.message);
    return null;
  }
}

async function clearEscalationRules(guildId) {
  if (!isMongoReady()) return;
  try {
    await AutoModEscalationRule.deleteMany({ guildId });
  } catch (err) {
    console.error('[AutoModEscalation] clearEscalationRules error:', err.message);
  }
}

async function getStrikes(guildId, userId) {
  if (!isMongoReady()) return { count: 0, strikes: [] };
  try {
    const now = Date.now();
    const strikes = await AutoModStrike.find({
      guildId,
      userId,
      expiresAt: { $gt: now }
    }).sort({ timestamp: -1 }).lean();
    return { count: strikes.length, strikes };
  } catch (err) {
    console.error('[AutoModEscalation] getStrikes error:', err.message);
    return { count: 0, strikes: [] };
  }
}

async function clearStrikes(guildId, userId) {
  if (!isMongoReady()) return;
  try {
    await AutoModStrike.deleteMany({ guildId, userId });
  } catch (err) {
    console.error('[AutoModEscalation] clearStrikes error:', err.message);
  }
}

/**
 * Record a strike and check if an escalation action should be applied.
 */
async function recordStrikeAndEscalate(guild, member, reason = 'AutoMod Violation', ruleType = 'general', client) {
  if (!isMongoReady() || !guild || !member) return null;

  try {
    const guildId = guild.id;
    const userId = member.id;
    const now = Date.now();
    const expiresAt = now + DEFAULT_EXPIRY_MS;

    // 1. Record Strike in DB
    await AutoModStrike.create({
      guildId,
      userId,
      reason,
      ruleType,
      timestamp: now,
      expiresAt
    });

    // 2. Count active strikes
    const { count: activeCount } = await getStrikes(guildId, userId);

    // 3. Find matching escalation rule
    const rules = await getEscalationRules(guildId);
    // Find rule matching current strike count or highest triggered rule
    const triggeredRule = rules.find(r => r.strikes === activeCount);

    if (!triggeredRule) {
      return {
        escalated: false,
        strikeCount: activeCount,
        action: 'warn'
      };
    }

    // 4. Apply escalation action
    const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (!botMember) return { escalated: false, strikeCount: activeCount };

    // Check bot hierarchy
    if (member.roles && botMember.roles && member.roles.highest.position >= botMember.roles.highest.position) {
      console.warn(`[AutoModEscalation] Cannot escalate on user ${member.id} due to role hierarchy`);
      return { escalated: false, strikeCount: activeCount, hierarchyBlocked: true };
    }

    const escalationReason = `AutoMod Escalation (${activeCount} Strikes): ${reason}`;

    if (triggeredRule.action === 'timeout') {
      const dur = triggeredRule.durationMs || 10 * 60 * 1000;
      if (botMember.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        await member.timeout(dur, escalationReason).catch(() => {});
        await member.send(`⚠️ You received a temporary timeout in **${guild.name}** for **${Math.round(dur / 60000)} minutes** due to accumulating ${activeCount} AutoMod strikes.`).catch(() => {});
      }
    } else if (triggeredRule.action === 'kick') {
      if (botMember.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        await member.send(`⛔ You have been kicked from **${guild.name}** due to accumulating ${activeCount} AutoMod strikes.`).catch(() => {});
        await member.kick(escalationReason).catch(() => {});
      }
    } else if (triggeredRule.action === 'ban') {
      if (botMember.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        await member.send(`🔨 You have been banned from **${guild.name}** due to accumulating ${activeCount} AutoMod strikes.`).catch(() => {});
        await guild.members.ban(userId, { reason: escalationReason }).catch(() => {});
      }
    }

    // 5. Send Alert Log Embed
    const logEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🚨 AutoMod Punishment Escalation Triggered')
      .setDescription(`User <@${userId}> has reached **${activeCount} strikes** and an automated penalty was enforced.`)
      .addFields(
        { name: 'Target User', value: `${member.user?.tag || userId} (<@${userId}>)`, inline: true },
        { name: 'Active Strikes', value: `\`${activeCount}\``, inline: true },
        { name: 'Enforced Action', value: `**${triggeredRule.action.toUpperCase()}**${triggeredRule.durationMs ? ` (${Math.round(triggeredRule.durationMs / 60000)}m)` : ''}`, inline: true },
        { name: 'Latest Trigger', value: `${reason} (${ruleType})`, inline: false }
      )
      .setFooter({ text: 'Uranium • AutoMod Escalation Defense' })
      .setTimestamp();

    const webhookHelper = require('./webhookHelper');
    const logStorage = require('./logStorage');
    if (webhookHelper) {
      await webhookHelper.sendViaWebhookIfConfigured(client, guildId, { embeds: [logEmbed] }).catch(() => {});
    }

    return {
      escalated: true,
      strikeCount: activeCount,
      action: triggeredRule.action,
      durationMs: triggeredRule.durationMs
    };

  } catch (err) {
    console.error('[AutoModEscalation] recordStrikeAndEscalate error:', err);
    return null;
  }
}

module.exports = {
  getEscalationRules,
  setEscalationRule,
  clearEscalationRules,
  getStrikes,
  clearStrikes,
  recordStrikeAndEscalate
};
