// src/events/welcomeHandler.js — Handles guildMemberAdd for Welcome & Goodbye system
const welcomeStorage = require('../utils/welcomeStorage');
const { generateWelcomeCard } = require('../utils/welcomeCardRenderer');
const { EmbedBuilder, AttachmentBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member, client) {
    try {
      if (!member || !member.guild || member.user?.bot) return;
      const guild = member.guild;
      const guildId = guild.id;

      const settings = await welcomeStorage.getSettings(guildId);
      if (!settings || !settings.enabled) return;

      const memberCount = guild.memberCount || 1;
      const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 512 });

      // Variable replacer helper
      const formatPlaceholders = (template) => {
        if (!template) return '';
        return template
          .replace(/{user}/gi, `<@${member.id}>`)
          .replace(/{username}/gi, member.user.username)
          .replace(/{server}/gi, guild.name)
          .replace(/{guild}/gi, guild.name)
          .replace(/{server\.member_count}/gi, String(memberCount))
          .replace(/{count}/gi, String(memberCount));
      };

      // ── 1. AUTOROLE ASSIGNMENT ─────────────────────────────────────────────
      if (settings.autoroleEnabled && Array.isArray(settings.autoroleIds) && settings.autoroleIds.length > 0) {
        try {
          const botMember = guild.members.me;
          if (botMember && botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            const rolesToAdd = settings.autoroleIds.filter(roleId => {
              const role = guild.roles.cache.get(roleId);
              return role && botMember.roles.highest.position > role.position;
            });
            if (rolesToAdd.length > 0) {
              await member.roles.add(rolesToAdd).catch(() => {});
            }
          }
        } catch (err) {
          console.warn('[welcomeHandler] Autorole error:', err?.message || err);
        }
      }

      // Generate card buffer if needed for channel or DM
      let cardBuffer = null;
      if (settings.welcomeCardEnabled || settings.dmCardEnabled) {
        try {
          cardBuffer = await generateWelcomeCard({
            username: member.user.username,
            discriminator: member.user.discriminator || '0',
            avatarUrl,
            guildName: guild.name,
            memberCount,
            cardTheme: settings.cardTheme || 'modern_obsidian',
            cardFont: settings.cardFont || 'Inter',
            cardTextColor: settings.cardTextColor,
            cardBgColor: settings.cardBgColor,
            cardOverlayOpacity: settings.cardOverlayOpacity,
            cardBgImage: settings.cardBgImage,
            cardTitle: settings.cardTitle,
            cardSubtitle: settings.cardSubtitle
          });
        } catch (cardErr) {
          console.warn('[welcomeHandler] Card render failed:', cardErr?.message || cardErr);
        }
      }

      // ── 2. SEND WELCOME MESSAGE IN CHANNEL ─────────────────────────────────
      if (settings.welcomeChannelEnabled && settings.welcomeChannelId) {
        const channel = guild.channels.cache.get(String(settings.welcomeChannelId));
        if (channel && channel.isTextBased()) {
          const botMember = guild.members.me;
          if (botMember && channel.permissionsFor(botMember)?.has(PermissionsBitField.Flags.SendMessages)) {
            const parsedText = formatPlaceholders(settings.welcomeMessage);
            const files = [];

            if (cardBuffer && settings.welcomeCardEnabled) {
              files.push(new AttachmentBuilder(cardBuffer, { name: 'welcome.png' }));
            }

            if (settings.welcomeMessageType === 'embed') {
              const embConfig = settings.welcomeEmbed || {};
              const embed = new EmbedBuilder()
                .setTitle(formatPlaceholders(embConfig.title || `Welcome to ${guild.name}!`))
                .setDescription(parsedText || formatPlaceholders(embConfig.description || `Welcome {user}!`))
                .setColor(embConfig.color ? parseInt(embConfig.color.replace('#', ''), 16) || 0xf43f5e : 0xf43f5e)
                .setTimestamp();

              if (cardBuffer && settings.welcomeCardEnabled) {
                embed.setImage('attachment://welcome.png');
              }
              if (embConfig.footer) {
                embed.setFooter({ text: formatPlaceholders(embConfig.footer) });
              }

              await channel.send({ embeds: [embed], files }).catch(() => {});
            } else {
              // Text message mode
              await channel.send({ content: parsedText || `Hey <@${member.id}>, welcome to **${guild.name}**!`, files }).catch(() => {});
            }
          }
        }
      }

      // ── 3. SEND DIRECT MESSAGE (DM) TO USER ────────────────────────────────
      if (settings.dmEnabled && settings.dmMessage) {
        try {
          const dmText = formatPlaceholders(settings.dmMessage);
          const dmFiles = [];

          if (cardBuffer && settings.dmCardEnabled) {
            dmFiles.push(new AttachmentBuilder(cardBuffer, { name: 'welcome.png' }));
          }

          if (settings.dmMessageType === 'embed') {
            const embConfig = settings.dmEmbed || {};
            const embed = new EmbedBuilder()
              .setTitle(formatPlaceholders(embConfig.title || `Welcome to ${guild.name}!`))
              .setDescription(dmText)
              .setColor(embConfig.color ? parseInt(embConfig.color.replace('#', ''), 16) || 0xf43f5e : 0xf43f5e)
              .setTimestamp();

            if (cardBuffer && settings.dmCardEnabled) {
              embed.setImage('attachment://welcome.png');
            }
            if (embConfig.footer) {
              embed.setFooter({ text: formatPlaceholders(embConfig.footer) });
            }

            await member.send({ embeds: [embed], files: dmFiles }).catch(() => {});
          } else {
            await member.send({ content: dmText, files: dmFiles }).catch(() => {});
          }
        } catch {
          // User DMs may be closed; safely ignore
        }
      }
    } catch (err) {
      console.error('[welcomeHandler] Unhandled error:', err?.message || err);
    }
  }
};