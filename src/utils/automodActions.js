// src/utils/automodActions.js
const { PermissionsBitField } = require('discord.js');
const modStorage = (() => {
  try { return require('./modStorage'); } catch (e) { return null; }
})();

const logStorage = (() => {
  try { return require('./logStorage'); } catch (e) { return null; }
})();

const webhookHelper = (() => {
  try { return require('./webhookHelper'); } catch (e) { return null; }
})();

async function tryLog(guildId, client, embed) {
  try {
    if (webhookHelper) {
      const ok = await webhookHelper.sendViaWebhookIfConfigured(client, guildId, { embeds: [embed] });
      if (ok) return;
    }
    if (logStorage) {
      const ch = await logStorage.getLogChannel(guildId);
      if (!ch) return;
      const guild = client.guilds.cache.get(String(guildId));
      if (!guild) return;
      const channel = guild.channels.cache.get(String(ch));
      if (channel && channel.isTextBased?.()) {
        const me = guild.members.me;
        if (me && me.permissionsIn(channel).has(PermissionsBitField.Flags.SendMessages)) {
          await channel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    }
  } catch (err) {
    // swallow
    console.warn('[automodActions] logging failed', err?.message || err);
  }
}

async function saveCaseRecord(guildId, data) {
  try {
    if (modStorage && typeof modStorage.saveCase === 'function') {
      await modStorage.saveCase(data);
    }
  } catch (err) {
    console.warn('[automodActions] saveCase failed', err?.message || err);
  }
}

module.exports = {
  async deleteMessage(message) {
    try {
      if (!message) return false;
      if (typeof message.delete === 'function') {
        await message.delete().catch(() => {});
        return true;
      }
      return false;
    } catch { return false; }
  },

  async warnUser(guild, moderator, user, reason = 'Automod: warning', client) {
    try {
      // try DM
      try {
        await user.send(`You were warned in **${guild.name}**: ${reason}`).catch(() => {});
      } catch {}
      // log case
      await saveCaseRecord(guild.id, {
        caseId: `AM-${Date.now().toString(36)}`,
        guildId: guild.id,
        moderatorId: moderator?.id || client.user.id,
        targetId: user.id,
        action: 'automod_warn',
        reason,
        duration: null,
        timestamp: Date.now(),
        evidence: [],
        references: []
      });
      return true;
    } catch { return false; }
  },

  async timeoutUser(guildMember, durationMs, reason = 'Automod: timeout', client) {
    try {
      if (!guildMember.moderatable && !guildMember.manageable) {
        // not necessarily fatal, but can't timeout
      }
      await guildMember.timeout(durationMs, reason).catch(() => {});
      await saveCaseRecord(guildMember.guild.id, {
        caseId: `AM-${Date.now().toString(36)}`,
        guildId: guildMember.guild.id,
        moderatorId: client.user.id,
        targetId: guildMember.id,
        action: 'automod_timeout',
        reason,
        duration: durationMs,
        timestamp: Date.now(),
        evidence: [],
        references: []
      });
      return true;
    } catch (err) {
      return false;
    }
  },

  async kickUser(guildMember, reason = 'Automod: kick', client) {
    try {
      if (!guildMember.kickable) return false;
      await guildMember.kick(reason).catch(() => {});
      await saveCaseRecord(guildMember.guild.id, {
        caseId: `AM-${Date.now().toString(36)}`,
        guildId: guildMember.guild.id,
        moderatorId: client.user.id,
        targetId: guildMember.id,
        action: 'automod_kick',
        reason,
        duration: null,
        timestamp: Date.now(),
        evidence: [],
        references: []
      });
      return true;
    } catch { return false; }
  },

  async banUser(guild, userId, reason = 'Automod: ban', client) {
    try {
      // Check hierarchy if the user is still in the guild
      try {
        const targetMember = await guild.members.fetch(userId).catch(() => null);
        if (targetMember && !targetMember.bannable) return false;
      } catch {}
      await guild.bans.create(userId, { reason, deleteMessageSeconds: 86400 }).catch(() => {});
      await saveCaseRecord(guild.id, {
        caseId: `AM-${Date.now().toString(36)}`,
        guildId: guild.id,
        moderatorId: client.user.id,
        targetId: userId,
        action: 'automod_ban',
        reason,
        duration: null,
        timestamp: Date.now(),
        evidence: [],
        references: []
      });
      return true;
    } catch { return false; }
  },

  // helper to map string action to function
  async performAction(action, context = {}) {
    // context: { message, member, guild, user, durationMs, moderator, client, embedForLog }
    const { message, member, guild, user, durationMs, moderator, client, embedForLog } = context;
    let ok = false;
    try {
      // Offending messages should always be deleted upon automod rule violation
      if (message) {
        await this.deleteMessage(message);
      }

      if (action === 'delete') {
        ok = true;
      } else if (action === 'warn') {
        ok = await this.warnUser(guild, moderator || client.user, user || (member && member.user), 'Automod action', client);
      } else if (action === 'timeout') {
        if (!member) return false;
        ok = await this.timeoutUser(member, durationMs || 60_000, client);
      } else if (action === 'kick') {
        if (!member) return false;
        ok = await this.kickUser(member, 'Automod', client);
      } else if (action === 'ban') {
        ok = await this.banUser(guild, user?.id || (member && member.id), 'Automod', client);
      }
    } catch (e) {
      ok = false;
    }

    // log via webhook/storage
    if (embedForLog && guild?.id) {
      tryLog(guild.id, client, embedForLog).catch(() => {});
    }

    return ok;
  }
};