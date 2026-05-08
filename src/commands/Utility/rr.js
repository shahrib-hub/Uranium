// src/commands/Utility/rr.js - REVAMPED
const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const rrStorage = require('../../utils/rrStorage');
const logger = require('../../utils/logger');

const PANEL_COLOR = 0x071022;
const ACCENT = 0x57f287;
const ERROR_COLOR = 0xED4245;

function panelEmbed(setup, items = [], stats = null) {
  const config = setup.config || {};
  const embed = new EmbedBuilder()
    .setTitle(config.customTitle || `🎭 Role Panel ${setup.title ? `— ${setup.title}` : ''}`)
    .setDescription(config.customDescription || setup.description || '*React or press a button to toggle roles*')
    .setColor(config.color || PANEL_COLOR);

  if (config.footerText) {
    embed.setFooter({ text: config.footerText });
  } else {
    embed.setFooter({ text: `MULTi-Bot • ID ${setup.id}` });
  }

  if (config.thumbnail) {
    embed.setThumbnail(config.thumbnail);
  }

  if (config.authorName) {
    const authorOpts = { name: config.authorName };
    if (config.authorIcon) authorOpts.iconURL = config.authorIcon;
    if (config.authorUrl) authorOpts.url = config.authorUrl;
    embed.setAuthor(authorOpts);
  }

  if (config.image) {
    embed.setImage(config.image);
  }

  embed.setTimestamp();

  if (items.length) {
    const formatMode = setup.mode === 'dropdown' ? '📋 Dropdown' : 
                       setup.mode === 'buttons' ? '🔘 Buttons' : '💬 Reactions';
    embed.addFields({ 
      name: `Options (${items.length}/25) • ${formatMode}`, 
      value: items.map(it => `${it.emoji} — <@&${it.role_id}>${it.description ? `\n   ${it.description}` : it.label ? ` — ${it.label}` : ''}`).join('\n'), 
      inline: false 
    });
  } else {
    embed.addFields({ name: 'Options', value: 'No items yet. Add items with `/rr add`.', inline: false });
  }

  // Config summary
  const configLines = [];
  if (config.maxPerUser > 0) configLines.push(`Max per user: ${config.maxPerUser}`);
  if (config.cooldownSeconds > 0) configLines.push(`Cooldown: ${config.cooldownSeconds}s`);
  if (config.allowMultiple === false) configLines.push(`Single choice only`);
  
  const getGroupCount = (maybeMap) => {
    if (maybeMap instanceof Map) return maybeMap.size;
    if (typeof maybeMap === 'object' && maybeMap !== null) return Object.keys(maybeMap).length;
    return 0;
  };
  
  const exclusiveCount = getGroupCount(config.exclusiveGroups);
  const requiredCount = getGroupCount(config.requiredRoles);
  if (exclusiveCount > 0) configLines.push(`Exclusive groups: ${exclusiveCount}`);
  if (requiredCount > 0) configLines.push(`Prerequisites: ${requiredCount}`);
  if (config.blockedRoles?.length) configLines.push(`Blocked roles: ${config.blockedRoles.length}`);
  
  if (configLines.length) {
    embed.addFields({ name: '⚙️ Configuration', value: configLines.join(' • '), inline: false });
  }

  if (stats) {
    const last24h = [];
    if (stats.grant) last24h.push(`✅ ${stats.grant} granted`);
    if (stats.revoke) last24h.push(`❌ ${stats.revoke} revoked`);
    if (last24h.length) embed.addFields({ name: '📊 Activity (24h)', value: last24h.join(' • '), inline: false });
  }

  return embed;
}

function buildButtonsFromItems(client, guildId, setupId, items) {
  if (!items || items.length === 0) return [];
  
  // Max 5 buttons per row, up to 25 total (Discord limit)
  const rows = [];
  const chunkSize = 5;
  // Map style index: 0=Primary,1=Secondary,2=Success,3=Danger,4=Link (not used)
  const styleMap = [ButtonStyle.Primary, ButtonStyle.Secondary, ButtonStyle.Success, ButtonStyle.Danger, ButtonStyle.Link];
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const row = new ActionRowBuilder();
    const chunk = items.slice(i, i + chunkSize);
    
    for (const it of chunk) {
      const btn = new ButtonBuilder()
        .setCustomId(`rr_btn:${guildId}:${setupId}:${it.id}`)
        .setStyle(styleMap[it.style] ?? ButtonStyle.Secondary)
        .setEmoji(it.emoji)
        .setDisabled(false);
      
      if (it.label) {
        btn.setLabel(it.label.substring(0, 80));
      }
      row.addComponents(btn);
    }
    rows.push(row);
  }
  
  return rows;
}

