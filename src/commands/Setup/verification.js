const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const {
  getVerificationConfig,
  saveVerificationConfig,
  deleteVerificationConfig,
  deleteDiscordVerificationMessage,
  getVerifiedUser,
  markUserVerified,
  removeUserVerification,
  generateOTP,
  setOTPCooldown,
  isOTPCooldownActive
} = require('../../utils/verification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('🔐 Server verification system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Start the verification setup wizard'))
    .addSubcommand(sub =>
      sub.setName('bypass')
        .setDescription('Manually verify a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to verify').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove verification from a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to unverify').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable the verification system'))
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('View current verification configuration')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // 🧩 SETUP
    if (sub === 'setup') {
      const existing = await getVerificationConfig(guildId);
      if (existing) {
        return interaction.reply({
          content: '⚠️ This server already has a verification system set up. Use `/verify disable` first to reset it.',
          flags: 64
        });
      }

      const filter = m => m.author.id === interaction.user.id;
      const channel = interaction.channel;

      await interaction.reply('📢 Which channel should the verification embed be sent to? Mention it or provide the channel ID.');
      const channelMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
      const channelInput = channelMsg.first()?.mentions.channels.first() || interaction.guild.channels.cache.get(channelMsg.first()?.content);
      if (!channelInput || channelInput.type !== ChannelType.GuildText) {
        return channel.send('❌ Invalid channel. Setup cancelled.');
      }

      await channel.send('🎭 Which role should be given upon verification? Mention it or provide the role ID.');
      const roleMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
      const roleInput = roleMsg.first()?.mentions.roles.first() || interaction.guild.roles.cache.get(roleMsg.first()?.content);
      if (!roleInput) return channel.send('❌ Invalid role. Setup cancelled.');

      await channel.send('📝 What should the embed message say? Type `default` to use the default message.');
      const msgMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
      const embedMessage = msgMsg.first()?.content === 'default'
        ? 'Click the button below to verify yourself and gain access to the server.'
        : msgMsg.first()?.content;

      await channel.send('🔒 Choose verification type: `button` (tap to verify) or `otp` (DM + OTP entry).');
      const typeMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
      const type = typeMsg.first()?.content.toLowerCase();
      if (!['button', 'otp'].includes(type)) return channel.send('❌ Invalid type. Setup cancelled.');

      // Confirm
      const summary = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('🛠️ Confirm Verification Setup')
        .addFields(
          { name: 'Channel', value: `<#${channelInput.id}>`, inline: true },
          { name: 'Role', value: `<@&${roleInput.id}>`, inline: true },
          { name: 'Type', value: type, inline: true },
          { name: 'Embed Message', value: embedMessage }
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_verify_setup')
          .setLabel('✅ Confirm')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel_verify_setup')
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Danger)
      );

      const confirmMsg = await channel.send({ embeds: [summary], components: [row] });

      const collector = confirmMsg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 60000
      });

      collector.on('collect', async i => {
        try {
          if (i.customId === 'confirm_verify_setup') {
            const verifyEmbed = new EmbedBuilder()
              .setColor('Green')
              .setTitle('✅ Verify Yourself')
              .setDescription(embedMessage);

            const verifyButton = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('verify_button')
                .setLabel('Verify')
                .setStyle(ButtonStyle.Success)
                .setEmoji({ id: '1443318664332837146' }) // ✅ Custom emoji
            );

            // Clean up any old message if existing
            const existingConfig = await getVerificationConfig(guildId);
            if (existingConfig && existingConfig.channel_id && existingConfig.message_id) {
              await deleteDiscordVerificationMessage(interaction.client, interaction.guild, existingConfig.channel_id, existingConfig.message_id);
            }

            const sentMsg = await channelInput.send({ embeds: [verifyEmbed], components: [verifyButton] });

            await saveVerificationConfig(guildId, {
              channel_id: channelInput.id,
              message_id: sentMsg.id,
              role_id: roleInput.id,
              embed_message: embedMessage,
              type,
              enabled: true
            });

            await i.update({
              content: '✅ Verification system has been set up!',
              embeds: [],
              components: []
            });
          } else {
            await i.update({
              content: '❌ Setup cancelled.',
              embeds: [],
              components: []
            });
          }
          collector.stop();
        } catch (err) {
          if (err?.code === 10062) return;
          console.error('[verification] collector error:', err);
        }
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') {
          confirmMsg.edit({ content: '⏱️ Setup timed out.', components: [], embeds: [] });
        }
      });
    }

    // ✅ BYPASS
    if (sub === 'bypass') {
      const user = interaction.options.getUser('user');
      const config = await getVerificationConfig(guildId);
      if (!config) return interaction.reply({ content: '❌ No verification system is set up.', flags: 64 });

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: '❌ User not found in this server.', flags: 64 });

      await member.roles.add(config.role_id).catch(() => null);
      await markUserVerified(guildId, user.id);

      return interaction.reply({ content: `✅ <@${user.id}> has been verified.`, flags: 64 });
    }

    // ❌ REMOVE
    if (sub === 'remove') {
      const user = interaction.options.getUser('user');
      const config = await getVerificationConfig(guildId);
      if (!config) return interaction.reply({ content: '❌ No verification system is set up.', flags: 64 });

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: '❌ User not found in this server.', flags: 64 });

      await member.roles.remove(config.role_id).catch(() => null);
      await removeUserVerification(guildId, user.id);

      return interaction.reply({ content: `🗑️ <@${user.id}> has been unverified.`, flags: 64 });
    }

    // 🧹 DISABLE
    if (sub === 'disable') {
      const config = await getVerificationConfig(guildId);
      if (!config) return interaction.reply({ content: '❌ No verification system is currently active.', flags: 64 });

      let deletedMsg = false;
      if (config.channel_id && config.message_id) {
        deletedMsg = await deleteDiscordVerificationMessage(interaction.client, interaction.guild, config.channel_id, config.message_id);
      }

      await deleteVerificationConfig(guildId);
      return interaction.reply({
        content: deletedMsg
          ? '🧹 Verification system has been disabled and the verification message was deleted from Discord.'
          : '🧹 Verification system has been disabled.',
        flags: 64
      });
    }

    // 📊 STATUS
    if (sub === 'status') {
      const config = await getVerificationConfig(guildId);
      if (!config) return interaction.reply({ content: 'ℹ️ No verification system is currently set up.', flags: 64 });

      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('🔍 Verification System Status')
        .addFields(
          { name: 'Channel', value: `<#${config.channel_id}>`, inline: true },
          { name: 'Role', value: `<@&${config.role_id}>`, inline: true },
          { name: 'Type', value: config.type, inline: true },
          { name: 'Embed Message', value: config.embed_message }
        );

      return interaction.reply({ embeds: [embed], flags: 64 });
    }
  }
};