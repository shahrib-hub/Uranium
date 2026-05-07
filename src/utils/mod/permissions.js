// src/utils/mod/permissions.js
const { PermissionsBitField } = require('discord.js');
const db = require('../../storage/modStorage'); // abstracted storage layer

const actionPermissions = {
  warn: [PermissionsBitField.Flags.KickMembers],
  unwarn: [PermissionsBitField.Flags.KickMembers],
  kick: [PermissionsBitField.Flags.KickMembers],
  ban: [PermissionsBitField.Flags.BanMembers],
  tempban: [PermissionsBitField.Flags.BanMembers],
  unban: [PermissionsBitField.Flags.BanMembers],
  mute: [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ManageRoles],
  unmute: [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ManageRoles],
  timeout: [PermissionsBitField.Flags.ModerateMembers],
  softban: [PermissionsBitField.Flags.BanMembers],
  purge: [PermissionsBitField.Flags.ManageMessages],
  lockdown: [PermissionsBitField.Flags.ManageChannels],
  unlock: [PermissionsBitField.Flags.ManageChannels],
  slowmode: [PermissionsBitField.Flags.ManageChannels],
  nick: [PermissionsBitField.Flags.ManageNicknames],
  'force-role': [PermissionsBitField.Flags.ManageRoles],
  'clear-roles': [PermissionsBitField.Flags.ManageRoles],
  settings: [PermissionsBitField.Flags.ManageGuild],
  audit: [PermissionsBitField.Flags.ViewAuditLog],
  case: [PermissionsBitField.Flags.ManageGuild]
};

async function hasModPermission(member, guild, action) {
  const required = actionPermissions[action];
  if (!required) return false;

  // Check native permissions
  const hasNative = required.some(perm => member.permissions.has(perm));
  if (hasNative) return true;

  // Check mod roles from DB
  const modRoles = await db.getModRoles(guild.id); // returns array of role IDs
  return member.roles.cache.some(role => modRoles.includes(role.id));
}

module.exports = { hasModPermission };