function buildDropdownFromItems(guildId, setupId, items) {
  if (!items || items.length === 0) return [];
  
  const select = new StringSelectMenuBuilder()
    .setCustomId(`rr_select:${guildId}:${setupId}`)
    .setPlaceholder('Select roles to toggle (select multiple)')
    .setMinValues(1)
    .setMaxValues(Math.min(25, items.length));

  for (const it of items.slice(0, 25)) {
    select.addOptions({
      label: (it.label || `Role ${it.id}`).substring(0, 100),
      value: String(it.id),
      emoji: it.emoji ? { name: it.emoji, id: it.emoji.includes('<') ? null : undefined } : undefined,
      description: (it.description || '').substring(0, 150)
    });
  }

  return [new ActionRowBuilder().addComponents(select)];
}

async function sendOrUpdatePanel(channel, setup, items, interaction) {
  const embed = panelEmbed(setup, items);
  let components = [];

  if (setup.mode === 'buttons') {
    components = buildButtonsFromItems(interaction.client, setup.guild_id, setup.id, items);
  } else if (setup.mode === 'dropdown') {
    components = buildDropdownFromItems(setup.guild_id, setup.id, items);
  }

  if (setup.message_id) {
    try {
      const msg = await channel.messages.fetch(setup.message_id).catch(() => null);
      if (msg) {
        await msg.edit({ embeds: [embed], components });
        
        // For reaction mode, sync reactions
        if (setup.mode === 'reactions' && items.length) {
          const msgEmojis = new Set((msg.reactions.cache.map(r => r.emoji.toString())).values());
          const itemEmojis = new Set(items.map(i => i.emoji));
          
          // Add missing reactions
          for (const item of items) {
            if (!msgEmojis.has(item.emoji)) {
              try { await msg.react(item.emoji).catch(() => {}); } catch {}
            }
          }
          
          // Remove extra reactions (if item was deleted)
          for (const [emojiStr, reaction] of msg.reactions.cache) {
            if (!itemEmojis.has(emojiStr)) {
              try { await reaction.remove().catch(() => {}); } catch {}
            }
          }
        }
        return;
      }
    } catch (err) {
      logger.warn('[RR] Failed to edit existing message %s: %s', setup.message_id, err.message);
    }
  }

  // Send new message
  const sent = await channel.send({ embeds: [embed], components });
  
  if (setup.mode === 'reactions' && items.length) {
    for (const item of items) {
      try { await sent.react(item.emoji).catch(() => {}); } catch {}
    }
  }

  await rrStorage.updateSetupMessageId(setup.id, sent.id);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rr')
    .setDescription('Reaction Roles manager (buttons, dropdowns, reactions)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a new reaction role panel')
        .addStringOption(opt => opt.setName('mode')
          .setDescription('Panel type')
          .setRequired(true)
          .addChoices(
            { name: '🔘 Buttons (max 5)', value: 'buttons' },
            { name: '📋 Dropdown (max 25)', value: 'dropdown' },
            { name: '💬 Reactions (max 20)', value: 'reactions' }
          ))
        .addChannelOption(opt => opt.setName('channel')
          .setDescription('Channel to post the panel (default: current)'))
        .addStringOption(opt => opt.setName('title').setDescription('Panel title'))
        .addStringOption(opt => opt.setName('description').setDescription('Panel description'))
        .addIntegerOption(opt => opt.setName('max-per-user')
          .setDescription('Max roles per user (0 = unlimited)').setMinValue(0).setMaxValue(25))
        .addBooleanOption(opt => opt.setName('unique')
          .setDescription('Users can only have 1 role from this panel (exclusive mode)'))
        // Embed customization
        .addStringOption(opt => opt.setName('embed-title').setDescription('Custom embed title (overrides default)'))
        .addStringOption(opt => opt.setName('embed-description').setDescription('Custom embed description (overrides default)'))
        .addIntegerOption(opt => opt.setName('embed-color')
          .setDescription('Embed color in hex (e.g., 581478)').setMinValue(0).setMaxValue(16777215))
        .addStringOption(opt => opt.setName('embed-footer').setDescription('Custom footer text'))
        .addStringOption(opt => opt.setName('embed-thumbnail').setDescription('Thumbnail URL (image)'))
        .addStringOption(opt => opt.setName('embed-author-name').setDescription('Author name'))
        .addStringOption(opt => opt.setName('embed-author-icon').setDescription('Author icon URL'))
        .addStringOption(opt => opt.setName('embed-author-url').setDescription('Author URL'))
        .addStringOption(opt => opt.setName('embed-image').setDescription('Large image URL'))
    )
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add an item (emoji + role) to a panel')
        .addIntegerOption(opt => opt.setName('setup').setDescription('Panel ID').setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('Emoji (unicode or custom)').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true))
        .addStringOption(opt => opt.setName('label').setDescription('Button label (buttons only)'))
        .addStringOption(opt => opt.setName('description').setDescription('Tooltip description'))
        .addIntegerOption(opt => opt.setName('style')
          .setDescription('Button style (0=primary,1=secondary,2=success,3=danger)')
          .setMinValue(0).setMaxValue(3))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove an item from a panel')
        .addIntegerOption(opt => opt.setName('item').setDescription('Item ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('Configure panel settings')
        .addIntegerOption(opt => opt.setName('setup').setDescription('Panel ID').setRequired(true))
        .addIntegerOption(opt => opt.setName('max-per-user')
          .setDescription('Max roles per user (0=unlimited)').setMinValue(0).setMaxValue(25))
        .addIntegerOption(opt => opt.setName('cooldown')
          .setDescription('Per-user cooldown seconds').setMinValue(0).setMaxValue(3600))
        .addBooleanOption(opt => opt.setName('unique')
          .setDescription('Single choice mode (mutually exclusive)'))
        .addStringOption(opt => opt.setName('blocked-roles')
          .setDescription('Comma-separated role IDs that cannot be self-assigned'))
        // Role policy (JSON encoded)
        .addStringOption(opt => opt.setName('exclusive-groups')
          .setDescription('JSON: {"groupName": ["roleId1","roleId2"]}'))
        .addStringOption(opt => opt.setName('required-roles')
          .setDescription('JSON: {"groupName": ["roleId1","roleId2"]}'))
        // Embed customization
        .addStringOption(opt => opt.setName('embed-title').setDescription('Custom embed title'))
        .addStringOption(opt => opt.setName('embed-description').setDescription('Custom embed description'))
        .addIntegerOption(opt => opt.setName('embed-color')
          .setDescription('Embed color in hex (e.g., 581478)').setMinValue(0).setMaxValue(16777215))
        .addStringOption(opt => opt.setName('embed-footer').setDescription('Custom footer text'))
        .addStringOption(opt => opt.setName('embed-thumbnail').setDescription('Thumbnail URL'))
        .addStringOption(opt => opt.setName('embed-author-name').setDescription('Author name'))
        .addStringOption(opt => opt.setName('embed-author-icon').setDescription('Author icon URL'))
        .addStringOption(opt => opt.setName('embed-author-url').setDescription('Author URL'))
        .addStringOption(opt => opt.setName('embed-image').setDescription('Large image URL'))
    )
    .addSubcommand(sub => sub.setName('list').setDescription('List all panels in this server'))
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View a panel details')
        .addIntegerOption(opt => opt.setName('setup').setDescription('Panel ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete a panel completely')
        .addIntegerOption(opt => opt.setName('setup').setDescription('Panel ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('regen')
        .setDescription('Repost/refresh a panel message')
        .addIntegerOption(opt => opt.setName('setup').setDescription('Panel ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('sync')
        .setDescription('Sync reaction emojis on a reactions panel')
        .addIntegerOption(opt => opt.setName('setup').setDescription('Panel ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('stats')
        .setDescription('View panel activity stats')
        .addIntegerOption(opt => opt.setName('setup').setDescription('Panel ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('reorder')
        .setDescription('Reorder items in a panel')
        .addIntegerOption(opt => opt.setName('item').setDescription('Item ID to move').setRequired(true))
        .addIntegerOption(opt => opt.setName('position').setDescription('New position (0-based)').setRequired(true).setMinValue(0))
    )
    .addSubcommand(sub =>
      sub.setName('bulkadd')
        .setDescription('Add multiple items at once')
        .addIntegerOption(opt => opt.setName('setup').setDescription('Panel ID').setRequired(true))
        .addStringOption(opt => opt.setName('items')
          .setDescription('JSON array: [{"emoji":"🎮","role":"roleID","label":"Valorant"}]').setRequired(true))
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    const replyError = (text) => interaction.reply({ 
      embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription(text)], 
      flags: 64 
    });

    const replySuccess = (text) => interaction.reply({ 
      embeds: [new EmbedBuilder().setColor(ACCENT).setDescription(text)], 
      flags: 64 
    });

    try {
      if (sub === 'create') {
        const mode = interaction.options.getString('mode', true);
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const title = interaction.options.getString('title') ?? '';
        const description = interaction.options.getString('description') ?? '';
        const maxPerUser = interaction.options.getInteger('max-per-user') || 0;
        const isUnique = interaction.options.getBoolean('unique') || false;

        if (!channel.isTextBased()) return replyError('Please pick a text channel.');
        if (!interaction.guild.members.me.permissionsIn(channel).has(['SendMessages', 'EmbedLinks'])) {
          return replyError('I need Send Messages & Embed Links in target channel.');
        }
        if (mode === 'reactions' && !interaction.guild.members.me.permissionsIn(channel).has('AddReactions')) {
          return replyError('I need Add Reactions permission for reaction mode.');
        }

        const config = {
          maxPerUser,
          allowMultiple: !isUnique,
          exclusiveGroups: isUnique ? { default: [] } : {},
          requiredRoles: {},
          blockedRoles: [],
          cooldownSeconds: 0,
          // Embed customization defaults
          color: null,
          customTitle: null,
          customDescription: null,
          footerText: null,
          thumbnail: null,
          authorName: null,
          authorIcon: null,
          authorUrl: null,
          image: null
        };

        // Apply embed customizations if provided
        const embedTitle = interaction.options.getString('embed-title');
        const embedDesc = interaction.options.getString('embed-description');
        const embedColor = interaction.options.getInteger('embed-color');
        const embedFooter = interaction.options.getString('embed-footer');
        const embedThumbnail = interaction.options.getString('embed-thumbnail');
        const embedAuthorName = interaction.options.getString('embed-author-name');
        const embedAuthorIcon = interaction.options.getString('embed-author-icon');
        const embedAuthorUrl = interaction.options.getString('embed-author-url');
        const embedImage = interaction.options.getString('embed-image');

        if (embedTitle) config.customTitle = embedTitle;
        if (embedDesc) config.customDescription = embedDesc;
        if (embedColor !== null) config.color = embedColor;
        if (embedFooter) config.footerText = embedFooter;
        if (embedThumbnail) config.thumbnail = embedThumbnail;
        if (embedAuthorName) config.authorName = embedAuthorName;
        if (embedAuthorIcon) config.authorIcon = embedAuthorIcon;
        if (embedAuthorUrl) config.authorUrl = embedAuthorUrl;
        if (embedImage) config.image = embedImage;

        const setupId = await rrStorage.createSetup({
          guildId: interaction.guild.id,
          channelId: channel.id,
          mode,
          title,
          description,
          creatorId: interaction.user.id,
          config
        });

        const setup = await rrStorage.getSetupById(setupId);
        const items = await rrStorage.listItems(setupId);
        const embed = panelEmbed(setup, items);

        const sent = await channel.send({ embeds: [embed] }).catch(err => {
          console.error('[rr] create send error:', err);
          return null;
        });

        if (sent) {
          await rrStorage.updateSetupMessageId(setupId, sent.id);
          if (mode === 'reactions' && items.length) {
            for (const it of items) {
              try { await sent.react(it.emoji).catch(() => {}); } catch {}
            }
          }
        }

        return replySuccess(`✅ Panel created (ID **${setupId}**) in ${channel}. Use \`/rr add\` to add items.`);
      }

      if (sub === 'add') {
        const setupId = interaction.options.getInteger('setup', true);
        const emojiRaw = interaction.options.getString('emoji', true);
        const role = interaction.options.getRole('role', true);
        const label = interaction.options.getString('label') ?? null;
        const description = interaction.options.getString('description') ?? null;
        const style = interaction.options.getInteger('style') ?? 0;

        const setup = await rrStorage.getSetupById(setupId);
        if (!setup || setup.guild_id !== interaction.guild.id) {
          return replyError('Panel not found or not in this server.');
        }

        const items = await rrStorage.listItems(setupId);
        
        const limits = { buttons: 5, dropdown: 25, reactions: 20 };
        if (items.length >= (limits[setup.mode] || 25)) {
          return replyError(`This panel type supports maximum ${limits[setup.mode]} items.`);
        }

        const botMember = interaction.guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
          return replyError('Move my role above that role to assign it.');
        }

        // Parse emoji robustly
        const parsed = parseEmojiAdvanced(emojiRaw);
        if (!parsed) return replyError('Invalid emoji format. Use Unicode or custom emoji format like <:name:id>.');

        // Check duplicate emoji (by raw or identifier)
        const duplicate = items.find(it => 
          it.emoji_identifier === parsed.identifier || it.emoji === parsed.raw
        );
        if (duplicate) return replyError('This emoji is already used in this panel.');

        const itemId = await rrStorage.addItem({
          setupId,
          emoji: parsed.raw,
          emojiIdentifier: parsed.identifier,
          label,
          roleId: role.id,
          position: items.length,
          style,
          description,
          metadata: { ...parsed }
        });

        // Update panel
        const updatedItems = await rrStorage.listItems(setupId);
        const channel = await interaction.guild.channels.fetch(setup.channel_id).catch(() => null);
        if (channel && channel.isTextBased()) {
          await sendOrUpdatePanel(channel, setup, updatedItems, interaction);
        }

        return replySuccess(`🎉 Added ${parsed.raw} → <@&${role.id}> (item **${itemId}**)`);
      }

      if (sub === 'remove') {
        const itemId = interaction.options.getInteger('item', true);
        const item = await rrStorage.findItemById(itemId);
        if (!item) return replyError('Item not found.');
        const setup = await rrStorage.getSetupById(item.setup_id);
        if (!setup || setup.guild_id !== interaction.guild.id) return replyError('Panel not found or wrong server.');

        await rrStorage.removeItem(itemId);

        if (setup.message_id) {
          const ch = await interaction.guild.channels.fetch(setup.channel_id).catch(() => null);
          if (ch && ch.isTextBased()) {
            const msg = await ch.messages.fetch(setup.message_id).catch(() => null);
            if (msg) {
              try {
                // For reactions mode, remove the emoji
                if (setup.mode === 'reactions') {
                  const reaction = msg.reactions.cache.get(item.emoji);
                  if (reaction) await reaction.remove().catch(() => {});
                }
              } catch {}
            }
          }
        }

        // Refresh message with new items
        if (setup.message_id) {
          const ch = await interaction.guild.channels.fetch(setup.channel_id).catch(() => null);
          if (ch && ch.isTextBased()) {
            const msg = await ch.messages.fetch(setup.message_id).catch(() => null);
            if (msg) {
              const items = await rrStorage.listItems(setup.id);
              await sendOrUpdatePanel(ch, setup, items, interaction);
            }
          }
        }

        return replySuccess(`✅ Removed item ${itemId}.`);
      }

      if (sub === 'config') {
        const setupId = interaction.options.getInteger('setup', true);
        const maxPerUser = interaction.options.getInteger('max-per-user');
        const cooldown = interaction.options.getInteger('cooldown');
        const unique = interaction.options.getBoolean('unique');
        const blockedRolesRaw = interaction.options.getString('blocked-roles');
        // Embed customization options
        const embedTitle = interaction.options.getString('embed-title');
        const embedDesc = interaction.options.getString('embed-description');
        const embedColor = interaction.options.getInteger('embed-color');
        const embedFooter = interaction.options.getString('embed-footer');
        const embedThumbnail = interaction.options.getString('embed-thumbnail');
        const embedAuthorName = interaction.options.getString('embed-author-name');
        const embedAuthorIcon = interaction.options.getString('embed-author-icon');
        const embedAuthorUrl = interaction.options.getString('embed-author-url');
        const embedImage = interaction.options.getString('embed-image');

        const setup = await rrStorage.getSetupById(setupId);
        if (!setup || setup.guild_id !== interaction.guild.id) return replyError('Panel not found.');
        
        const updates = { ...setup.config };
        if (maxPerUser !== null) updates.maxPerUser = maxPerUser;
        if (cooldown !== null) updates.cooldownSeconds = cooldown;
        if (unique !== null) updates.allowMultiple = !unique;
        if (blockedRolesRaw !== null) {
          updates.blockedRoles = blockedRolesRaw.split(',').map(r => r.trim()).filter(Boolean);
        }
        // Role policies (JSON)
        const exclusiveGroupsRaw = interaction.options.getString('exclusive-groups');
        const requiredRolesRaw = interaction.options.getString('required-roles');
        if (exclusiveGroupsRaw !== null) {
          try {
            updates.exclusiveGroups = new Map(Object.entries(JSON.parse(exclusiveGroupsRaw)));
          } catch (e) {
            return replyError('Invalid JSON for exclusive-groups.');
          }
        }
        if (requiredRolesRaw !== null) {
          try {
            updates.requiredRoles = new Map(Object.entries(JSON.parse(requiredRolesRaw)));
          } catch (e) {
            return replyError('Invalid JSON for required-roles.');
          }
        }
        // Embed customizations
        if (embedTitle !== null) updates.customTitle = embedTitle;
        if (embedDesc !== null) updates.customDescription = embedDesc;
        if (embedColor !== null) updates.color = embedColor;
        if (embedFooter !== null) updates.footerText = embedFooter;
        if (embedThumbnail !== null) updates.thumbnail = embedThumbnail;
        if (embedAuthorName !== null) updates.authorName = embedAuthorName;
        if (embedAuthorIcon !== null) updates.authorIcon = embedAuthorIcon;
        if (embedAuthorUrl !== null) updates.authorUrl = embedAuthorUrl;
        if (embedImage !== null) updates.image = embedImage;

        await rrStorage.updateSetupConfig(setupId, updates);
        return replySuccess(`⚙️ Configuration updated for panel **${setupId}**.`);
      }

      if (sub === 'list') {
        const rows = await rrStorage.listSetupsForGuild(interaction.guild.id);
        if (!rows.length) return interaction.reply({ embeds: [new EmbedBuilder().setColor(PANEL_COLOR).setDescription('No panels exist yet.')], flags: 64 });
        
        // Fetch item counts in parallel
        const lines = await Promise.all(rows.map(async (r) => {
          const itemCount = (await rrStorage.listItems(r.id)).length;
          return `> • **ID ${r.id}** — ${r.mode} — "${r.title || '(no title)'}" — ${itemCount} items — <#${r.channel_id}>`;
        }));
        
        const embed = new EmbedBuilder()
          .setTitle('📋 Reaction Role Panels')
          .setColor(PANEL_COLOR)
          .setDescription(lines.join('\n'))
          .setFooter({ text: 'Use /rr view <id> for details' });
        return interaction.reply({ embeds: [embed], flags: 64 });
      }

      if (sub === 'view') {
        const setupId = interaction.options.getInteger('setup', true);
        const setup = await rrStorage.getSetupById(setupId);
        if (!setup || setup.guild_id !== interaction.guild.id) return replyError('Panel not found.');
        const items = await rrStorage.listItems(setupId);
        const stats = await rrStorage.getSetupStats(setupId);
        const embed = panelEmbed(setup, items, stats);
        return interaction.reply({ embeds: [embed], flags: 64 });
      }

      if (sub === 'delete') {
        const setupId = interaction.options.getInteger('setup', true);
        const setup = await rrStorage.getSetupById(setupId);
        if (!setup || setup.guild_id !== interaction.guild.id) return replyError('Panel not found.');

        // Delete message if exists
        if (setup.message_id) {
          try {
            const ch = await interaction.guild.channels.fetch(setup.channel_id);
            if (ch?.isTextBased()) {
              const msg = await ch.messages.fetch(setup.message_id);
              if (msg) await msg.delete().catch(() => {});
            }
          } catch {}
        }

        await rrStorage.deleteSetup(setupId);
        return replySuccess(`🗑️ Deleted panel ${setupId} and all its items.`);
      }

      if (sub === 'regen') {
        const setupId = interaction.options.getInteger('setup', true);
        const setup = await rrStorage.getSetupById(setupId);
        if (!setup || setup.guild_id !== interaction.guild.id) return replyError('Panel not found.');

        const ch = await interaction.guild.channels.fetch(setup.channel_id).catch(() => null);
        if (!ch || !ch.isTextBased()) return replyError('Channel not available.');

        const items = await rrStorage.listItems(setupId);
        await sendOrUpdatePanel(ch, setup, items, interaction);
        return replySuccess(`📝 Reposted panel in ${ch}.`);
      }

      if (sub === 'sync') {
        const setupId = interaction.options.getInteger('setup', true);
        const setup = await rrStorage.getSetupById(setupId);
        if (!setup || setup.mode !== 'reactions') return replyError('Sync only works for reaction mode.');
        
        if (!setup.message_id) return replyError('No message linked. Use /rr regen first.');

        const ch = await interaction.guild.channels.fetch(setup.channel_id).catch(() => null);
        if (!ch || !ch.isTextBased()) return replyError('Channel not found.');

        const msg = await ch.messages.fetch(setup.message_id).catch(() => null);
        if (!msg) return replyError('Message not found (it may have been deleted).');

        const items = await rrStorage.listItems(setupId);
        let synced = 0;
        
        // Add missing reactions
        for (const item of items) {
          const exists = msg.reactions.cache.some(r => r.emoji.toString() === item.emoji);
          if (!exists) {
            try { await msg.react(item.emoji).catch(() => {}); synced++; } catch {}
          }
        }

        // Remove extra reactions
        for (const [emojiStr, reaction] of msg.reactions.cache) {
          const needed = items.some(it => it.emoji === emojiStr);
          if (!needed) {
            try { await reaction.remove().catch(() => {}); } catch {}
          }
        }

        return replySuccess(`🔄 Synced reactions. Added ${synced} missing reactions.`);
      }

      if (sub === 'stats') {
        const setupId = interaction.options.getInteger('setup', true);
        const setup = await rrStorage.getSetupById(setupId);
        if (!setup || setup.guild_id !== interaction.guild.id) return replyError('Panel not found.');

        const stats = await rrStorage.getSetupStats(setupId);
        const items = await rrStorage.listItems(setupId);
        
        const embed = new EmbedBuilder()
          .setTitle(`📊 Panel Stats — ID ${setupId}`)
          .setColor(PANEL_COLOR)
          .addFields(
            { name: 'Total Items', value: String(items.length), inline: true },
            { name: 'Mode', value: setup.mode, inline: true },
            { name: 'Channel', value: `<#${setup.channel_id}>`, inline: true }
          );

        if (Object.keys(stats).length) {
          const statsLines = Object.entries(stats).map(([action, count]) => {
            const emoji = { grant: '✅', revoke: '❌', fail: '⚠️', blocked: '🚫' }[action] || '•';
            return `${emoji} **${action.toUpperCase()}**: ${count}`;
          });
          embed.addFields({ name: 'Last 24h Activity', value: statsLines.join('\n'), inline: false });
        }

        return interaction.reply({ embeds: [embed], flags: 64 });
      }

      if (sub === 'reorder') {
        const itemId = interaction.options.getInteger('item', true);
        const newPos = interaction.options.getInteger('position', true);

        const item = await rrStorage.findItemById(itemId);
        if (!item) return replyError('Item not found.');
        const setup = await rrStorage.getSetupById(item.setup_id);
        if (!setup || setup.guild_id !== interaction.guild.id) return replyError('Panel not found or wrong server.');

        // Fetch all items and re-order
        const items = await rrStorage.listItems(item.setup_id);
        
        // Remove the item from its current position
        const filtered = items.filter(i => i.id !== itemId);
        
        // Clamp new position
        const clampedPos = Math.max(0, Math.min(newPos, filtered.length));
        
        // Insert at new position
        filtered.splice(clampedPos, 0, item);
        
        // Update all positions in DB (bulk)
        const updatePromises = filtered.map((it, idx) => 
          rrStorage.updateItem(it.id, { position: idx })
        );
        await Promise.all(updatePromises);

        // Refresh panel message
        if (setup.message_id) {
          const ch = await interaction.guild.channels.fetch(setup.channel_id).catch(() => null);
          if (ch && ch.isTextBased()) {
            const msg = await ch.messages.fetch(setup.message_id).catch(() => null);
            if (msg) {
              const updatedItems = await rrStorage.listItems(setup.id);
              await sendOrUpdatePanel(ch, setup, updatedItems, interaction);
            }
          }
        }

        return replySuccess(`✅ Reordered item ${itemId} to position ${clampedPos}.`);
      }

      if (sub === 'bulkadd') {
        const setupId = interaction.options.getInteger('setup', true);
        const itemsJson = interaction.options.getString('items', true);

        const setup = await rrStorage.getSetupById(setupId);
        if (!setup || setup.guild_id !== interaction.guild.id) return replyError('Panel not found.');

        let parsedItems;
        try {
          parsedItems = JSON.parse(itemsJson);
          if (!Array.isArray(parsedItems)) throw new Error('Must be array');
        } catch (e) {
          return replyError('Invalid JSON. Format: `[{"emoji":"🎮","role":"123456","label":"Valorant"}]`');
        }

        const currentItems = await rrStorage.listItems(setupId);
        const limits = { buttons: 5, dropdown: 25, reactions: 20 };
        const maxItems = limits[setup.mode] || 25;
        
        if (currentItems.length + parsedItems.length > maxItems) {
          return replyError(`Cannot add ${parsedItems.length} items. Panel would exceed limit of ${maxItems}.`);
        }

        const botMember = interaction.guild.members.me;
        if (!botMember) return replyError('Bot member unavailable.');

        let addedCount = 0;
        const errors = [];

        for (const item of parsedItems) {
          if (!item.emoji || !item.role) {
            errors.push(`Missing emoji or role in item #${addedCount+1}`);
            continue;
          }

          const role = interaction.guild.roles.cache.get(item.role);
          if (!role) {
            errors.push(`Role ${item.role} not found`);
            continue;
          }

          if (role.position >= botMember.roles.highest.position) {
            errors.push(`Role ${role.name} is above my highest role`);
            continue;
          }

          const parsed = parseEmojiAdvanced(item.emoji);
          if (!parsed) {
            errors.push(`Invalid emoji: ${item.emoji}`);
            continue;
          }

          try {
            await rrStorage.addItem({
              setupId,
              emoji: parsed.raw,
              emojiIdentifier: parsed.identifier,
              label: item.label || null,
              roleId: role.id,
              position: currentItems.length + addedCount,
              style: item.style || 0,
              description: item.description || null,
              metadata: { ...parsed, ...(item.metadata || {}) }
            });
            addedCount++;
          } catch (err) {
            errors.push(`Failed to add ${item.emoji}: ${err.message}`);
          }
        }

        // Update panel message
        const ch = await interaction.guild.channels.fetch(setup.channel_id).catch(() => null);
        if (ch && ch.isTextBased()) {
          const updatedItems = await rrStorage.listItems(setupId);
          await sendOrUpdatePanel(ch, setup, updatedItems, interaction);
        }

        let response = `✅ Added ${addedCount} item(s) to panel.`;
        if (errors.length) {
          response += `\n⚠️ Errors (${errors.length}):\n` + errors.slice(0, 5).join('\n');
        }

        return replySuccess(response);
      }

      return replyError('Unknown subcommand.');
    } catch (err) {
      logger.error('[RR Command] Error in %s: %s', sub, err.stack || err.message);
      return interaction.reply({ 
        embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription('❌ An unexpected error occurred. Check logs.')], 
        flags: 64 
      });
    }
  }
};

// Helper: Parse emoji string into standardized format
function parseEmojiAdvanced(input) {
  if (!input) return null;
  input = input.trim();

  // Match custom emoji: <a:name:id> or <:name:id>
  const customMatch = input.match(/<(a)?:([\w-]+):([0-9]+)>/);
  if (customMatch) {
    const animated = Boolean(customMatch[1]);
    const name = customMatch[2];
    const id = customMatch[3];
    return {
      raw: input,
      identifier: `${name}:${id}`,
      isCustom: true,
      name,
      id,
      animated
    };
  }

  // Match "name:id" format
  if (/^[\w-]+:[0-9]+$/.test(input)) {
    const [name, id] = input.split(':');
    return {
      raw: `<:${name}:${id}>`,
      identifier: `${name}:${id}`,
      isCustom: true,
      name,
      id
    };
  }

  // Unicode emoji (or multi-codepoint sequence)
  return {
    raw: input,
    identifier: input,
    isCustom: false
  };
}
