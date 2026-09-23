const {
  getVerificationConfig,
  markUserVerified,
  generateOTP,
  setOTPCooldown,
  isOTPCooldownActive
} = require('../utils/verification');

const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require('discord.js');

module.exports = async (interaction) => {
  if (!interaction.isButton() || interaction.customId !== 'verify_button') return;

  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  const config = await getVerificationConfig(guildId);
  if (!config) {
    return interaction.reply({ content: '❌ Verification system is not configured.', flags: 64 });
  }

  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  if (!member) return interaction.reply({ content: '❌ Could not find your member profile.', flags: 64 });

  if (config.type === 'button') {
    if (config.role_id) {
      await member.roles.add(config.role_id).catch(() => null);
    }
    if (config.unverified_role_id) {
      await member.roles.remove(config.unverified_role_id).catch(() => null);
    }
    await markUserVerified(guildId, userId);

    // Optional audit log
    if (config.log_channel_id) {
      const logChannel = interaction.guild.channels.cache.get(config.log_channel_id);
      if (logChannel) {
        logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#10b981')
              .setTitle('🛡️ Member Verified')
              .setDescription(`<@${userId}> (${member.user.tag}) completed verification via **One-Click Button**.`)
              .setTimestamp()
          ]
        }).catch(() => null);
      }
    }

    // Optional DM
    if (config.send_dm && config.dm_message) {
      const dmText = config.dm_message
        .replace(/{server}/gi, interaction.guild.name)
        .replace(/{user}/gi, `<@${userId}>`)
        .replace(/{username}/gi, member.user.username);
      member.send({ content: dmText }).catch(() => null);
    }

    return interaction.reply({ content: '✅ You have been verified!', flags: 64 });
  }

  if (config.type === 'otp') {
    const cooldown = await isOTPCooldownActive(guildId, userId);
    if (cooldown) {
      return interaction.reply({ content: '⏱️ Please wait before requesting another OTP (30s cooldown).', flags: 64 });
    }

    const otp = generateOTP();
    await setOTPCooldown(guildId, userId, otp);

    try {
     await interaction.user.send({
     embeds: [new EmbedBuilder()
    .setColor('Blue')
    .setTitle(`🔐 OTP for ${interaction.guild.name}`)
    .setDescription(
      `Here is your one-time password (OTP) for verifying in **${interaction.guild.name}**:\n\n` +
      `\`${otp}\`\n\n` +
      `Please enter this code in the **<#${config.channel_id}>** channel of the server to complete your verification.`
    )
    .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })]
});
        
    } catch {
      return interaction.reply({ content: '❌ I couldn’t DM you. Please enable DMs and try again.', flags: 64 });
    }

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('📥 Enter Your OTP')
      .setDescription('I’ve sent you a 5-character OTP in your DMs.\n\nClick the button below to enter it here and complete verification.');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('otp_enter')
        .setLabel('Enter OTP')
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      flags: 64
    });
  }
};
