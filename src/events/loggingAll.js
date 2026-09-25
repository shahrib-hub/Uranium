// src/events/loggingAll.js
const { PermissionsBitField, Events } = require('discord.js');
const logger = require('../utils/logger');
const chalk = require('chalk');
const logStorage = require('../utils/logStorage');
const webhookHelper = require('../utils/webhookHelper');
const {
  makeCreateEmbed,
  makeDeleteEmbed,
  makeUpdateEmbed,
  formatMember,
  formatChannel,
  formatRole
} = require('../utils/logFormatter');

const EVENTS = {
  messageUpdate: 'messageUpdate',
  messageDelete: 'messageDelete',
  messageBulkDelete: 'messageBulkDelete',
  guildMemberAdd: 'guildMemberAdd',
  guildMemberRemove: 'guildMemberRemove',
  channelCreate: 'channelCreate',
  channelDelete: 'channelDelete',
  channelUpdate: 'channelUpdate',
  roleCreate: 'roleCreate',
  roleDelete: 'roleDelete',
  emojiCreate: 'emojiCreate',
  emojiDelete: 'emojiDelete',
  voiceStateUpdate: 'voiceStateUpdate'
};

async function sendLog(client, guildId, embed) {
  try {
    const ok = await webhookHelper.sendViaWebhookIfConfigured(client, guildId, { embeds: [embed] });
    if (ok) return true;
  } catch {}

  try {
    const channelId = await logStorage.getLogChannel(guildId);
    if (!channelId) return false;

    const guild = client.guilds.cache.get(String(guildId));
    if (!guild) return false;

    const ch = guild.channels.cache.get(String(channelId));
    if (!ch || !ch.isTextBased?.()) return false;

    const me = guild.members.me;
    if (!me.permissionsIn(ch).has(PermissionsBitField.Flags.SendMessages)) return false;

    await ch.send({ embeds: [embed] }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log('[loggingAll] unified logger active');

    async function shouldHandle(guildId, eventName, channelId = null) {
      try {
        const pluginStorage = require('../utils/pluginStorage');
        if (pluginStorage && !(await pluginStorage.isPluginEnabled(guildId, 'logging'))) {
          return false;
        }

        const enabled = await logStorage.isEventEnabled(guildId, eventName);
        if (!enabled) return false;

        if (channelId) {
          const ignored = await logStorage.listIgnoredChannels(guildId);
          if (ignored && ignored.includes(String(channelId))) return false;
        }

        return true;
      } catch {
        return false;
      }
    }

    // MESSAGE UPDATE
    client.on('messageUpdate', async (oldMessage, newMessage) => {
      try {
        if (!newMessage.guild || newMessage.author?.bot) return;
        if (!(await shouldHandle(newMessage.guild.id, EVENTS.messageUpdate, newMessage.channel?.id))) return;

        const before = (oldMessage?.content ?? '').slice(0, 1024) || '(no content)';
        const after = (newMessage?.content ?? '').slice(0, 1024) || '(no content)';
        if (before === after) return;

        const embed = makeUpdateEmbed({
          guild: newMessage.guild,
          event: 'Message Edited',
          actor: `${newMessage.author.tag} (${newMessage.author.id})`,
          target: formatChannel(newMessage.channel),
          beforeText: before,
          afterText: after
        });

        await sendLog(client, newMessage.guild.id, embed);
      } catch {}
    });

    // MESSAGE DELETE
    client.on('messageDelete', async (message) => {
      try {
        if (!message.guild || message.author?.bot) return;
        if (!(await shouldHandle(message.guild.id, EVENTS.messageDelete, message.channel?.id))) return;

        const embed = makeDeleteEmbed({
          guild: message.guild,
          event: 'Message Deleted',
          actor: `${message.author.tag} (${message.author.id})`,
          target: formatChannel(message.channel),
          fields: [
            { name: 'Content', value: message.content ? message.content.slice(0, 1024) : '*(no content)*' }
          ]
        });

        await sendLog(client, message.guild.id, embed);
      } catch {}
    });

    // MESSAGE BULK DELETE
    client.on('messageBulkDelete', async (messages) => {
      try {
        if (!messages.size) return;
        const guild = messages.first().guild;
        if (!guild) return;

        if (!(await shouldHandle(guild.id, EVENTS.messageBulkDelete, messages.first().channel?.id))) return;

        const embed = makeDeleteEmbed({
          guild,
          event: 'Messages Bulk Deleted',
          target: formatChannel(messages.first().channel),
          fields: [{ name: 'Count', value: String(messages.size) }]
        });

        await sendLog(client, guild.id, embed);
      } catch {}
    });

    // MEMBER JOIN
    client.on('guildMemberAdd', async (member) => {
      try {
        if (!(await shouldHandle(member.guild.id, EVENTS.guildMemberAdd))) return;

        const embed = makeCreateEmbed({
          guild: member.guild,
          event: 'Member Joined',
          actor: formatMember(member),
          fields: [
            { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` }
          ]
        });

        await sendLog(client, member.guild.id, embed);
      } catch {}
    });

    // MEMBER LEAVE
    client.on('guildMemberRemove', async (member) => {
      try {
        if (!(await shouldHandle(member.guild.id, EVENTS.guildMemberRemove))) return;

        const embed = makeDeleteEmbed({
          guild: member.guild,
          event: 'Member Left',
          actor: formatMember(member)
        });

        await sendLog(client, member.guild.id, embed);
      } catch {}
    });

    // CHANNEL CREATE
    client.on('channelCreate', async (channel) => {
      try {
        if (!channel.guild) return;
        if (!(await shouldHandle(channel.guild.id, EVENTS.channelCreate))) return;

        const embed = makeCreateEmbed({
          guild: channel.guild,
          event: 'Channel Created',
          target: formatChannel(channel),
          fields: [{ name: 'Type', value: String(channel.type) }]
        });

        await sendLog(client, channel.guild.id, embed);
      } catch {}
    });

    // CHANNEL DELETE
    client.on('channelDelete', async (channel) => {
      try {
        if (!channel.guild) return;
        if (!(await shouldHandle(channel.guild.id, EVENTS.channelDelete))) return;

        const embed = makeDeleteEmbed({
          guild: channel.guild,
          event: 'Channel Deleted',
          target: formatChannel(channel),
          fields: [{ name: 'Type', value: String(channel.type) }]
        });

        await sendLog(client, channel.guild.id, embed);
      } catch {}
    });

    // CHANNEL UPDATE
    client.on('channelUpdate', async (oldChannel, newChannel) => {
      try {
        if (!newChannel.guild) return;
        if (!(await shouldHandle(newChannel.guild.id, EVENTS.channelUpdate))) return;

        const embed = makeUpdateEmbed({
          guild: newChannel.guild,
          event: 'Channel Updated',
          target: formatChannel(newChannel),
          beforeText: oldChannel?.name ?? '(unknown)',
          afterText: newChannel?.name ?? '(unknown)'
        });

        await sendLog(client, newChannel.guild.id, embed);
      } catch {}
    });

    // ROLE CREATE
    client.on('roleCreate', async (role) => {
      try {
        if (!(await shouldHandle(role.guild.id, EVENTS.roleCreate))) return;

        const embed = makeCreateEmbed({
          guild: role.guild,
          event: 'Role Created',
          target: formatRole(role),
          fields: [{ name: 'Color', value: role.hexColor }]
        });

        await sendLog(client, role.guild.id, embed);
      } catch {}
    });

    // ROLE DELETE
    client.on('roleDelete', async (role) => {
      try {
        if (!(await shouldHandle(role.guild.id, EVENTS.roleDelete))) return;

        const embed = makeDeleteEmbed({
          guild: role.guild,
          event: 'Role Deleted',
          target: formatRole(role),
          fields: [{ name: 'Color', value: role.hexColor }]
        });

        await sendLog(client, role.guild.id, embed);
      } catch {}
    });

    // EMOJI CREATE
    client.on('emojiCreate', async (emoji) => {
      try {
        if (!(await shouldHandle(emoji.guild.id, EVENTS.emojiCreate))) return;

        const embed = makeCreateEmbed({
          guild: emoji.guild,
          event: 'Emoji Created',
          target: `${emoji.name} — <:${emoji.name}:${emoji.id}>`
        });

        await sendLog(client, emoji.guild.id, embed);
      } catch {}
    });

    // EMOJI DELETE
    client.on('emojiDelete', async (emoji) => {
      try {
        if (!(await shouldHandle(emoji.guild.id, EVENTS.emojiDelete))) return;

        const embed = makeDeleteEmbed({
          guild: emoji.guild,
          event: 'Emoji Deleted',
          target: `${emoji.name} (${emoji.id})`
        });

        await sendLog(client, emoji.guild.id, embed);
      } catch {}
    });

    // VOICE STATE UPDATE
    client.on('voiceStateUpdate', async (oldState, newState) => {
      try {
        const guild = newState.guild || oldState.guild;
        if (!guild) return;

        if (!(await shouldHandle(guild.id, EVENTS.voiceStateUpdate))) return;

        const user = newState.member?.user || oldState.member?.user;
        const before = oldState.channel;
        const after = newState.channel;

        let summary = '';
        if (!before && after) summary = `Joined ${formatChannel(after)}`;
        else if (before && !after) summary = `Left ${formatChannel(before)}`;
        else if (before && after && before.id !== after.id)
          summary = `Moved: ${formatChannel(before)} → ${formatChannel(after)}`;
        else summary = 'Voice state changed';

        const embed = makeUpdateEmbed({
          guild,
          event: 'Voice State Update',
          actor: `${user.tag} (${user.id})`,
          target: `${user.tag} (${user.id})`,
          beforeText: before ? formatChannel(before) : '(none)',
          afterText: after ? formatChannel(after) : '(none)',
          fields: [{ name: 'Summary', value: summary }]
        });

        await sendLog(client, guild.id, embed);
      } catch {}
    });

    logger.info(chalk.blue('[loggingAll] listeners ready'));
  }
};