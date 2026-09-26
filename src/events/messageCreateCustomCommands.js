// src/events/messageCreateCustomCommands.js
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const {
  getCustomCommands,
  getCustomCommand,
  incrementUses,
  checkExecutionAllowed
} = require('../utils/customCommandStorage');
const pluginStorage = require('../utils/pluginStorage');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    try {
      if (!message.guild || message.author.bot || !message.content) return;

      const guildId = message.guild.id;

      // 1. Check if customcommands plugin is enabled
      if (pluginStorage && typeof pluginStorage.isPluginEnabled === 'function') {
        const isEnabled = await pluginStorage.isPluginEnabled(guildId, 'customcommands');
        if (!isEnabled) return;
      }

      const raw = message.content.trim();
      if (!raw) return;

      const commands = await getCustomCommands(guildId);
      if (!commands || commands.length === 0) return;

      // Match dynamic prefix + command name (e.g. '!rules', '?help', '$donate')
      const lowerRaw = raw.toLowerCase();
      const cmd = commands.find(c => {
        const prefix = (c.data?.prefix || '!').toLowerCase();
        const cmdName = c.name.toLowerCase();
        const fullTrigger = prefix + cmdName;

        if (lowerRaw.startsWith(fullTrigger)) {
          const rest = lowerRaw.slice(fullTrigger.length);
          return rest.length === 0 || /^\s/.test(rest);
        }
        return false;
      });

      if (!cmd) return;

      const botMember = message.guild.members.me || await message.guild.members.fetchMe().catch(() => null);
      if (!botMember) return;
      const perms = message.channel.permissionsFor(botMember);
      if (!perms || !perms.has(PermissionFlagsBits.SendMessages)) return;

      // Check member permissions and cooldown
      const check = checkExecutionAllowed(message.member, message.channel, cmd);
      if (!check.allowed) {
        return message.reply({ content: `⛔ ${check.reason}` }).then(m => {
          setTimeout(() => m.delete().catch(() => {}), 5000);
        }).catch(() => {});
      }

      const formatPlaceholders = (text) => {
        if (!text) return '';
        return text
          .replace(/{user}/gi, `<@${message.author.id}>`)
          .replace(/{mention}/gi, `<@${message.author.id}>`)
          .replace(/{username}/gi, message.author.username)
          .replace(/{user\.tag}/gi, message.author.tag || message.author.username)
          .replace(/{user\.id}/gi, message.author.id)
          .replace(/{server}/gi, message.guild.name)
          .replace(/{guild}/gi, message.guild.name)
          .replace(/{membercount}/gi, String(message.guild.memberCount || 1))
          .replace(/{channel}/gi, `<#${message.channel.id}>`);
      };

      const actions = cmd.data?.actions || [];
      const action = actions[0] || {};

      let replyText = action.message || cmd.data?.message || '';
      const randomArr = action.randomResponses || cmd.data?.randomResponses || [];
      if (Array.isArray(randomArr) && randomArr.length > 0) {
        const pool = [replyText, ...randomArr].filter(Boolean);
        replyText = pool[Math.floor(Math.random() * pool.length)];
      }

      replyText = formatPlaceholders(replyText);

      // Embed support
      const embedConfig = action.embed || cmd.data?.embed;
      let embed = null;
      if (embedConfig && (embedConfig.title || embedConfig.description)) {
        embed = new EmbedBuilder();
        if (embedConfig.title) embed.setTitle(formatPlaceholders(embedConfig.title));
        if (embedConfig.description) embed.setDescription(formatPlaceholders(embedConfig.description));
        if (embedConfig.color) {
          const colorInt = typeof embedConfig.color === 'number'
            ? embedConfig.color
            : parseInt(String(embedConfig.color).replace('#', ''), 16) || 0x5865F2;
          embed.setColor(colorInt);
        } else {
          embed.setColor(0x5865F2);
        }
        if (embedConfig.thumbnail) embed.setThumbnail(embedConfig.thumbnail);
        if (embedConfig.image) embed.setImage(embedConfig.image);
        if (embedConfig.footer) embed.setFooter({ text: formatPlaceholders(embedConfig.footer) });
        embed.setTimestamp();
      }

      await incrementUses(guildId, cmd.name);

      if (cmd.data?.hideUsage) {
        message.delete().catch(() => {});
      }

      if (embed) {
        return message.channel.send({
          content: replyText && replyText !== embedConfig.description ? replyText : undefined,
          embeds: [embed]
        }).catch(() => {});
      } else {
        return message.channel.send({ content: replyText }).catch(() => {});
      }
    } catch (err) {
      console.error('[messageCreateCustomCommands error]:', err);
    }
  }
};
