// src/buttons/ticketButtons.js
// hello
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');

const {
  getConfig,
  getPanel,
  getPanelsForGuild,
  isTicketChannel,
  isSupport,
  isPremiumGuild,
  createOrUpdatePanel
} = require('../utils/ticketHelpers');

const { run, get } = require('../utils/ticketDb');
const { createTicket, closeTicket } = require('../utils/ticketService');
const { ticketPanelEmbed, ticketCreatedEmbed, ticketClosedEmbed, ticketInfoEmbed } = require('../components/ticketEmbeds');
const { generateTranscriptBuffer } = require('../listeners/transcript');
const { startTicketWatchdog } = require('../listeners/ticketWatchdog');

/**
 * Handler exported for interactionCreate button and modal routing.
 * Expectation: your interactionCreate router will call this file for Ticket-related interactions.
 */
module.exports = async function handleTicketInteraction(interaction) {
  try {
    if (interaction.isButton()) {
      const id = interaction.customId;

      // Panel "open" button -> payload: ticket_create:<TYPE> or ticket_create (fallback)
      if (id === 'ticket_create' || id.startsWith('ticket_create:')) {
        const [, type = 'Support', panelId] = id.split(':'); // optional panelId after second colon

        // If multi-panel is requested we expect panelId; if not, fall back to default behaviour
        // Build a modal to collect a short description (and optional extra question per type)
        const modal = new ModalBuilder().setCustomId(`ticket_create_modal:${type}`).setTitle(`Open ${type} Ticket`);

        // Basic question: short subject
        const subjectInput = new TextInputBuilder()
          .setCustomId('subject')
          .setLabel('Short summary (one line)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100);

        // Details input
        const descriptionInput = new TextInputBuilder()
          .setCustomId('details')
          .setLabel('Describe your issue (provide details & steps)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(2000);

        modal.addComponents(
          new ActionRowBuilder().addComponents(subjectInput),
          new ActionRowBuilder().addComponents(descriptionInput)
        );

        await interaction.showModal(modal);
        return;
      }

      // Confirm / Cancel creation (legacy panel)
      if (id === 'ticket_confirm_create') {
        await interaction.update({ content: '✅ Creating ticket...', components: [], flags: 64 }).catch(() => { });
        return;
      }

      if (id === 'ticket_cancel_create') {
        await interaction.update({ content: '❌ Ticket creation cancelled.', components: [], flags: 64 }).catch(() => { });
        return;
      }

      // Claim
      if (id === 'ticket_claim') {
        const { guild, channel, user } = interaction;
        const ticket = await get(`SELECT * FROM tickets WHERE guild_id = ? AND channel_id = ?`, [guild.id, channel.id]);
        if (!ticket) return interaction.reply({ content: '❌ Ticket not found.', flags: 64 });

        await run(`UPDATE tickets SET status = 'claimed', claim_user_id = ? WHERE guild_id = ? AND id = ?`, [user.id, guild.id, ticket.id]);
        await interaction.reply({ content: `✅ Ticket claimed by <@${user.id}>.`, flags: 64 });
        return;
      }

      // Unclaim
      if (id === 'ticket_unclaim') {
        const { guild, channel } = interaction;
        const ticket = await get(`SELECT * FROM tickets WHERE guild_id = ? AND channel_id = ?`, [guild.id, channel.id]);
        if (!ticket) return interaction.reply({ content: '❌ Ticket not found.', flags: 64 });

        await run(`UPDATE tickets SET status = 'open', claim_user_id = NULL WHERE guild_id = ? AND id = ?`, [guild.id, ticket.id]);
        await interaction.reply({ content: `❎ Ticket unclaimed.`, flags: 64 });
        return;
      }

      // Close
      if (id === 'ticket_close') {
        await interaction.deferReply({ flags: 64 });
        const { guild, channel, user } = interaction;
        const ticket = await get(`SELECT * FROM tickets WHERE guild_id = ? AND channel_id = ?`, [guild.id, channel.id]);
        if (!ticket) {
          await safeInteractionReply(interaction, { content: '❌ Ticket record not found.' });
          return;
        }

        // generate transcript
        const buffer = await generateTranscriptBuffer(channel);
        const file = new AttachmentBuilder(buffer, { name: `ticket-${ticket.id}.html` });

        await run(`UPDATE tickets SET status = 'closed', closed_at = ? WHERE guild_id = ? AND id = ?`, [Date.now(), guild.id, ticket.id]);

        const embed = ticketClosedEmbed({
          ticketId: ticket.id,
          openerId: ticket.opener_id,
          closerId: user.id,
          claimedBy: ticket.claim_user_id,
          status: 'Closed'
        });

        const config = await getConfig(guild.id);
        const transcriptChannel = config ? await guild.channels.fetch(config.transcript_channel_id).catch(() => null) : null;
        if (transcriptChannel) await transcriptChannel.send({ embeds: [embed], files: [file] }).catch(() => { });
        await channel.send({ embeds: [embed], files: [file] }).catch(() => { });

        await channel.permissionOverwrites.edit(ticket.opener_id, { ViewChannel: false }).catch(() => { });
        const deleteRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_delete').setLabel('🗑️ Delete Ticket').setStyle(ButtonStyle.Danger)
        );
        await channel.send({ content: 'This ticket is now closed. You may delete it if no longer needed.', components: [deleteRow] }).catch(() => { });
        if (config) await channel.setParent(config.closed_category_id).catch(() => { });
        await safeInteractionReply(interaction, { content: '✅ Ticket closed.' });
        return;
      }

      // Delete
      if (id === 'ticket_delete') {
        await interaction.reply({ content: '🗑️ Deleting ticket in 5 seconds...', flags: 64 });
        setTimeout(() => interaction.channel.delete().catch(() => { }), 5000);
        return;
      }

      // Info
      if (id === 'ticket_info') {
        const { guild, channel } = interaction;
        const ticket = await get(`SELECT * FROM tickets WHERE guild_id = ? AND channel_id = ?`, [guild.id, channel.id]);
        if (!ticket) return interaction.reply({ content: '❌ Ticket not found.', flags: 64 });

        const embed = ticketInfoEmbed({
          ticketId: ticket.id,
          openerId: ticket.opener_id,
          claimedBy: ticket.claim_user_id,
          status: ticket.status,
          createdAt: ticket.created_at,
          description: ticket.description
        });

        await interaction.reply({ embeds: [embed], flags: 64 });
        return;
      }

      // Unknown button
      return;
    } // end isButton

    // MODAL submit handler (ticket creation modal)
    if (interaction.isModalSubmit()) {
      const customId = interaction.customId; // format: ticket_create_modal:<TYPE>
      if (!customId.startsWith('ticket_create_modal:')) return;

      // Defer first (acknowledge the modal)
      await interaction.deferReply({ flags: 64 }).catch(() => { });

      const [, type = 'Support'] = customId.split(':');
      const subject = interaction.fields.getTextInputValue('subject') || 'No subject';
      const details = interaction.fields.getTextInputValue('details') || '';

      const guild = interaction.guild;
      const user = interaction.user;
      const config = await getConfig(guild.id);
      if (!config) {
        await safeInteractionReply(interaction, { content: '❌ Ticket system not configured. Ask an admin to run `/ticket setup`.' });
        return;
      }

      // Create ticket via service
      const { ticketId, ticketChannel } = await createTicket({
        client: interaction.client,
        guild,
        openerId: user.id,
        type,
        form: { subject, details },
        config
      });

      // Start watchdog (24h default)
      startTicketWatchdog(interaction.client, guild.id, ticketId, ticketChannel.id, user.id);

      // Try to edit the deferred reply. If the token is invalid (50027) or edit fails, fallback to followUp/reply.
      await safeInteractionReply(interaction, { content: `✅ Ticket created: <#${ticketChannel.id}>` });
      return;
    }
  } catch (err) {
    console.error('[ticketButtons] error:', err);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: '❌ An unexpected error occurred while processing the ticket.' }).catch(() => { });
      } else {
        await interaction.reply({ content: '❌ An unexpected error occurred while processing the ticket.', flags: 64 }).catch(() => { });
      }
    } catch { }
  }
};

/**
 * Safe reply helper:
 * - If interaction is deferred or replied, try editReply()
 * - If editReply fails with invalid webhook token (50027) or any error, fall back to followUp()
 * - Otherwise, use reply()
 */
async function safeInteractionReply(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      try {
        return await interaction.editReply(payload);
      } catch (err) {
        // If token invalid or any other failure, fall back to followUp
        // Check DiscordAPIError shape by err.code if present
        try {
          return await interaction.followUp({ ...payload, ephemeral: payload.ephemeral ?? true });
        } catch (followErr) {
          // final fallback: try to reply (may fail if already replied)
          try { return await interaction.reply({ ...payload, ephemeral: payload.ephemeral ?? true }); } catch (_) { }
        }
      }
    } else {
      // Not deferred/replied yet — reply normally
      return await interaction.reply(payload);
    }
  } catch (finalErr) {
    // swallow to prevent crash, but log
    console.error('[ticketButtons] safeInteractionReply final error:', finalErr);
  }
}
