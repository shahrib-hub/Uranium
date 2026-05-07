// src/events/interactionCreate.js
const { Events } = require('discord.js');
const path = require('path');
const fs = require('fs');

/**
 * Safely execute an async handler, swallowing DiscordAPIError 10062 (Unknown interaction).
 * This error means the interaction token expired (3s deadline) — always harmless.
 */
async function safeExecute(fn) {
  try {
    await fn();
  } catch (err) {
    if (err?.code === 10062) return; // expired interaction — ignore
    throw err; // re-throw anything else for the outer catch
  }
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Debug: Check if interaction is already acknowledged (for troubleshooting "Already acknowledged" errors)
    if (interaction.replied || interaction.deferred) {
      console.warn(`[interactionCreate] ⚠️ Interaction ${interaction.id} already acknowledged BEFORE handler start.`);
      return;
    }

    try {
      // -----------------------------
      // Slash Commands
      // -----------------------------
      if (interaction.isChatInputCommand && interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        try {
          await command.execute(interaction);
        } catch (err) {
          if (err?.code === 10062) return;
          console.error('[interactionCreate] command error:', err);

          try {
            if (!interaction.isRepliable()) return;

            const errorMsg = '❌ There was an error executing this command.';
            if (interaction.replied || interaction.deferred) {
              await interaction.followUp({ content: errorMsg, flags: 64 });
            } else {
              await interaction.reply({ content: errorMsg, flags: 64 });
            }
          } catch (_) { }
        }
        return;
      }

      // -----------------------------
      // Autocomplete
      // -----------------------------
      if (interaction.isAutocomplete && interaction.isAutocomplete()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (command?.autocomplete) {
          try {
            await command.autocomplete(interaction);
          } catch (err) {
            if (err?.code !== 10062) console.error(`[interactionCreate] autocomplete error:`, err);
          }
        }
        return;
      }

      // -----------------------------
      // Select Menus
      if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
        const sid = interaction.customId || '';

        if (sid.startsWith('help_select_')) {
          await safeExecute(async () => {
            const handler = require('../buttons/helphandler.js');
            await handler(interaction);
          });
        }

        if (sid === 'load_embed_template') {
          await safeExecute(async () => {
            const handler = require('../buttons/embedbuttons.js');
            await handler.execute(interaction);
          });
        }

        if (sid === 'premium_help_nav') {
          await safeExecute(async () => {
            const handler = require('../buttons/premiumhandler.js');
            await handler(interaction);
          });
        }

        if (sid === 'music_help_nav') {
          await safeExecute(async () => {
            const handler = require('../buttons/music_help_handler.js');
            await handler(interaction);
          });
        }



        if (sid?.startsWith('music_filter_select:')) {
          await safeExecute(async () => {
            const handler = require('../buttons/music_controls.js');
            await handler(interaction);
          });
        }

        return;
      }

      // -----------------------------
      // Buttons
      // -----------------------------
      if (interaction.isButton && interaction.isButton()) {
        const id = interaction.customId;

        // 🚫 Ignore buttons handled by collectors inside commands
        if (
          id === 'guild_next' ||
          id === 'guild_prev' ||
          id === 'confirm_autoresponse' ||
          id === 'cancel_autoresponse' ||
          id === 'confirm_code' ||
          id === 'cancel_code' ||
          id === 'confirm_reset' ||
          id === 'cancel_reset' ||
          id === 'confirm_verify_setup' ||
          id?.startsWith('calc_') ||
          id?.startsWith('music_search_') ||
          id?.startsWith('music_queue_')
        ) {
          return;
        }

        // Economy buttons
        if (id?.startsWith('eco:')) {
          return;
        }

        // Help buttons
        if (id?.startsWith('help_')) {
          await safeExecute(async () => {
            const handler = require('../buttons/helphandler.js');
            await handler(interaction);
          });
          return;
        }

        // Ticket system buttons
        if (id === 'ticket_create' || id?.startsWith('ticket_')) {
          await safeExecute(async () => {
            const handler = require('../buttons/ticketButtons.js');
            await handler(interaction);
          });
          return;
        }

        // AI regenerate
        if (id?.startsWith('ai_regen_')) {
          await safeExecute(async () => {
            const handler = require('../buttons/ai_regenerate.js');
            await handler(interaction);
          });
          return;
        }

        // Reaction Roles
        if (id?.startsWith('rr_btn:')) {
          await safeExecute(async () => {
            const handler = require('../buttons/rr_button.js');
            await handler(interaction);
          });
          return;
        }

        // Embed Builder
        const embedBuilderButtons = [
          'start_embed_builder', 'edit_title', 'edit_description', 'edit_color', 'edit_author', 'edit_footer',
          'edit_thumbnail', 'edit_image', 'add_field', 'remove_field', 'toggle_timestamp', 'ai_assist',
          'save_template', 'send_embed', 'cancel_builder'
        ];
        if (embedBuilderButtons.includes(id)) {
          await safeExecute(async () => {
            const handler = require('../buttons/embedbuttons.js');
            await handler.execute(interaction);
          });
          return;
        }

        // Giveaways
        if (
          id?.startsWith('giveaway_confirm_') ||
          id?.startsWith('giveaway_cancel_') ||
          id?.startsWith('giveaway_enter_')
        ) {
          await safeExecute(async () => {
            const handler = require('../buttons/giveawayButtons.js');
            await handler(interaction);
          });
          return;
        }



        // Music controls (legacy per-track message)
        if (id?.startsWith('music_ctrl:')) {
          await safeExecute(async () => {
            const handler = require('../buttons/music_controls.js');
            await handler(interaction);
          });
          return;
        }

        // Info Buttons
        if (id?.startsWith('info_emoji_')) {
          await safeExecute(async () => {
            const handler = require('../buttons/info_buttons.js');
            await handler(interaction);
          });
          return;
        }

        // Backup ignored buttons
        if (
          id?.startsWith('backup_restore_confirm:') ||
          id?.startsWith('backup_restore_cancel:') ||
          id?.startsWith('backup_delete_confirm:') ||
          id?.startsWith('backup_delete_cancel:')
        ) {
          return;
        }

        // Dynamic button fallback
        const buttonPath = path.resolve(__dirname, '..', 'buttons', `${id}.js`);
        if (fs.existsSync(buttonPath)) {
          await safeExecute(async () => {
            const handler = require(buttonPath);
            await handler(interaction);
          });
          return;
        }

        // Final fallback
        if (interaction.isRepliable && !interaction.replied) {
          await interaction.reply({ content: `Unhandled button interaction: ${id}`, flags: 64 }).catch(() => { });
        }

        return;
      }

      // -----------------------------
      // Modal Submissions
      // -----------------------------
      if (interaction.isModalSubmit && interaction.isModalSubmit()) {
        const id = interaction.customId;

        // Ticket modals
        if (id?.startsWith('ticket_create_modal:')) {
          await safeExecute(async () => {
            const handler = require('../buttons/ticketButtons.js');
            await handler(interaction);
          });
          return;
        }

        // Dynamic modals folder
        const modalPath = path.resolve(__dirname, '..', 'modals', `${id}.js`);
        if (fs.existsSync(modalPath)) {
          await safeExecute(async () => {
            const handler = require(modalPath);
            await handler(interaction);
          });
          return;
        }

        // Unhandled
        if (interaction.isRepliable && !interaction.replied) {
          await interaction.reply({ content: 'Unhandled modal submission.', flags: 64 }).catch(() => { });
        }

        return;
      }

      // -----------------------------
      // Generic fallback (only if this file was supposed to handle it)
      // -----------------------------
      // Removed generic fallback to prevent conflict with other interactionCreate handlers (Economy, Backup, etc.)
      // Interactions will be handled by their respective files.

    } catch (error) {
      if (error?.code === 10062) return; // expired interaction — ignore globally
      console.error('[interactionCreate] fatal handler error:', error);
      try {
        if (interaction.isRepliable && !interaction.replied) {
          await interaction.reply({ content: 'Internal error handling interaction.', flags: 64 });
        }
      } catch (_) { }
    }
  }
};
