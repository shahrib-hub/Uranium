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

  await member.roles.add(config.role_id).catch(() => null);
  await markUserVerified(guildId, userId);

  return interaction.reply({ content: '✅ OTP verified! You are now verified.', flags: 64 });
};
