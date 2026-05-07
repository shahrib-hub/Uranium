const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const {
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

// ✅ Replace with your actual owner IDs and dev guild ID
const OWNER_IDS = ['835826354515214336', '1337468049749704716'];
const DEV_GUILD_ID = '937561869957357629';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premiumadmin')
    .setDescription('🔧 Developer-only premium management commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Grant premium to a guild and/or user')
        .addStringOption(opt => opt.setName('guild').setDescription('Guild ID (optional)'))
        .addStringOption(opt => opt.setName('user').setDescription('User ID (optional)'))
        .addIntegerOption(opt => opt.setName('days').setDescription('Validity in days').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove premium from a guild and/or user')
        .addStringOption(opt => opt.setName('guild').setDescription('Guild ID (optional)'))
        .addStringOption(opt => opt.setName('user').setDescription('User ID (optional)')))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all premium guilds and users'))
    .addSubcommand(sub =>
      sub.setName('codegenerate')
        .setDescription('Start a wizard to generate a premium code'))
    .addSubcommand(sub =>
      sub.setName('codedelete')
        .setDescription('Delete a premium code')
        .addStringOption(opt => opt.setName('code').setDescription('Code to delete').setRequired(true))),

  devOnly: true,

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // ✅ Owner-only check
    if (!OWNER_IDS.includes(userId)) {
      return interaction.reply({
        flags: 64,
        embeds: [new EmbedBuilder()
          .setColor('Red')
          .setTitle('🚫 Access Denied')
          .setDescription('You are not authorized to use this command.')]
      });
    }

    // ✅ Dev guild check
    if (interaction.guildId !== DEV_GUILD_ID) {
      return interaction.reply({
        flags: 64,
        embeds: [new EmbedBuilder()
          .setColor('Red')
          .setTitle('🚫 Dev Guild Only')
          .setDescription('This command can only be used in the development server.')]
      });
    }

    if (sub === 'add') {
      const guildId = interaction.options.getString('guild');
      const targetUser = interaction.options.getString('user');
      const days = interaction.options.getInteger('days');

      if (!guildId && !targetUser) {
        return interaction.reply({
          flags: 64,
          embeds: [new EmbedBuilder()
            .setColor('Yellow')
            .setTitle('⚠️ Missing Input')
            .setDescription('You must provide at least a guild ID or a user ID to grant premium.')]
        });
      }

      const expiresAt = new Date(Date.now() + days * 86400000).toISOString();

      if (guildId) addPremiumGuild(guildId, userId, expiresAt);
      if (targetUser) addPremiumUser(targetUser, userId, expiresAt);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Premium Granted')
          .setDescription([
            guildId ? `• Guild: \`${guildId}\`` : null,
            targetUser ? `• User: <@${targetUser}>` : null,
            `• Valid for: **${days} days**`,
            `🗓️ Expires: <t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:D>`
          ].filter(Boolean).join('\n'))]
      });
    }

    if (sub === 'remove') {
      const guildId = interaction.options.getString('guild');
      const targetUser = interaction.options.getString('user');

      if (!guildId && !targetUser) {
        return interaction.reply({
          flags: 64,
          embeds: [new EmbedBuilder()
            .setColor('Yellow')
            .setTitle('⚠️ Missing Input')
            .setDescription('You must provide at least a guild ID or a user ID to remove premium.')]
        });
      }

      if (guildId) removePremiumGuild(guildId);
      if (targetUser) removePremiumUser(targetUser);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('Red')
          .setTitle('🗑️ Premium Revoked')
          .setDescription([
            guildId ? `• Guild: \`${guildId}\`` : null,
            targetUser ? `• User: <@${targetUser}>` : null
          ].filter(Boolean).join('\n'))]
      });
    }

    if (sub === 'list') {
      const guilds = listPremiumGuilds();
      const users = listPremiumUsers();

      const embed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('📋 Premium Access List')
        .addFields(
          {
            name: '🛡️ Guilds',
            value: Object.keys(guilds).length
              ? Object.entries(guilds).map(([id, g]) =>
                  `• \`${id}\` (expires <t:${Math.floor(new Date(g.expiresAt).getTime() / 1000)}:R>)`
                ).join('\n')
              : 'None'
          },
          {
            name: '👤 Users',
            value: Object.keys(users).length
              ? Object.entries(users).map(([id, u]) =>
                  `• <@${id}> (expires <t:${Math.floor(new Date(u.expiresAt).getTime() / 1000)}:R>)`
                ).join('\n')
              : 'None'
          }
        );

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'codegenerate') {
      const channel = interaction.channel;
      const filter = m => m.author.id === userId;

      await interaction.reply('🧩 What should the code be?\nType `random` for a random code or enter a custom one.');
      const codeMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
      const codeInput = codeMsg.first()?.content;
      if (!codeInput) return channel.send('⏱️ Timed out. Please try again.');
      const code = codeInput.toLowerCase() === 'random'
        ? crypto.randomBytes(4).toString('hex')
        : codeInput.trim();

      await channel.send('⏳ How long should the code last? (e.g. `30d`, `1y 2d`, `5h`)');
      const durationMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
      const durationInput = durationMsg.first()?.content;
      const durationMs = parseDuration(durationInput);
      if (!durationInput || !durationMs || durationMs < 1000) {
        return channel.send('❌ Invalid duration format. Use formats like `30d`, `1y`, `5h 30m`.');
      }

      await channel.send('🔁 How many times can this code be used? (e.g. `1`, `5`, `100`)');
      const usesMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
      const usesInput = usesMsg.first()?.content;
      if (!usesInput || isNaN(usesInput) || parseInt(usesInput) <= 0) {
        return channel.send('❌ Invalid number of uses.');
      }

      const uses = parseInt(usesInput);
      const expiresAt = new Date(Date.now() + durationMs);

      const summary = new EmbedBuilder()
        .setColor('Gold')
        .setTitle('🎟️ Confirm Code Generation')
        .addFields(
          { name: 'Code', value: `\`${code}\``, inline: true },
          { name: 'Duration', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true },
          { name: 'Uses', value: `${uses}`, inline: true }
        )
        .setFooter({ text: 'Click Confirm to create the code or Cancel to abort.' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_code')
          .setLabel('✅ Confirm')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel_code')
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Danger)
      );

      const confirmMsg = await channel.send({ embeds: [summary], components: [row] });

      const buttonFilter = i => i.user.id === interaction.user.id;
      const collector = confirmMsg.createMessageComponentCollector({ filter: buttonFilter, time: 60000 });

      collector.on('collect', async i => {
        try {
          if (i.customId === 'confirm_code') {
            generateCode(code, interaction.user.id, durationInput, uses);
            await i.update({
              embeds: [new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ Code Created')
                .setDescription(`Code \`${code}\` is now active!\n🗓️ Expires: <t:${Math.floor(expiresAt.getTime() / 1000)}:D>\n🔁 Uses: ${uses}`)],
              components: []
            });
          } else if (i.customId === 'cancel_code') {
            await i.update({
              content: '❌ Code generation cancelled.',
              embeds: [],
              components: []
            });
          }
          collector.stop();
        } catch (err) {
          if (err?.code === 10062) return; // expired interaction — ignore
          console.error('[premiumadmin] collector error:', err);
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          confirmMsg.edit({ content: '⏱️ Confirmation timed out.', components: [], embeds: [] });
        }
      });
    }

    if (sub === 'codedelete') {
      const code = interaction.options.getString('code');
      deleteCode(code);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('Grey')
          .setTitle('🗑️ Code Deleted')
          .setDescription(`Code \`${code}\` has been removed.`)]
      });
    }
  }
};
