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
      if (!settings || !settings.enabled) return;
      if (!settings.goodbyeEnabled || !settings.goodbyeChannelId) return;

      const channel = guild.channels.cache.get(String(settings.goodbyeChannelId));
      if (!channel || !channel.isTextBased()) return;

      const botMember = guild.members.me;
      if (!botMember || !channel.permissionsFor(botMember)?.has(PermissionsBitField.Flags.SendMessages)) return;

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
          .replace(/{count}/gi, String(memberCount));
      };

      const parsedText = formatPlaceholders(
        settings.goodbyeMessage || '**{username}** just left the server 😭 We now have {count} members!'
      );

      const files = [];

      // Optional goodbye card
      if (settings.goodbyeCardEnabled) {
        try {
          const cardBuffer = await generateWelcomeCard({
            username: member.user?.username || 'Member',
            discriminator: member.user?.discriminator || '0',
            avatarUrl,
            guildName: guild.name,
            memberCount,
            cardTheme: settings.cardTheme || 'modern_obsidian',
            cardFont: settings.cardFont || 'Inter',
            cardTextColor: settings.cardTextColor,
            cardBgColor: settings.cardBgColor,
            cardOverlayOpacity: settings.cardOverlayOpacity,
            cardBgImage: settings.cardBgImage,
            cardTitle: `${member.user?.username || 'Member'} left the server`,
            cardSubtitle: `We now have ${memberCount} members`,
            isGoodbye: true
          });
          if (cardBuffer) {
            files.push(new AttachmentBuilder(cardBuffer, { name: 'goodbye.png' }));
          }
        } catch (err) {
          console.warn('[goodbyeHandler] Card render error:', err?.message || err);
        }
      }

      if (settings.goodbyeMessageType === 'embed') {
        const embConfig = settings.goodbyeEmbed || {};
        const embed = new EmbedBuilder()
          .setTitle(formatPlaceholders(embConfig.title || 'Goodbye!'))
          .setDescription(parsedText || formatPlaceholders(embConfig.description || '{username} has left the server.'))
          .setColor(embConfig.color ? parseInt(embConfig.color.replace('#', ''), 16) || 0x717892 : 0x717892)
          .setTimestamp();

        if (files.length > 0) {
          embed.setImage('attachment://goodbye.png');
        }
        if (embConfig.footer) {
          embed.setFooter({ text: formatPlaceholders(embConfig.footer) });
        }

        await channel.send({ embeds: [embed], files }).catch(() => {});
      } else {
        await channel.send({ content: parsedText, files }).catch(() => {});
      }
    } catch (err) {
      console.error('[goodbyeHandler] Error executing goodbye:', err?.message || err);
    }
  }
};
