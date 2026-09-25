// src/events/messageCreateRanking.js
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const {
  getConfig,
  getUser,
  upsertUser,
  listRoleRewards
} = require('../utils/ranking');
const pluginStorage = require('../utils/pluginStorage');

// Helper to calculate XP needed for level
function xpNeededForLevel(level, formulaText) {
  try {
    const f = new Function('level', `return ${formulaText || '50 * level * level + 50 * level'};`);
    return Math.max(0, Math.floor(f(level)));
  } catch {
    return 50 * level * level + 50 * level;
  }
}

// In-memory cooldown tracking: `${guildId}:${userId}` -> timestamp
const userCooldowns = new Map();

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    try {
      if (!message.guild || message.author.bot || !message.content) return;

      const guildId = message.guild.id;
      const userId = message.author.id;

      // 1. Check if ranking plugin is enabled for this guild
      if (pluginStorage && typeof pluginStorage.isPluginEnabled === 'function') {
        const isEnabled = await pluginStorage.isPluginEnabled(guildId, 'ranking');
        if (!isEnabled) return;
      }

      // 2. Fetch guild ranking config
      const cfg = await getConfig(guildId);
      if (!cfg || !cfg.enabled) return;

      // 3. Minimum characters check
      const minChars = cfg.min_chars ?? 5;
      if (message.content.trim().length < minChars) return;

      // 4. Blacklisted channels check
      let blacklist = [];
      try {
        blacklist = typeof cfg.blacklist === 'string' ? JSON.parse(cfg.blacklist || '[]') : (cfg.blacklist || []);
      } catch {}
      if (blacklist.includes(message.channel.id)) return;

      // 5. Cooldown check
      const cooldownSec = cfg.cooldown_seconds ?? 60;
      const cooldownKey = `${guildId}:${userId}`;
      const now = Date.now();
      const lastMsgTs = userCooldowns.get(cooldownKey) || 0;
      if (now - lastMsgTs < cooldownSec * 1000) {
        return; // on cooldown
      }
      userCooldowns.set(cooldownKey, now);

      // 6. Award XP (random between 15 and 25)
      const earnedXp = Math.floor(Math.random() * 11) + 15;

      const currentStats = (await getUser(guildId, userId)) || {
        guild_id: guildId,
        user_id: userId,
        xp: 0,
        level: 0,
        badges: '[]'
      };

      const newTotalXp = (currentStats.xp || 0) + earnedXp;
      let currentLevel = currentStats.level || 0;
      let leveledUp = false;

      // Check level-up progression
      while (newTotalXp >= xpNeededForLevel(currentLevel + 1, cfg.formula)) {
        currentLevel++;
        leveledUp = true;
      }

      // Save updated stats
      await upsertUser({
        guild_id: guildId,
        user_id: userId,
        xp: newTotalXp,
        level: currentLevel,
        last_msg_ts: now,
        last_msg_hash: null,
        badges: currentStats.badges || '[]'
      });

      // 7. If leveled up, trigger role rewards and announcements
      if (leveledUp) {
        // Check role rewards
        try {
          const rewards = await listRoleRewards(guildId);
          for (const reward of rewards) {
            if (reward.level <= currentLevel) {
              const role = message.guild.roles.cache.get(reward.role_id);
              if (role && !message.member.roles.cache.has(role.id)) {
                await message.member.roles.add(role).catch(() => {});
              }
            }
          }
        } catch (rErr) {
          console.warn('[Ranking] Failed to award role:', rErr.message);
        }

        // Announcement settings
        const announcementType = cfg.announcement_channel || 'current'; // current, custom, dm, none
        if (announcementType === 'none') return;

        const defaultMsg = '🎉 GG {user}, you just advanced to **Level {level}**!';
        const rawTemplate = cfg.announcement_message || defaultMsg;
        const formatted = rawTemplate
          .replace(/{user}/gi, `<@${userId}>`)
          .replace(/{username}/gi, message.author.username)
          .replace(/{level}/gi, String(currentLevel))
          .replace(/{xp}/gi, String(newTotalXp))
          .replace(/{server}/gi, message.guild.name);

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setAuthor({
            name: `${message.author.username} Leveled Up!`,
            iconURL: message.author.displayAvatarURL()
          })
          .setDescription(formatted)
          .setFooter({ text: `Total XP: ${newTotalXp.toLocaleString()}` })
          .setTimestamp();

        if (announcementType === 'dm') {
          await message.author.send({ embeds: [embed] }).catch(() => {});
        } else if (announcementType === 'custom' && cfg.custom_announcement_channel) {
          const ch = message.guild.channels.cache.get(cfg.custom_announcement_channel);
          if (ch && ch.isTextBased()) {
            await ch.send({ embeds: [embed] }).catch(() => {});
          }
        } else {
          // current channel
          const botMember = message.guild.members.me;
          if (botMember && message.channel.permissionsFor(botMember).has(PermissionFlagsBits.SendMessages)) {
            await message.channel.send({ embeds: [embed] }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error('[Ranking messageCreate error]:', err);
    }
  }
};
