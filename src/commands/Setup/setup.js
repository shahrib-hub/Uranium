// src/commands/Setup/setup.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');

const welcomeHandler = require('../../handlers/setup/welcome');
const autoroleHandler = require('../../handlers/setup/autorole');
const verificationHandler = require('../../handlers/setup/verification');
const joinPingHandler = require('../../handlers/setup/join-ping');
const ghostPingHandler = require('../../handlers/setup/anti-ghostping');
const jtcHandler = require('../../handlers/setup/join-to-create');
const autoresponseHandler = require('../../handlers/setup/autoresponse');
const ytverifyHandler = require('../../handlers/setup/ytverify');

const TEMPLATE_CHOICES = [
  { name: '1 — Modern Gradient', value: '1' },
  { name: '2 — Warm Swoosh', value: '2' },
  { name: '3 — Dark Neon', value: '3' },
  { name: '4 — Minimal Banner', value: '4' },
  { name: '5 — Playful Colorful', value: '5' },
  { name: '6 — Mosaic Geometric', value: '6' },
  { name: '7 — Polaroid Photo', value: '7' },
  { name: '8 — Comic Sticker', value: '8' },
  { name: '9 — Glassmorphism', value: '9' },
  { name: '10 — Luxe Gold', value: '10' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('⚙️ Universal Server Setup & Automation Configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)

    // 1. WELCOME GROUP
    .addSubcommandGroup(group =>
      group
        .setName('welcome')
        .setDescription('Configure welcome greetings and cards')
        .addSubcommand(sub =>
          sub
            .setName('channel-set')
            .setDescription('Set the welcome greeting channel')
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('Target text channel')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub
            .setName('channel-remove')
            .setDescription('Disable and remove welcome greeting channel')
        )
        .addSubcommand(sub =>
          sub
            .setName('config')
            .setDescription('Customize welcome card template and message')
            .addStringOption(opt =>
              opt
                .setName('template')
                .setDescription('Card template theme')
                .addChoices(...TEMPLATE_CHOICES)
                .setRequired(false)
            )
            .addStringOption(opt =>
              opt
                .setName('message')
                .setDescription('Welcome text. Placeholders: {user} {username} {guild} {count}')
                .setRequired(false)
            )
            .addBooleanOption(opt =>
              opt
                .setName('enabled')
                .setDescription('Enable or disable welcome messages')
                .setRequired(false)
            )
            .addBooleanOption(opt =>
              opt
                .setName('dm')
                .setDescription('Send greeting as direct message instead of channel')
                .setRequired(false)
            )
        )
    )

    // 2. AUTOROLE GROUP
    .addSubcommandGroup(group =>
      group
        .setName('autorole')
        .setDescription('Automatic role assignment upon member join')
        .addSubcommand(sub =>
          sub
            .setName('create')
            .setDescription('Create a new autorole configuration set')
            .addStringOption(opt => opt.setName('name').setDescription('Optional set name'))
            .addIntegerOption(opt => opt.setName('delay').setDescription('Delay in seconds before assigning roles').setMinValue(0))
            .addStringOption(opt => opt.setName('welcome').setDescription('Optional DM welcome message ({user}, {guild})'))
        )
        .addSubcommand(sub =>
          sub
            .setName('add')
            .setDescription('Add a role to an autorole set')
            .addIntegerOption(opt => opt.setName('set').setDescription('Target set ID').setRequired(true))
            .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('remove')
            .setDescription('Remove a role from an autorole set')
            .addIntegerOption(opt => opt.setName('set').setDescription('Target set ID').setRequired(true))
            .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('list')
            .setDescription('List all configured autorole sets')
        )
        .addSubcommand(sub =>
          sub
            .setName('delete')
            .setDescription('Delete an autorole set')
            .addIntegerOption(opt => opt.setName('set').setDescription('Target set ID').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('enable')
            .setDescription('Enable an autorole set')
            .addIntegerOption(opt => opt.setName('set').setDescription('Target set ID').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('disable')
            .setDescription('Disable an autorole set')
            .addIntegerOption(opt => opt.setName('set').setDescription('Target set ID').setRequired(true))
        )
    )

    // 3. VERIFICATION GROUP
    .addSubcommandGroup(group =>
      group
        .setName('verification')
        .setDescription('Member verification gatekeeper system')
        .addSubcommand(sub =>
          sub
            .setName('start')
            .setDescription('Start the interactive verification setup wizard')
        )
        .addSubcommand(sub =>
          sub
            .setName('bypass')
            .setDescription('Manually verify a member')
            .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('remove')
            .setDescription('Remove verification from a member')
            .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('status')
            .setDescription('View current verification configuration')
        )
        .addSubcommand(sub =>
          sub
            .setName('disable')
            .setDescription('Disable the verification gatekeeper')
        )
    )

    // 4. JOIN-PING GROUP
    .addSubcommandGroup(group =>
      group
        .setName('joinping')
        .setDescription('Ghost ping new joiners in specific channels')
        .addSubcommand(sub =>
          sub
            .setName('add')
            .setDescription('Add a channel for join pings')
            .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('remove')
            .setDescription('Remove a channel from join pings')
            .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('disable')
            .setDescription('Disable all join pings in this server')
        )
        .addSubcommand(sub =>
          sub
            .setName('list')
            .setDescription('List all configured join-ping channels')
        )
    )

    // 5. ANTI-GHOSTPING GROUP
    .addSubcommandGroup(group =>
      group
        .setName('ghostping')
        .setDescription('Anti-ghostping alert and moderation system')
        .addSubcommand(sub =>
          sub
            .setName('enable')
            .setDescription('Enable anti-ghostping system')
        )
        .addSubcommand(sub =>
          sub
            .setName('disable')
            .setDescription('Disable anti-ghostping system')
        )
        .addSubcommand(sub =>
          sub
            .setName('reset')
            .setDescription("Reset a user's ghostping count")
            .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('config')
            .setDescription('Configure ghostping action and timeouts')
            .addStringOption(opt =>
              opt
                .setName('action')
                .setDescription('Action to take')
                .addChoices(
                  { name: 'Notify only', value: 'notify' },
                  { name: 'Timeout', value: 'timeout' },
                  { name: 'None', value: 'none' }
                )
            )
            .addIntegerOption(opt =>
              opt
                .setName('timeout')
                .setDescription('Timeout duration in seconds')
                .setMinValue(30)
                .setMaxValue(604800)
            )
        )
    )

    // 6. JOIN-TO-CREATE (JTC) GROUP
    .addSubcommandGroup(group =>
      group
        .setName('jtc')
        .setDescription('Temporary voice channel generation system')
        .addSubcommand(sub =>
          sub
            .setName('setup')
            .setDescription('Configure Join-To-Create hub')
            .addChannelOption(opt =>
              opt
                .setName('voice_channel')
                .setDescription('Hub voice channel users join to trigger creation')
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true)
            )
            .addChannelOption(opt =>
              opt
                .setName('category')
                .setDescription('Category where new temporary voice channels are created')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true)
            )
            .addIntegerOption(opt =>
              opt
                .setName('limit')
                .setDescription('Default user limit per temporary channel (1–99)')
                .setMinValue(1)
                .setMaxValue(99)
                .setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub
            .setName('disable')
            .setDescription('Disable the Join-To-Create system')
        )
    )

    // 7. AUTORESPONSE GROUP
    .addSubcommandGroup(group =>
      group
        .setName('autoresponse')
        .setDescription('Keyword triggers and automatic responses')
        .addSubcommand(sub =>
          sub
            .setName('add')
            .setDescription('Start interactive wizard to add an auto-response')
        )
        .addSubcommand(sub =>
          sub
            .setName('remove')
            .setDescription('Remove an auto-response trigger')
            .addStringOption(opt => opt.setName('trigger').setDescription('Trigger keyword').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('list')
            .setDescription('List all server auto-responses')
        )
    )

    // 8. YOUTUBE VERIFICATION GROUP
    .addSubcommandGroup(group =>
      group
        .setName('ytverify')
        .setDescription('Subscription verification via YouTube')
        .addSubcommand(sub =>
          sub
            .setName('setup')
            .setDescription('Setup YouTube subscription gatekeeper')
            .addChannelOption(opt => opt.setName('channel').setDescription('Verification channel').setRequired(true))
            .addRoleOption(opt => opt.setName('role').setDescription('Role granted upon subscription').setRequired(true))
            .addStringOption(opt => opt.setName('youtube').setDescription('YouTube Channel ID or URL').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('disable')
            .setDescription('Disable YouTube verification')
        )
        .addSubcommand(sub =>
          sub
            .setName('status')
            .setDescription('View YouTube verification configuration')
        )
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();

    switch (group) {
      case 'welcome': {
        // Map channel-set and channel-remove
        if (sub === 'channel-set') {
          interaction.options.getSubcommandGroup = () => 'channel';
          interaction.options.getSubcommand = () => 'set';
        } else if (sub === 'channel-remove') {
          interaction.options.getSubcommandGroup = () => 'channel';
          interaction.options.getSubcommand = () => 'remove';
        }
        return welcomeHandler.execute(interaction);
      }

      case 'autorole': {
        return autoroleHandler.execute(interaction);
      }

      case 'verification': {
        if (sub === 'start') {
          interaction.options.getSubcommand = () => 'setup';
        }
        return verificationHandler.execute(interaction);
      }

      case 'joinping': {
        return joinPingHandler.execute(interaction);
      }

      case 'ghostping': {
        if (sub === 'enable') {
          interaction.options.getSubcommand = () => 'setup';
        } else if (sub === 'reset') {
          interaction.options.getSubcommand = () => 'number-reset';
        }
        return ghostPingHandler.execute(interaction);
      }

      case 'jtc': {
        return jtcHandler.execute(interaction);
      }

      case 'autoresponse': {
        return autoresponseHandler.execute(interaction);
      }

      case 'ytverify': {
        return ytverifyHandler.execute(interaction);
      }

      default:
        return interaction.reply({ content: '❌ Unknown setup group.', flags: 64 });
    }
  }
};
