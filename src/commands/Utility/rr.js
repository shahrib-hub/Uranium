// src/commands/Utility/rr.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const rrStorage = require('../../utils/rrStorage');
const emojiUtil = require('../../utils/emojiUtil');

const PANEL_COLOR = 0x071022;
const ACCENT = 0x57f287;

function panelEmbed(setup, items = []) {
  const embed = new EmbedBuilder()
    .setTitle(`🎭 Role Panel ${setup.title ? `— ${setup.title}` : ''}`)
    .setDescription(setup.description || '*React or press a button to toggle roles*')
    .setColor(PANEL_COLOR)
    .setFooter({ text: `MULTi-Bot • ID ${setup.id}` })
    .setTimestamp();

  if (items.length) {
    const lines = items.map(it => `${it.emoji} — <@&${it.role_id}> ${it.label ? `— ${it.label}` : ''}`);
    embed.addFields({ name: 'Options', value: lines.join('\n'), inline: false });
  } else {
    embed.addFields({ name: 'Options', value: 'No items yet. Add items with `/rr add`', inline: false });
  }
  return embed;
}

function buildButtonsFromItems(client, guildId, setupId, items) {
  // up to 5 buttons total, 5 per action row allowed
  const row = new ActionRowBuilder();
  const buttons = items.slice(0, 5).map(it => {
    const btn = new ButtonBuilder()
      .setCustomId(`rr_btn:${guildId}:${setupId}:${it.id}`)
      .setLabel(it.label ? it.label.substring(0, 80) : '')
      // if label empty discord requires something, fallback to zero-width char
      .setStyle(ButtonStyle.Secondary);
    if (it.emoji) {
      try { btn.setEmoji(it.emoji); } catch {}
    }
    return btn;
  });
  row.addComponents(...buttons);
  return [row];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rr')
    .setDescription('Reaction Roles manager (buttons & reactions)')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a new reaction role setup')
        .addStringOption(opt => opt.setName('mode').setDescription('buttons or reactions').setRequired(true).addChoices(
          { name: 'buttons', value: 'buttons' },
          { name: 'reactions', value: 'reactions' }
        ))
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post the role panel in'))
        .addStringOption(opt => opt.setName('title').setDescription('Panel title').setRequired(false))
        .addStringOption(opt => opt.setName('description').setDescription('Panel description').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add an item (emoji + role) to a setup')
        .addIntegerOption(opt => opt.setName('setup').setDescription('Setup ID').setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('Emoji (unicode or <:name:id>)').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true))
        .addStringOption(opt => opt.setName('label').setDescription('Label (buttons only)').setRequired(false))
    )
    .addSubcommand(sub => sub.setName('list').setDescription('List reaction-role setups in this server'))
    .addSubcommand(sub => sub.setName('view').setDescription('View a setup').addIntegerOption(opt => opt.setName('setup').setDescription('Setup ID').setRequired(true)))
    .addSubcommand(sub => sub.setName('delete').setDescription('Delete a setup').addIntegerOption(opt => opt.setName('setup').setDescription('Setup ID').setRequired(true)))
    .addSubcommand(sub => sub.setName('regen').setDescription('Regenerate (repost) the public message for a setup').addIntegerOption(opt => opt.setName('setup').setDescription('Setup ID').setRequired(true)))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove an item from a setup').addIntegerOption(opt => opt.setName('item').setDescription('Item ID').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await rrStorage.initStorage();

    const replyError = (text) => interaction.reply({ embeds: [new EmbedBuilder().setColor('Red').setDescription(text)], flags: 64 });

    try {
      if (sub === 'create') {
        const mode = interaction.options.getString('mode', true);
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const title = interaction.options.getString('title') ?? '';
        const description = interaction.options.getString('description') ?? '';

        if (!channel.isTextBased()) return replyError('Please pick a text channel.');
        if (!interaction.guild.members.me.permissionsIn(channel).has(['SendMessages', 'EmbedLinks'])) return replyError('I need Send Messages & Embed Links in target channel.');
        if (mode === 'reactions' && !interaction.guild.members.me.permissionsIn(channel).has('AddReactions')) return replyError('I need Add Reactions permission for reaction mode.');

        const setupId = await rrStorage.createSetup({
          guildId: interaction.guild.id,
          channelId: channel.id,
          mode,
          title,
          description,
          creatorId: interaction.user.id
        });

        // Auto-post initial panel message
        const setup = await rrStorage.getSetupById(setupId);
        const items = await rrStorage.listItems(setupId);
        const embed = panelEmbed({ ...setup, id: setupId }, items);

        const sent = await channel.send({ embeds: [embed] }).catch(err => { console.error('[rr] create send', err); return null; });
        if (sent && setup.mode === 'reactions') {
          // seed no reactions yet (items empty)
        }
        if (sent) {
          await rrStorage.updateSetupMessageId(setupId, sent.id);
        }

        return interaction.reply({ embeds: [new EmbedBuilder().setColor(ACCENT).setDescription(`✅ Setup created (ID **${setupId}**) and posted in ${channel}. Add items with \`/rr add\`.`)], flags: 64 });
      }

      // ------------------------------
// /rr add  (FULL UPDATED BLOCK)
// ------------------------------
if (sub === 'add') {
  const setupId = interaction.options.getInteger('setup', true);
  const emojiRaw = interaction.options.getString('emoji', true);
  const role = interaction.options.getRole('role', true);
  const label = interaction.options.getString('label') ?? null;

  const setup = await rrStorage.getSetupById(setupId);
  if (!setup || setup.guild_id !== interaction.guild.id)
    return replyError('Setup not found.');

  const items = await rrStorage.listItems(setupId);

  if (setup.mode === 'buttons' && items.length >= 5)
    return replyError('Button panels support a maximum of **5** buttons.');
  if (setup.mode === 'reactions' && items.length >= 10)
    return replyError('Reaction panels support a maximum of **10** emojis.');

  const botMember = interaction.guild.members.me;
  if (role.position >= botMember.roles.highest.position)
    return replyError('Move my role above that role so I can assign it.');

  const parsed = emojiUtil.parseEmoji(emojiRaw);
  if (!parsed) return replyError('Invalid emoji format.');

  const duplicate = await rrStorage.findItemByEmoji(setupId, parsed.identifier);
  if (duplicate) return replyError('This emoji is already used in this panel.');

  const itemId = await rrStorage.addItem({
    setupId,
    emoji: parsed.raw,
    emojiIdentifier: parsed.identifier,
    label,
    roleId: role.id,
    position: items.length
  });

  // Update public panel
  const updatedItems = await rrStorage.listItems(setupId);
  const embed = panelEmbed(setup, updatedItems);

  let components = [];
  if (setup.mode === 'buttons') {
    components = buildButtonsFromItems(
      interaction.client,
      interaction.guild.id,
      setupId,
      updatedItems
    );
  }

  if (setup.message_id) {
    const ch = await interaction.guild.channels.fetch(setup.channel_id).catch(() => null);
    if (ch && ch.isTextBased()) {
      const msg = await ch.messages.fetch(setup.message_id).catch(() => null);

      if (msg) {
        await msg.edit({ embeds: [embed], components });

        // Seed emoji reactions
        if (setup.mode === 'reactions') {
          await msg.react(parsed.raw).catch(() => {});
        }
      }
    }
  }

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(ACCENT)
        .setDescription(`🎉 Added ${parsed.raw} → <@&${role.id}> (item **${itemId}**)`)
    ],
    flags: 64
  });
}

      if (sub === 'list') {
        const rows = await rrStorage.listSetupsForGuild(interaction.guild.id);
        if (!rows.length) return interaction.reply({ embeds: [new EmbedBuilder().setColor(PANEL_COLOR).setDescription('No setups yet.')], flags: 64 });
        const lines = rows.map(r => `• ID ${r.id} — ${r.mode} — ${r.title ? r.title : '(no title)'} — channel: <#${r.channel_id}>`);
        const embed = new EmbedBuilder().setTitle('Reaction Role Setups').setColor(PANEL_COLOR).setDescription(lines.join('\n')).setFooter({ text: 'Use /rr view <id>' });
        return interaction.reply({ embeds: [embed], flags: 64 });
      }

      if (sub === 'view') {
        const setupId = interaction.options.getInteger('setup', true);
        const setup = await rrStorage.getSetupById(setupId);
        if (!setup || setup.guild_id !== interaction.guild.id) return replyError('Setup not found.');
        const items = await rrStorage.listItems(setupId);
        const embed = panelEmbed(setup, items);
        return interaction.reply({ embeds: [embed], flags: 64 });
      }

      if (sub === 'delete') {
        const setupId = interaction.options.getInteger('setup', true);
        const setup = await rrStorage.getSetupById(setupId);
        if (!setup || setup.guild_id !== interaction.guild.id) return replyError('Setup not found.');
        // attempt to delete public message
        if (setup.message_id) {
          const ch = await interaction.guild.channels.fetch(setup.channel_id).catch(() => null);
          if (ch && ch.isTextBased()) {
            const msg = await ch.messages.fetch(setup.message_id).catch(() => null);
            if (msg) msg.delete().catch(() => {});
          }
        }
        await rrStorage.deleteSetup(setupId);
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(ACCENT).setDescription(`✅ Deleted setup ${setupId}.`)], flags: 64 });
      }

      if (sub === 'regen') {
        const setupId = interaction.options.getInteger('setup', true);
        const setup = await rrStorage.getSetupById(setupId);
        if (!setup || setup.guild_id !== interaction.guild.id) return replyError('Setup not found.');

        const ch = await interaction.guild.channels.fetch(setup.channel_id).catch(() => null);
        if (!ch || !ch.isTextBased()) return replyError('Target channel not available.');
        const items = await rrStorage.listItems(setupId);
        const embed = panelEmbed(setup, items);

        // delete old if present
        if (setup.message_id) {
          const old = await ch.messages.fetch(setup.message_id).catch(() => null);
          if (old) await old.delete().catch(() => {});
        }

        const sent = await ch.send({ embeds: [embed] }).catch(err => { console.error('[rr] regen send', err); return null; });
        if (!sent) return replyError('Failed to post message (missing perms?).');

        // seed reactions for reaction mode
        if (setup.mode === 'reactions' && items.length) {
          for (const it of items) {
            try { await sent.react(it.emoji).catch(e => console.error('[rr] seed react', e)); } catch (e) {}
          }
        }

        await rrStorage.updateSetupMessageId(setupId, sent.id);
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(ACCENT).setDescription(`✅ Reposted panel in ${ch}.`)], flags: 64 });
      }

      if (sub === 'remove') {
        const itemId = interaction.options.getInteger('item', true);
        const item = await rrStorage.findItemById(itemId);
        if (!item) return replyError('Item not found.');
        const setup = await rrStorage.getSetupById(item.setup_id);
        if (!setup || setup.guild_id !== interaction.guild.id) return replyError('Setup not found or not in this guild.');

        // remove reaction from message if reaction mode and message exists
        if (setup.message_id && setup.mode === 'reactions') {
          const ch = await interaction.guild.channels.fetch(setup.channel_id).catch(() => null);
          if (ch && ch.isTextBased()) {
            const msg = await ch.messages.fetch(setup.message_id).catch(() => null);
            if (msg) {
              try {
                await msg.reactions.resolve(item.emoji)?.remove().catch(() => {});
              } catch {}
            }
          }
        }

        await rrStorage.removeItem(itemId);
        // edit public message
        if (setup.message_id) {
          const ch = await interaction.guild.channels.fetch(setup.channel_id).catch(() => null);
          if (ch && ch.isTextBased()) {
            const msg = await ch.messages.fetch(setup.message_id).catch(() => null);
            const items = await rrStorage.listItems(setup.id);
            const embed = panelEmbed(setup, items);
            if (msg) try { await msg.edit({ embeds: [embed] }); } catch (e) { console.error('[rr] edit after remove', e); }
          }
        }

        return interaction.reply({ embeds: [new EmbedBuilder().setColor(ACCENT).setDescription(`✅ Removed item ${itemId}.`)], flags: 64 });
      }

      return replyError('Unknown subcommand.');
    } catch (err) {
      console.error('[rr command] error', err);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('Red').setDescription('Internal error occurred.')], flags: 64 });
    }
  }
};