// src/buttons/rr_dropdown.js
const { EmbedBuilder } = require('discord.js');
const rrStorage = require('../utils/rrStorage');
const logger = require('../utils/logger');

const activeLocks = new Map();

function getLockKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function isLockActive(lockKey) {
  const ts = activeLocks.get(lockKey);
  if (!ts) return false;
  if (Date.now() - ts > 5000) {
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

module.exports = async function handleRRDropdown(interaction) {
  if (!interaction.isStringSelectMenu()) return;
  const id = interaction.customId;
  if (!id.startsWith('rr_select:')) return;

  const [_, guildId, setupId] = id.split(':');
  const userId = interaction.user.id;
  const lockKey = getLockKey(guildId, userId);

  // Rate limiting
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
    const setup = await rrStorage.getSetupById(setupId);
    if (!setup) return interaction.reply({ embeds: [errEmbed('Setup not found.')], flags: 64 });

    // Defer because multiple role updates can take > 3s
    await interaction.deferReply({ flags: 64 });

    const selectedItemIds = interaction.values;
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return interaction.reply({ embeds: [errEmbed('Member not found.')], flags: 64 });

    const results = { added: [], removed: [], failed: [], blocked: [] };

    // Fetch all items for this setup to compare
    const allItems = await rrStorage.listItems(setupId);
    
    // For dropdowns, we often want to SYNC roles:
    // Any role in allItems that is NOT in selectedItemIds should be REMOVED (if user has it)
    // Any role in selectedItemIds should be ADDED (if user doesn't have it)
    
    // However, Discord RR dropdowns often act as "toggles" or "add-only" depending on config.
    // We'll implement a "Toggle" logic for each selected item for now, 
    // OR if it's a single-select, just process that one.

    for (const itemId of selectedItemIds) {
      const item = allItems.find(i => String(i.id) === String(itemId));
      if (!item) continue;

      const role = guild.roles.cache.get(item.role_id);
      if (!role) {
        results.failed.push(`Role for ${item.label || item.emoji} no longer exists.`);
        continue;
      }

      // Permissions
      if (role.position >= guild.members.me.roles.highest.position) {
        results.failed.push(`Role **${role.name}** is above my highest role.`);
        continue;
      }

      // Validation
      const validation = await rrStorage.validateRoleAssignment(member, item, setup);
      if (!validation.allowed) {
        results.blocked.push(`**${role.name}**: ${validation.reason}`);
        continue;
      }

      const hasRole = member.roles.cache.has(role.id);
      try {
        if (hasRole) {
          await member.roles.remove(role, 'RR dropdown toggle');
          results.removed.push(role.name);
          rrStorage.removeUserRoleCache(guildId, userId, role.id);
        } else {
          await member.roles.add(role, 'RR dropdown toggle');
          results.added.push(role.name);
          rrStorage.setUserRoleCache(guildId, userId, role.id);
        }
        
        await rrStorage.logAction({
          guildId, userId, roleId: role.id, setupId,
          action: hasRole ? 'revoke' : 'grant',
          metadata: { itemId: item.id, mode: 'dropdown' }
        });
      } catch (err) {
        logger.error('[RR Dropdown] Failed to toggle role %s: %s', role.id, err.message);
        results.failed.push(`Failed to toggle **${role.name}**.`);
      }
    }

    // Prepare response
    let response = '';
    if (results.added.length) response += `➕ Added: ${results.added.map(r => `**${r}**`).join(', ')}\n`;
    if (results.removed.length) response += `➖ Removed: ${results.removed.map(r => `**${r}**`).join(', ')}\n`;
    if (results.blocked.length) response += `🚫 Blocked: ${results.blocked.join('\n')}\n`;
    if (results.failed.length) response += `❌ Errors: ${results.failed.join('\n')}\n`;

    if (!response) response = 'No changes made.';

    await interaction.editReply({ content: response.trim() });

    // Rate limit
    await rrStorage.incrementRateLimit(guildId, userId, setupId, setup.config?.cooldownSeconds);

  } catch (err) {
    logger.error('[RR Dropdown Handler] Fatal error: %s', err.stack || err.message);
    if (!interaction.replied) {
      await interaction.reply({ content: 'An error occurred while processing the menu.', flags: 64 }).catch(() => {});
    }
  } finally {
    activeLocks.delete(lockKey);
  }
};
