const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');

const {
  setConfig,
  getConfig,
  isTicketChannel,
  getPanelsForGuild,
  createOrUpdatePanel,
  removePanel,
  getPanel,
  isPremiumGuild,
  isSupport
} = require('../../utils/ticketHelpers');

const { run, get, all } = require('../../utils/ticketDb');
const { ticketPanelEmbed, ticketInfoEmbed, ticketClosedEmbed } = require('../../components/ticketEmbeds');
const { generateTranscriptBuffer } = require('../../listeners/transcript');
const { premiumRequiredEmbed } = require('../../components/ticketUI');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage the ticket system')
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Configure the ticket system')
        .addChannelOption(o =>
          o
            .setName('channel')
            .setDescription('Channel where the main ticket panel will be sent')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addChannelOption(o =>
          o
            .setName('transcript_channel')
            .setDescription('Channel where closed ticket transcripts are sent')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addChannelOption(o =>
          o
            .setName('open_category')
            .setDescription('Category for open tickets')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addChannelOption(o =>
          o
            .setName('closed_category')
            .setDescription('Category for closed tickets')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addChannelOption(o =>
          o
            .setName('archive_category')
            .setDescription('Category for archived tickets')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addRoleOption(o =>
          o
            .setName('support_role')
            .setDescription('Role considered as support staff for tickets')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('panel')
        .setDescription('Create or update a ticket panel (multi-panels require premium)')
        .addChannelOption(o =>
          o
            .setName('channel')
            .setDescription('Channel where this panel should appear')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption(o =>
          o
            .setName('name')
            .setDescription('Name for this ticket panel (e.g. Main Support Panel)')
            .setRequired(true)
        )
        .addStringOption(o =>
          o
            .setName('types')
            .setDescription('Comma-separated ticket types (e.g. Support,Billing,Report)')
            .setRequired(false)
        )
        .addBooleanOption(o =>
          o
            .setName('premium_only')
            .setDescription('Whether this panel should be marked as premium-only')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete ticket data or this ticket channel')
        .addStringOption(o =>
          o
            .setName('target')
            .setDescription('What to delete')
            .setRequired(true)
            .addChoices(
              { name: 'ticket setup', value: 'setup' },
              { name: 'ticket count', value: 'count' },
              { name: 'tickets', value: 'tickets' },
              { name: 'this ticket', value: 'channel' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('archive')
        .setDescription('Archive this ticket (move to archive category)')
    )
    .addSubcommand(sub =>
      sub.setName('add-user')
        .setDescription('Add a user to this ticket')
        .addUserOption(o =>
          o
            .setName('user')
            .setDescription('User to add to this ticket')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remove-user')
        .setDescription('Remove a user from this ticket')
        .addUserOption(o =>
          o
            .setName('user')
            .setDescription('User to remove from this ticket')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('close')
        .setDescription('Close this ticket and generate a transcript')
    )
    .addSubcommand(sub =>
      sub.setName('claim')
        .setDescription('Claim this ticket as a support member')
    )
    .addSubcommand(sub =>
      sub.setName('unclaim')
        .setDescription('Unclaim this ticket')
    )
    .addSubcommand(sub =>
      sub.setName('information')
        .setDescription('View detailed information about this ticket')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const { guild, channel, member, user } = interaction;

    // Admin-only commands
    if (['setup', 'delete', 'panel'].includes(sub) && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ You need the **Manage Server** permission to use this command.', flags: 64 });
    }

    // /ticket setup
    if (sub === 'setup') {
      const configObj = {
        setup_channel_id: interaction.options.getChannel('channel').id,
        transcript_channel_id: interaction.options.getChannel('transcript_channel').id,
        open_category_id: interaction.options.getChannel('open_category').id,
        closed_category_id: interaction.options.getChannel('closed_category').id,
        archive_category_id: interaction.options.getChannel('archive_category').id,
        support_role_id: interaction.options.getRole('support_role').id
      };

      await setConfig(guild.id, configObj);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_create')
          .setLabel('🎫 Create Ticket')
          .setStyle(ButtonStyle.Primary)
      );

      const panelChannel = interaction.options.getChannel('channel');
      await panelChannel.send({ embeds: [ticketPanelEmbed()], components: [row] });

      return interaction.reply({ content: '✅ Ticket system configured and panel posted.', flags: 64 });
    }

    // /ticket panel  (create/update panels — multi-panels = premium only)
    if (sub === 'panel') {
      const targetChannel = interaction.options.getChannel('channel');
      const name = interaction.options.getString('name');
      const typesStr = interaction.options.getString('types') || 'Support';
      const types = typesStr.split(',').map(t => t.trim()).filter(Boolean);
      const premiumOnly = !!interaction.options.getBoolean('premium_only');

      const panels = await getPanelsForGuild(guild.id);
      const isPremium = isPremiumGuild(guild.id);

      // Non-premium guilds may only have ONE panel total
      if (panels && panels.length >= 1 && !isPremium) {
        return interaction.reply({
          embeds: [premiumRequiredEmbed('Multiple ticket panels')],
          flags: 64
        });
      }

      const panelId = `${guild.id}:${targetChannel.id}`;
      await createOrUpdatePanel(panelId, guild.id, targetChannel.id, name, types, premiumOnly);

      const row = new ActionRowBuilder();
      for (const t of types) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_create:${t}:${panelId}`)
            .setLabel(t)
            .setStyle(ButtonStyle.Primary)
        );
      }

      await targetChannel.send({
        embeds: [ticketPanelEmbed({ premium: premiumOnly, showTypes: true })],
        components: [row]
      });

      return interaction.reply({ content: '✅ Ticket panel created/updated.', flags: 64 });
    }

    // /ticket delete
    if (sub === 'delete') {
      const target = interaction.options.getString('target');

      if (target === 'setup') {
        await run(`DELETE FROM guild_config WHERE guild_id = ?`, [guild.id]);
        return interaction.reply({ content: '🗑️ Ticket setup deleted.', flags: 64 });
      }

      if (target === 'count') {
        await run(`DELETE FROM counters WHERE guild_id = ?`, [guild.id]);
        return interaction.reply({ content: '🗑️ Ticket counter reset.', flags: 64 });
      }

      if (target === 'tickets') {
        await run(`DELETE FROM tickets WHERE guild_id = ?`, [guild.id]);
        await run(`DELETE FROM ticket_members WHERE guild_id = ?`, [guild.id]);
        return interaction.reply({ content: '🗑️ All ticket records deleted.', flags: 64 });
      }

      if (target === 'channel') {
        const ticket = await get(`SELECT * FROM tickets WHERE guild_id = ? AND channel_id = ?`, [guild.id, channel.id]);
        if (ticket) {
          await run(`DELETE FROM tickets WHERE guild_id = ? AND id = ?`, [guild.id, ticket.id]);
          await run(`DELETE FROM ticket_members WHERE guild_id = ? AND ticket_id = ?`, [guild.id, ticket.id]);
        }
        await interaction.reply({ content: '🗑️ Ticket will be deleted in 5 seconds.', flags: 64 });
        setTimeout(() => channel.delete().catch(() => {}), 5000);
        return;
      }
    }

    // Everything below requires that we are in a ticket channel
    const config = await getConfig(guild.id);
    if (!config || !isTicketChannel(channel.name)) {
      return interaction.reply({
        content: '❌ This command can only be used **inside a ticket channel**.',
        flags: 64
      });
    }

    const ticket = await get(`SELECT * FROM tickets WHERE guild_id = ? AND channel_id = ?`, [guild.id, channel.id]);
    if (!ticket) {
      return interaction.reply({ content: '❌ Ticket not found in database.', flags: 64 });
    }

    const authorized = user.id === ticket.opener_id || isSupport(interaction, config.support_role_id);
    if (!authorized) {
      return interaction.reply({ content: '❌ You are not authorized to use this command.', flags: 64 });
    }

    // /ticket archive
    if (sub === 'archive') {
      await channel.setParent(config.archive_category_id).catch(() => {});
      await run(`UPDATE tickets SET status = 'archived' WHERE guild_id = ? AND id = ?`, [guild.id, ticket.id]);
      return interaction.reply({ content: '📦 Ticket archived.', flags: 64 });
    }

    // /ticket add-user
    if (sub === 'add-user') {
      const target = interaction.options.getUser('user');
      await run(
        `INSERT OR IGNORE INTO ticket_members (guild_id, ticket_id, user_id) VALUES (?, ?, ?)`,
        [guild.id, ticket.id, target.id]
      );

      await channel.permissionOverwrites.edit(target.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });

      return interaction.reply({ content: `✅ <@${target.id}> added to the ticket.`, flags: 64 });
    }

    // /ticket remove-user
    if (sub === 'remove-user') {
      const target = interaction.options.getUser('user');
      await run(
        `DELETE FROM ticket_members WHERE guild_id = ? AND ticket_id = ? AND user_id = ?`,
        [guild.id, ticket.id, target.id]
      );

      await channel.permissionOverwrites.delete(target.id).catch(() => {});
      return interaction.reply({ content: `✅ <@${target.id}> removed from the ticket.`, flags: 64 });
    }

    // /ticket claim
    if (sub === 'claim') {
      await run(
        `UPDATE tickets SET status = 'claimed', claim_user_id = ? WHERE guild_id = ? AND id = ?`,
        [user.id, guild.id, ticket.id]
      );
      return interaction.reply({ content: `🛠️ Ticket claimed by <@${user.id}>.`, flags: 64 });
    }

    // /ticket unclaim
    if (sub === 'unclaim') {
      await run(
        `UPDATE tickets SET status = 'open', claim_user_id = NULL WHERE guild_id = ? AND id = ?`,
        [guild.id, ticket.id]
      );
      return interaction.reply({ content: `❎ Ticket unclaimed.`, flags: 64 });
    }

    // /ticket close
    if (sub === 'close') {
      const buffer = await generateTranscriptBuffer(channel);
      const file = { attachment: buffer, name: `ticket-${ticket.id}.html` };

      await run(
        `UPDATE tickets SET status = 'closed', closed_at = ? WHERE guild_id = ? AND id = ?`,
        [Date.now(), guild.id, ticket.id]
      );

      const embed = ticketClosedEmbed({
        ticketId: ticket.id,
        openerId: ticket.opener_id,
        closerId: user.id,
        claimedBy: ticket.claim_user_id,
        status: 'Closed'
      });

      const transcriptChannel = await guild.channels.fetch(config.transcript_channel_id).catch(() => null);
      if (transcriptChannel) {
        await transcriptChannel.send({ embeds: [embed], files: [file] }).catch(() => {});
      }

      await channel.send({ embeds: [embed], files: [file] }).catch(() => {});
      await channel.permissionOverwrites.edit(ticket.opener_id, { ViewChannel: false }).catch(() => {});
      await channel.setParent(config.closed_category_id).catch(() => {});
      return interaction.reply({ content: '✅ Ticket closed.', flags: 64 });
    }

    // /ticket information
    if (sub === 'information') {
      const embed = ticketInfoEmbed({
        ticketId: ticket.id,
        openerId: ticket.opener_id,
        claimedBy: ticket.claim_user_id,
        status: ticket.status,
        createdAt: ticket.created_at,
        description: ticket.description
      });

      return interaction.reply({ embeds: [embed], flags: 64 });
    }
  }
};
