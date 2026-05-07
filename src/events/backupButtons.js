const { Events } = require('discord.js');
const backupButtons = require('../buttons/backupButtons');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (!interaction.isButton()) return;

      const id = interaction.customId;

      if (
        id.startsWith('backup_restore_confirm:') ||
        id.startsWith('backup_restore_cancel:') ||
        id.startsWith('backup_delete_confirm:') ||
        id.startsWith('backup_delete_cancel:')
      ) {
        return backupButtons(interaction);
      }

    } catch (err) {
      console.error('❌ Backup interaction error:', err);
    }
  }
};
