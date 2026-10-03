// src/commands/Stickymessage/stickymessage.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType
} = require('discord.js');

const stickyStorage = require('../../utils/stickyStorage');

const MAX_CONTENT = 4000;

function makeErrorEmbed(title, desc) {
  return new EmbedBuilder().setTitle(title).setDescription(desc).setColor(0xED4245);
}

function makeInfoEmbed(title, desc) {
  return new EmbedBuilder().setTitle(title).setDescription(desc).setColor(0x5865F2);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stickymessage')
    .setDescription('Manage sticky messages for channels (admin)')
    .addSubcommand(sc =>
      sc
        .setName('create')
        .setDescription('Create a sticky message')
        .addStringOption(o => o.setName('content').setDescription('Sticky content').setRequired(true))
        .addStringOption(o =>
          o.setName('type')
            .setDescription('Type: pinned or bottom')
            .setRequired(true)
            .addChoices({ name: 'pinned', value: 'pinned' }, { name: 'bottom', value: 'bottom' })
        )
        .addChannelOption(o =>
          o.setName('channel')
            .setDescription('Target channel (defaults to this channel)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
        .addBooleanOption(o => o.setName('embed').setDescription('Send as embed?').setRequired(false))
        .addIntegerOption(o => o.setName('priority').setDescription('Priority (lower = sent first)').setRequired(false))
    )
    .addSubcommand(sc =>
      sc
        .setName('edit')
        .setDescription('Edit an existing sticky')
        .addIntegerOption(o => o.setName('id').setDescription('Sticky ID').setRequired(true))
        .addStringOption(o => o.setName('content').setDescription('New content').setRequired(false))
        .addStringOption(o =>
          o.setName('type')
            .setDescription('Change type')
            .setRequired(false)
            .addChoices({ name: 'pinned', value: 'pinned' }, { name: 'bottom', value: 'bottom' })
        )
        .addBooleanOption(o => o.setName('embed').setDescription('Embed?').setRequired(false))
        .addIntegerOption(o => o.setName('priority').setDescription('Priority (lower = sooner)').setRequired(false))
    )
    .addSubcommand(sc =>
      sc
        .setName('remove')
        .setDescription('Remove a sticky by ID')
        .addIntegerOption(o => o.setName('id').setDescription('Sticky ID').setRequired(true))
    )
    .addSubcommand(sc =>
      sc
        .setName('list')
        .setDescription('List stickies for this guild (admins see all)')
        .addIntegerOption(o => o.setName('page').setDescription('Page number').setRequired(false))
    )
    .addSubcommand(sc =>
      sc
        .setName('toggle')
        .setDescription('Enable or disable a sticky')
        .addIntegerOption(o => o.setName('id').setDescription('Sticky ID').setRequired(true))
        .addStringOption(o =>
          o.setName('action')
            .setDescription('enable or disable')
            .setRequired(true)
            .addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' })
        )
    )
    .addSubcommand(sc =>
      sc
        .setName('setchannel')
        .setDescription('Move a sticky to another channel')
        .addIntegerOption(o => o.setName('id').setDescription('Sticky ID').setRequired(true))
        .addChannelOption(o => o.setName('channel').setDescription('Target channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand(sc =>
      sc
        .setName('reorder')
        .setDescription('Change sticky priority (lower = higher priority)')
        .addIntegerOption(o => o.setName('id').setDescription('Sticky ID').setRequired(true))
        .addIntegerOption(o => o.setName('position').setDescription('New priority value (integer)').setRequired(true))
    )
    // config kept as a single subcommand for backward compatibility; code will also accept it if it's a group
    .addSubcommand(sc =>
      sc
        .setName('config')
        .setDescription('Set guild sticky config (Manage Server only)')
        .addIntegerOption(o => o.setName('repostdelay').setDescription('Repost delay in seconds (bottom type)').setRequired(false))
        .addBooleanOption(o => o.setName('autopin').setDescription('Auto-pin on create for pinned type').setRequired(false))
        .addStringOption(o => o.setName('webhookname').setDescription('Optional webhook name to use (not implemented)').setRequired(false))
    ),

  async execute(interaction) {
    let sub = null;
    let group = null;
    try {
      sub = interaction.options.getSubcommand();
    } catch {
      sub = null;
    }
    try {
      group = interaction.options.getSubcommandGroup();
    } catch {
      group = null;
    }

    const member = interaction.member;

    // helper permission check for admin actions
    const requireAdmin = async () => {
      const has = member.permissions.has(PermissionFlagsBits.ManageGuild);
      if (!has) {
        const embed = makeErrorEmbed('⛔ Permission denied', 'You need the **Manage Server** permission to use this subcommand.');
        await interaction.reply({ embeds: [embed], flags: 64 });
        return false;
      }
      return true;
    };

    try {
      // CREATE
      if (sub === 'create') {
        if (!(await requireAdmin())) return;
        await interaction.deferReply({ flags: 64 });

        const rawContent = interaction.options.getString('content', true);
        const content = rawContent.slice(0, MAX_CONTENT);
        const type = interaction.options.getString('type', true); // 'pinned' | 'bottom'
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const embedFlag = interaction.options.getBoolean('embed') || false;
        const priority = interaction.options.getInteger('priority') ?? 0;

        if (!channel.isTextBased()) {
          return interaction.editReply({ embeds: [makeErrorEmbed('Invalid channel', 'That channel cannot hold messages.')] });
        }

        // permission checks for sending/pinning
        const me = interaction.guild.members.me;
        if (!me.permissionsIn(channel).has('SendMessages')) {
          return interaction.editReply({ embeds: [makeErrorEmbed('Missing permission', 'I need permission to send messages in the target channel.')] });
        }

        // create DB row first
        const id = await stickyStorage.createSticky(interaction.guild.id, channel.id, content, type, embedFlag ? 1 : 0, interaction.user.id, { priority });

        // send initial sticky message
        try {
          let sent;
          if (embedFlag) {
            sent = await channel.send({ embeds: [makeInfoEmbed('📌 Sticky', content)] });
          } else {
            sent = await channel.send({ content });
          }

          // pin if requested type pinned
          if (type === 'pinned') {
            try {
              if (!me.permissionsIn(channel).has('ManageMessages') && !me.permissionsIn(channel).has('ManageChannels')) {
                await interaction.followUp({ content: '⚠️ Sticky created but I lack permission to pin messages in that channel.', flags: 64 }).catch(() => {});
              } else {
                await sent.pin().catch(() => {});
              }
            } catch (err) {}
          }

          // update lastMessageId
          await stickyStorage.setLastMessageId(id, sent.id);
        } catch (err) {
          console.warn('[Sticky] failed to send initial message', err);
          return interaction.editReply({ embeds: [makeErrorEmbed('Created but failed to send', `Sticky created in DB (ID ${id}) but I couldn't send a message to the channel. Check my permissions.`)] });
        }

        return interaction.editReply({ embeds: [makeInfoEmbed('Sticky created', `ID: ${id}\nChannel: <#${channel.id}>\nType: ${type}\nPriority: ${priority}`)] });
      }

      // EDIT
      if (sub === 'edit') {
        if (!(await requireAdmin())) return;
        await interaction.deferReply({ flags: 64 });

        const id = interaction.options.getInteger('id', true);
        const contentRaw = interaction.options.getString('content', false);
        const type = interaction.options.getString('type', false);
        const embedFlag = interaction.options.getBoolean('embed', false);
        const priority = interaction.options.getInteger('priority', false);

        const sticky = await stickyStorage.getSticky(id);
        if (!sticky) return interaction.editReply({ embeds: [makeErrorEmbed('Not found', `No sticky found with ID ${id}.`)] });

        const updates = {};
        if (contentRaw != null) updates.content = contentRaw.slice(0, MAX_CONTENT);
        if (type) updates.type = type;
        if (typeof embedFlag === 'boolean') updates.embedFlag = embedFlag ? 1 : 0;
        if (typeof priority === 'number') updates.priority = priority;

        if (Object.keys(updates).length === 0) {
          return interaction.editReply({ content: 'ℹ️ No changes provided.', flags: 64 });
        }

        await stickyStorage.updateSticky(id, updates);

        // If lastMessageId exists, attempt to edit that message for quick update
        if (sticky.lastMessageId) {
          try {
            const channel = interaction.guild.channels.cache.get(sticky.channelId);
            const msg = channel ? await channel.messages.fetch(sticky.lastMessageId).catch(() => null) : null;
            if (msg) {
              if (updates.content) {
                if (updates.embedFlag === 1 || (updates.embedFlag == null && sticky.embedFlag)) {
                  await msg.edit({ embeds: [makeInfoEmbed('📌 Sticky (edited)', updates.content ?? sticky.content.slice(0, MAX_CONTENT))] }).catch(() => {});
                } else {
                  await msg.edit({ content: updates.content ?? sticky.content.slice(0, MAX_CONTENT) }).catch(() => {});
                }
              }
            }
          } catch (err) {
            console.warn('[Sticky] failed to update live message after edit', err);
          }
        }

        return interaction.editReply({ embeds: [makeInfoEmbed('Edited', `Sticky ${id} updated.`)] });
      }

      // REMOVE
      if (sub === 'remove') {
        if (!(await requireAdmin())) return;
        await interaction.deferReply({ flags: 64 });

        const id = interaction.options.getInteger('id', true);
        const sticky = await stickyStorage.getSticky(id);
        if (!sticky) return interaction.editReply({ embeds: [makeErrorEmbed('Not found', `No sticky with ID ${id}.`)] });

        if (sticky.lastMessageId) {
          try {
            const ch = interaction.guild.channels.cache.get(sticky.channelId);
            if (ch) {
              const m = await ch.messages.fetch(sticky.lastMessageId).catch(() => null);
              if (m && m.deletable) await m.delete().catch(() => {});
            }
          } catch (err) {}
        }

        await stickyStorage.removeSticky(id);
        return interaction.editReply({ embeds: [makeInfoEmbed('Removed', `Sticky ${id} removed.`)] });
      }

      // LIST
      if (sub === 'list') {
        await interaction.deferReply({ flags: 64 });

        const page = Math.max(1, interaction.options.getInteger('page') || 1);
        const perPage = 8;
        const rows = await stickyStorage.listStickies(interaction.guild.id, page, perPage);
        if (!rows.length) return interaction.editReply({ content: 'No stickies configured for this guild.', flags: 64 });

        const lines = rows.map(r => {
          const en = r.enabled ? '✅' : '❌';
          const type = r.type;
          const preview = (r.content || '').slice(0, 120).replace(/\n/g, ' ');
          return `**ID ${r.id}** ${en} — ${type} — <#${r.channelId}> — by <@${r.createdBy}> — priority:${r.priority}\n> ${preview}`;
        });

        const embed = new EmbedBuilder()
          .setTitle('Stickies')
          .setColor(0x5865F2)
          .setDescription(lines.join('\n\n'))
          .setFooter({ text: `Page ${page}` });

        return interaction.editReply({ embeds: [embed] });
      }

      // TOGGLE
      if (sub === 'toggle') {
        if (!(await requireAdmin())) return;
        await interaction.deferReply({ flags: 64 });

        const id = interaction.options.getInteger('id', true);
        const action = interaction.options.getString('action', true); // enable|disable
        const sticky = await stickyStorage.getSticky(id);
        if (!sticky) return interaction.editReply({ embeds: [makeErrorEmbed('Not found', `No sticky with ID ${id}.`)] });

        if (action === 'enable') {
          await stickyStorage.updateSticky(id, { enabled: 1 });
          return interaction.editReply({ embeds: [makeInfoEmbed('Enabled', `Sticky ${id} enabled.`)] });
        } else {
          if (sticky.lastMessageId) {
            try {
              const ch = interaction.guild.channels.cache.get(sticky.channelId);
              if (ch) {
                const m = await ch.messages.fetch(sticky.lastMessageId).catch(() => null);
                if (m && m.deletable) await m.delete().catch(() => {});
              }
            } catch (err) {}
          }
          await stickyStorage.updateSticky(id, { enabled: 0, lastMessageId: null });
          return interaction.editReply({ embeds: [makeInfoEmbed('Disabled', `Sticky ${id} disabled.`)] });
        }
      }

      // SETCHANNEL
      if (sub === 'setchannel') {
        if (!(await requireAdmin())) return;
        await interaction.deferReply({ flags: 64 });

        const id = interaction.options.getInteger('id', true);
        const channel = interaction.options.getChannel('channel', true);
        if (!channel.isTextBased()) return interaction.editReply({ embeds: [makeErrorEmbed('Invalid channel', 'Target must be a text channel.')] });

        const sticky = await stickyStorage.getSticky(id);
        if (!sticky) return interaction.editReply({ embeds: [makeErrorEmbed('Not found', `No sticky with ID ${id}.`)] });

        if (sticky.lastMessageId) {
          try {
            const oldCh = interaction.guild.channels.cache.get(sticky.channelId);
            if (oldCh) {
              const m = await oldCh.messages.fetch(sticky.lastMessageId).catch(() => null);
              if (m && m.deletable) await m.delete().catch(() => {});
            }
          } catch (err) {}
        }

        try {
          let sent;
          if (sticky.embedFlag) sent = await channel.send({ embeds: [makeInfoEmbed('📌 Sticky', sticky.content)] });
          else sent = await channel.send({ content: sticky.content });

          await stickyStorage.updateSticky(id, { channelId: channel.id });
          await stickyStorage.setLastMessageId(id, sent.id);

          return interaction.editReply({ embeds: [makeInfoEmbed('Moved', `Sticky ${id} moved to <#${channel.id}>`)] });
        } catch (err) {
          console.warn('[Sticky] failed to create message in new channel', err);
          return interaction.editReply({ embeds: [makeErrorEmbed('Failed', 'Could not send message in the target channel. Check my permissions.')] });
        }
      }

      // REORDER
      if (sub === 'reorder') {
        if (!(await requireAdmin())) return;
        await interaction.deferReply({ flags: 64 });

        const id = interaction.options.getInteger('id', true);
        const pos = interaction.options.getInteger('position', true);
        const sticky = await stickyStorage.getSticky(id);
        if (!sticky) return interaction.editReply({ embeds: [makeErrorEmbed('Not found', `No sticky with ID ${id}.`)] });

        await stickyStorage.updateSticky(id, { priority: pos });
        return interaction.editReply({ embeds: [makeInfoEmbed('Reordered', `Sticky ${id} set to priority ${pos}.`)] });
      }

      // CONFIG: handle either as plain subcommand named "config" or as a subcommandGroup "config"
      if (sub === 'config' || group === 'config') {
        if (!(await requireAdmin())) return;
        await interaction.deferReply({ flags: 64 });

        const repostdelay = interaction.options.getInteger('repostdelay');
        const autopin = interaction.options.getBoolean('autopin');
        const webhookname = interaction.options.getString('webhookname');

        const cfgUpdates = {};
        if (typeof repostdelay === 'number' && !Number.isNaN(repostdelay)) cfgUpdates.repostDelaySeconds = Math.max(1, repostdelay);
        if (typeof autopin === 'boolean') cfgUpdates.autoPinOnCreate = autopin ? 1 : 0;
        if (typeof webhookname === 'string') cfgUpdates.webhookName = webhookname;

        if (Object.keys(cfgUpdates).length === 0) {
          const cur = await stickyStorage.getGuildConfig(interaction.guild.id);
          return interaction.editReply({ embeds: [makeInfoEmbed('Current config', `repostDelaySeconds: ${cur.repostDelaySeconds}\nautoPinOnCreate: ${cur.autoPinOnCreate}\nwebhookName: ${cur.webhookName || '—'}`)] });
        }

        await stickyStorage.setGuildConfig(interaction.guild.id, cfgUpdates);
        return interaction.editReply({ embeds: [makeInfoEmbed('Updated', 'Guild sticky configuration updated.')] });
      }

      // fallback
      return interaction.reply({ content: 'Unknown subcommand', flags: 64 });
    } catch (err) {
      console.error('[stickymessage command] error', err);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ embeds: [makeErrorEmbed('Error', 'An internal error occurred.')] });
        } else {
          await interaction.reply({ embeds: [makeErrorEmbed('Error', 'An internal error occurred.')], flags: 64 });
        }
      } catch (e) {
        console.error('[stickymessage] failed to send error reply', e);
      }
    }
  }
};