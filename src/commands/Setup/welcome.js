// src/commands/Welcome/welcome.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const welcomeStorage = require('../../utils/welcomeStorage');

function errorEmbed(title, desc) {
  return new EmbedBuilder().setTitle(title).setDescription(desc).setColor(0xED4245);
}
function infoEmbed(title, desc) {
  return new EmbedBuilder().setTitle(title).setDescription(desc).setColor(0x5865F2);
}

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
    .setName('welcome')
    .setDescription('Manage server welcome settings (channel + config)')
    .addSubcommandGroup(group =>
      group.setName('channel')
        .setDescription('Manage the welcome channel')
        .addSubcommand(sc =>
          sc.setName('set')
            .setDescription('Set the welcome channel')
            .addChannelOption(o => o.setName('channel').setDescription('Channel to send welcome messages in').setRequired(true))
        )
        .addSubcommand(sc =>
          sc.setName('remove')
            .setDescription('Remove/disable the welcome channel')
        )
    )
    .addSubcommand(sc =>
      sc.setName('config')
        .setDescription('View or change welcome configuration (Manage Server)')
        .addStringOption(o =>
          o.setName('template')
            .setDescription('Choose a welcome card template')
            .setRequired(false)
            .addChoices(...TEMPLATE_CHOICES)
        )
        .addStringOption(o => o.setName('message').setDescription('Welcome message. Use {user} {username} {guild} {count}').setRequired(false))
        .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable welcome messages').setRequired(false))
        .addBooleanOption(o => o.setName('dm').setDescription('Send welcome via DM instead of channel').setRequired(false))
    ),

  async execute(interaction) {
    let group = null;
    let sub = null;
    try { group = interaction.options.getSubcommandGroup(false); } catch {}
    try { sub = interaction.options.getSubcommand(); } catch {}

    const requireManageGuild = async () => {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        await interaction.reply({ embeds: [errorEmbed('Permission denied', 'You need the **Manage Server** permission to use this.')], flags: 64 });
        return false;
      }
      return true;
    };

    try {
      // CHANNEL.SET
      if (group === 'channel' && sub === 'set') {
        if (!(await requireManageGuild())) return;
        const channel = interaction.options.getChannel('channel', true);
        if (!channel.isTextBased?.()) {
          return interaction.reply({ embeds: [errorEmbed('Invalid channel', 'Please provide a text channel that can receive messages.')], flags: 64 });
        }

        await welcomeStorage.setWelcomeChannel(interaction.guild.id, channel.id);
        return interaction.reply({ embeds: [infoEmbed('Welcome channel set', `✅ Welcome messages will be sent to <#${channel.id}>.`)], flags: 64 });
      }

      // CHANNEL.REMOVE
      if (group === 'channel' && sub === 'remove') {
        if (!(await requireManageGuild())) return;
        await welcomeStorage.removeWelcomeChannel(interaction.guild.id);
        return interaction.reply({ embeds: [infoEmbed('Welcome disabled', '✅ Welcome channel removed and welcome messages disabled.')], flags: 64 });
      }

      // CONFIG (view or update)
      if (sub === 'config') {
        const templateChoice = interaction.options.getString('template'); // string '1'..'10'
        const message = interaction.options.getString('message');
        const enabled = interaction.options.getBoolean('enabled');
        const dm = interaction.options.getBoolean('dm');

        const updates = {};

        if (typeof templateChoice === 'string') {
          const tpl = parseInt(templateChoice, 10);
          if (!Number.isNaN(tpl) && tpl >= 1 && tpl <= TEMPLATE_CHOICES.length) {
            // write both keys to be compatible with multiple storage schemas
            updates.template = tpl;
            updates.templateIndex = tpl;
          }
        }
        if (typeof message === 'string') updates.message = message;
        if (typeof enabled === 'boolean') updates.enabled = enabled ? 1 : 0;
        if (typeof dm === 'boolean') updates.dm = dm ? 1 : 0;

        // If no updates, show current
        if (!Object.keys(updates).length) {
          const cur = await welcomeStorage.getSettings(interaction.guild.id) || {
            enabled: 0,
            channelId: null,
            template: null,
            dm: 0,
            message: null
          };

          const lines = [
            `Enabled: ${cur.enabled ? '✅' : '❌'}`,
            `Channel: ${cur.channelId ? `<#${cur.channelId}>` : 'Not set'}`,
            `Template: ${cur.template ?? cur.templateIndex ?? 'Not set'}`,
            `DM: ${cur.dm ? 'Yes' : 'No'}`,
            `Message: ${cur.message ?? 'Not set'}`
          ];
          return interaction.reply({ embeds: [infoEmbed('Welcome configuration', lines.join('\n'))], flags: 64 });
        }

        // updates require ManageGuild
        if (!(await requireManageGuild())) return;

        // Persist partial updates. Many storage functions accept partial objects.
        // We write both template and templateIndex (some storage/DBs use different keys).
        await welcomeStorage.setConfig(interaction.guild.id, updates);

        return interaction.reply({ embeds: [infoEmbed('Configuration updated', '✅ Welcome configuration updated successfully.')], flags: 64 });
      }

      return interaction.reply({ embeds: [errorEmbed('Unknown subcommand', 'Please use channel.set, channel.remove or config.')], flags: 64 });
    } catch (err) {
      console.error('[welcome command] error', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [errorEmbed('Internal error', 'An error occurred processing the welcome command.')], flags: 64 });
      } else {
        try { await interaction.editReply({ embeds: [errorEmbed('Internal error', 'An error occurred processing the welcome command.')] }); } catch {}
      }
    }
  }
};