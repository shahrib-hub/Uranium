const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');
const { getVerificationConfig } = require('../utils/verification');

module.exports = async (interaction) => {
  if (!interaction.isButton() || interaction.customId !== 'otp_enter') return;

  const guildId = interaction.guild?.id;
  if (guildId) {
    const config = await getVerificationConfig(guildId);
    if (!config || !config.enabled) {
      return interaction.reply({
        content: '❌ The verification system has been disabled or removed on this server.',
        flags: 64
      });
    }
  }

  const modal = new ModalBuilder()
    .setCustomId('otp_submit')
    .setTitle('Enter OTP Code')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('otp_input')
          .setLabel('Your OTP Code')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

  await interaction.showModal(modal);
};