// src/utils/backupSerializer.js
const { ChannelType, PermissionsBitField } = require('discord.js');

function serializeGuild(guild) {
  const roles = guild.roles.cache
    .filter(r => !r.managed)
    .map(r => ({
      id: r.id,
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      mentionable: r.mentionable,
      permissions: r.permissions.bitfield.toString(),
      position: r.position,
    }));

  const channels = guild.channels.cache
    .filter(c => c.deletable)
    .map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parentId: c.parentId,
      topic: c.topic ?? null,
      nsfw: c.nsfw ?? false,
      rateLimitPerUser: c.rateLimitPerUser ?? 0,
      position: c.position,
      permissionOverwrites: c.permissionOverwrites.cache.map(po => ({
        id: po.id,
        type: po.type,
        allow: po.allow.bitfield.toString(),
        deny: po.deny.bitfield.toString(),
      })),
    }));

  return {
    guild: {
      name: guild.name,
      icon: guild.iconURL({ size: 1024, extension: 'png' }),
      verificationLevel: guild.verificationLevel,
      explicitContentFilter: guild.explicitContentFilter,
      defaultMessageNotifications: guild.defaultMessageNotifications,
      systemChannelId: guild.systemChannelId,
    },
    roles,
    channels,
  };
}

async function applyGuildSettings(guild, data) {
  const g = data.guild || {};

  try {
    if (g.name && g.name !== guild.name) {
      await guild.setName(g.name, 'Restoring backup: guild name');
    }

    if (g.icon) {
      try {
        await guild.setIcon(g.icon, 'Restoring backup: icon');
      } catch {
        // ignore icon failures
      }
    }
  } catch (err) {
    console.error('[backup] Failed to apply guild settings', err);
  }
}

/**
 * Apply backup and return a summary of what happened.
 */
async function applyBackup(guild, data) {
  const summary = {
    channelsDeleted: 0,
    channelsDeleteFailed: 0,
    rolesDeleted: 0,
    rolesDeleteFailed: 0,
    rolesCreated: 0,
    rolesCreateFailed: 0,
    channelsCreated: 0,
    channelsCreateFailed: 0,
    overwritesApplied: 0,
    overwritesFailed: 0,
    startedAt: Date.now(),
    finishedAt: null,
    timeMs: 0,
  };

  const { roles, channels } = data;

  // 1) Delete channels
  try {
    const deletableChannels = guild.channels.cache
      .filter(c => c.deletable)
      .sort((a, b) => b.position - a.position);

    for (const [, channel] of deletableChannels) {
      try {
        await channel.delete('Restoring backup: clearing existing channels');
        summary.channelsDeleted++;
      } catch (err) {
        summary.channelsDeleteFailed++;
        console.error(`[backup] Failed to delete channel ${channel.id}`, err);
      }
    }
  } catch (err) {
    console.error('[backup] Failed while deleting channels', err);
  }

  // 2) Delete roles (except @everyone and managed)
  try {
    const deletableRoles = guild.roles.cache
      .filter(r => !r.managed && r.editable && r.id !== guild.id)
      .sort((a, b) => b.position - a.position);

    for (const [, role] of deletableRoles) {
      try {
        await role.delete('Restoring backup: clearing existing roles');
        summary.rolesDeleted++;
      } catch (err) {
        summary.rolesDeleteFailed++;
        console.error(`[backup] Failed to delete role ${role.id}`, err);
      }
    }
  } catch (err) {
    console.error('[backup] Failed while deleting roles', err);
  }

  // 3) Recreate roles
  const roleIdMap = new Map();
  try {
    const sortedRoles = [...roles].sort((a, b) => a.position - b.position);

    for (const r of sortedRoles) {
      try {
        const created = await guild.roles.create({
          name: r.name,
          color: r.color,
          hoist: r.hoist,
          mentionable: r.mentionable,
          permissions: new PermissionsBitField(BigInt(r.permissions || '0')),
          reason: 'Restoring backup: recreating roles',
        });

        roleIdMap.set(r.id, created.id);
        summary.rolesCreated++;
      } catch (err) {
        summary.rolesCreateFailed++;
        console.error(`[backup] Failed to create role "${r.name}"`, err);
      }
    }
  } catch (err) {
    console.error('[backup] Failed while creating roles', err);
  }

  // 4) Recreate channels
  const channelIdMap = new Map();
  const categoryData = channels.filter(c => c.type === ChannelType.GuildCategory);
  const otherChannels = channels.filter(c => c.type !== ChannelType.GuildCategory);

  // 4a) Categories
  for (const cat of categoryData.sort((a, b) => a.position - b.position)) {
    try {
      const created = await guild.channels.create({
        name: cat.name,
        type: ChannelType.GuildCategory,
        position: cat.position,
        reason: 'Restoring backup: recreating categories',
      });
      channelIdMap.set(cat.id, created.id);
      summary.channelsCreated++;
    } catch (err) {
      summary.channelsCreateFailed++;
      console.error(`[backup] Failed to create category "${cat.name}"`, err);
    }
  }

  // 4b) Other channels
  for (const ch of otherChannels.sort((a, b) => a.position - b.position)) {
    try {
      const parentId = ch.parentId ? channelIdMap.get(ch.parentId) ?? null : null;

      const created = await guild.channels.create({
        name: ch.name,
        type: ch.type,
        parent: parentId,
        topic: ch.topic || null,
        nsfw: ch.nsfw || false,
        rateLimitPerUser: ch.rateLimitPerUser || 0,
        position: ch.position,
        reason: 'Restoring backup: recreating channels',
      });

      channelIdMap.set(ch.id, created.id);
      summary.channelsCreated++;

      for (const po of ch.permissionOverwrites || []) {
        const targetIsRole = guild.roles.cache.has(po.id) || roleIdMap.has(po.id);
        const targetId = targetIsRole ? (roleIdMap.get(po.id) || po.id) : po.id;

        try {
          await created.permissionOverwrites.create(
            targetId,
            {
              allow: new PermissionsBitField(BigInt(po.allow || '0')),
              deny: new PermissionsBitField(BigInt(po.deny || '0')),
            },
            { reason: 'Restoring backup: applying permission overwrites' }
          );
          summary.overwritesApplied++;
        } catch (err) {
          summary.overwritesFailed++;
          console.error(`[backup] Failed to apply overwrites for "${ch.name}"`, err);
        }
      }
    } catch (err) {
      summary.channelsCreateFailed++;
      console.error(`[backup] Failed to create channel "${ch.name}"`, err);
    }
  }

  await applyGuildSettings(guild, data);

  summary.finishedAt = Date.now();
  summary.timeMs = summary.finishedAt - summary.startedAt;

  return summary;
}

module.exports = {
  serializeGuild,
  applyBackup,
};
