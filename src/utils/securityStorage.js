// src/utils/securityStorage.js
const { useMongoDB } = require('../config/database');
const mongooseModels = require('../database/mongoose');
const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const inMemorySecurity = new Map(); // guildId -> config
const inMemoryQuarantine = new Map(); // `${guildId}:${userId}` -> record

async function getSecurityConfig(guildId) {
  if (inMemorySecurity.has(guildId)) {
    return inMemorySecurity.get(guildId);
  }

  let config = {
    guildId,
    quarantineRoleId: null,
    quarantineChannelId: null,
    isPanicLockdown: false,
    lockedChannels: []
  };

  if (useMongoDB) {
    try {
      const doc = await mongooseModels.SecurityConfig.findOne({ guildId }).lean();
      if (doc) {
        config = { ...config, ...doc };
      }
    } catch (e) {
      console.error('getSecurityConfig error:', e);
    }
  }

  inMemorySecurity.set(guildId, config);
  return config;
}

async function updateSecurityConfig(guildId, updates) {
  const current = await getSecurityConfig(guildId);
  const updated = { ...current, ...updates };
  inMemorySecurity.set(guildId, updated);

  if (useMongoDB) {
    try {
      await mongooseModels.SecurityConfig.findOneAndUpdate(
        { guildId },
        { $set: updates },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.error('updateSecurityConfig error:', e);
    }
  }

  return updated;
}

// Quarantine Operations
async function getQuarantineRecord(guildId, userId) {
  const key = `${guildId}:${userId}`;
  if (inMemoryQuarantine.has(key)) return inMemoryQuarantine.get(key);

  if (useMongoDB) {
    try {
      const doc = await mongooseModels.QuarantineMember.findOne({ guildId, userId }).lean();
      if (doc) {
        inMemoryQuarantine.set(key, doc);
        return doc;
      }
    } catch (e) {
      console.error('getQuarantineRecord error:', e);
    }
  }

  return null;
}

async function isolateMember(guild, member, reason, executorId) {
  const config = await getSecurityConfig(guild.id);
  if (!config.quarantineRoleId) {
    throw new Error('Quarantine role is not configured. Run `/security quarantine setup` first.');
  }

  const qRole = guild.roles.cache.get(config.quarantineRoleId);
  if (!qRole) {
    throw new Error('Configured quarantine role no longer exists in this server.');
  }

  // Save current roles (excluding managed/everyone)
  const botMember = guild.members.me;
  const originalRoles = member.roles.cache
    .filter(r => r.id !== guild.id && !r.managed && r.position < botMember.roles.highest.position)
    .map(r => r.id);

  // Strip roles and add quarantine role
  try {
    await member.roles.set([config.quarantineRoleId], `Quarantine Isolation by ${executorId}: ${reason}`);
  } catch (err) {
    throw new Error(`Failed to update roles: ${err.message}`);
  }

  const record = {
    guildId: guild.id,
    userId: member.id,
    savedRoleIds: originalRoles,
    quarantinedAt: Date.now(),
    quarantinedBy: executorId,
    reason
  };

  const key = `${guild.id}:${member.id}`;
  inMemoryQuarantine.set(key, record);

  if (useMongoDB) {
    try {
      await mongooseModels.QuarantineMember.findOneAndUpdate(
        { guildId: guild.id, userId: member.id },
        { $set: record },
        { upsert: true }
      );
    } catch (e) {
      console.error('isolateMember DB error:', e);
    }
  }

  return record;
}

async function releaseMember(guild, member, reason = 'Quarantine lifted') {
  const config = await getSecurityConfig(guild.id);
  const record = await getQuarantineRecord(guild.id, member.id);

  const botMember = guild.members.me;
  const rolesToRestore = (record?.savedRoleIds || []).filter(rid => {
    const role = guild.roles.cache.get(rid);
    return role && role.position < botMember.roles.highest.position && !role.managed;
  });

  try {
    await member.roles.set(rolesToRestore, `Quarantine release: ${reason}`);
  } catch (err) {
    // If set fails, at least remove the quarantine role
    if (config.quarantineRoleId && member.roles.cache.has(config.quarantineRoleId)) {
      await member.roles.remove(config.quarantineRoleId, `Quarantine release fallback: ${reason}`).catch(() => {});
    }
  }

  const key = `${guild.id}:${member.id}`;
  inMemoryQuarantine.delete(key);

  if (useMongoDB) {
    try {
      await mongooseModels.QuarantineMember.deleteOne({ guildId: guild.id, userId: member.id });
    } catch (e) {
      console.error('releaseMember DB error:', e);
    }
  }

  return rolesToRestore;
}

// Lockdown Operations
async function lockSingleChannel(channel, reason = 'Channel locked down') {
  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
    SendMessages: false,
    SendMessagesInThreads: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false
  }, { reason });
}

async function unlockSingleChannel(channel, reason = 'Channel unlocked') {
  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
    SendMessages: null,
    SendMessagesInThreads: null,
    CreatePublicThreads: null,
    CreatePrivateThreads: null
  }, { reason });
}

async function triggerPanicLockdown(guild, reason = 'Emergency Panic Lockdown initiated') {
  const textTypes = [
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement,
    ChannelType.GuildForum
  ];

  const lockedChannelIds = [];
  const channels = guild.channels.cache.filter(c => textTypes.includes(c.type));

  for (const [, ch] of channels) {
    try {
      const perms = ch.permissionsFor(guild.roles.everyone);
      if (perms && perms.has(PermissionFlagsBits.SendMessages)) {
        await lockSingleChannel(ch, reason);
        lockedChannelIds.push(ch.id);
      }
    } catch {}
  }

  await updateSecurityConfig(guild.id, {
    isPanicLockdown: true,
    lockedChannels: lockedChannelIds
  });

  return lockedChannelIds;
}

async function releasePanicLockdown(guild, reason = 'Emergency Panic Lockdown released') {
  const config = await getSecurityConfig(guild.id);
  const channelIds = config.lockedChannels || [];

  let unlockedCount = 0;
  for (const id of channelIds) {
    const ch = guild.channels.cache.get(id);
    if (ch) {
      try {
        await unlockSingleChannel(ch, reason);
        unlockedCount++;
      } catch {}
    }
  }

  await updateSecurityConfig(guild.id, {
    isPanicLockdown: false,
    lockedChannels: []
  });

  return unlockedCount;
}

module.exports = {
  getSecurityConfig,
  updateSecurityConfig,
  getQuarantineRecord,
  isolateMember,
  releaseMember,
  lockSingleChannel,
  unlockSingleChannel,
  triggerPanicLockdown,
  releasePanicLockdown
};
