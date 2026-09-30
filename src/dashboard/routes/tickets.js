// src/dashboard/routes/tickets.js — Ticket System Backend API
const { Router } = require('express');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const ticketDb = require('../../utils/ticketDb');

module.exports = function createTicketsRouter(client, { requireGuildAccess, requireGuildAdmin, requireGuildMod }) {
  const router = Router();

  // 1. GET Ticket Overview & Settings
  router.get('/guild/:guildId/tickets', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { guild } = req;
      const config = (await ticketDb.getConfig(guild.id)) || {
        setup_channel_id: null,
        transcript_channel_id: null,
        open_category_id: null,
        closed_category_id: null,
        archive_category_id: null,
        support_role_id: null
      };

      const panels = (ticketDb.getPanelsByGuild ? await ticketDb.getPanelsByGuild(guild.id) : (ticketDb.getPanels ? await ticketDb.getPanels(guild.id) : [])) || [];
      const allTickets = (ticketDb.listGuildTickets ? await ticketDb.listGuildTickets(guild.id) : []) || [];
      const openTickets = allTickets.filter(t => t.status === 'open');
      const closedTickets = allTickets.filter(t => t.status === 'closed');

      // Guild Discord metadata for selector dropdowns
      const channels = guild.channels.cache
        .filter(c => c.type === ChannelType.GuildText)
        .map(c => ({ id: c.id, name: c.name, parentId: c.parentId }));

      const categories = guild.channels.cache
        .filter(c => c.type === ChannelType.GuildCategory)
        .map(c => ({ id: c.id, name: c.name }));

      const roles = guild.roles.cache
        .filter(r => !r.managed && r.id !== guild.id)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));

      res.json({
        config,
        panels,
        stats: {
          total: allTickets.length,
          open: openTickets.length,
          closed: closedTickets.length
        },
        channels,
        categories,
        roles
      });
    } catch (err) {
      console.error('[Tickets API] Error fetching tickets info:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. POST Update Ticket Config
  router.post('/guild/:guildId/tickets/config', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const {
        setup_channel_id,
        transcript_channel_id,
        open_category_id,
        closed_category_id,
        archive_category_id,
        support_role_id
      } = req.body;

      await ticketDb.setConfig(guild.id, {
        setup_channel_id: setup_channel_id || null,
        transcript_channel_id: transcript_channel_id || null,
        open_category_id: open_category_id || null,
        closed_category_id: closed_category_id || null,
        archive_category_id: archive_category_id || null,
        support_role_id: support_role_id || null
      });

      res.json({ success: true, message: 'Ticket settings saved successfully.' });
    } catch (err) {
      console.error('[Tickets API] Error saving ticket config:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. POST Create & Deploy Ticket Panel to Discord
  router.post('/guild/:guildId/tickets/panels', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const {
        name,
        channel_id,
        title = 'Support Tickets',
        description = 'Click the button below to create a private support ticket with staff.',
        button_text = 'Open Ticket',
        button_emoji = '📩',
        button_style = 'Primary'
      } = req.body;

      if (!name || !channel_id) {
        return res.status(400).json({ error: 'Panel name and target channel are required.' });
      }

      const channel = await guild.channels.fetch(channel_id).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        return res.status(400).json({ error: 'Selected channel is not a valid text channel.' });
      }

      // Check bot permissions
      const me = guild.members.me;
      if (!me.permissionsIn(channel).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
        return res.status(403).json({ error: 'Bot lacks Send Messages or Embed Links permissions in that channel.' });
      }

      // Map button style
      let style = ButtonStyle.Primary;
      if (button_style === 'Secondary') style = ButtonStyle.Secondary;
      if (button_style === 'Success') style = ButtonStyle.Success;
      if (button_style === 'Danger') style = ButtonStyle.Danger;

      const panelId = `panel_${Date.now().toString(36)}`;

      const embed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: `${guild.name} • Ticket Support System` })
        .setTimestamp();

      const button = new ButtonBuilder()
        .setCustomId(`ticket_create`)
        .setLabel(button_text)
        .setStyle(style);

      if (button_emoji) {
        try { button.setEmoji(button_emoji); } catch (_) {}
      }

      const row = new ActionRowBuilder().addComponents(button);

      const sentMsg = await channel.send({ embeds: [embed], components: [row] });

      const metadata = JSON.stringify({ messageId: sentMsg.id, title, description, button_text });
      if (typeof ticketDb.savePanel === 'function') {
        await ticketDb.savePanel(panelId, guild.id, channel.id, name, 0, metadata);
      } else if (typeof ticketDb.createPanel === 'function') {
        await ticketDb.createPanel({ panel_id: panelId, guild_id: guild.id, channel_id: channel.id, name, is_premium_only: 0, types: metadata });
      }

      res.json({ success: true, panelId, messageId: sentMsg.id });
    } catch (err) {
      console.error('[Tickets API] Error creating ticket panel:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. DELETE Ticket Panel
  router.delete('/guild/:guildId/tickets/panels/:panelId', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { panelId } = req.params;
      if (typeof ticketDb.deletePanel === 'function') {
        await ticketDb.deletePanel(panelId);
      } else if (typeof ticketDb.removePanel === 'function') {
        await ticketDb.removePanel(panelId);
      }
      res.json({ success: true, message: 'Ticket panel deleted.' });
    } catch (err) {
      console.error('[Tickets API] Error deleting ticket panel:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. GET Live Tickets List
  router.get('/guild/:guildId/tickets/list', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { guild } = req;
      const tickets = (ticketDb.listGuildTickets ? await ticketDb.listGuildTickets(guild.id) : []) || [];

      // Enrich with opener usernames from cache if possible
      const enriched = tickets.map(t => {
        const opener = client.users.cache.get(t.opener_id);
        const claimer = t.claim_user_id ? client.users.cache.get(t.claim_user_id) : null;
        return {
          ...t,
          opener_name: opener ? opener.tag : t.opener_id,
          opener_avatar: opener ? opener.displayAvatarURL() : null,
          claimer_name: claimer ? claimer.tag : null
        };
      });

      res.json({ tickets: enriched });
    } catch (err) {
      console.error('[Tickets API] Error listing tickets:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 6. POST Close Ticket Remotely
  router.post('/guild/:guildId/tickets/:ticketId/close', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { guild } = req;
      const ticketId = parseInt(req.params.ticketId, 10);
      const ticket = await ticketDb.getTicket(guild.id, ticketId);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

      await ticketDb.updateTicket(guild.id, ticketId, {
        status: 'closed',
        closed_at: Date.now()
      });

      // Optionally close channel in Discord
      if (ticket.channel_id) {
        const ch = await guild.channels.fetch(ticket.channel_id).catch(() => null);
        if (ch) {
          await ch.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('🔒 Ticket Closed via Dashboard')
                .setDescription(`This ticket was closed by **${req.member.user.tag}** via the Web Dashboard.`)
                .setTimestamp()
            ]
          }).catch(() => null);
        }
      }

      res.json({ success: true, message: `Ticket #${ticketId} closed.` });
    } catch (err) {
      console.error('[Tickets API] Error closing ticket:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
