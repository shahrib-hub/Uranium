// src/commands/Moderation/automod.js
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const AutomodStorage = require('../../utils/automodStorage');

function requireManageGuild(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
    interaction.reply({ content: 'You need the **Manage Server** permission to configure automod!', flags: 64 });
    return false;
  }
  return true;
}

function makeStatusEmbed(cfg) {
  return new EmbedBuilder()
    .setTitle('Automod Configuration')
    .setColor(0x5865F2)
    .setDescription('Current automod configuration summary')
    .addFields(
      { name: 'Anti-Spam', value: cfg.AntiSpam?.enabled ? `✅ ${cfg.AntiSpam.maxMessages}/${cfg.AntiSpam.timeWindow}s → ${cfg.AntiSpam.action}` : '❌', inline: true },
      { name: 'Anti-Link', value: cfg.AntiLink?.enabled ? `✅ → ${cfg.AntiLink.action}` : '❌', inline: true },
      { name: 'Anti-Caps', value: cfg.AntiCaps?.enabled ? `✅ ${cfg.AntiCaps.percentage}% → ${cfg.AntiCaps.action}` : '❌', inline: true },
      { name: 'Anti-Invite', value: cfg.AntiInvite?.enabled ? `✅ → ${cfg.AntiInvite.action}` : '❌', inline: true },
      { name: 'Anti-Mention', value: cfg.AntiMentionSpam?.enabled ? `✅ ${cfg.AntiMentionSpam.maxMentions} → ${cfg.AntiMentionSpam.action}` : '❌', inline: true },
      { name: 'Banned Words', value: cfg.BannedWords?.enabled ? `✅ ${cfg.BannedWords.words.length} words` : '❌', inline: true },
      { name: 'Anti-Raid', value: cfg.AntiRaid?.enabled ? `✅ ${cfg.AntiRaid.joinThreshold}/${cfg.AntiRaid.timeWindow}s → ${cfg.AntiRaid.action}` : '❌', inline: true },
      { name: 'Ignored Channels', value: `${(cfg.IgnoredChannels || []).length}`, inline: true },
      { name: 'Ignored Roles', value: `${(cfg.IgnoredRoles || []).length}`, inline: true }
    );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure automod settings')
    .setDMPermission(false)

    .addSubcommand(sc => sc.setName('anti-spam').setDescription('Configure anti-spam')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
      .addIntegerOption(o => o.setName('max-messages').setDescription('Max messages in window').setMinValue(1))
      .addIntegerOption(o => o.setName('time-window').setDescription('Window seconds').setMinValue(1))
      .addStringOption(o => o.setName('action').setDescription('delete|timeout|kick|ban|warn'))
    )

    .addSubcommand(sc => sc.setName('anti-link').setDescription('Configure anti-link')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
      .addStringOption(o => o.setName('action').setDescription('delete|timeout|warn'))
    )

    .addSubcommand(sc => sc.setName('anti-caps').setDescription('Configure anti-caps')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
      .addIntegerOption(o => o.setName('percentage').setDescription('Caps% threshold').setMinValue(50).setMaxValue(100))
      .addStringOption(o => o.setName('action').setDescription('delete|warn'))
    )

    .addSubcommand(sc => sc.setName('anti-invite').setDescription('Configure anti-invite')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
      .addStringOption(o => o.setName('action').setDescription('delete|warn|timeout'))
    )

    .addSubcommand(sc => sc.setName('anti-mention-spam').setDescription('Configure mention spam')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
      .addIntegerOption(o => o.setName('max-mentions').setDescription('Max mentions allowed').setMinValue(1))
      .addStringOption(o => o.setName('action').setDescription('delete|timeout|kick'))
    )

    .addSubcommand(sc => sc.setName('banned-words').setDescription('Configure banned words')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
      .addStringOption(o => o.setName('words').setDescription('Comma separated words').setRequired(false))
      .addStringOption(o => o.setName('action').setDescription('delete|warn'))
    )

    .addSubcommand(sc => sc.setName('anti-raid').setDescription('Configure anti-raid')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
      .addIntegerOption(o => o.setName('join-threshold').setDescription('Number of joins to trigger').setMinValue(2))
      .addIntegerOption(o => o.setName('time-window').setDescription('Seconds window').setMinValue(1))
      .addStringOption(o => o.setName('action').setDescription('kick|ban'))
    )

    .addSubcommand(sc => sc.setName('ignore-channel').setDescription('Add/remove ignored channel')
      .addStringOption(o => o.setName('action').setDescription('add|remove').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Target channel').setRequired(true))
    )

    .addSubcommand(sc => sc.setName('ignore-role').setDescription('Add/remove ignored role')
      .addStringOption(o => o.setName('action').setDescription('add|remove').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Target role').setRequired(true))
    )

    .addSubcommand(sc => sc.setName('whitelist-domain').setDescription('Add/remove whitelisted domain')
      .addStringOption(o => o.setName('action').setDescription('add|remove').setRequired(true))
      .addStringOption(o => o.setName('domain').setDescription('Domain (example.com)').setRequired(true))
    )

    .addSubcommand(sc => sc.setName('status').setDescription('Show current automod status'))
  ,

  async execute(interaction) {
    if (!requireManageGuild(interaction)) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const cfg = await AutomodStorage.getConfig(guildId);

    try {
      switch (sub) {
        case 'anti-spam': {
          const enabled = interaction.options.getBoolean('enabled');
          const maxMessages = interaction.options.getInteger('max-messages') ?? cfg.AntiSpam.maxMessages;
          const timeWindow = interaction.options.getInteger('time-window') ?? cfg.AntiSpam.timeWindow;
          const action = interaction.options.getString('action') ?? cfg.AntiSpam.action;
          cfg.AntiSpam = { enabled, maxMessages, timeWindow, action };
          await AutomodStorage.setConfig(guildId, cfg);
          return interaction.reply({ content: 'Anti-spam updated.', flags: 64 });
        }

        case 'anti-link': {
          const enabled = interaction.options.getBoolean('enabled');
          const action = interaction.options.getString('action') ?? cfg.AntiLink.action;
          cfg.AntiLink.enabled = enabled;
          cfg.AntiLink.action = action;
          await AutomodStorage.setConfig(guildId, cfg);
          return interaction.reply({ content: 'Anti-link updated.', flags: 64 });
        }

        case 'anti-caps': {
          const enabled = interaction.options.getBoolean('enabled');
          const percentage = interaction.options.getInteger('percentage') ?? cfg.AntiCaps.percentage;
          const action = interaction.options.getString('action') ?? cfg.AntiCaps.action;
          cfg.AntiCaps = { enabled, percentage, action };
          await AutomodStorage.setConfig(guildId, cfg);
          return interaction.reply({ content: 'Anti-caps updated.', flags: 64 });
        }

        case 'anti-invite': {
          const enabled = interaction.options.getBoolean('enabled');
          const action = interaction.options.getString('action') ?? cfg.AntiInvite.action;
          cfg.AntiInvite = { enabled, action };
          await AutomodStorage.setConfig(guildId, cfg);
          return interaction.reply({ content: 'Anti-invite updated.', flags: 64 });
        }

        case 'anti-mention-spam': {
          const enabled = interaction.options.getBoolean('enabled');
          const maxMentions = interaction.options.getInteger('max-mentions') ?? cfg.AntiMentionSpam.maxMentions;
          const action = interaction.options.getString('action') ?? cfg.AntiMentionSpam.action;
          cfg.AntiMentionSpam = { enabled, maxMentions, action };
          await AutomodStorage.setConfig(guildId, cfg);
          return interaction.reply({ content: 'Anti-mention spam updated.', flags: 64 });
        }

        case 'banned-words': {
          const enabled = interaction.options.getBoolean('enabled');
          const wordsInput = interaction.options.getString('words');
          cfg.BannedWords = cfg.BannedWords || { enabled: false, words: [], action: 'delete' };
          cfg.BannedWords.enabled = enabled;
          if (wordsInput) {
            cfg.BannedWords.words = wordsInput.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
          }
          const action = interaction.options.getString('action') ?? cfg.BannedWords.action;
          cfg.BannedWords.action = action;
          await AutomodStorage.setConfig(guildId, cfg);
          return interaction.reply({ content: 'Banned words updated.', flags: 64 });
        }

        case 'anti-raid': {
          const enabled = interaction.options.getBoolean('enabled');
          const joinThreshold = interaction.options.getInteger('join-threshold') ?? cfg.AntiRaid.joinThreshold;
          const timeWindow = interaction.options.getInteger('time-window') ?? cfg.AntiRaid.timeWindow;
          const action = interaction.options.getString('action') ?? cfg.AntiRaid.action;
          cfg.AntiRaid = { enabled, joinThreshold, timeWindow, action };
          await AutomodStorage.setConfig(guildId, cfg);
          return interaction.reply({ content: 'Anti-raid updated.', flags: 64 });
        }

        case 'ignore-channel': {
          const act = interaction.options.getString('action');
          const ch = interaction.options.getChannel('channel');
          cfg.IgnoredChannels = cfg.IgnoredChannels || [];
          const id = String(ch.id);
          if (act === 'add') {
            if (!cfg.IgnoredChannels.includes(id)) cfg.IgnoredChannels.push(id);
            await AutomodStorage.setConfig(guildId, cfg);
            return interaction.reply({ content: `Added ${ch} to ignored channels.`, flags: 64 });
          } else {
            cfg.IgnoredChannels = cfg.IgnoredChannels.filter(x => x !== id);
            await AutomodStorage.setConfig(guildId, cfg);
            return interaction.reply({ content: `Removed ${ch} from ignored channels.`, flags: 64 });
          }
        }

        case 'ignore-role': {
          const act = interaction.options.getString('action');
          const role = interaction.options.getRole('role');
          cfg.IgnoredRoles = cfg.IgnoredRoles || [];
          const id = String(role.id);
          if (act === 'add') {
            if (!cfg.IgnoredRoles.includes(id)) cfg.IgnoredRoles.push(id);
            await AutomodStorage.setConfig(guildId, cfg);
            return interaction.reply({ content: `Added ${role} to ignored roles.`, flags: 64 });
          } else {
            cfg.IgnoredRoles = cfg.IgnoredRoles.filter(x => x !== id);
            await AutomodStorage.setConfig(guildId, cfg);
            return interaction.reply({ content: `Removed ${role} from ignored roles.`, flags: 64 });
          }
        }

        case 'whitelist-domain': {
          const act = interaction.options.getString('action');
          const domain = interaction.options.getString('domain').toLowerCase().trim();
          cfg.AntiLink.whitelistedDomains = cfg.AntiLink.whitelistedDomains || [];
          if (act === 'add') {
            if (!cfg.AntiLink.whitelistedDomains.includes(domain)) cfg.AntiLink.whitelistedDomains.push(domain);
            await AutomodStorage.setConfig(guildId, cfg);
            return interaction.reply({ content: `Added \`${domain}\` to whitelist.`, flags: 64 });
          } else {
            cfg.AntiLink.whitelistedDomains = cfg.AntiLink.whitelistedDomains.filter(d => d !== domain);
            await AutomodStorage.setConfig(guildId, cfg);
            return interaction.reply({ content: `Removed \`${domain}\` from whitelist.`, flags: 64 });
          }
        }

        case 'status': {
          const embed = makeStatusEmbed(cfg);
          return interaction.reply({ embeds: [embed], flags: 64 });
        }

        default:
          return interaction.reply({ content: 'Unknown subcommand', flags: 64 });
      }
    } catch (err) {
      console.error('[automod command] error', err);
      return interaction.reply({ content: 'Failed to update automod configuration.', flags: 64 });
    }
  }
};