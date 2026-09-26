// src/commands/Utility/bot.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const os = require('os');
const moment = require('moment'); // keep; install if you don't have it
const pkg = require('../../../package.json'); // adjust path if needed

const START_TIME = Date.now();

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatDuration(ms) {
  const d = moment.duration(ms);
  const parts = [];
  if (d.years()) parts.push(`${d.years()}y`);
  if (d.months()) parts.push(`${d.months()}mo`);
  if (d.days()) parts.push(`${d.days()}d`);
  if (d.hours()) parts.push(`${d.hours()}h`);
  if (d.minutes()) parts.push(`${d.minutes()}m`);
  parts.push(`${d.seconds()}s`);
  return parts.join(' ');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bot')
    .setDescription('Bot-related commands and info (uptime, stats, invite, etc.)')
    .addSubcommand(sub =>
      sub.setName('uptime').setDescription('Check how long the bot has been running')
    )
    .addSubcommand(sub =>
      sub.setName('ping').setDescription('Check the bot\'s latency')
    )
    .addSubcommand(sub =>
      sub.setName('stats').setDescription('View bot performance and usage stats')
    )
    .addSubcommand(sub =>
      sub.setName('info').setDescription('Get general information about the bot')
    )
    .addSubcommand(sub =>
      sub.setName('dashboard').setDescription('Get the link to the web dashboard')
    )
    .addSubcommand(sub =>
      sub.setName('version').setDescription('Show the current bot version and environment')
    )
    .addSubcommand(sub =>
      sub.setName('developer').setDescription('Show info about the bot developer')
    )
    .addSubcommand(sub =>
      sub.setName('invite').setDescription('Get the bot\'s invite link')
    )
    .addSubcommand(sub =>
      sub.setName('settings')
        .setDescription('Manage bot settings for this server (Manager only)')
        .addStringOption(opt => 
          opt.setName('language')
             .setDescription('Select the default language for bot responses')
             .setRequired(false)
             .addChoices(
               { name: 'English', value: 'en' },
               { name: 'Hindi', value: 'hi' },
               { name: 'Bangla', value: 'bn' },
               { name: 'Spanish', value: 'es' },
               { name: 'French', value: 'fr' },
               { name: 'German', value: 'de' },
               { name: 'Russian', value: 'ru' },
               { name: 'Japanese', value: 'ja' },
               { name: 'Korean', value: 'ko' },
               { name: 'Arabic', value: 'ar' },
               { name: 'Portuguese', value: 'pt' },
               { name: 'Italian', value: 'it' },
               { name: 'Turkish', value: 'tr' },
               { name: 'Polish', value: 'pl' },
               { name: 'Vietnamese', value: 'vi' },
               { name: 'Dutch', value: 'nl' }
             )
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const client = interaction.client;

    // small safe helpers
    const botAvatar = client.user?.displayAvatarURL?.({ size: 1024 }) || null;
    const developerCredit = 'Made by SHM'; // per your preference for footers

    // UPTIME
    if (sub === 'uptime') {
      // prefer client's uptime if available
      const msUptime = (client.uptime != null && client.uptime > 0) ? client.uptime : (Date.now() - START_TIME);
      const pretty = formatDuration(msUptime);
      const startedAt = new Date(Date.now() - msUptime);

      const embed = new EmbedBuilder()
        .setTitle('🕒 Bot Uptime')
        .setDescription(`I have been online for **${pretty}**`)
        .addFields(
          { name: 'Started', value: `<t:${Math.floor(startedAt.getTime() / 1000)}:F>`, inline: true },
          { name: 'Since (relative)', value: `<t:${Math.floor(startedAt.getTime() / 1000)}:R>`, inline: true }
        )
        .setColor(0x57F287) // Green
        .setThumbnail(botAvatar)
        .setFooter({ text: developerCredit });

      return interaction.reply({ embeds: [embed] });
    }

    // PING
    if (sub === 'ping') {
      const websocket = Math.round(client.ws?.ping ?? 0);
      const apiLatency = Date.now() - interaction.createdTimestamp;
      const cpu = os.loadavg()[0].toFixed(2);

      const embed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setDescription('Latency & responsiveness snapshot')
        .addFields(
          { name: 'WebSocket Latency', value: `\`${websocket} ms\``, inline: true },
          { name: 'API / Interaction Latency', value: `\`${apiLatency} ms\``, inline: true },
          { name: 'CPU Load (1m)', value: `${cpu}`, inline: true }
        )
        .setColor(0x5865F2) // Blurple-ish
        .setThumbnail(botAvatar)
        .setFooter({ text: developerCredit });

      return interaction.reply({ embeds: [embed] });
    }

    // STATS
    if (sub === 'stats') {
      const mem = process.memoryUsage();
      const heapUsed = formatBytes(mem.heapUsed);
      const heapTotal = formatBytes(mem.heapTotal);
      const rss = formatBytes(mem.rss);
      const nodeVer = process.version;
      const cpuModel = os.cpus()[0]?.model || 'Unknown';
      const cpuCount = os.cpus().length;
      const up = formatDuration(process.uptime() * 1000);

      // attempt to read some client counts (may not exist depending on your loader)
      const guildCount = client.guilds?.cache?.size ?? 'N/A';
      const userCount = client.users?.cache?.size ?? 'N/A';
      const commandCount = (client.commands && typeof client.commands.size === 'number') ? client.commands.size : 'N/A';

      const embed = new EmbedBuilder()
        .setTitle('📊 Bot Stats')
        .setDescription('Live performance metrics & usage')
        .addFields(
          { name: 'Servers', value: `${guildCount}`, inline: true },
          { name: 'Cached Users', value: `${userCount}`, inline: true },
          { name: 'Commands Loaded', value: `${commandCount}`, inline: true },

          { name: 'Memory (heap used / total)', value: `${heapUsed} / ${heapTotal}`, inline: true },
          { name: 'RSS', value: `${rss}`, inline: true },
          { name: 'Process Uptime', value: `${up}`, inline: true },

          { name: 'Node.js', value: `${nodeVer}`, inline: true },
          { name: 'CPU', value: `${cpuModel} (${cpuCount} cores)`, inline: false }
        )
        .setColor(0xF1C40F) // Yellow
        .setThumbnail(botAvatar)
        .setFooter({ text: developerCredit })
        .setTimestamp();

      // add a small action row: invite & support server (if envs are set)
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Dashboard')
          .setStyle(ButtonStyle.Link)
          .setURL('https://uraniumbot.vercel.app/')
          .setEmoji('🚀'),
        new ButtonBuilder()
          .setLabel('Invite')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`),
        new ButtonBuilder()
          .setLabel('Support')
          .setStyle(ButtonStyle.Link)
          .setURL(process.env.SUPPORT_SERVER_URL || 'https://discord.gg/26ThFyckFX') // set SUPPORT_SERVER_URL in .env
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // INFO
    if (sub === 'info') {
      const cmdCount = (client.commands && typeof client.commands.size === 'number') ? client.commands.size : 'N/A';
      const uptimePretty = formatDuration(client.uptime ?? (Date.now() - START_TIME));

      let pers = null;
      try {
        const personalizationStorage = require('../../utils/personalizationStorage');
        if (interaction.guildId) {
          pers = await personalizationStorage.getPersonalization(interaction.guildId);
        }
      } catch {
        // ignore
      }

      const botName = pers?.nickname || client.user?.username || 'Uranium';
      const botAvatarUrl = pers?.avatarUrl || botAvatar;
      const serverBio = pers?.bio?.trim();

      const descLines = [];
      if (serverBio) {
        descLines.push(`> 💬 *"${serverBio}"*\n`);
      }
      descLines.push(`${botName} is your all-in-one Discord assistant — packed with moderation tools, fun commands, utilities, and real-time features.`);
      descLines.push('');
      descLines.push('Use `/help` to see a full command list, or click the buttons below for invites and support.');

      const embed = new EmbedBuilder()
        .setTitle(`🤖 ${botName} — Overview`)
        .setDescription(descLines.join('\n'))
        .addFields(
          { name: 'Prefix', value: '`/` (slash commands)', inline: true },
          { name: 'Commands', value: `${cmdCount}`, inline: true },
          { name: 'Framework', value: 'discord.js v14', inline: true },
          { name: 'Uptime', value: `${uptimePretty}`, inline: true },
          { name: 'Developer', value: 'SHM', inline: true }
        )
        .setColor(0x0099FF)
        .setThumbnail(botAvatarUrl)
        .setFooter({ text: developerCredit });

      if (pers?.bannerUrl) {
        embed.setImage(pers.bannerUrl);
      }

      const cleanDash = (process.env.DASHBOARD_URL || 'https://uraniumbot.vercel.app').replace(/\/+$/, '');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Invite Me')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`),
        new ButtonBuilder()
          .setLabel('Dashboard')
          .setStyle(ButtonStyle.Link)
          .setURL(`${cleanDash}/`),
        new ButtonBuilder()
          .setLabel('Privacy')
          .setStyle(ButtonStyle.Link)
          .setURL(`${cleanDash}/privacy`),
        new ButtonBuilder()
          .setLabel('Terms')
          .setStyle(ButtonStyle.Link)
          .setURL(`${cleanDash}/tos`),
        new ButtonBuilder()
          .setLabel('Support')
          .setStyle(ButtonStyle.Link)
          .setURL(process.env.SUPPORT_SERVER_URL || 'https://discord.gg/26ThFyckFX')
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // VERSION
    if (sub === 'version') {
      // discord.js version accessible via package or require
      let discordJsVersion = 'v14';
      try {
        discordJsVersion = require('discord.js').version || discordJsVersion;
      } catch { /* ignore */ }

      const embed = new EmbedBuilder()
        .setTitle('🧩 Version & Environment')
        .addFields(
          { name: 'Bot Version', value: `v${pkg.version || 'v2.x'}`, inline: true },
          { name: 'Node.js', value: process.version, inline: true },
          { name: 'discord.js', value: discordJsVersion, inline: true },
          { name: 'Platform', value: `${os.type()} ${os.release()} (${os.arch()})`, inline: false },
          { name: 'Process ID', value: `${process.pid}`, inline: true },
        )
        .setColor(0x1ABC9C)
        .setThumbnail(botAvatar)
        .setFooter({ text: developerCredit })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // DEVELOPER
    if (sub === 'developer') {
      const embed = new EmbedBuilder()
        .setTitle('👨‍💻 Developer Info')
        .setDescription('This bot was crafted with ❤️ by **SHM**.')
        .addFields(
          { name: 'Support / Feedback', value: process.env.SUPPORT_CONTACT || 'Use the support server link', inline: false },
          { name: 'Source', value: process.env.SOURCE_REPO || 'Not published', inline: true },
          { name: 'Contributions', value: 'If you want to contribute, open a PR or reach out!', inline: true }
        )
        .setColor(0xFFD700)
        .setFooter({ text: developerCredit });

      return interaction.reply({ embeds: [embed] });
    }

    // INVITE
    if (sub === 'invite') {
      const inviteLink = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
      const supportUrl = process.env.SUPPORT_SERVER_URL || 'https://discord.gg/26ThFyckFX';
      const docsUrl = process.env.DOCS_URL || null;

      const embed = new EmbedBuilder()
        .setTitle('🔗 Invite Multi-Bot')
        .setDescription('Add Multi-Bot to your server. Click the button(s) below.')
        .setColor(0x8E44AD)
        .setThumbnail(botAvatar)
        .setFooter({ text: developerCredit });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('➕ Invite Me')
            .setStyle(ButtonStyle.Link)
            .setURL(inviteLink),
          new ButtonBuilder()
            .setLabel('Dashboard')
            .setStyle(ButtonStyle.Link)
            .setURL('https://uraniumbot.vercel.app/dashboard')
            .setEmoji('🚀')
        );

      // optionally add Support / Docs if configured
      if (supportUrl) {
        row.addComponents(new ButtonBuilder().setLabel('Support Server').setStyle(ButtonStyle.Link).setURL(supportUrl));
      }
      if (docsUrl) {
        row.addComponents(new ButtonBuilder().setLabel('Docs').setStyle(ButtonStyle.Link).setURL(docsUrl));
      }

      return interaction.reply({ embeds: [embed], components: [row], flags: 64 });
    }

    // SETTINGS
    if (sub === 'settings') {
      // Must be Server Manager
      const { PermissionFlagsBits } = require('discord.js');
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: '❌ You need **Manage Server** permission to use this command.', flags: 64 });
      }

      const language = interaction.options.getString('language');
      const { setBotLanguage, getServerSettings } = require('../../database/settings');
      
      // Update language if provided
      if (language) {
        await setBotLanguage(interaction.guildId, language);
        return interaction.reply({ content: `✅ Bot language successfully updated to \`${language}\` for this server.`, flags: 64 });
      }

      // If no args provided, show current configuration
      const settings = await getServerSettings(interaction.guildId);
      const currentLang = settings.botLanguage || 'en';

      const embed = new EmbedBuilder()
        .setTitle('⚙️ Server Bot Settings')
        .setDescription(`Current configuration for **${interaction.guild.name}**`)
        .addFields(
          { name: 'Language', value: `\`${currentLang}\``, inline: true }
        )
        .setColor(0x5865F2)
        .setFooter({ text: 'Use /bot settings language:<lang> to change' });

      return interaction.reply({ embeds: [embed] });
    }

    // DASHBOARD
    if (sub === 'dashboard') {
      const embed = new EmbedBuilder()
        .setTitle('🚀 Uranium Web Dashboard')
        .setDescription([
          'Manage your music, moderation, and settings from our sleek web interface.',
          '',
          '**__Why use the Dashboard?__**',
          '• **Real-time Sync:** Changes reflect instantly.',
          '• **Rich Controls:** Drag-and-drop queue, visual filter selection.',
          '• **Ease of Use:** Manage your entire server from your browser.',
          '',
          'Click the button below to launch the dashboard and manage your servers.',
        ].join('\n'))
        .setColor(0xEF4444)
        .setThumbnail(botAvatar)
        .setFooter({ text: 'uraniumbot.vercel.app' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Launch Dashboard')
          .setStyle(ButtonStyle.Link)
          .setURL('https://uraniumbot.vercel.app/')
          .setEmoji('🚀')
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // fallback (shouldn't happen)
    return interaction.reply({ content: 'Unknown subcommand.', flags: 64 });
  }
};