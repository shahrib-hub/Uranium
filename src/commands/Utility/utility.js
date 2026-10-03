// src/commands/Utility/utility.js — Master Utility Category Hub
const {
  SlashCommandBuilder,
  ChannelType
} = require('discord.js');

const afkHandler = require('../../handlers/utility/afk');
const backupHandler = require('../../handlers/utility/backup');
const birthdayHandler = require('../../handlers/utility/birthday');
const countdownHandler = require('../../handlers/utility/countdown');
const countryHandler = require('../../handlers/utility/countries');
const customCommandHandler = require('../../handlers/utility/customcommand');
const embedBuilderHandler = require('../../handlers/utility/embedbuilder');
const pokedexHandler = require('../../handlers/utility/pokedex');
const stickyHandler = require('../../handlers/utility/stickymessages');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('utility')
    .setDescription('🛠️ Universal Productivity & Server Utilities')
    .setDMPermission(false)

    // 1. AFK GROUP
    .addSubcommandGroup(group =>
      group
        .setName('afk')
        .setDescription('Away From Keyboard status system')
        .addSubcommand(sub =>
          sub
            .setName('set')
            .setDescription('Set your AFK status with an optional note')
            .addStringOption(opt => opt.setName('reason').setDescription('AFK reason note').setRequired(false))
            .addBooleanOption(opt => opt.setName('hide').setDescription('Hide your AFK status from public pings').setRequired(false))
        )
        .addSubcommand(sub =>
          sub
            .setName('remove')
            .setDescription('Clear your current AFK status')
        )
        .addSubcommand(sub =>
          sub
            .setName('info')
            .setDescription("View a member's AFK status")
            .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('list')
            .setDescription('List all currently AFK members in this server')
        )
    )

    // 2. BIRTHDAY GROUP
    .addSubcommandGroup(group =>
      group
        .setName('birthday')
        .setDescription('Server birthday celebration and tracker')
        .addSubcommand(sub =>
          sub
            .setName('set')
            .setDescription('Set your birthday date')
            .addIntegerOption(opt => opt.setName('month').setDescription('Month (1-12)').setMinValue(1).setMaxValue(12).setRequired(true))
            .addIntegerOption(opt => opt.setName('day').setDescription('Day (1-31)').setMinValue(1).setMaxValue(31).setRequired(true))
            .addIntegerOption(opt => opt.setName('year').setDescription('Birth year (optional)').setMinValue(1900).setMaxValue(2026).setRequired(false))
        )
        .addSubcommand(sub =>
          sub
            .setName('view')
            .setDescription("View a member's birthday")
            .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(false))
        )
        .addSubcommand(sub =>
          sub
            .setName('list')
            .setDescription('Show upcoming birthdays in this server')
        )
        .addSubcommand(sub =>
          sub
            .setName('remove')
            .setDescription('Remove your stored birthday')
        )
    )

    // 3. COUNTDOWN GROUP
    .addSubcommandGroup(group =>
      group
        .setName('countdown')
        .setDescription('Live real-time event countdowns')
        .addSubcommand(sub =>
          sub
            .setName('holiday')
            .setDescription('Countdown to a major holiday')
            .addStringOption(opt =>
              opt
                .setName('name')
                .setDescription('Holiday name')
                .setRequired(true)
                .addChoices(
                  { name: 'New Year', value: 'newyear' },
                  { name: 'Christmas', value: 'christmas' },
                  { name: 'Halloween', value: 'halloween' },
                  { name: 'Thanksgiving', value: 'thanksgiving' },
                  { name: 'Valentine’s Day', value: 'valentines' },
                  { name: 'Easter', value: 'easter' },
                  { name: 'April Fools', value: 'aprilfools' }
                )
            )
        )
        .addSubcommand(sub =>
          sub
            .setName('custom')
            .setDescription('Countdown to a custom date')
            .addIntegerOption(opt => opt.setName('year').setDescription('Year (e.g. 2026)').setMinValue(2026).setMaxValue(2035).setRequired(true))
            .addIntegerOption(opt => opt.setName('month').setDescription('Month (1-12)').setMinValue(1).setMaxValue(12).setRequired(true))
            .addIntegerOption(opt => opt.setName('day').setDescription('Day (1-31)').setMinValue(1).setMaxValue(31).setRequired(true))
            .addStringOption(opt => opt.setName('title').setDescription('Event title (e.g. Server Anniversary)').setRequired(true))
        )
    )

    // 4. CUSTOM COMMAND GROUP
    .addSubcommandGroup(group =>
      group
        .setName('customcmd')
        .setDescription('Create and manage server-specific custom commands')
        .addSubcommand(sub =>
          sub
            .setName('create')
            .setDescription('Create a new custom command')
            .addStringOption(opt => opt.setName('name').setDescription('Command trigger name').setRequired(true))
            .addStringOption(opt => opt.setName('response').setDescription('Reply message ({user}, {server})').setRequired(true))
            .addStringOption(opt => opt.setName('prefix').setDescription('Prefix (default: !)').setRequired(false))
        )
        .addSubcommand(sub =>
          sub
            .setName('delete')
            .setDescription('Delete an existing custom command')
            .addStringOption(opt => opt.setName('name').setDescription('Command name').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('list')
            .setDescription('List all server custom commands')
        )
    )

    // 5. STICKY MESSAGES GROUP
    .addSubcommandGroup(group =>
      group
        .setName('sticky')
        .setDescription('Pin persistent messages to the bottom of channels')
        .addSubcommand(sub =>
          sub
            .setName('create')
            .setDescription('Create a sticky message in a channel')
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('Target text channel')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true)
            )
            .addStringOption(opt => opt.setName('content').setDescription('Message content').setRequired(true))
            .addBooleanOption(opt => opt.setName('embed').setDescription('Display as styled embed').setRequired(false))
        )
        .addSubcommand(sub =>
          sub
            .setName('remove')
            .setDescription('Remove a sticky message from a channel')
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('Target channel')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub
            .setName('list')
            .setDescription('List all active sticky messages')
        )
    )

    // 6. BACKUP GROUP
    .addSubcommandGroup(group =>
      group
        .setName('backup')
        .setDescription('Complete server snapshot backup and restore engine')
        .addSubcommand(sub =>
          sub
            .setName('create')
            .setDescription('Create a full backup snapshot of this server')
            .addStringOption(opt => opt.setName('name').setDescription('Backup label name').setRequired(false))
        )
        .addSubcommand(sub =>
          sub
            .setName('restore')
            .setDescription('Restore a previously saved server snapshot')
            .addStringOption(opt => opt.setName('backup_id').setDescription('Backup ID').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('list')
            .setDescription('List all available backups for this server')
        )
        .addSubcommand(sub =>
          sub
            .setName('delete')
            .setDescription('Delete a backup snapshot')
            .addStringOption(opt => opt.setName('backup_id').setDescription('Backup ID').setRequired(true))
        )
    )

    // 7. POKEDEX GROUP
    .addSubcommandGroup(group =>
      group
        .setName('pokedex')
        .setDescription('Pokémon encyclopedia database')
        .addSubcommand(sub =>
          sub
            .setName('search')
            .setDescription('Lookup detailed Pokémon stats and abilities')
            .addStringOption(opt => opt.setName('name').setDescription('Pokémon name or Pokédex number').setRequired(true))
        )
    )

    // 8. COUNTRY GROUP
    .addSubcommandGroup(group =>
      group
        .setName('country')
        .setDescription('World geography and country facts')
        .addSubcommand(sub =>
          sub
            .setName('view')
            .setDescription('Lookup country statistics, flag, and currency')
            .addStringOption(opt => opt.setName('name').setDescription('Country name').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('set')
            .setDescription('Set your nationality profile badge')
            .addStringOption(opt => opt.setName('country').setDescription('Your country').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('list')
            .setDescription('List member nationalities in this server')
        )
    )

    // 9. EMBED BUILDER GROUP
    .addSubcommandGroup(group =>
      group
        .setName('embed')
        .setDescription('Interactive visual embed message builder')
        .addSubcommand(sub =>
          sub
            .setName('create')
            .setDescription('Start the interactive Discord embed builder')
        )
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();

    switch (group) {
      case 'afk': {
        return afkHandler.execute(interaction);
      }

      case 'birthday': {
        return birthdayHandler.execute(interaction);
      }

      case 'countdown': {
        if (sub === 'holiday') {
          const holidayName = interaction.options.getString('name');
          interaction.options.getSubcommand = () => holidayName;
        } else if (sub === 'custom') {
          interaction.options.getSubcommand = () => 'date';
        }
        return countdownHandler.execute(interaction);
      }

      case 'customcmd': {
        return customCommandHandler.execute(interaction);
      }

      case 'sticky': {
        return stickyHandler.execute(interaction);
      }

      case 'backup': {
        return backupHandler.execute(interaction);
      }

      case 'pokedex': {
        interaction.options.getSubcommand = () => 'pokemon';
        interaction.options.getString = (opt) => opt === 'pokemon' ? interaction.options.getString('name') : null;
        return pokedexHandler.execute(interaction);
      }

      case 'country': {
        return countryHandler.execute(interaction);
      }

      case 'embed': {
        interaction.options.getSubcommand = () => 'create';
        return embedBuilderHandler.execute(interaction);
      }

      default:
        return interaction.reply({ content: '❌ Unknown utility group.', flags: 64 });
    }
  }
};
