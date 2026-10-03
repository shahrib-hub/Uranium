// src/commands/Premium/premium.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const {
  isPremiumGuild,
  isPremiumUser,
  redeemCode,
  addPremiumGuild,
  removePremiumGuild,
  addPremiumUser,
  removePremiumUser,
  generateCode,
  deleteCode,
  listPremiumGuilds,
  listPremiumUsers,
  parseDuration
} = require('../../utils/premium');

const crypto = require('crypto');

const OWNER_IDS = (process.env.BOT_OWNER_IDS || '835826354515214336,1337468049749704716')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('🌟 Premium Hub — Features, subscriptions, redemption & admin management')

    // GROUP: PERKS
    .addSubcommandGroup(g =>
      g.setName('perks')
        .setDescription('Explore, purchase, redeem, and check premium access')
        .addSubcommand(s => s.setName('help').setDescription('Learn about premium perks and capabilities'))
        .addSubcommand(s => s.setName('buy').setDescription('Get links and guides to acquire premium'))
        .addSubcommand(s =>
          s.setName('redeem')
            .setDescription('Redeem a premium promo / purchase code')
            .addStringOption(o => o.setName('code').setDescription('Enter your premium code').setRequired(true))
        )
        .addSubcommand(s => s.setName('status').setDescription('Check server and user premium active status'))
        .addSubcommand(s => s.setName('support').setDescription('Get priority assistance for premium accounts'))
    )

    // GROUP: ADMIN
    .addSubcommandGroup(g =>
      g.setName('admin')
        .setDescription('Bot owner tools for managing premium grants and codes')
        .addSubcommand(s =>
          s.setName('grant')
            .setDescription('Grant premium to a guild and/or user')
            .addStringOption(o => o.setName('guild').setDescription('Guild ID (optional)'))
            .addStringOption(o => o.setName('user').setDescription('User ID (optional)'))
            .addIntegerOption(o => o.setName('days').setDescription('Duration in days (default: 30)'))
        )
        .addSubcommand(s =>
          s.setName('revoke')
            .setDescription('Revoke premium from a guild and/or user')
            .addStringOption(o => o.setName('guild').setDescription('Guild ID (optional)'))
            .addStringOption(o => o.setName('user').setDescription('User ID (optional)'))
        )
        .addSubcommand(s =>
          s.setName('list')
            .setDescription('List all active premium guilds and users')
        )
        .addSubcommand(s =>
          s.setName('generate')
            .setDescription('Interactive wizard to generate a new premium redemption code')
        )
        .addSubcommand(s =>
          s.setName('delete')
            .setDescription('Delete an active premium code')
            .addStringOption(o => o.setName('code').setDescription('Code to delete').setRequired(true))
        )
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild?.id;
    const userId = interaction.user.id;

    try {
      // ══════════════════════════════════════════════
      // GROUP: PERKS
      // ══════════════════════════════════════════════
      if (group === 'perks') {
        if (sub === 'help') {
          const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🌟 Uranium Premium Features & Perks')
            .setDescription(
              'Upgrade to **Uranium Premium** and unlock our most powerful enterprise tools:\n\n' +
              '• 🗃️ **Multi-Backups:** 10 backup slots & reduced cooldown\n' +
              '• 🎨 **Custom Embeds:** Unlimited templates & rich components\n' +
              '• 🎙️ **Hi-Fi Music:** 384kbps lossless stream & studio EQ filters\n' +
              '• ⚡ **Priority Processing:** Dedicated bot worker threads\n' +
              '• 🛡️ **Advanced Security:** Anti-raid instant quarantine triggers\n' +
              '• 📬 **VIP Support:** Direct assistance from the development team\n\n' +
              '*Select an option from the menu below to learn more!*'
            )
            .setFooter({ text: 'Uranium • Premium Engine' });

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('premium_help_nav')
            .setPlaceholder('Explore Premium Options...')
            .addOptions([
              { label: 'Feature Overview', description: 'View all premium perks and limits', value: 'overview', emoji: '🌟' },
              { label: 'How to Buy', description: 'Learn how to purchase a premium subscription', value: 'buy', emoji: '💳' },
              { label: 'How to Redeem', description: 'Learn how to use a premium code', value: 'redeem', emoji: '🎁' }
            ]);

          const row = new ActionRowBuilder().addComponents(selectMenu);
          return interaction.reply({ embeds: [embed], components: [row] });
        }

        if (sub === 'buy') {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('💳 Get Premium').setStyle(ButtonStyle.Link).setURL('https://discord.gg/26ThFyckFX')
          );

          const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('💎 Acquire Uranium Premium')
            .setDescription(
              'We are currently awarding complimentary premium slots to growing servers!\n\n' +
              'Join our community and support server to claim your perk code.'
            )
            .setFooter({ text: 'Thank you for supporting Uranium 💖' });

          return interaction.reply({ embeds: [embed], components: [row] });
        }

        if (sub === 'redeem') {
          const code = interaction.options.getString('code', true);
          const result = redeemCode(code, guildId, userId);

          if (!result.success) {
            return interaction.reply({
              embeds: [new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ Code Redemption Failed')
                .setDescription(`Reason: **${result.reason}**\nPlease verify your code and try again.`)
                .setFooter({ text: 'Need assistance? Join our support server.' })]
            });
          }

          return interaction.reply({
            embeds: [new EmbedBuilder()
              .setColor('Green')
              .setTitle('✅ Premium Activated!')
              .setDescription(`Premium is now fully active for this server!\n\n🗓️ Valid until: <t:${Math.floor(new Date(result.expiresAt).getTime() / 1000)}:D>`)
              .setFooter({ text: 'Enjoy your upgraded perks!' })]
          });
        }

        if (sub === 'status') {
          const guildStatus = isPremiumGuild(guildId);
          const userStatus = isPremiumUser(userId);

          const embed = new EmbedBuilder()
            .setColor(guildStatus || userStatus ? 'Green' : 'Red')
            .setTitle('📊 Premium Status')
            .addFields(
              { name: 'Server Premium', value: guildStatus ? '✅ Active' : '❌ Inactive', inline: true },
              { name: 'User Premium', value: userStatus ? '✅ Active' : '❌ Inactive', inline: true }
            )
            .setFooter({ text: 'Use /premium perks redeem to activate a subscription.' });

          return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'support') {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('🛠️ Join Support Server').setStyle(ButtonStyle.Link).setURL('https://discord.gg/26ThFyckFX')
          );

          const embed = new EmbedBuilder()
            .setColor('Blurple')
            .setTitle('🛠️ Premium Support')
            .setDescription('Need help with subscription billing, server transfer, or code redemption?\nReach out directly in our support server!')
            .setFooter({ text: 'Uranium Support Team' });

          return interaction.reply({ embeds: [embed], components: [row] });
        }
      }

      // ══════════════════════════════════════════════
      // GROUP: ADMIN
      // ══════════════════════════════════════════════
      if (group === 'admin') {
        if (!OWNER_IDS.includes(userId)) {
          return interaction.reply({
            flags: 64,
            embeds: [new EmbedBuilder().setColor('Red').setTitle('🚫 Access Denied').setDescription('This command is restricted to Bot Developers.')]
          });
        }

        if (sub === 'grant') {
          const targetGuild = interaction.options.getString('guild');
          const targetUser = interaction.options.getString('user');
          const days = interaction.options.getInteger('days') || 30;

          if (!targetGuild && !targetUser) {
            return interaction.reply({
              flags: 64,
              embeds: [new EmbedBuilder().setColor('Yellow').setTitle('⚠️ Missing Parameters').setDescription('Provide at least a Guild ID or a User ID.')]
            });
          }

          const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
          if (targetGuild) addPremiumGuild(targetGuild, userId, expiresAt);
          if (targetUser) addPremiumUser(targetUser, userId, expiresAt);

          return interaction.reply({
            embeds: [new EmbedBuilder()
              .setColor('Green')
              .setTitle('✅ Premium Granted')
              .setDescription([
                targetGuild ? `• Guild: \`${targetGuild}\`` : null,
                targetUser ? `• User: <@${targetUser}>` : null,
                `• Duration: **${days} days**`,
                `🗓️ Expires: <t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:D>`
              ].filter(Boolean).join('\n'))]
          });
        }

        if (sub === 'revoke') {
          const targetGuild = interaction.options.getString('guild');
          const targetUser = interaction.options.getString('user');

          if (!targetGuild && !targetUser) {
            return interaction.reply({
              flags: 64,
              embeds: [new EmbedBuilder().setColor('Yellow').setTitle('⚠️ Missing Parameters').setDescription('Provide at least a Guild ID or User ID.')]
            });
          }

          if (targetGuild) removePremiumGuild(targetGuild);
          if (targetUser) removePremiumUser(targetUser);

          return interaction.reply({
            embeds: [new EmbedBuilder()
              .setColor('Red')
              .setTitle('🗑️ Premium Revoked')
              .setDescription([
                targetGuild ? `• Guild: \`${targetGuild}\`` : null,
                targetUser ? `• User: <@${targetUser}>` : null
              ].filter(Boolean).join('\n'))]
          });
        }

        if (sub === 'list') {
          const guilds = listPremiumGuilds();
          const users = listPremiumUsers();

          const embed = new EmbedBuilder()
            .setColor('Blurple')
            .setTitle('📋 Premium Access Registry')
            .addFields(
              {
                name: '🛡️ Active Guilds',
                value: Object.keys(guilds).length
                  ? Object.entries(guilds).map(([id, g]) =>
                      `• \`${id}\` (expires <t:${Math.floor(new Date(g.expiresAt).getTime() / 1000)}:R>)`
                    ).join('\n')
                  : '*None*'
              },
              {
                name: '👤 Active Users',
                value: Object.keys(users).length
                  ? Object.entries(users).map(([id, u]) =>
                      `• <@${id}> (expires <t:${Math.floor(new Date(u.expiresAt).getTime() / 1000)}:R>)`
                    ).join('\n')
                  : '*None*'
              }
            );

          return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'generate') {
          const channel = interaction.channel;
          const filter = m => m.author.id === userId;

          await interaction.reply('🧩 Enter code name (or type `random` for auto-generation):');
          const codeMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
          const codeInput = codeMsg.first()?.content;
          if (!codeInput) return channel.send('⏱️ Request timed out.');

          const code = codeInput.toLowerCase() === 'random'
            ? crypto.randomBytes(4).toString('hex').toUpperCase()
            : codeInput.trim();

          await channel.send('⏳ Enter validity duration (e.g. `30d`, `1y`, `7d`):');
          const durationMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
          const durationInput = durationMsg.first()?.content;
          const durationMs = parseDuration(durationInput);
          if (!durationInput || !durationMs || durationMs < 1000) {
            return channel.send('❌ Invalid duration format.');
          }

          await channel.send('🔁 How many times can this code be redeemed? (e.g. `1`, `5`):');
          const usesMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
          const usesInput = usesMsg.first()?.content;
          const uses = parseInt(usesInput, 10);
          if (!uses || isNaN(uses) || uses <= 0) {
            return channel.send('❌ Invalid uses count.');
          }

          generateCode(code, userId, durationInput, uses);
          const expiresAt = new Date(Date.now() + durationMs);

          const summary = new EmbedBuilder()
            .setColor('Gold')
            .setTitle('🎟️ Premium Code Created')
            .addFields(
              { name: 'Code', value: `\`${code}\``, inline: true },
              { name: 'Duration', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true },
              { name: 'Redemptions Allowed', value: `${uses}`, inline: true }
            );

          return channel.send({ embeds: [summary] });
        }

        if (sub === 'delete') {
          const code = interaction.options.getString('code', true);
          deleteCode(code);
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor('Grey').setTitle('🗑️ Code Deleted').setDescription(`Code \`${code}\` removed.`)]
          });
        }
      }

      return interaction.reply({ content: 'Subcommand not found.', flags: 64 });
    } catch (err) {
      console.error('premium command error', err);
      if (!interaction.replied) return interaction.reply({ content: 'An internal error occurred.', flags: 64 });
    }
  }
};
