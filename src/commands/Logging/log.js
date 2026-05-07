// src/commands/Moderation/log.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType
} = require('discord.js');

const logStorage = require('../../utils/logStorage');
const webhookHelper = require('../../utils/webhookHelper');

const EVENTS = [
  'messageDelete',
  'messageUpdate',
  'messageBulkDelete',
  'guildMemberAdd',
  'guildMemberRemove',
  'channelCreate',
  'channelDelete',
  'channelUpdate',
  'roleCreate',
  'roleDelete',
  'emojiCreate',
  'emojiDelete',
  'voiceStateUpdate'
];

function makeEmbed(title, desc, color = 0x5865F2) {
  return new EmbedBuilder().setTitle(title).setDescription(desc).setColor(color);
}

function requireManageGuild(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    interaction.reply({
      embeds: [makeEmbed('Permission denied', 'You need the **Manage Server** permission to use this command.', 0xED4245)],
      flags: 64
    }).catch(() => {});
    return false;
  }
  return true;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log')
    .setDescription('Guild logging configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    // set-channel
    .addSubcommand(sc =>
      sc
        .setName('set-channel')
        .setDescription('Set the fallback text channel for logs')
        .addChannelOption(o =>
          o.setName('channel')
           .setDescription('Channel to send logs to')
           .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
           .setRequired(true)
        )
    )
    // create-webhook
    .addSubcommand(sc =>
      sc
        .setName('create-webhook')
        .setDescription('Create + save a logging webhook in a channel')
        .addChannelOption(o =>
          o.setName('channel')
           .setDescription('Channel to create webhook in')
           .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
           .setRequired(true)
        )
        .addStringOption(o =>
          o.setName('name')
           .setDescription('Webhook name (optional)')
           .setRequired(false)
        )
    )
    // remove-webhook
    .addSubcommand(sc =>
      sc
        .setName('remove-webhook')
        .setDescription('Remove saved webhook and attempt to delete it')
    )
    // enable event
    .addSubcommand(sc =>
      sc
        .setName('enable')
        .setDescription('Enable a logging event')
        .addStringOption(o =>
          o.setName('event')
           .setDescription('Event name to enable')
           .setRequired(true)
           .addChoices(...EVENTS.map(e => ({ name: e, value: e })))
        )
    )
    // disable event
    .addSubcommand(sc =>
      sc
        .setName('disable')
        .setDescription('Disable a logging event')
        .addStringOption(o =>
          o.setName('event')
           .setDescription('Event name to disable')
           .setRequired(true)
           .addChoices(...EVENTS.map(e => ({ name: e, value: e })))
        )
    )
    // list-events
    .addSubcommand(sc =>
      sc
        .setName('list-events')
        .setDescription('List all loggable events and their enabled state')
    )
    // ignore channel add/remove/list
    .addSubcommand(sc =>
      sc
        .setName('ignore-add')
        .setDescription('Add channel to logging ignore list')
        .addChannelOption(o =>
          o.setName('channel')
           .setDescription('Channel to ignore')
           .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
           .setRequired(true)
        )
    )
    .addSubcommand(sc =>
      sc
        .setName('ignore-remove')
        .setDescription('Remove channel from logging ignore list')
        .addChannelOption(o =>
          o.setName('channel')
           .setDescription('Channel to remove from ignore list')
           .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
           .setRequired(true)
        )
    )
    .addSubcommand(sc =>
      sc
        .setName('ignore-list')
        .setDescription('List ignored channels for logging')
    )
    // status
    .addSubcommand(sc =>
      sc
        .setName('status')
        .setDescription('Show current logging configuration')
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({ embeds: [makeEmbed('Guild only', 'This command must be run inside a guild.', 0xED4245)], flags: 64 });
    }

    if (!requireManageGuild(interaction)) return;

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    try {
      // set-channel
      if (sub === 'set-channel') {
        const channel = interaction.options.getChannel('channel', true);
        await logStorage.setLogChannel(guildId, channel.id);
        return interaction.reply({ embeds: [makeEmbed('Saved', `Logs will now be sent to <#${channel.id}>`)] });
      }

      // create-webhook
      if (sub === 'create-webhook') {
        const channel = interaction.options.getChannel('channel', true);
        const name = (interaction.options.getString('name') || `Logger-${interaction.guild.name}`).slice(0, 80);

        const me = interaction.guild.members.me;
        if (!me.permissionsIn(channel).has(PermissionFlagsBits.ManageWebhooks)) {
          return interaction.reply({ embeds: [makeEmbed('Permissions', 'I need **Manage Webhooks** in the target channel to create a webhook.', 0xED4245)], flags: 64 });
        }

        await interaction.deferReply({ flags: 64 });
        try {
          const res = await webhookHelper.createAndSaveWebhook(interaction.client, guildId, channel.id, name);
          const urlText = res.url ? `\nWebhook URL: \`${res.url}\`` : '\nWebhook created (token not exposed at runtime).';
          return interaction.editReply({ embeds: [makeEmbed('Webhook created', `Saved webhook for logging in <#${channel.id}>.${urlText}`)] });
        } catch (err) {
          return interaction.editReply({ embeds: [makeEmbed('Failed', `Could not create webhook: ${err.message || String(err)}`, 0xED4245)] });
        }
      }

      // remove-webhook
      if (sub === 'remove-webhook') {
        await interaction.deferReply({ flags: 64 });
        try {
          await webhookHelper.removeSavedWebhook(interaction.client, guildId);
          return interaction.editReply({ embeds: [makeEmbed('Removed', 'Saved webhook removed (attempted deletion).')] });
        } catch (err) {
          return interaction.editReply({ embeds: [makeEmbed('Failed', `Could not remove webhook: ${err.message || String(err)}`, 0xED4245)] });
        }
      }

      // enable
      if (sub === 'enable') {
        const eventName = interaction.options.getString('event', true);
        if (!EVENTS.includes(eventName)) return interaction.reply({ embeds: [makeEmbed('Unknown event', 'That event is not supported.', 0xED4245)], flags: 64 });
        await logStorage.setEventEnabled(guildId, eventName, true);
        return interaction.reply({ embeds: [makeEmbed('Enabled', `Event **${eventName}** enabled.`)] });
      }

      // disable
      if (sub === 'disable') {
        const eventName = interaction.options.getString('event', true);
        if (!EVENTS.includes(eventName)) return interaction.reply({ embeds: [makeEmbed('Unknown event', 'That event is not supported.', 0xED4245)], flags: 64 });
        await logStorage.setEventEnabled(guildId, eventName, false);
        return interaction.reply({ embeds: [makeEmbed('Disabled', `Event **${eventName}** disabled.`)] });
      }

      // list-events
      if (sub === 'list-events') {
        const rows = await logStorage.listEvents(guildId);
        const map = new Map(rows.map(r => [r.eventName, !!r.enabled]));
        const lines = EVENTS.map(e => `• ${e} — ${map.get(e) ? '✅' : '❌'}`).join('\n');
        return interaction.reply({ embeds: [makeEmbed('Log events', lines)] });
      }

      // ignore-add
      if (sub === 'ignore-add') {
        const channel = interaction.options.getChannel('channel', true);
        await logStorage.addIgnoredChannel(guildId, channel.id);
        return interaction.reply({ embeds: [makeEmbed('Ignored', `<#${channel.id}> will be ignored by logging.`)] });
      }

      // ignore-remove
      if (sub === 'ignore-remove') {
        const channel = interaction.options.getChannel('channel', true);
        await logStorage.removeIgnoredChannel(guildId, channel.id);
        return interaction.reply({ embeds: [makeEmbed('Removed', `<#${channel.id}> removed from ignore list.`)] });
      }

      // ignore-list
      if (sub === 'ignore-list') {
        const ids = await logStorage.listIgnoredChannels(guildId);
        if (!ids.length) return interaction.reply({ embeds: [makeEmbed('Ignored channels', 'No channels are ignored.')] });
        const listText = ids.map(id => `<#${id}>`).join('\n');
        return interaction.reply({ embeds: [makeEmbed('Ignored channels', listText)] });
      }

      // status
      if (sub === 'status') {
        const logChannelId = await logStorage.getLogChannel(guildId);
        const webhook = await logStorage.getWebhook(guildId);
        const rows = await logStorage.listEvents(guildId);
        const map = new Map(rows.map(r => [r.eventName, !!r.enabled]));
        const enabledList = EVENTS.filter(e => map.get(e)).join(', ') || '—';

        const lines = [
          `Log channel: ${logChannelId ? `<#${logChannelId}>` : 'Not set'}`,
          `Webhook: ${webhook ? (webhook.id ? `Saved (id: ${webhook.id})` : 'Saved') : 'Not set'}`,
          `Enabled events: ${enabledList}`
        ].join('\n');

        return interaction.reply({ embeds: [makeEmbed('Logging status', lines)] });
      }

      return interaction.reply({ embeds: [makeEmbed('Unknown', 'Unknown subcommand')], flags: 64 });
    } catch (err) {
      console.error('[log command] error', err);
      return interaction.reply({ embeds: [makeEmbed('Error', 'An internal error occurred.')], flags: 64 });
    }
  }
};