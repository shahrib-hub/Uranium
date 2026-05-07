const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');

module.exports = async (interaction) => {
  if (!interaction.isButton() || interaction.customId !== 'otp_enter') return;

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