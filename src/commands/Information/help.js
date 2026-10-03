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

function buildHomeButtons(helpData) {
  const cleanDash = (process.env.DASHBOARD_URL || 'https://uraniumbot.vercel.app').replace(/\/+$/, '');
  const invite = helpData.bot?.invite_url || 'https://discord.com/oauth2/authorize?client_id=932136827605905489&scope=bot%20applications.commands&permissions=8';
  const support = helpData.bot?.support_url || 'https://discord.gg/26ThFyckFX';

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Dashboard')
      .setStyle(ButtonStyle.Link)
      .setURL(`${cleanDash}/`)
      .setEmoji('🚀'),
    new ButtonBuilder()
      .setLabel('Invite')
      .setStyle(ButtonStyle.Link)
      .setURL(invite)
      .setEmoji('📨'),
    new ButtonBuilder()
      .setLabel('Support')
      .setStyle(ButtonStyle.Link)
      .setURL(support)
      .setEmoji('🛠️')
  );
}

function buildMainEmbed(helpData, interaction) {
  const botInfo = helpData.bot || {};
  const categories = helpData.categories || [];
  const totalCommands = countCommands(categories);
  const botUser = interaction.client?.user;
  const author = interaction.user;
  const guilds = interaction.client.guilds.cache.size;
  const users = interaction.client.guilds.cache.reduce((s, g) => s + (g.memberCount || 0), 0);
  const ping = interaction.client.ws?.ping ?? -1;
  const pingDisplay = ping >= 0 ? `${ping}ms` : 'Connecting...';
  const cleanDash = (process.env.DASHBOARD_URL || 'https://uraniumbot.vercel.app').replace(/\/+$/, '');

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({
      name: `${botInfo.name || 'Uranium'} • Command Center`,
      iconURL: botUser?.displayAvatarURL?.({ size: 128 }),
      url: cleanDash
    })
    .setTitle(`⚡ ${botInfo.name || 'Uranium'} — Interactive Command Center`)
    .setDescription([
      '### ✦ Enterprise Discord Companion',
      '> **Your all-in-one powerhouse for moderation, economy, security & web management.**',
      '> Engineered for high performance with real-time audit logging, automated defense shields, and full dashboard integration.',
      '',
      'Select a category from the dropdown menu below to view available commands.'
    ].join('\n'))
    .setThumbnail(botUser?.displayAvatarURL?.({ size: 256 }))
    .addFields(
      {
        name: '📊 Network Metrics',
        value: [
          `> 🌐 **Servers:** \`${guilds.toLocaleString()}\``,
          `> 👥 **Users:** \`${users.toLocaleString()}\``,
          `> ⚡ **Latency:** \`${pingDisplay}\``
        ].join('\n'),
        inline: true
      },
      {
        name: '⚙️ Core Engine',
        value: [
          `> 📦 **Version:** \`v${botInfo.version || '2.0.0'}\``,
          `> ⏱️ **Uptime:** \`${formatUptime(interaction.client.uptime || 0)}\``,
          `> 🔧 **Developer:** \`${botInfo.developer || 'SHM'}\``
        ].join('\n'),
        inline: true
      },
      {
        name: '📂 Command Registry',
        value: [
          `> 📁 **Suites:** \`${categories.length} Modules\``,
          `> 📜 **Commands:** \`${totalCommands} Total\``,
          `> 🔒 **Interface:** \`Slash (/) Ready\``
        ].join('\n'),
        inline: true
      },
      {
        name: '🌟 Core Module Highlights',
        value: [
          '• `🛡️ Moderation` — Warnings, bans, timeouts, audit logs & sanctions',
          '• `🤖 AutoMod` — Anti-spam, anti-raid, strike escalation & auto-quarantine',
          '• `💰 Economy` — Dynamic economy, jobs, shop, inventory & casino',
          '• `🎫 Tickets` — Interactive ticket panels, transcripts & rating feedback',
          '• `🎵 Music & Fun` — High-fidelity audio playback, filters & social mini-games'
        ].join('\n'),
        inline: false
      },
      {
        name: '💡 Quick Navigation Guide',
        value: [
          '`1.` **Select a Module:** Use the select menu below to explore commands in any category.',
          '`2.` **Browse Pages:** Use **◀ Previous** and **Next ▶** buttons for large categories.',
          '`3.` **Return Home:** Click **Back** at any time to return to this overview.',
          '`4.` **Run Commands:** All commands can be triggered directly using `/command` in chat.'
        ].join('\n'),
        inline: false
      }
    )
    .setFooter({
      text: `Requested by ${author.username} • Session locked to you`,
      iconURL: author.displayAvatarURL({ dynamic: true, size: 128 })
    })
    .setTimestamp();

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
    .setTitle(`${category.emoji || '📁'} **${category.id} Commands**`)
    .setDescription([
      `> 📂 Category: **${category.id}** • **${cmds.length}** total command${cmds.length === 1 ? '' : 's'}`,
      `> 📄 Page **${page + 1}** of **${totalPages}**`,
      '',
      'Select another category from the dropdown or click **Back** to return home.'
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
      name: `${num.toString().padStart(2, '0')}. ${command}`,
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
      label: cat.id.substring(0, 100),
      value: cat.id,
      description: `${cmdsCount} command${cmdsCount === 1 ? '' : 's'} • Click to browse`
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
      const selectOptions = buildSelectOptions(categories);

      const select = new StringSelectMenuBuilder()
        .setCustomId(selectId)
        .setPlaceholder('✨ Select a module to explore commands...')
        .addOptions(selectOptions);

      const selectRow = new ActionRowBuilder().addComponents(select);
      const buttons = buildHomeButtons(helpData);
      const mainEmbed = buildMainEmbed(helpData, interaction);

      await interaction.reply({ embeds: [mainEmbed], components: [selectRow, buttons], flags: 0 });
    } catch (err) {
      console.error('[help]', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '⚠️ Error opening help.', flags: 64 }).catch(() => {});
      }
    }
  },
  buildMainEmbed,
  buildCategoryEmbed,
  buildSelectOptions,
  buildHomeButtons,
  safeLoadJson,
  countCommands,
  formatUptime,
  parseEmoji,
  makeToken
};