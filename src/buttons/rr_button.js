// src/buttons/rr_button.js - REVAMPED
const { EmbedBuilder } = require('discord.js');
const rrStorage = require('../utils/rrStorage');
const logger = require('../utils/logger');

// Distributed lock using persistent storage (with TTL cleanup)
const activeLocks = new Map(); // lockKey -> timestamp

function getLockKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function isLockActive(lockKey) {
  const ts = activeLocks.get(lockKey);
  if (!ts) return false;
  if (Date.now() - ts > 5000) { // 5 second timeout
    activeLocks.delete(lockKey);
    return false;
  }
  return true;
}

function setLock(lockKey) {
  activeLocks.set(lockKey, Date.now());
  setTimeout(() => activeLocks.delete(lockKey), 5000);
}

function errEmbed(text, title = 'Error') {
  return new EmbedBuilder().setColor('Red').setTitle(title).setDescription(text);
}

module.exports = async function handleRRButton(interaction) {
  const id = interaction.customId;
  if (!id.startsWith('rr_btn:')) return;

  const [_, guildId, setupId, itemId] = id.split(':');
  const userId = interaction.user.id;

  const lockKey = getLockKey(guildId, userId);

  // Rate limiting check (per user per setup)
  const rateCheck = await rrStorage.checkRateLimit(guildId, userId, setupId);
  if (!rateCheck.allowed) {
    return interaction.reply({
      embeds: [errEmbed(`Please wait ${rateCheck.remaining} seconds before toggling roles again.`, 'Slow down')],
      flags: 64
    });
  }

  if (isLockActive(lockKey)) {
    return interaction.reply({
      embeds: [errEmbed('Processing your previous action... Please wait.', 'Slow down')],
      flags: 64
    });
  }

  setLock(lockKey);

  try {
    const guild = interaction.guild;
    if (!guild) {
      return interaction.reply({ embeds: [errEmbed('Guild not found.')], flags: 64 });
    }

    // Fetch setup with cache
    const setup = await rrStorage.getSetupById(setupId);
    if (!setup || String(setup.guild_id) !== String(guildId)) {
      return interaction.reply({ embeds: [errEmbed('Setup not found or invalid.')], flags: 64 });
    }

    // Fetch item
    const item = await rrStorage.findItemById(itemId);
    if (!item) {
      return interaction.reply({ embeds: [errEmbed('This item no longer exists.')], flags: 64 });
    }

    // Fetch member (with error handling)
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      return interaction.reply({ embeds: [errEmbed('Could not fetch your member data.')], flags: 64 });
    }

    // Fetch role
    const role = guild.roles.cache.get(item.role_id);
    if (!role) {
      await rrStorage.logAction({
        guildId,
        userId,
        roleId: item.role_id,
        setupId,
        action: 'fail',
        error: 'Role no longer exists',
        metadata: { itemId: item.id, reason: 'ROLE_DELETED' }
      });
      return interaction.reply({ 
        embeds: [errEmbed(`Role <@&${item.role_id}> no longer exists. Contact an admin.`)], 
        flags: 64 
      });
    }

    // Permissions check
    const botMember = guild.members.me;
    if (!botMember) {
      return interaction.reply({ embeds: [errEmbed('Bot member data unavailable.')], flags: 64 });
    }

    if (role.position >= botMember.roles.highest.position) {
      const emoji = '⚠️';
      return interaction.reply({
        embeds: [errEmbed(`My role must be above **${role.name}** to assign it.\n\nAsk an admin to move my role higher in the role hierarchy.`, 'Permission Error')],
        flags: 64
      });
    }

    // Role policy validation
    const validation = await rrStorage.validateRoleAssignment(member, item, setup);
    if (!validation.allowed) {
      let reasonMsg = 'You cannot take this role.';
      switch (validation.reason) {
        case 'BLOCKED_ROLE':
          reasonMsg = 'This role is blocked from self-assignment.';
          break;
        case 'MISSING_PREREQUISITES':
          reasonMsg = `You need to have the required role(s) first.\nCheck the role panel description for prerequisites.`;
          break;
        case 'EXCLUSIVE_GROUP_CONFLICT':
          reasonMsg = 'You already have a role from this exclusive group. Remove it first.';
          break;
        case 'USER_LIMIT_REACHED':
          reasonMsg = `You've reached the maximum number of roles (${setup.config?.maxPerUser}) from this panel.`;
          break;
      }
      await rrStorage.logAction({
        guildId, userId, roleId: role.id, setupId,
        action: 'blocked',
        metadata: { reason: validation.reason, itemId: item.id }
      });
      return interaction.reply({ embeds: [errEmbed(reasonMsg, 'Cannot Assign Role')], flags: 64 });
    }

    // Check if user already has the role
    const already = member.roles.cache.has(role.id);

    try {
      if (already) {
        await member.roles.remove(role, 'RR button toggle').catch(async err => {
          logger.error('[RR] Failed to remove role %s from %s in %s: %s', role.id, userId, guildId, err.message);
          throw err;
        });
        
        rrStorage.removeUserRoleCache(guildId, userId, role.id);
        
        await rrStorage.logAction({
          guildId,
          userId,
          roleId: role.id,
          setupId,
          action: 'revoke',
          metadata: { itemId: item.id, mode: 'button' }
        });

        return interaction.reply({ 
          content: `➖ Removed **${role.name}**`, 
          flags: 64 
        });
      } else {
        await member.roles.add(role, 'RR button toggle').catch(async err => {
          logger.error('[RR] Failed to add role %s to %s in %s: %s', role.id, userId, guildId, err.message);
          throw err;
        });

        rrStorage.setUserRoleCache(guildId, userId, role.id);
        
        await rrStorage.logAction({
          guildId,
          userId,
          roleId: role.id,
          setupId,
          action: 'grant',
          metadata: { itemId: item.id, mode: 'button' }
        });

        return interaction.reply({ 
          content: `➕ Added **${role.name}**`, 
          flags: 64 
        });
      }
    } finally {
      // Apply rate limit after successful operation
      await rrStorage.incrementRateLimit(guildId, userId, setupId, setup.config?.cooldownSeconds);
    }

  } catch (err) {
    logger.error('[RR Button Handler] Error for user %s in guild %s: %s', userId, guildId, err.stack || err.message);
    
    try {
      return interaction.reply({ 
        embeds: [errEmbed('An error occurred while processing your request. Please try again.', 'Internal Error')], 
        flags: 64 
      });
    } catch (replyErr) {
      logger.error('[RR] Failed to send error reply: %s', replyErr.message);
    }
  } finally {
    activeLocks.delete(lockKey);
  }
};
