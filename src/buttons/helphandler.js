// src/buttons/helphandler.js — Uranium Help Menu Handler (Premium v3.0)
const path = require('path');
const fs = require('fs');
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const HELP_JSON_PATH = path.join(__dirname, '..', 'components', 'help.json');

function safeLoadJson() {
  try { return JSON.parse(fs.readFileSync(HELP_JSON_PATH, 'utf8')); }
  catch { return null; }
}

function parseEmoji(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const m = raw.match(/^<a?:([\w~]+):(\d+)>$/);
  if (!m) return null;
  return { id: m[2], name: m[1] };
}

function countCommands(categories = []) {
  return categories.reduce((acc, c) => acc + (Array.isArray(c.commands) ? c.commands.length : 0), 0);
}

function formatUptime(ms) {
  if (!ms && ms !== 0) return '0m';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function buildMainEmbed(helpData, interaction) {
  const botInfo = helpData.bot || {};
  const totalCommands = countCommands(helpData.categories || []);
  const botUser = interaction.client?.user;
  const author = interaction.user;
  const guilds = interaction.client.guilds.cache.size;
  const users = interaction.client.guilds.cache.reduce((s, g) => s + g.memberCount, 0);

  const embed = new EmbedBuilder()
    .setColor(0x2F3136)
    .setTitle(`✺ ${botInfo.name || 'Uranium'} — Command Center`)
    .setDescription([
      '```ansi',
      '\u001b[1;35m╔══════════════════════════════════════╗',
      `║   \u001b[1;33m🤖 ${(botInfo.name || 'Uranium').padEnd(25)}\u001b[0;35m║`,
      '║   \u001b[0;37mYour premium Discord companion\u001b[0;35m      ║',
      '╚══════════════════════════════════════╝\u001b[0m',
      '```',
      '',
      '**__📖 Quick Navigation__**',
      '> Select a category from the dropdown below to browse all commands.',
      '> Only **you** can interact with this panel.',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    ].join('\n'))
    .setThumbnail(botUser?.displayAvatarURL?.({ size: 256 }))
    .addFields(
      {
        name: '⚡ Bot Statistics',
        value: [
          `> \`📦 Version:\` **v${botInfo.version || '2.0'}**`,
          `> \`🔧 Developer:\` **${botInfo.developer || 'SHM'}**`,
          `> \`📊 Commands:\` **${totalCommands}** total`,
          `> \`🌐 Servers:\` **${guilds.toLocaleString()}**`,
          `> \`👥 Users:\` **${users.toLocaleString()}**`,
          `> \`⏱ Uptime:\` **${formatUptime(interaction.client.uptime || 0)}**`
        ].join('\n'),
        inline: false
      }
    )
    .setAuthor({ name: `Requested by ${author.username}`, iconURL: author.displayAvatarURL({ dynamic: true, size: 128 }) })
    .setFooter({ text: `⚡ Uranium • Made with 💜 by ${botInfo.developer || 'SHM'} • ${new Date().toLocaleDateString()}` })
    .setTimestamp();

  embed.addFields({
    name: '💡 How to Use',
    value: [
      '**1.** Pick a command category using the dropdown below',
      '**2.** Browse through all commands in that category',
      '**3.** See detailed descriptions for each command',
      '**4.** Use the pagination buttons to navigate through long lists',
      '**5.** Click **Back** to return to the main menu',
      '',
      '✦ **Tip:** Commands are shown as they should be typed in chat.'
    ].join('\n'),
    inline: false
  });

  return embed;
}

function buildCategoryEmbed(category, page = 0, perPage = 8, interaction = null) {
  const cmds = category.commands || [];
  const totalPages = Math.max(1, Math.ceil(cmds.length / perPage));
  const start = page * perPage;
  const slice = cmds.slice(start, start + perPage);
  const botUser = interaction?.client?.user;

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`${category.emoji || '📁'} **${category.id}**`)
    .setDescription([
      `> **${cmds.length}** command${cmds.length === 1 ? '' : 's'} in this category`,
      `> Page **${page + 1}** of **${totalPages}**`,
      '',
      '╰─' + '─'.repeat(40)
    ].join('\n'))
    .setFooter({ text: `Page ${page + 1} of ${totalPages} • ${cmds.length} total commands` })
    .setTimestamp();

  if (botUser) {
    embed.setThumbnail(botUser.displayAvatarURL({ size: 256 }));
  }

  if (!cmds.length) {
    embed.setDescription('> ⚠️ No commands have been added to this category yet.');
    return embed;
  }

  const fields = [];
  for (let i = 0; i < slice.length; i++) {
    const cmd = slice[i];
    const [command, desc] = cmd.split(' — ');
    const num = start + i + 1;

    fields.push({
      name: `${num.toString().padStart(3, '0')}. ${command}`,
      value: `> ${desc || 'No description available'}`,
      inline: false
    });
  }

  embed.addFields(fields);
  return embed;
}

