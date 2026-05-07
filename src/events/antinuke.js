// src/events/antinuke.js
const { Events, AuditLogEvent } = require('discord.js');

const db = require('../utils/antinukeDb');
const embeds = require('../components/antinukeEmbeds');

/* ──────────────────────────────── */
/* ACTION → FEATURE MAP */
/* ──────────────────────────────── */
const ACTION_EVENTS = {
  CHANNEL_CREATE: 'antichannel',
  CHANNEL_DELETE: 'antichannel',
  CHANNEL_UPDATE: 'antichannel',

  ROLE_CREATE: 'antirole',
  ROLE_DELETE: 'antirole',
  ROLE_UPDATE: 'antirole',

  EMOJI_CREATE: 'antiemoji',
  EMOJI_DELETE: 'antiemoji',

  WEBHOOK_CREATE: 'antiwebhook',

  MEMBER_BAN_ADD: 'antiban',
  MEMBER_KICK: 'antikick',
  MEMBER_PRUNE: 'antiprune',

  BOT_ADD: 'antibot'
};

module.exports = {
  name: 'clientReady',

  async execute(client) {
    /* ──────────────────────────────── */
    /* CORE HANDLER */
    /* ──────────────────────────────── */
    async function handleNuke(guild, auditKey, executorId, target) {
      if (!guild || !executorId) return;
      if (executorId === guild.ownerId) return;

      const config = await db.getFullConfig(guild.id);
      if (!config.enabled) return;

      if (await db.isWhitelisted(guild.id, executorId)) return;

      const feature = ACTION_EVENTS[auditKey];
      if (!feature || !config[feature]) return;

      const count = await db.incrementAction(guild.id, executorId, Date.now());
      if (count < config.action_limit) return;

      const member = await guild.members.fetch(executorId).catch(() => null);
      if (!member) return;

      /* ───────── APPLY PUNISHMENT ───────── */
      try {
        if (config.punishment === 'ban') {
          await member.ban({ reason: 'Anti-Nuke: Mass destructive actions' });
        } else if (config.punishment === 'kick') {
          await member.kick('Anti-Nuke: Mass destructive actions');
        } else if (config.punishment === 'striproles') {
          const roles = member.roles.cache
            .filter(r => r.editable && r.id !== guild.id)
            .map(r => r.id);
          await member.roles.remove(roles);
        }
      } catch {}

      /* ───────── AUTO RECOVERY LOG ───────── */
      if (config.autorecovery) {
        await db.logRecovery(guild.id, auditKey, target);
      }

      /* ───────── LOG CHANNEL ───────── */
      const logChannelId = await db.getLogChannel(guild.id);
      const logChannel = logChannelId
        ? guild.channels.cache.get(logChannelId)
        : null;

      if (logChannel) {
        logChannel.send({
          embeds: [
            embeds.nukeAlert(
              guild,
              executorId,
              auditKey,
              config.punishment
            )
          ]
        }).catch(() => {});
      }
    }

    /* ──────────────────────────────── */
    /* AUDIT FETCH HELPER */
    /* ──────────────────────────────── */
    async function watchAudit(guild, type) {
      const logs = await guild.fetchAuditLogs({ limit: 1, type }).catch(() => null);
      if (!logs) return null;

      const entry = logs.entries.first();
      if (!entry) return null;

      return {
        executorId: entry.executor?.id,
        target: entry.target
      };
    }

    /* ──────────────────────────────── */
    /* REGISTER LISTENERS */
    /* ──────────────────────────────── */
    client.on('channelCreate', async channel => {
      const r = await watchAudit(channel.guild, AuditLogEvent.ChannelCreate);
      if (r) handleNuke(channel.guild, 'CHANNEL_CREATE', r.executorId, channel);
    });

    client.on('channelDelete', async channel => {
      const r = await watchAudit(channel.guild, AuditLogEvent.ChannelDelete);
      if (r) handleNuke(channel.guild, 'CHANNEL_DELETE', r.executorId, channel);
    });

    client.on('channelUpdate', async (_, channel) => {
      const r = await watchAudit(channel.guild, AuditLogEvent.ChannelUpdate);
      if (r) handleNuke(channel.guild, 'CHANNEL_UPDATE', r.executorId, channel);
    });

    client.on('roleCreate', async role => {
      const r = await watchAudit(role.guild, AuditLogEvent.RoleCreate);
      if (r) handleNuke(role.guild, 'ROLE_CREATE', r.executorId, role);
    });

    client.on('roleDelete', async role => {
      const r = await watchAudit(role.guild, AuditLogEvent.RoleDelete);
      if (r) handleNuke(role.guild, 'ROLE_DELETE', r.executorId, role);
    });

    client.on('emojiCreate', async emoji => {
      const r = await watchAudit(emoji.guild, AuditLogEvent.EmojiCreate);
      if (r) handleNuke(emoji.guild, 'EMOJI_CREATE', r.executorId, emoji);
    });

    client.on('emojiDelete', async emoji => {
      const r = await watchAudit(emoji.guild, AuditLogEvent.EmojiDelete);
      if (r) handleNuke(emoji.guild, 'EMOJI_DELETE', r.executorId, emoji);
    });

    client.on('webhookUpdate', async channel => {
      const r = await watchAudit(channel.guild, AuditLogEvent.WebhookCreate);
      if (r) handleNuke(channel.guild, 'WEBHOOK_CREATE', r.executorId, channel);
    });

    client.on('guildMemberAdd', async member => {
      if (!member.user.bot) return;
      const r = await watchAudit(member.guild, AuditLogEvent.BotAdd);
      if (r) handleNuke(member.guild, 'BOT_ADD', r.executorId, member);
    });

    console.log('[AntiNuke] Protection listeners registered');
  }
};