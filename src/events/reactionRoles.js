// src/events/reactionRoles.js - REVAMPED
const { Events } = require('discord.js');
const rrStorage = require('../utils/rrStorage');
const logger = require('../utils/logger');
const chalk = require('chalk');

/**
 * Emoji identifier matching strategy:
 * 1. For custom emojis: match by "name:id" format
 * 2. For unicode: exact string match
 * 3. Fallback: try raw emoji.toString()
 */
async function findItemForReaction(setupId, reaction) {
  if (!reaction?.emoji) return null;
  
  const identifiers = [];
  
  // Custom emoji with ID
  if (reaction.emoji.id) {
    identifiers.push(`${reaction.emoji.name}:${reaction.emoji.id}`);
  }
  
  // Animated custom emoji
  if (reaction.emoji.animated) {
    identifiers.unshift(`a:${reaction.emoji.name}:${reaction.emoji.id}`);
  }
  
  // Raw emoji string (for unicode or already formatted custom emoji)
  try {
    const raw = reaction.emoji.toString();
    if (raw && !identifiers.includes(raw)) {
      identifiers.push(raw);
    }
  } catch {}
  
  // Name only (less precise, but useful for unicode)
  if (reaction.emoji.name && !identifiers.includes(reaction.emoji.name)) {
    identifiers.push(reaction.emoji.name);
  }
  
  return rrStorage.findItemByAnyIdentifier(setupId, identifiers);
}

/**
 * Main reaction handler with comprehensive validation and logging
 */
async function handleReaction(addOrRemove, reaction, user) {
  if (user.bot) return;

  // Fetch partials
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (err) {
      logger.warn('[RR] Failed to fetch partial reaction: %s', err.message);
      return;
    }
  }

  const msg = reaction.message;
  if (!msg?.guild) return;

  try {
    const setup = await rrStorage.getSetupByMessage(msg.guild.id, msg.id);
    if (!setup || setup.mode !== 'reactions') return;

    const item = await findItemForReaction(setup.id, reaction);
    if (!item) return;

    const guild = msg.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const role = guild.roles.cache.get(item.role_id);
    if (!role) {
      logger.warn('[RR] Role %s not found for item %s in setup %s', item.role_id, item.id, setup.id);
      return;
    }

    const botMember = guild.members.me;
    if (!botMember) return;

    if (role.position >= botMember.roles.highest.position) {
      logger.warn('[RR] Skipping role %s: bot role too low', role.id);
      return;
    }

    // Rate limiting per user per setup
    const rateCheck = await rrStorage.checkRateLimit(guild.id, user.id, setup.id);
    if (!rateCheck.allowed) {
      logger.debug('[RR] Rate limited user %s in guild %s (setup %s)', user.id, guild.id, setup.id);
      return;
    }

    // Role policy validation
    const validation = await rrStorage.validateRoleAssignment(member, item, setup);
    if (!validation.allowed) {
      await rrStorage.logAction({
        guildId: guild.id,
        userId: user.id,
        roleId: role.id,
        setupId: setup.id,
        action: 'blocked',
        metadata: { reason: validation.reason, itemId: item.id, emoji: item.emoji_identifier }
      });
      return;
    }

    const already = member.roles.cache.has(role.id);
    const shouldAdd = addOrRemove === 'add';

    // Skip if state matches (already has role when adding, or doesn't have when removing)
    if (already === shouldAdd) return;

    if (shouldAdd) {
      await member.roles.add(role, 'RR reaction add').catch(async err => {
        logger.error('[RR] Failed to add role %s to %s: %s', role.id, user.id, err.message);
        await rrStorage.logAction({
          guildId: guild.id,
          userId: user.id,
          roleId: role.id,
          setupId: setup.id,
          action: 'fail',
          error: err.message,
          metadata: { itemId: item.id }
        });
      });
      await rrStorage.logAction({
        guildId: guild.id,
        userId: user.id,
        roleId: role.id,
        setupId: setup.id,
        action: 'grant',
        metadata: { itemId: item.id, mode: 'reaction' }
      });
    } else {
      await member.roles.remove(role, 'RR reaction remove').catch(async err => {
        logger.error('[RR] Failed to remove role %s from %s: %s', role.id, user.id, err.message);
        await rrStorage.logAction({
          guildId: guild.id,
          userId: user.id,
          roleId: role.id,
          setupId: setup.id,
          action: 'fail',
          error: err.message,
          metadata: { itemId: item.id }
        });
      });
      await rrStorage.logAction({
        guildId: guild.id,
        userId: user.id,
        roleId: role.id,
        setupId: setup.id,
        action: 'revoke',
        metadata: { itemId: item.id, mode: 'reaction' }
      });
    }

    // Apply rate limit
    await rrStorage.incrementRateLimit(guild.id, user.id, setup.id, setup.config?.cooldownSeconds);

  } catch (err) {
    logger.error('[RR Reaction Handler] Unexpected error: %s', err.stack || err.message);
  }
}

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(_, client) {
    await rrStorage.initStorage();
    logger.info('[RR] Reaction Roles event listeners registered');

    // Reaction Added
    client.on('messageReactionAdd', (reaction, user) => {
      handleReaction('add', reaction, user).catch(err => {
        logger.error('[RR] Unhandled error in reactionAdd: %s', err.message);
      });
    });

    // Reaction Removed
    client.on('messageReactionRemove', (reaction, user) => {
      handleReaction('remove', reaction, user).catch(err => {
        logger.error('[RR] Unhandled error in reactionRemove: %s', err.message);
      });
    });

    // Role deleted → cleanup items
    client.on(Events.GuildRoleDelete, async (role) => {
      try {
        const items = await rrStorage.findItemsByRoleId(role.id);
        if (items && items.length > 0) {
          for (const item of items) {
            await rrStorage.removeItem(item.id).catch(() => {});
            logger.info('[RR] Cleaned up item %s (role %s) from setup %s', item.id, role.id, item.setup_id);
          }
        }
      } catch (err) {
        logger.error('[RR] Error cleaning up items for role %s: %s', role.id, err.message);
      }
    });

    // Message deleted → unlink setup
    client.on(Events.MessageDelete, async (message) => {
      if (!message?.guild) return;
      try {
        const setup = await rrStorage.getSetupByMessage(message.guild.id, message.id);
        if (!setup) return;
        await rrStorage.updateSetupMessageId(setup.id, null);
        logger.info('[RR] Message %s deleted, unlinked from setup %s', message.id, setup.id);
      } catch (err) {
        logger.error('[RR] Error unlinking setup after message delete: %s', err.message);
      }
    });

    // Guild leave → cleanup all setups for that guild
    client.on(Events.GuildDelete, async (guild) => {
      try {
        const setups = await rrStorage.listSetupsForGuild(guild.id);
        for (const setup of setups) {
          await rrStorage.deleteSetup(setup.id);
        }
        logger.info('[RR] Cleaned up %d setups for left guild %s', setups.length, guild.id);
      } catch (err) {
        logger.error('[RR] Error cleaning up guild %s: %s', guild.id, err.message);
      }
    });

    logger.info(chalk.magenta('[RR] Reaction Roles system ready – %d setups loaded'), 
      (await rrStorage.listSetupsForGuild?.(client.guilds.cache.first()?.id) || []).length);
  }
};