function buildSelectOptions(categories) {
  const options = [];
  for (const cat of categories) {
    if (options.length >= 25) break;
    const parsed = parseEmoji(cat.emoji);
    const cmdsCount = (cat.commands || []).length;
    const opt = {
      label: cat.id.length > 25 ? cat.id.substring(0, 22) + '...' : cat.id,
      value: cat.id,
      description: `${cmdsCount} command${cmdsCount === 1 ? '' : 's'} • Click to view all`
    };
    if (parsed) opt.emoji = { id: parsed.id, name: parsed.name };
    options.push(opt);
  }
  return options;
}

function makeToken() { return Math.random().toString(36).slice(2, 8); }

module.exports = async function helpHandler(interaction) {
  try {
    const helpData = safeLoadJson();
    if (!helpData) {
      if (interaction.isRepliable && !interaction.replied) {
        return interaction.reply({ content: '⚠️ Help data missing on host. Contact developer.', flags: 64 });
      }
      return;
    }

    const categories = helpData.categories || [];

    // SELECT (category chosen)
    if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
      const cid = interaction.customId || '';
      if (!cid.startsWith('help_select_')) return;

      const parts = cid.split('_');
      const expectedUser = parts[2];
      if (expectedUser && expectedUser !== interaction.user.id) {
        return interaction.reply({ content: 'Only the original requester may interact with this help menu.', flags: 64 });
      }

      const token = parts[3] || makeToken();
      const chosen = interaction.values[0];
      const category = categories.find(c => c.id === chosen);
      if (!category) return interaction.update({ content: 'Category not found.', embeds: [], components: [] });

      const prevId = `help_prev_${interaction.user.id}_${token}`;
      const nextId = `help_next_${interaction.user.id}_${token}`;
      const backId = `help_back_${interaction.user.id}_${token}`;
      const selectId = `help_select_${interaction.user.id}_${token}`;

      const perPage = 8;
      const totalPages = Math.max(1, Math.ceil((category.commands || []).length / perPage));

      const prevBtn = new ButtonBuilder().setCustomId(prevId).setLabel('◀ Previous').setStyle(ButtonStyle.Primary).setDisabled(true);
      const nextBtn = new ButtonBuilder().setCustomId(nextId).setLabel('Next ▶').setStyle(ButtonStyle.Primary).setDisabled(totalPages <= 1);
      const backBtn = new ButtonBuilder().setCustomId(backId).setLabel('Back').setStyle(ButtonStyle.Secondary);
      const navRow = new ActionRowBuilder().addComponents(prevBtn, backBtn, nextBtn);

      const selectOptions = buildSelectOptions(categories);
      const select = new StringSelectMenuBuilder().setCustomId(selectId).setPlaceholder('✨ Choose a category...').addOptions(selectOptions);
      const selectRow = new ActionRowBuilder().addComponents(select);

      return interaction.update({ embeds: [buildCategoryEmbed(category, 0, perPage, interaction)], components: [selectRow, navRow] });
    }

    // BUTTONS (prev/next/back)
    if (interaction.isButton && interaction.isButton()) {
      const id = interaction.customId || '';
      if (!id.startsWith('help_prev_') && !id.startsWith('help_next_') && !id.startsWith('help_back_')) {
        return;
      }

      const parts = id.split('_');
      const action = parts[1];
      const expectedUser = parts[2];
      const token = parts[3] || '';

      if (expectedUser && expectedUser !== interaction.user.id) {
        return interaction.reply({ content: 'Only the original requester may interact with this help menu.', flags: 64 });
      }

      const message = interaction.message;
      const embed = message?.embeds?.[0];
      if (!embed) {
        const mainEmbed = buildMainEmbed(helpData, interaction);
        const selectOptions = buildSelectOptions(categories);
        const selectId = `help_select_${interaction.user.id}_${token || makeToken()}`;
        const select = new StringSelectMenuBuilder().setCustomId(selectId).setPlaceholder('✨ Choose a category...').addOptions(selectOptions);
        const selectRow = new ActionRowBuilder().addComponents(select);
        const invite = helpData.bot?.invite_url || 'https://discord.com';
        const support = helpData.bot?.support_url || 'https://discord.com';
        const links = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('Invite').setStyle(ButtonStyle.Link).setURL(invite).setEmoji('📨'),
          new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL(support).setEmoji('🛠️')
        );
        return interaction.update({ embeds: [mainEmbed], components: [selectRow, links] });
      }

      const title = embed.title || '';
      let currentCategory = null;
      for (const c of categories) {
        if (title.includes(c.id)) {
          currentCategory = c;
          break;
        }
      }

      if (!currentCategory) {
        const mainEmbed = buildMainEmbed(helpData, interaction);
        const selectOptions = buildSelectOptions(categories);
        const selectId = `help_select_${interaction.user.id}_${token || makeToken()}`;
        const select = new StringSelectMenuBuilder().setCustomId(selectId).setPlaceholder('✨ Choose a category...').addOptions(selectOptions);
        const selectRow = new ActionRowBuilder().addComponents(select);
        const invite = helpData.bot?.invite_url || 'https://discord.com';
        const support = helpData.bot?.support_url || 'https://discord.com';
        const links = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('Invite').setStyle(ButtonStyle.Link).setURL(invite).setEmoji('📨'),
          new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL(support).setEmoji('🛠️')
        );
        return interaction.update({ embeds: [mainEmbed], components: [selectRow, links] });
      }

      let page = 0;
      const footer = embed.footer?.text || '';
      const m = footer.match(/Page\s+(\d+)\s+of\s+(\d+)/i);
      if (m) page = Math.max(0, parseInt(m[1], 10) - 1);

      const perPage = 8;
      const totalPages = Math.max(1, Math.ceil((currentCategory.commands || []).length / perPage));

      if (action === 'prev') page = Math.max(0, page - 1);
      else if (action === 'next') page = Math.min(totalPages - 1, page + 1);
      else if (action === 'back') {
        const mainEmbed = buildMainEmbed(helpData, interaction);
        const selectOptions = buildSelectOptions(categories);
        const selectId = `help_select_${interaction.user.id}_${token}`;
        const select = new StringSelectMenuBuilder().setCustomId(selectId).setPlaceholder('✨ Choose a category...').addOptions(selectOptions);
        const selectRow = new ActionRowBuilder().addComponents(select);
        const invite = helpData.bot?.invite_url || 'https://discord.com';
        const support = helpData.bot?.support_url || 'https://discord.com';
        const links = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('Invite').setStyle(ButtonStyle.Link).setURL(invite).setEmoji('📨'),
          new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL(support).setEmoji('🛠️')
        );
        return interaction.update({ embeds: [mainEmbed], components: [selectRow, links] });
      }

      const prevBtn = new ButtonBuilder().setCustomId(`help_prev_${interaction.user.id}_${token}`).setLabel('◀ Previous').setStyle(ButtonStyle.Primary).setDisabled(page <= 0);
      const nextBtn = new ButtonBuilder().setCustomId(`help_next_${interaction.user.id}_${token}`).setLabel('Next ▶').setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages - 1);
      const backBtn = new ButtonBuilder().setCustomId(`help_back_${interaction.user.id}_${token}`).setLabel('Back').setStyle(ButtonStyle.Secondary);
      const navRow = new ActionRowBuilder().addComponents(prevBtn, backBtn, nextBtn);

      const selectOptions2 = buildSelectOptions(categories);
      const select2 = new StringSelectMenuBuilder().setCustomId(`help_select_${interaction.user.id}_${token}`).setPlaceholder('✨ Choose a category...').addOptions(selectOptions2);
      const selectRow2 = new ActionRowBuilder().addComponents(select2);

       return interaction.update({ embeds: [buildCategoryEmbed(currentCategory, page, perPage, interaction)], components: [selectRow2, navRow] });
    }

    return;
  } catch (err) {
    try {
      if (interaction.isRepliable && !interaction.replied) return interaction.reply({ content: 'Help handler error', flags: 64 });
      if (interaction.isRepliable && interaction.replied) return interaction.followUp({ content: 'Help handler error', flags: 64 });
    } catch (_) {}
  }
};