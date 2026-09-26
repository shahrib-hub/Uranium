// src/commands/Information/privacy.js
// Compliance with Discord Developer Policy Section 1 & 2 (Privacy Policy, Terms of Service, and Data Deletion)

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('privacy')
    .setDescription('🔒 Privacy Policy, Terms of Service, and User Data Management')
    .addSubcommand(sub =>
      sub
        .setName('policy')
        .setDescription('📜 View our Privacy Policy, data handling practices, and Terms of Service')
    )
    .addSubcommand(sub =>
      sub
        .setName('delete-my-data')
        .setDescription('🗑️ Permanently delete all your personal data stored by Uranium Bot')
    )
    .addSubcommand(sub =>
      sub
        .setName('delete-server-data')
        .setDescription('⚠️ (Admin Only) Permanently delete all server settings and configurations')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const cleanUrl = (process.env.DASHBOARD_URL || 'https://uraniumbot.vercel.app').replace(/\/+$/, '');
    const privacyUrl = `${cleanUrl}/privacy`;
    const tosUrl = `${cleanUrl}/tos`;
    const supportUrl = process.env.SUPPORT_SERVER_URL || 'https://discord.gg/26ThFyckFX';

    // ──────────────────────────────────────────
    // 1. SUBCOMMAND: POLICY
    // ──────────────────────────────────────────
    if (sub === 'policy') {
      const embed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('🔒 Uranium Bot — Privacy & Data Protection')
        .setDescription(
          'Uranium Bot operates under strict adherence to the **Discord Developer Terms of Service** and **Discord Developer Policy**.\n' +
          'We practice data minimization and respect your privacy rights (including GDPR and CCPA compliance).'
        )
        .addFields(
          {
            name: '📊 What Data We Collect',
            value: [
              '• **Discord Identifiers:** User IDs, Server IDs, Channel IDs, Role IDs strictly required for core operations.',
              '• **Server Configurations:** Moderation rules, automod keywords, reaction roles, music preferences.',
              '• **Feature Data:** Economy balance, ranking/XP levels, AFK status, and birthdays you choose to set.',
              '• **Zero Sensitive Data:** We never collect, request, or store passwords, payment info, or real-life identities.'
            ].join('\n')
          },
          {
            name: '💬 Message Content Intent Notice',
            value: [
              '• Message content is processed **in real-time** solely for active chat features (AutoMod filtering, custom commands, AFK mentions, ranking XP).',
              '• We **never** store user message history permanently across servers or harvest chat logs.'
            ].join('\n')
          },
          {
            name: '🛡️ No Selling or Advertising',
            value: 'We **never** sell, license, or monetize your data with third parties, ad networks, or data brokers.'
          },
          {
            name: '🗑️ Your Right to Deletion',
            value: [
              'You can permanently delete all your stored personal data at any time using: `/privacy delete-my-data`.',
              'Server Administrators can purge guild configurations with: `/privacy delete-server-data`.'
            ].join('\n')
          }
        )
        .setFooter({ text: 'Uranium Bot • Privacy & Compliance' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Privacy Policy')
          .setStyle(ButtonStyle.Link)
          .setURL(privacyUrl)
          .setEmoji('📜'),
        new ButtonBuilder()
          .setLabel('Terms of Service')
          .setStyle(ButtonStyle.Link)
          .setURL(tosUrl)
          .setEmoji('⚖️'),
        new ButtonBuilder()
          .setLabel('Support Server')
          .setStyle(ButtonStyle.Link)
          .setURL(supportUrl)
          .setEmoji('🛠️')
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // ──────────────────────────────────────────
    // 2. SUBCOMMAND: DELETE-MY-DATA
    // ──────────────────────────────────────────
    if (sub === 'delete-my-data') {
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('⚠️ Delete Your Personal Data?')
        .setDescription(
          `Hey <@${interaction.user.id}>, are you sure you want to permanently delete all your personal data stored by Uranium Bot?\n\n` +
          '**The following data will be permanently wiped:**\n' +
          '• Economy profile, wallet, bank balance, inventory, and stats\n' +
          '• Ranking levels, XP, and badges\n' +
          '• Stored AFK status and mention logs\n' +
          '• Birthday records\n' +
          '• Social and family profile data\n' +
          '• Saved custom playlists\n\n' +
          '⚠️ *This action is irreversible and complies with your Right to Erasure.*'
        )
        .setFooter({ text: 'Click below to confirm or cancel' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`privacy_delete_user_confirm_${interaction.user.id}`)
          .setLabel('Confirm Deletion')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️'),
        new ButtonBuilder()
          .setCustomId(`privacy_delete_user_cancel_${interaction.user.id}`)
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('❌')
      );

      return interaction.reply({
        embeds: [confirmEmbed],
        components: [row],
        flags: 64 // Ephemeral: private to the user
      });
    }

    // ──────────────────────────────────────────
    // 3. SUBCOMMAND: DELETE-SERVER-DATA
    // ──────────────────────────────────────────
    if (sub === 'delete-server-data') {
      if (!interaction.guild) {
        return interaction.reply({ content: '❌ This command can only be used inside a server.', flags: 64 });
      }

      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: '❌ You need **Administrator** permissions to delete server configurations.',
          flags: 64
        });
      }

      const confirmEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('⚠️ Delete All Server Configurations?')
        .setDescription(
          `**Server:** \`${interaction.guild.name}\`\n\n` +
          'Are you sure you want to permanently delete **all configurations, automod settings, reaction roles, tickets, antinuke settings, logs, and backups** for this server?\n\n' +
          '⚠️ *This action is irreversible. The bot will reset all settings to defaults for this guild.*'
        )
        .setFooter({ text: 'Administrator confirmation required' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`privacy_delete_guild_confirm_${interaction.user.id}_${interaction.guild.id}`)
          .setLabel('Confirm Server Wipe')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('⚠️'),
        new ButtonBuilder()
          .setCustomId(`privacy_delete_guild_cancel_${interaction.user.id}_${interaction.guild.id}`)
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('❌')
      );

      return interaction.reply({
        embeds: [confirmEmbed],
        components: [row],
        flags: 64
      });
    }
  }
};
