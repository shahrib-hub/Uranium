const {
  validateOTP,
  markUserVerified,
  getVerificationConfig
} = require('../utils/verification');

module.exports = async (interaction) => {
  if (!interaction.isModalSubmit() || interaction.customId !== 'otp_submit') return;

  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  const inputCode = interaction.fields.getTextInputValue('otp_input').trim().toUpperCase();

  const valid = await validateOTP(guildId, userId, inputCode);
  if (!valid) {
    return interaction.reply({ content: '❌ Invalid OTP. Please try again.', flags: 64 });
  }

  const config = await getVerificationConfig(guildId);
  if (!config) {
    return interaction.reply({ content: '❌ Verification system is not configured.', flags: 64 });
  }

  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  if (!member) return interaction.reply({ content: '❌ Could not find your member profile.', flags: 64 });

  const { EmbedBuilder } = require('discord.js');

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
            .setTitle('🛡️ Member Verified (2FA OTP)')
            .setDescription(`<@${userId}> (${member.user.tag}) completed 2FA OTP verification.`)
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

  return interaction.reply({ content: '✅ OTP verified! You are now verified.', flags: 64 });
};
