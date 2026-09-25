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
      if (!settings || (!settings.enabled && !settings.active)) return;

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
          .replace(/{member_count}/gi, String(memberCount))
          .replace(/{count}/gi, String(memberCount));
      };

      const parseColor = (col) => {
        if (!col) return 0xf43f5e;
        if (typeof col === 'number') return col;
        return parseInt(String(col).replace('#', ''), 16) || 0xf43f5e;
      };

      // ── 1. AUTOROLE ASSIGNMENT ─────────────────────────────────────────────
      if ((settings.autoroleEnabled || settings.autorolesEnabled) && Array.isArray(settings.autoroleIds) && settings.autoroleIds.length > 0) {
        try {
          const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
          if (botMember && botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            if (guild.roles.cache.size <= 1) {
              await guild.roles.fetch().catch(() => null);
            }
            const rolesToAdd = settings.autoroleIds.filter(roleId => {
              const role = guild.roles.cache.get(roleId);
              return role && botMember.roles.highest.position > role.position;
            });

            for (const roleId of rolesToAdd) {
              await member.roles.add(roleId, 'Welcome Autorole').catch(err => {
                console.warn(`[welcomeHandler] Failed to assign role ${roleId}:`, err?.message || err);
              });
            }
          }
        } catch (err) {
          console.warn('[welcomeHandler] Autorole error:', err?.message || err);
        }
      }

      // Generate card buffer if needed for channel or DM
      let cardBuffer = null;
      if (settings.welcomeCardEnabled || settings.dmCardEnabled || settings.sendWelcomeCard || settings.sendWelcomeDmCard) {
        try {
          cardBuffer = await generateWelcomeCard({
            username: member.user.username,
            discriminator: member.user.discriminator || '0',
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
            cardTitle: settings.cardTitle || settings.welcomeCardConfig?.titleTemplate,
            cardSubtitle: settings.cardSubtitle || settings.welcomeCardConfig?.subtitleTemplate
          });
        } catch (cardErr) {
          console.warn('[welcomeHandler] Card render failed:', cardErr?.message || cardErr);
        }
      }

      // ── 2. SEND WELCOME MESSAGE IN CHANNEL ─────────────────────────────────
      if ((settings.welcomeChannelEnabled || settings.sendWelcomeMessage) && settings.welcomeChannelId) {
        let channel = guild.channels.cache.get(String(settings.welcomeChannelId));
        if (!channel) {
          channel = await guild.channels.fetch(String(settings.welcomeChannelId)).catch(() => null);
        }

        if (channel && channel.isTextBased()) {
          const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
          const perms = botMember ? channel.permissionsFor(botMember) : null;

          if (perms && perms.has(PermissionsBitField.Flags.SendMessages)) {
            const parsedText = formatPlaceholders(settings.welcomeMessage || 'Hey {user}, welcome to **{server}**!');
            const files = [];

            if (cardBuffer && (settings.welcomeCardEnabled || settings.sendWelcomeCard) && perms.has(PermissionsBitField.Flags.AttachFiles)) {
              files.push(new AttachmentBuilder(cardBuffer, { name: 'welcome.png' }));
            }

            if (settings.welcomeMessageType === 'embed' && perms.has(PermissionsBitField.Flags.EmbedLinks)) {
              const embConfig = settings.welcomeEmbed || {};
              const embed = new EmbedBuilder()
                .setTitle(formatPlaceholders(embConfig.title || `Welcome to ${guild.name}!`))
                .setDescription(parsedText || formatPlaceholders(embConfig.description || `Welcome {user}!`))
                .setColor(parseColor(embConfig.color))
                .setTimestamp();

              if (files.length > 0) {
                embed.setImage('attachment://welcome.png');
              }
              if (embConfig.footer) {
                embed.setFooter({ text: formatPlaceholders(embConfig.footer) });
              }

              await channel.send({ embeds: [embed], files }).catch(async (sendErr) => {
                console.warn('[welcomeHandler] Failed to send embed, trying text fallback:', sendErr.message);
                await channel.send({ content: parsedText || `Hey <@${member.id}>, welcome to **${guild.name}**!` }).catch(() => {});
              });
            } else {
              // Text message mode (or embed links missing fallback)
              await channel.send({ content: parsedText || `Hey <@${member.id}>, welcome to **${guild.name}**!`, files }).catch(async (sendErr) => {
                console.warn('[welcomeHandler] Failed to send message with files, retrying without files:', sendErr.message);
                await channel.send({ content: parsedText || `Hey <@${member.id}>, welcome to **${guild.name}**!` }).catch(() => {});
              });
            }
          } else {
            console.warn(`[welcomeHandler] Bot lacks SendMessages permission in welcome channel #${channel.name}`);
          }
        }
      }

      // ── 3. SEND DIRECT MESSAGE (DM) TO USER ────────────────────────────────
      const dmMsg = settings.welcomeDmMessage || settings.dmMessage;
      if ((settings.dmEnabled || settings.sendWelcomeDm) && dmMsg) {
        try {
          const dmText = formatPlaceholders(dmMsg);
          const dmFiles = [];

          if (cardBuffer && (settings.dmCardEnabled || settings.sendWelcomeDmCard)) {
            dmFiles.push(new AttachmentBuilder(cardBuffer, { name: 'welcome.png' }));
          }

          if ((settings.dmMessageType || settings.welcomeDmMessageType) === 'embed') {
            const embConfig = settings.dmEmbed || {};
            const embed = new EmbedBuilder()
              .setTitle(formatPlaceholders(embConfig.title || `Welcome to ${guild.name}!`))
              .setDescription(dmText)
              .setColor(parseColor(embConfig.color))
              .setTimestamp();

            if (dmFiles.length > 0) {
              embed.setImage('attachment://welcome.png');
            }
            if (embConfig.footer) {
              embed.setFooter({ text: formatPlaceholders(embConfig.footer) });
            }

            await member.send({ embeds: [embed], files: dmFiles }).catch(async () => {
              await member.send({ content: dmText }).catch(() => {});
            });
          } else {
            await member.send({ content: dmText, files: dmFiles }).catch(async () => {
              await member.send({ content: dmText }).catch(() => {});
            });
          }
        } catch {
          // User DMs closed or blocked
        }
      }
    } catch (err) {
      console.error('[welcomeHandler] Unhandled error:', err?.message || err);
    }
  }
};