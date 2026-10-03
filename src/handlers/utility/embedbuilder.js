const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');

const {
  getTemplateNames,
  getTemplateByName,
  deleteTemplate
} = require('../../utils/embedTemplates');

const {
  createSession,
  updateEmbed
} = require('../../components/embedbuilder/builderSession');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embedbuilder')
    .setDescription('🎨 Create and manage custom embed messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Launch the Embed Builder Wizard')
    )
    .addSubcommandGroup(group =>
      group.setName('template')
        .setDescription('Manage your saved embed templates')
        .addSubcommand(sub =>
          sub.setName('load')
            .setDescription('Load a saved embed template')
            .addStringOption(opt =>
              opt.setName('name')
                .setDescription('Name of the template to load')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(sub =>
          sub.setName('list')
            .setDescription('List all saved templates')
        )
        .addSubcommand(sub =>
          sub.setName('delete')
            .setDescription('Delete a saved template')
            .addStringOption(opt =>
              opt.setName('name')
                .setDescription('Name of the template to delete')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const guildId = interaction.guild.id;
    const { getTemplateNames } = require('../../utils/embedTemplates');
    try {
      const names = await getTemplateNames(guildId);
      const filtered = names.filter(n => n.toLowerCase().includes(focusedValue.toLowerCase()));
      await interaction.respond(
        filtered.slice(0, 25).map(choice => ({ name: choice, value: choice }))
      );
    } catch (err) {
      console.error(err);
    }
  },

  async execute(interaction) {
    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // Permission check
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const errorEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🚫 Permission Denied')
        .setDescription('You need the **Manage Server** permission to use the Embed Builder.');
      return interaction.reply({ embeds: [errorEmbed], flags: 64 });
    }

    // Handle /embedbuilder template subcommands
    if (subcommandGroup === 'template') {
      if (sub === 'list') {
        const names = await getTemplateNames(guildId);
        const embed = new EmbedBuilder()
          .setColor('Blurple')
          .setTitle('📦 Saved Templates')
          .setDescription(
            names.length
              ? names.map((n, i) => `\`${i + 1}.\` ${n}`).join('\n')
              : 'No templates saved yet.'
          );
          
        if (!names.length) {
          return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const { StringSelectMenuBuilder } = require('discord.js');
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('load_embed_template')
          .setPlaceholder('Select a template to load...')
          .addOptions(
            names.map(n => ({
              label: n.slice(0, 100), // Max label length is 100
              description: `Load template: ${n.slice(0, 80)}`,
              value: n.slice(0, 100)
            }))
          );

        const row = new ActionRowBuilder().addComponents(selectMenu);
        return interaction.reply({ embeds: [embed], components: [row] }); // Not ephemeral so it can be edited
      }

      if (sub === 'load') {
        const name = interaction.options.getString('name');
        const data = await getTemplateByName(guildId, name);
        if (!data) {
          return interaction.reply({
            flags: 64,
            content: `❌ No template found with the name **${name}**.`
          });
        }

        const session = createSession(userId);
        session.embed = EmbedBuilder.from(JSON.parse(data));
        updateEmbed(session);

        const { getBuilderRows } = require('../../buttons/embedbuttons.js');
        const rows = getBuilderRows();

        return interaction.reply({
          content: `🧱 **Embed Builder Active (8 minutes)** - Loaded: \`${name}\``,
          embeds: [session.embed],
          components: rows
        });
      }

      if (sub === 'delete') {
        const name = interaction.options.getString('name');
        const success = await deleteTemplate(guildId, name);
        return interaction.reply({
          flags: 64,
          content: success
            ? `🗑️ Template **${name}** deleted.`
            : `❌ No template found with the name **${name}**.`
        });
      }
    }

    // Handle /embedbuilder create
    if (sub === 'create') {
      const guideEmbed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('🎨 Welcome to MULTi-Bot Embed Building Wizard')
        .setDescription([
          'This wizard helps you build a custom Discord embed step by step.',
          '',
          '**Editable Fields:**',
          '• **Title** – Main heading of the embed',
          '• **Description** – Body text of the embed',
          '• **Color** – Named (`red`, `green`, `random`, etc.) or hex (`#ff0000`)',
          '• **Author** – Small header above the title',
          '• **Footer** – Text at the bottom of the embed',
          '• **Thumbnail** – Small image (URL or upload)',
          '• **Image** – Large image (URL or upload)',
          '• **Fields** – Name/value pairs (inline or block)',
          '• **Timestamp** – Adds current time to the footer',
          '',
          'You’ll be able to preview your embed live and send it to any channel.',
          '',
          'Click **Start Embed Builder** to begin!'
        ].join('\n'))
        .setFooter({ text: 'Only users with Manage Server permission can use this tool.' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('start_embed_builder')
          .setLabel('🚀 Start Embed Builder')
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        embeds: [guideEmbed],
        components: [row]
      });
    }
  }
};
