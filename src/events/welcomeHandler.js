// src/events/welcomeHandler.js
const welcomeStorage = require('../utils/welcomeStorage');
const { generateWelcomeCard } = require('../utils/welcomeCardRenderer');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member, client) {
    try {
      if (!member || !member.guild) return;
      const guildId = member.guild.id;

      const settings = await welcomeStorage.getSettings(guildId);
      if (!settings || !settings.enabled) return; // disabled

      // channel configured?
      const targetChannelId = settings.channelId;
      const sendDM = !!settings.dm;

      // choose template index (stored template id expected but we accept 1..5 fallback)
      let tpl = 1;
      if (typeof settings.template === 'number' && settings.template >= 1 && settings.template <= 10) tpl = settings.template;
      // If template points to a saved template id (from templates table) you can expand logic here.

      const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 512 });

      // member count (approx) — fetch guild member count when available
      let count = null;
      try {
        count = member.guild.memberCount;
      } catch { /* ignore */ }

      // generate image
      const buf = await generateWelcomeCard({
        username: member.user.username,
        discriminator: member.user.discriminator,
        avatarUrl,
        guildName: member.guild.name,
        memberCount: count,
        templateIndex: tpl
      });

      // Compose embed
      const embed = new EmbedBuilder()
        .setTitle(`Welcome ${member.user.username}!`)
        .setDescription(settings.message ? settings.message
          .replace(/{user}/g, `<@${member.id}>`)
          .replace(/{username}/g, member.user.username)
          .replace(/{guild}/g, member.guild.name)
          .replace(/{count}/g, count || '')
        : `Welcome to ${member.guild.name}, <@${member.id}>!`)
        .setImage('attachment://welcome.png')
        .setColor(0x57F287)
        .setTimestamp();

      // send DM or channel
      if (sendDM) {
        await member.send({ embeds: [embed], files: [{ attachment: buf, name: 'welcome.png' }] }).catch(() => {
          // DM may fail; fallback to channel
        });
        return;
      }

      if (!targetChannelId) return; // nothing to send to
      const ch = member.guild.channels.cache.get(String(targetChannelId));
      if (!ch || !ch.isTextBased?.()) return;

      // check bot send permissions
      const me = member.guild.members.me;
      if (!me.permissionsIn(ch).has('SendMessages')) return;

      await ch.send({ embeds: [embed], files: [{ attachment: buf, name: 'welcome.png' }] }).catch(() => {});

    } catch (err) {
      // only log errors, no floods
      console.error('[welcomeHandler] error:', err?.message || err);
    }
  }
};