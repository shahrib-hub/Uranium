// src/buttons/privacyButtons.js
// Handler for data deletion confirmation buttons (/privacy delete-my-data & /privacy delete-server-data)

const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { deleteUserData, deleteGuildData } = require('../utils/userDataManager');

module.exports = async function handlePrivacyButton(interaction) {
  const id = interaction.customId;

  // ──────────────────────────────────────────
  // USER DATA DELETION
  // ──────────────────────────────────────────
  if (id.startsWith('privacy_delete_user_')) {
    const parts = id.split('_'); // ['privacy', 'delete', 'user', 'confirm'/'cancel', '<userId>']
    const action = parts[3];
    const targetUserId = parts[4];

    if (interaction.user.id !== targetUserId) {
      return interaction.reply({
        content: '❌ You cannot interact with another user’s data deletion prompt.',
        flags: 64
      });
    }

    if (action === 'cancel') {
      const cancelEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Data Deletion Cancelled')
        .setDescription('Your stored data remains intact and unchanged.')
        .setTimestamp();

      return interaction.update({ embeds: [cancelEmbed], components: [] });
    }

    if (action === 'confirm') {
      await interaction.deferUpdate();

      try {
        const result = await deleteUserData(targetUserId);

        const successEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Data Successfully Purged')
          .setDescription(
            `All personal records associated with your User ID have been permanently deleted from our databases in compliance with the **Discord Developer Policy** and global privacy standards.\n\n` +
            `• Records removed: **${result.recordsDeleted}**\n` +
            `• Economy, Rank, AFK, Birthdays, and Playlists have been reset.`
          )
          .setFooter({ text: 'Right to erasure honored • Uranium Bot' })
          .setTimestamp();

        return interaction.editReply({ embeds: [successEmbed], components: [] });
      } catch (err) {
        console.error('[privacyButtons] Error executing user data deletion:', err);
        return interaction.editReply({
          content: '❌ An error occurred while processing your deletion request. Please contact support.',
          embeds: [],
          components: []
        });
      }
    }
  }

  // ──────────────────────────────────────────
  // GUILD DATA DELETION
  // ──────────────────────────────────────────
  if (id.startsWith('privacy_delete_guild_')) {
    const parts = id.split('_'); // ['privacy', 'delete', 'guild', 'confirm'/'cancel', '<userId>', '<guildId>']
    const action = parts[3];
    const targetUserId = parts[4];
    const guildId = parts[5];

    if (interaction.user.id !== targetUserId) {
      return interaction.reply({
        content: '❌ Only the administrator who initiated this request can confirm it.',
        flags: 64
      });
    }

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '❌ You must have Administrator permissions to perform this action.',
        flags: 64
      });
    }

    if (action === 'cancel') {
      const cancelEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Server Data Wipe Cancelled')
        .setDescription('All server settings and configurations remain safe.')
        .setTimestamp();

      return interaction.update({ embeds: [cancelEmbed], components: [] });
    }

    if (action === 'confirm') {
      await interaction.deferUpdate();

      try {
        const result = await deleteGuildData(guildId);

        const successEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Server Configuration Purged')
          .setDescription(
            `All stored settings, logs, automod rules, tickets, and backups for **${interaction.guild.name}** have been permanently deleted.\n\n` +
            `• Configuration records removed: **${result.recordsDeleted}**\n` +
            `• All features reset to default settings.`
          )
          .setFooter({ text: 'Server data wipe complete • Uranium Bot' })
          .setTimestamp();

        return interaction.editReply({ embeds: [successEmbed], components: [] });
      } catch (err) {
        console.error('[privacyButtons] Error executing guild data deletion:', err);
        return interaction.editReply({
          content: '❌ An error occurred while wiping server data. Please contact support.',
          embeds: [],
          components: []
        });
      }
    }
  }
};
