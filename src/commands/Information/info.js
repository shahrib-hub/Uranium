// src/commands/Information/info.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  PermissionsBitField
} = require('discord.js');

const os = require('os');
const moment = require('moment');
const pkg = require('../../../package.json');

const START_TIME = Date.now();
const DEVELOPER_CREDIT = 'Uranium • Advanced Bot Engine';
const PAGE_SIZE = 20;

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

function formatDate(date) {
  const ts = Math.floor(date.getTime() / 1000);
  return `<t:${ts}:F> • <t:${ts}:R>`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('📊 Information Hub — Bot stats, server diagnostics, user profiles & privacy')

    // GROUP: BOT
    .addSubcommandGroup(g =>
      g.setName('bot')
        .setDescription('Bot statistics, latency, overview & settings')
        .addSubcommand(s => s.setName('stats').setDescription('View bot memory, CPU & infrastructure stats'))
        .addSubcommand(s => s.setName('ping').setDescription('Check WebSocket and API latency'))
        .addSubcommand(s => s.setName('uptime').setDescription('Check how long the bot has been running'))
        .addSubcommand(s => s.setName('about').setDescription('Overview of Uranium Bot features & links'))
        .addSubcommand(s => s.setName('version').setDescription('Show bot version & Node environment'))
        .addSubcommand(s => s.setName('developer').setDescription('Show bot developer & contributor details'))
        .addSubcommand(s => s.setName('invite').setDescription('Get bot invite & documentation links'))
        .addSubcommand(s => s.setName('dashboard').setDescription('Get the web dashboard link'))
        .addSubcommand(s =>
          s.setName('settings')
            .setDescription('Manage bot configuration for this server (Manager only)')
            .addStringOption(opt =>
              opt.setName('language')
                .setDescription('Select default language for bot responses')
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
                  { name: 'Italian', value: 'it' }
                )
            )
        )
    )

    // GROUP: SERVER
    .addSubcommandGroup(g =>
      g.setName('server')
        .setDescription('Server diagnostics, channels, roles & emoji list')
        .addSubcommand(s => s.setName('overview').setDescription('View detailed server stats, boost level & ownership'))
        .addSubcommand(s =>
          s.setName('channel')
            .setDescription('Inspect a channel details and permissions')
            .addChannelOption(o => o.setName('channel').setDescription('Target channel'))
        )
        .addSubcommand(s =>
          s.setName('role')
            .setDescription('Detailed role information and member count')
            .addRoleOption(o => o.setName('role').setDescription('Target role').setRequired(true))
        )
        .addSubcommand(s =>
          s.setName('emojis')
            .setDescription('View server custom emojis in a paginated UI')
            .addStringOption(o =>
              o.setName('scope')
                .setDescription('Filter emojis')
                .addChoices(
                  { name: 'All emojis', value: 'all' },
                  { name: 'Static only', value: 'static' },
                  { name: 'Animated only', value: 'animated' }
                )
            )
            .addIntegerOption(o => o.setName('page').setDescription('Page number').setMinValue(1))
        )
    )

    // GROUP: USER
    .addSubcommandGroup(g =>
      g.setName('user')
        .setDescription('User profile, avatar & account details')
        .addSubcommand(s =>
          s.setName('profile')
            .setDescription('Detailed user profile, join date, account creation & roles')
            .addUserOption(o => o.setName('target').setDescription('Target user'))
        )
        .addSubcommand(s =>
          s.setName('avatar')
            .setDescription('View high-resolution avatar with download links')
            .addUserOption(o => o.setName('target').setDescription('Target user'))
        )
    )

    // GROUP: PRIVACY
    .addSubcommandGroup(g =>
      g.setName('privacy')
        .setDescription('Privacy policy, GDPR compliance & data deletion')
        .addSubcommand(s => s.setName('policy').setDescription('View Privacy Policy & Terms of Service'))
        .addSubcommand(s => s.setName('delete-my-data').setDescription('Permanently wipe your stored personal data'))
        .addSubcommand(s => s.setName('delete-server-data').setDescription('Permanently wipe all server configs (Admin only)'))
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const client = interaction.client;
    const botAvatar = client.user?.displayAvatarURL?.({ size: 1024 }) || null;
    const cleanDash = (process.env.DASHBOARD_URL || 'https://uraniumbot.vercel.app').replace(/\/+$/, '');
    const supportUrl = process.env.SUPPORT_SERVER_URL || 'https://discord.gg/26ThFyckFX';

    try {
      // ══════════════════════════════════════════════
      // GROUP: BOT
      // ══════════════════════════════════════════════
      if (group === 'bot') {
        if (sub === 'uptime') {
          const msUptime = (client.uptime != null && client.uptime > 0) ? client.uptime : (Date.now() - START_TIME);
          const pretty = formatDuration(msUptime);
          const startedAt = new Date(Date.now() - msUptime);

          const embed = new EmbedBuilder()
            .setTitle('🕒 Bot Uptime')
            .setDescription(`Uranium has been online for **${pretty}**`)
            .addFields(
              { name: 'Started', value: `<t:${Math.floor(startedAt.getTime() / 1000)}:F>`, inline: true },
              { name: 'Since', value: `<t:${Math.floor(startedAt.getTime() / 1000)}:R>`, inline: true }
            )
            .setColor(0x57F287)
            .setThumbnail(botAvatar)
            .setFooter({ text: DEVELOPER_CREDIT });

          return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'ping') {
          const websocket = Math.round(client.ws?.ping ?? 0);
          const apiLatency = Date.now() - interaction.createdTimestamp;
          const cpu = os.loadavg()[0].toFixed(2);

          const embed = new EmbedBuilder()
            .setTitle('🏓 Latency & Health')
            .setDescription('Real-time system response metrics')
            .addFields(
              { name: 'WebSocket Latency', value: `\`${websocket} ms\``, inline: true },
              { name: 'API Latency', value: `\`${apiLatency} ms\``, inline: true },
              { name: 'CPU Load (1m)', value: `\`${cpu}\``, inline: true }
            )
            .setColor(0x5865F2)
            .setThumbnail(botAvatar)
            .setFooter({ text: DEVELOPER_CREDIT });

          return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'stats') {
          const mem = process.memoryUsage();
          const heapUsed = formatBytes(mem.heapUsed);
          const heapTotal = formatBytes(mem.heapTotal);
          const rss = formatBytes(mem.rss);
          const nodeVer = process.version;
          const cpuModel = os.cpus()[0]?.model || 'Unknown';
          const cpuCount = os.cpus().length;
          const up = formatDuration(process.uptime() * 1000);

          const guildCount = client.guilds?.cache?.size ?? 'N/A';
          const userCount = client.users?.cache?.size ?? 'N/A';
          const commandCount = (client.commands && typeof client.commands.size === 'number') ? client.commands.size : 'N/A';

          const embed = new EmbedBuilder()
            .setTitle('📊 Uranium Infrastructure Stats')
            .setDescription('Live performance metrics & architecture status')
            .addFields(
              { name: 'Servers', value: `${guildCount}`, inline: true },
              { name: 'Cached Users', value: `${userCount}`, inline: true },
              { name: 'Commands Loaded', value: `${commandCount}`, inline: true },
              { name: 'Heap Usage', value: `${heapUsed} / ${heapTotal}`, inline: true },
              { name: 'RSS Memory', value: `${rss}`, inline: true },
              { name: 'Process Uptime', value: `${up}`, inline: true },
              { name: 'Runtime', value: `Node.js ${nodeVer}`, inline: true },
              { name: 'CPU Architecture', value: `${cpuModel} (${cpuCount} cores)`, inline: false }
            )
            .setColor(0xF1C40F)
            .setThumbnail(botAvatar)
            .setFooter({ text: DEVELOPER_CREDIT })
            .setTimestamp();

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Dashboard').setStyle(ButtonStyle.Link).setURL(cleanDash).setEmoji('🚀'),
            new ButtonBuilder().setLabel('Invite').setStyle(ButtonStyle.Link).setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`),
            new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL(supportUrl)
          );

          return interaction.reply({ embeds: [embed], components: [row] });
        }

        if (sub === 'about') {
          const cmdCount = (client.commands && typeof client.commands.size === 'number') ? client.commands.size : 'N/A';
          const uptimePretty = formatDuration(client.uptime ?? (Date.now() - START_TIME));

          let pers = null;
          try {
            const personalizationStorage = require('../../utils/personalizationStorage');
            if (interaction.guildId) pers = await personalizationStorage.getPersonalization(interaction.guildId);
          } catch {}

          const botName = pers?.nickname || client.user?.username || 'Uranium';
          const botAvatarUrl = pers?.avatarUrl || botAvatar;
          const serverBio = pers?.bio?.trim();

          const descLines = [];
          if (serverBio) descLines.push(`> 💬 *"${serverBio}"*\n`);
          descLines.push(`**${botName}** is an enterprise-grade multi-purpose Discord bot offering split-logging, auto-moderation strike escalation, starboard, economy, ticketing, and web dashboard management.`);
          descLines.push('');
          descLines.push('Use `/help` to see command categories or explore our web dashboard.');

          const embed = new EmbedBuilder()
            .setTitle(`🤖 ${botName} — Overview`)
            .setDescription(descLines.join('\n'))
            .addFields(
              { name: 'Prefix', value: '`/` (slash commands)', inline: true },
              { name: 'Command Hubs', value: `${cmdCount}`, inline: true },
              { name: 'Framework', value: 'Discord.js v14', inline: true },
              { name: 'Uptime', value: `${uptimePretty}`, inline: true },
              { name: 'Developer', value: 'SHM', inline: true }
            )
            .setColor(0x0099FF)
            .setThumbnail(botAvatarUrl)
            .setFooter({ text: DEVELOPER_CREDIT });

          if (pers?.bannerUrl) embed.setImage(pers.bannerUrl);

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Invite Bot').setStyle(ButtonStyle.Link).setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`),
            new ButtonBuilder().setLabel('Dashboard').setStyle(ButtonStyle.Link).setURL(cleanDash),
            new ButtonBuilder().setLabel('Privacy Policy').setStyle(ButtonStyle.Link).setURL(`${cleanDash}/privacy`),
            new ButtonBuilder().setLabel('Support Server').setStyle(ButtonStyle.Link).setURL(supportUrl)
          );

          return interaction.reply({ embeds: [embed], components: [row] });
        }

        if (sub === 'version') {
          let discordJsVersion = 'v14';
          try { discordJsVersion = require('discord.js').version || discordJsVersion; } catch {}

          const embed = new EmbedBuilder()
            .setTitle('🧩 Version & Environment')
            .addFields(
              { name: 'Bot Version', value: `v${pkg.version || '2.0.0'}`, inline: true },
              { name: 'Node.js', value: process.version, inline: true },
              { name: 'Discord.js', value: discordJsVersion, inline: true },
              { name: 'Platform', value: `${os.type()} ${os.release()} (${os.arch()})`, inline: false },
              { name: 'PID', value: `${process.pid}`, inline: true }
            )
            .setColor(0x1ABC9C)
            .setThumbnail(botAvatar)
            .setFooter({ text: DEVELOPER_CREDIT })
            .setTimestamp();

          return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'developer') {
          const embed = new EmbedBuilder()
            .setTitle('👨‍💻 Developer & Team')
            .setDescription('Crafted with passion by **SHM** and the Uranium Development Team.')
            .addFields(
              { name: 'Support / Feedback', value: supportUrl, inline: false },
              { name: 'Open Community', value: 'Feel free to contribute ideas or join our community server!', inline: true }
            )
            .setColor(0xFFD700)
            .setFooter({ text: DEVELOPER_CREDIT });

          return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'invite') {
          const inviteLink = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
          const embed = new EmbedBuilder()
            .setTitle('🔗 Invite Uranium')
            .setDescription('Add Uranium to your server using the link below:')
            .setColor(0x8E44AD)
            .setThumbnail(botAvatar)
            .setFooter({ text: DEVELOPER_CREDIT });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Invite Bot').setStyle(ButtonStyle.Link).setURL(inviteLink),
            new ButtonBuilder().setLabel('Web Dashboard').setStyle(ButtonStyle.Link).setURL(`${cleanDash}/dashboard`).setEmoji('🚀'),
            new ButtonBuilder().setLabel('Support Server').setStyle(ButtonStyle.Link).setURL(supportUrl)
          );

          return interaction.reply({ embeds: [embed], components: [row], flags: 64 });
        }

        if (sub === 'dashboard') {
          const embed = new EmbedBuilder()
            .setTitle('🚀 Uranium Web Dashboard')
            .setDescription([
              'Manage your music, moderation, starboard, and server settings from our sleek web interface.',
              '',
              '**✨ Web Features:**',
              '• **Real-time Sync:** Instant changes reflecting in your server.',
              '• **Visual Player:** Drag-and-drop music queue and audio filters.',
              '• **Audit Logs:** Full split logging monitoring and strikes control.',
              '',
              'Click the button below to launch the dashboard.'
            ].join('\n'))
            .setColor(0xEF4444)
            .setThumbnail(botAvatar)
            .setFooter({ text: 'uraniumbot.vercel.app' });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Open Dashboard').setStyle(ButtonStyle.Link).setURL(cleanDash).setEmoji('🚀')
          );

          return interaction.reply({ embeds: [embed], components: [row] });
        }

        if (sub === 'settings') {
          if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ content: '❌ You need **Manage Server** permission to use this command.', flags: 64 });
          }

          const language = interaction.options.getString('language');
          const { setBotLanguage, getServerSettings } = require('../../database/settings');

          if (language) {
            await setBotLanguage(interaction.guildId, language);
            return interaction.reply({ content: `✅ Bot language updated to \`${language}\` for this server.`, flags: 64 });
          }

          const settings = await getServerSettings(interaction.guildId);
          const currentLang = settings.botLanguage || 'en';

          const embed = new EmbedBuilder()
            .setTitle('⚙️ Server Bot Settings')
            .setDescription(`Configuration for **${interaction.guild.name}**`)
            .addFields({ name: 'Default Language', value: `\`${currentLang}\``, inline: true })
            .setColor(0x5865F2)
            .setFooter({ text: 'Use /info bot settings language:<lang> to change' });

          return interaction.reply({ embeds: [embed] });
        }
      }

      // ══════════════════════════════════════════════
      // GROUP: SERVER
      // ══════════════════════════════════════════════
      if (group === 'server') {
        if (!interaction.guild) {
          return interaction.reply({ content: '❌ This command must be executed within a server.', flags: 64 });
        }

        if (sub === 'overview') {
          const guild = interaction.guild;
          const owner = await guild.fetchOwner();

          const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🏛️ Server Information — ${guild.name}`)
            .setThumbnail(guild.iconURL({ size: 256 }))
            .addFields(
              { name: '🆔 Server ID', value: `\`${guild.id}\``, inline: true },
              { name: '👑 Owner', value: `${owner.user.tag} (${owner.id})`, inline: true },
              { name: '📅 Created', value: formatDate(guild.createdAt), inline: false },
              { name: '👥 Members', value: `Total: **${guild.memberCount}**`, inline: true },
              { name: '🚀 Boost Level', value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, inline: true },
              { name: '💬 Channels', value: `${guild.channels.cache.size}`, inline: true },
              { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true }
            );

          return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'channel') {
          const ch = interaction.options.getChannel('channel') || interaction.channel;
          const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🛰️ Channel Information — #${ch.name}`)
            .addFields(
              { name: '🆔 Channel ID', value: `\`${ch.id}\``, inline: true },
              { name: '📄 Type', value: `${ChannelType[ch.type]}`, inline: true },
              { name: '📅 Created', value: formatDate(ch.createdAt), inline: false }
            );

          return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'role') {
          const role = interaction.options.getRole('role', true);
          const embed = new EmbedBuilder()
            .setColor(role.color || '#5865F2')
            .setTitle(`🎨 Role Information — ${role.name}`)
            .addFields(
              { name: '🆔 Role ID', value: `\`${role.id}\``, inline: true },
              { name: '🎨 Hex Color', value: role.hexColor, inline: true },
              { name: '📅 Created', value: formatDate(role.createdAt), inline: false },
              { name: '👥 Member Count', value: `${role.members.size}`, inline: true },
              { name: '🛡️ Hoisted / Mentionable', value: `${role.hoist ? 'Yes' : 'No'} / ${role.mentionable ? 'Yes' : 'No'}`, inline: true }
            );

          return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'emojis') {
          const scope = interaction.options.getString('scope') || 'all';
          const requestedPage = interaction.options.getInteger('page') || 1;

          let emojis = [...interaction.guild.emojis.cache.values()];
          if (scope === 'static') emojis = emojis.filter(e => !e.animated);
          if (scope === 'animated') emojis = emojis.filter(e => e.animated);

          if (emojis.length === 0) {
            return interaction.reply({ content: `❌ No ${scope !== 'all' ? scope : ''} emojis found.`, flags: 64 });
          }

          const maxPage = Math.ceil(emojis.length / PAGE_SIZE);
          const page = Math.max(1, Math.min(requestedPage, maxPage));
          const start = (page - 1) * PAGE_SIZE;
          const pageItems = emojis.slice(start, start + PAGE_SIZE);

          const desc = pageItems
            .map((e, i) => `**${start + i + 1}.** ${e} — \`${e.name}\` (ID: \`${e.id}\`)`)
            .join('\n\n');

          const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📙 Emoji List (${scope})`)
            .setThumbnail(interaction.guild.iconURL({ size: 256 }))
            .setDescription(desc)
            .setFooter({ text: `Page ${page}/${maxPage} • ${emojis.length} total emojis` });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`info_emoji_prev_${interaction.guild.id}_${page}_${scope}`)
              .setLabel('◀')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page <= 1),
            new ButtonBuilder()
              .setCustomId(`info_emoji_next_${interaction.guild.id}_${page}_${scope}`)
              .setLabel('▶')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(page >= maxPage)
          );

          return interaction.reply({ embeds: [embed], components: [row] });
        }
      }

      // ══════════════════════════════════════════════
      // GROUP: USER
      // ══════════════════════════════════════════════
      if (group === 'user') {
        if (sub === 'avatar') {
          const user = interaction.options.getUser('target') || interaction.user;
          const png = user.displayAvatarURL({ extension: 'png', size: 4096 });
          const jpg = user.displayAvatarURL({ extension: 'jpg', size: 4096 });
          const webp = user.displayAvatarURL({ extension: 'webp', size: 4096 });
          const gif = user.displayAvatarURL({ extension: 'gif', size: 4096 });

          const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🖼️ Avatar — ${user.tag}`)
            .setImage(png)
            .setDescription(
              [
                '**Download Formats:**',
                `[PNG](${png}) • [JPG](${jpg}) • [WEBP](${webp})${gif ? ` • [GIF](${gif})` : ''}`,
                '',
                `**User ID:** \`${user.id}\``
              ].join('\n')
            );

          return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'profile') {
          const user = interaction.options.getUser('target') || interaction.user;
          const member = interaction.guild ? await interaction.guild.members.fetch(user.id).catch(() => null) : null;

          const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`👤 User Information — ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
              { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
              { name: '🤖 Bot Account', value: user.bot ? 'Yes' : 'No', inline: true },
              { name: '📅 Account Created', value: formatDate(user.createdAt), inline: false }
            );

          if (member) {
            embed.addFields(
              { name: '📥 Joined Server', value: member.joinedAt ? formatDate(member.joinedAt) : 'Unknown', inline: false },
              {
                name: '🎭 Roles',
                value: member.roles.cache
                  .filter(r => r.id !== interaction.guild.id)
                  .sort((a, b) => b.position - a.position)
                  .map(r => r.toString())
                  .slice(0, 15)
                  .join(', ') || 'None'
              }
            );
          }

          return interaction.reply({ embeds: [embed] });
        }
      }

      // ══════════════════════════════════════════════
      // GROUP: PRIVACY
      // ══════════════════════════════════════════════
      if (group === 'privacy') {
        const privacyUrl = `${cleanDash}/privacy`;
        const tosUrl = `${cleanDash}/tos`;

        if (sub === 'policy') {
          const embed = new EmbedBuilder()
            .setColor(0xEF4444)
            .setTitle('🔒 Uranium Bot — Privacy & Data Protection')
            .setDescription(
              'Uranium Bot operates under strict adherence to the **Discord Developer Terms of Service** and **Developer Policy**.\n' +
              'We practice data minimization and respect your privacy rights (including GDPR and CCPA compliance).'
            )
            .addFields(
              {
                name: '📊 What Data We Store',
                value: [
                  '• **Discord Identifiers:** User IDs, Guild IDs, Channel IDs required for core bot operations.',
                  '• **Configurations:** Server automod settings, logging webhooks, tickets, reaction roles.',
                  '• **Feature Data:** Opt-in economy balance, levels, AFK status, and birthdays you choose to set.',
                  '• **Zero Sensitive Data:** We never collect, request, or store passwords, financial accounts, or private messages.'
                ].join('\n')
              },
              {
                name: '💬 Message Content Intent Notice',
                value: 'Message content is analyzed in real-time purely for active features (AutoMod filtering, custom commands, AFK detection, leveling). We never retain or sell user message history.'
              },
              {
                name: '🗑️ Right to Erasure',
                value: 'You can erase your personal records at any time via `/info privacy delete-my-data`. Admins can wipe guild data via `/info privacy delete-server-data`.'
              }
            )
            .setFooter({ text: 'Uranium • Privacy & Compliance' })
            .setTimestamp();

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Privacy Policy').setStyle(ButtonStyle.Link).setURL(privacyUrl).setEmoji('📜'),
            new ButtonBuilder().setLabel('Terms of Service').setStyle(ButtonStyle.Link).setURL(tosUrl).setEmoji('⚖️'),
            new ButtonBuilder().setLabel('Support Server').setStyle(ButtonStyle.Link).setURL(supportUrl).setEmoji('🛠️')
          );

          return interaction.reply({ embeds: [embed], components: [row] });
        }

        if (sub === 'delete-my-data') {
          const confirmEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('⚠️ Delete Your Personal Data?')
            .setDescription(
              `Hey <@${interaction.user.id}>, are you sure you want to permanently delete all your personal data stored by Uranium Bot?\n\n` +
              '**The following data will be permanently wiped:**\n' +
              '• Economy profile, wallet, bank balance, inventory, and stats\n' +
              '• Ranking levels, XP, and badges\n' +
              '• Stored AFK status and mention logs\n' +
              '• Birthday records & custom playlists\n\n' +
              '⚠️ *This action is irreversible and complies with your Right to Erasure.*'
            )
            .setFooter({ text: 'Click below to confirm or cancel' });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`privacy_delete_user_confirm_${interaction.user.id}`).setLabel('Confirm Deletion').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
            new ButtonBuilder().setCustomId(`privacy_delete_user_cancel_${interaction.user.id}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji('❌')
          );

          return interaction.reply({ embeds: [confirmEmbed], components: [row], flags: 64 });
        }

        if (sub === 'delete-server-data') {
          if (!interaction.guild) {
            return interaction.reply({ content: '❌ This command can only be used inside a server.', flags: 64 });
          }

          if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ You need **Administrator** permissions to delete server configurations.', flags: 64 });
          }

          const confirmEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('⚠️ Delete All Server Configurations?')
            .setDescription(
              `**Server:** \`${interaction.guild.name}\`\n\n` +
              'Are you sure you want to permanently delete **all configurations, automod rules, reaction roles, tickets, starboard, antinuke, and logs** for this server?\n\n' +
              '⚠️ *This action is irreversible. The bot will reset all settings to defaults.*'
            )
            .setFooter({ text: 'Administrator confirmation required' });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`privacy_delete_guild_confirm_${interaction.user.id}_${interaction.guild.id}`).setLabel('Confirm Server Wipe').setStyle(ButtonStyle.Danger).setEmoji('⚠️'),
            new ButtonBuilder().setCustomId(`privacy_delete_guild_cancel_${interaction.user.id}_${interaction.guild.id}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji('❌')
          );

          return interaction.reply({ embeds: [confirmEmbed], components: [row], flags: 64 });
        }
      }

      return interaction.reply({ content: 'Subcommand not found.', flags: 64 });
    } catch (err) {
      console.error('info command error', err);
      if (!interaction.replied) return interaction.reply({ content: 'An internal error occurred.', flags: 64 });
    }
  }
};
