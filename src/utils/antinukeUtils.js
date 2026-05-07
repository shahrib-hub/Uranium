// src/utils/antinukeUtils.js
const {
  AuditLogEvent,
  PermissionsBitField
} = require('discord.js');

const db = require('./antinukeDb');
const embeds = require('../components/antinukeEmbeds');

/* ───────────────────────────── */
/* FETCH AUDIT LOG EXECUTOR */
/* ───────────────────────────── */
async function getExecutor(guild, type, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({
      type,
      limit: 5
    });

    const entry = logs.entries.find(e =>
      e.target?.id === targetId &&
      Date.now() - e.createdTimestamp < 5000
    );

    return entry?.executor || null;
  } catch {
    return null;
  }
}

/* ───────────────────────────── */
/* CORE HANDLER */
/* ───────────────────────────── */
async function handleAntiNuke({
  guild,
  actionType,
  auditType,
  target,
  restore
}) {
  if (!guild || !guild.members.me) return;

  const config = await db.getFullConfig(guild.id);
  if (!config.enabled) return;
  if (!config[actionType]) return;

  const executor = await getExecutor(guild, auditType, target.id);
  if (!executor) return;

  if (
    executor.id === guild.ownerId ||
    executor.id === guild.members.me.id
  ) return;

  if (await db.isWhitelisted(guild.id, executor.id)) return;

  const now = Date.now();
  const count = await db.incrementAction(guild.id, executor.id, now);

  if (count < config.action_limit) return;

  /* ───────────── PUNISH ───────────── */
  const member = await guild.members.fetch(executor.id).catch(() => null);

  try {
    if (member) {
      if (config.punishment === 'ban' && member.bannable) {
        await member.ban({ reason: 'Anti-Nuke Protection' });
      } else if (config.punishment === 'kick' && member.kickable) {
        await member.kick('Anti-Nuke Protection');
      } else if (config.punishment === 'timeout') {
        await member.timeout(60 * 60 * 1000, 'Anti-Nuke Protection');
      }
    }
  } catch {}

  /* ───────────── RECOVERY ───────────── */
  if (config.autorecovery && typeof restore === 'function') {
    try {
      await restore();
      await db.logRecovery(guild.id, actionType, target);
    } catch {}
  }

  /* ───────────── LOG ───────────── */
  const logChannelId = await db.getLogChannel(guild.id);
  if (!logChannelId) return;

  const logChannel = guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  const embed = embeds.alert({
    guild,
    executor,
    target,
    actionType,
    punishment: config.punishment
  });

  logChannel.send({ embeds: [embed] }).catch(() => {});
}

/* ───────────────────────────── */
/* EXPORT */
/* ───────────────────────────── */
module.exports = {
  handleAntiNuke,
  AuditLogEvent
};