// src/commands/Information/help.js — Uranium Premium Help Menu v3.0
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

const HELP_JSON_PATH = path.join(__dirname, '..', '..', 'components', 'help.json');

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
      '**1.** Use the dropdown menu below to select a command category.',
      '**2.** Browse through the commands and their descriptions.',
      '**3.** Use pagination buttons (◀ ▶) if a category has many commands.',
      '**4.** Click __Back__ to return to the main menu.',
      '',
      '**Example:** `' + botInfo.name + ' ' + (helpData.categories?.[0]?.commands?.[0]?.split(' ')[0] || '/help') + '` to start.'
    ].join('\n'),
    inline: false
  });

  return embed;
}

function buildCategoryEmbed(helpData, category, interaction, page = 0) {
  const cmds = category.commands || [];
  const totalPages = Math.max(1, Math.ceil(cmds.length / 8));
  const start = page * 8;
  const slice = cmds.slice(start, start + 8);
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
      description: `${cmdsCount} command${cmdsCount === 1 ? '' : 's'} • Click to view`,
    };
    if (parsed) opt.emoji = { id: parsed.id, name: parsed.name };
    options.push(opt);
  }
  return options;
}

function makeToken() { return Math.random().toString(36).slice(2, 8); }

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('📖 Open the premium help menu'),
  async execute(interaction) {
    try {
      const helpData = safeLoadJson();
      if (!helpData) return interaction.reply({ content: '⚠️ Could not load help data.', flags: 64 });

      const categories = helpData.categories || [];
      if (!categories.length) return interaction.reply({ content: 'No categories configured.', flags: 64 });

      const token = makeToken();
      const selectId = `help_select_${interaction.user.id}_${token}`;

      const options = categories.slice(0, 25).map(cat => {
        const parsed = parseEmoji(cat.emoji);
        const cmdsCount = (cat.commands || []).length;
        const opt = {
          label: cat.id.substring(0, 100),
          value: cat.id,
          description: `${cmdsCount} command${cmdsCount === 1 ? '' : 's'} • Click to browse`
        };
        if (parsed) opt.emoji = { id: parsed.id, name: parsed.name };
        return opt;
      });

      const select = new StringSelectMenuBuilder()
        .setCustomId(selectId)
        .setPlaceholder('✨ Choose a category to explore...')
        .addOptions(options);

      const selectRow = new ActionRowBuilder().addComponents(select);

      const cleanDash = (process.env.DASHBOARD_URL || 'https://uraniumbot.vercel.app').replace(/\/+$/, '');
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Dashboard')
          .setStyle(ButtonStyle.Link)
          .setURL(`${cleanDash}/`)
          .setEmoji('🚀'),
        new ButtonBuilder()
          .setLabel('Invite')
          .setStyle(ButtonStyle.Link)
          .setURL(helpData.bot?.invite_url || 'https://discord.com')
          .setEmoji('📨'),
        new ButtonBuilder()
          .setLabel('Privacy')
          .setStyle(ButtonStyle.Link)
          .setURL(`${cleanDash}/privacy`)
          .setEmoji('📜'),
        new ButtonBuilder()
          .setLabel('Terms')
          .setStyle(ButtonStyle.Link)
          .setURL(`${cleanDash}/tos`)
          .setEmoji('⚖️'),
        new ButtonBuilder()
          .setLabel('Support')
          .setStyle(ButtonStyle.Link)
          .setURL(helpData.bot?.support_url || 'https://discord.gg/26ThFyckFX')
          .setEmoji('🛠️')
      );

      const mainEmbed = buildMainEmbed(helpData, interaction);
      await interaction.reply({ embeds: [mainEmbed], components: [selectRow, buttons], flags: 0 });
    } catch (err) {
      console.error('[help]', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '⚠️ Error opening help.', flags: 64 }).catch(() => {});
      }
    }
  }
};