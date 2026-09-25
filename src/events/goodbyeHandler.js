// src/events/goodbyeHandler.js — Handles guildMemberRemove for Welcome & Goodbye system
const welcomeStorage = require('../utils/welcomeStorage');
const { generateWelcomeCard } = require('../utils/welcomeCardRenderer');
const { EmbedBuilder, AttachmentBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  async execute(member, client) {
    try {
      if (!member || !member.guild || member.user?.bot) return;
      const guild = member.guild;
      const guildId = guild.id;

      const settings = await welcomeStorage.getSettings(guildId);
      if (!settings || (!settings.enabled && !settings.active)) return;
      if ((!settings.goodbyeEnabled && !settings.sendGoodbyeMessage) || !settings.goodbyeChannelId) return;

      let channel = guild.channels.cache.get(String(settings.goodbyeChannelId));
      if (!channel) {
        channel = await guild.channels.fetch(String(settings.goodbyeChannelId)).catch(() => null);
      }
      if (!channel || !channel.isTextBased()) return;

      const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
      const perms = botMember ? channel.permissionsFor(botMember) : null;
      if (!perms || !perms.has(PermissionsBitField.Flags.SendMessages)) {
        console.warn(`[goodbyeHandler] Bot lacks SendMessages permission in goodbye channel #${channel.name}`);
        return;
      }

      const memberCount = guild.memberCount || 1;
      const avatarUrl = member.user?.displayAvatarURL?.({ extension: 'png', size: 512 });

      // Variable replacer helper
      const formatPlaceholders = (template) => {
        if (!template) return '';
        return template
          .replace(/{user}/gi, member.user?.tag || member.id)
          .replace(/{username}/gi, member.user?.username || 'Member')
          .replace(/{server}/gi, guild.name)
          .replace(/{guild}/gi, guild.name)
          .replace(/{server\.member_count}/gi, String(memberCount))
          .replace(/{member_count}/gi, String(memberCount))
          .replace(/{count}/gi, String(memberCount));
      };

      const parseColor = (col) => {
        if (!col) return 0x717892;
        if (typeof col === 'number') return col;
        return parseInt(String(col).replace('#', ''), 16) || 0x717892;
      };

      const parsedText = formatPlaceholders(
        settings.goodbyeMessage || '**{username}** just left the server 😭 We now have {count} members!'
      );

      const files = [];

      // Optional goodbye card
      if ((settings.goodbyeCardEnabled || settings.sendGoodbyeCard) && perms.has(PermissionsBitField.Flags.AttachFiles)) {
        try {
          const cardBuffer = await generateWelcomeCard({
            username: member.user?.username || 'Member',
            discriminator: member.user?.discriminator || '0',
            avatarUrl,
            guildName: guild.name,
            memberCount,
            cardConfig: settings.welcomeCardConfig,
            cardTheme: settings.cardTheme || settings.welcomeCardConfig?.theme || 'modern_obsidian',
            cardFont: settings.cardFont || settings.welcomeCardConfig?.font || 'Segoe UI, Arial, sans-serif',
            cardTextColor: settings.cardTextColor || settings.welcomeCardConfig?.textColor,
            cardBgColor: settings.cardBgColor || settings.welcomeCardConfig?.backgroundColor,
            cardOverlayOpacity: settings.cardOverlayOpacity ?? (settings.welcomeCardConfig?.overlayOpacity != null ? Math.round(settings.welcomeCardConfig.overlayOpacity * 100) : 75),
            cardBgImage: settings.cardBgImage || settings.welcomeCardConfig?.backgroundUrl,
            cardTitle: settings.cardTitle || `${member.user?.username || 'Member'} left the server`,
            cardSubtitle: settings.cardSubtitle || `We now have ${memberCount} members`,
            isGoodbye: true
          });
          if (cardBuffer) {
            files.push(new AttachmentBuilder(cardBuffer, { name: 'goodbye.png' }));
          }
        } catch (err) {
          console.warn('[goodbyeHandler] Card render error:', err?.message || err);
        }
      }

      if (settings.goodbyeMessageType === 'embed' && perms.has(PermissionsBitField.Flags.EmbedLinks)) {
        const embConfig = settings.goodbyeEmbed || {};
        const embed = new EmbedBuilder()
          .setTitle(formatPlaceholders(embConfig.title || 'Goodbye!'))
          .setDescription(parsedText || formatPlaceholders(embConfig.description || '{username} has left the server.'))
          .setColor(parseColor(embConfig.color))
          .setTimestamp();

        if (files.length > 0) {
          embed.setImage('attachment://goodbye.png');
        }
        if (embConfig.footer) {
          embed.setFooter({ text: formatPlaceholders(embConfig.footer) });
        }

        await channel.send({ embeds: [embed], files }).catch(async (sendErr) => {
          console.warn('[goodbyeHandler] Failed to send embed, falling back to text:', sendErr.message);
          await channel.send({ content: parsedText }).catch(() => {});
        });
      } else {
        await channel.send({ content: parsedText, files }).catch(async (sendErr) => {
          console.warn('[goodbyeHandler] Failed to send with files, falling back to text:', sendErr.message);
          await channel.send({ content: parsedText }).catch(() => {});
        });
      }
    } catch (err) {
      console.error('[goodbyeHandler] Error executing goodbye:', err?.message || err);
    }
  }
};
