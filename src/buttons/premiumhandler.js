const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction) => {
  const value = interaction.values[0];

  if (value === 'overview') {
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🌟 Premium Features & Perks')
      .setDescription(
        'Upgrade to **MULTi-Bot Premium** and unlock a suite of powerful tools and expanded limits designed to supercharge your server.\n\n' +
        '**🔥 Current Premium Perks:**\n' +
        '• 🎨 **Embed Templates:** Save up to **20** templates (Free limit: 3)\n' +
        '• 🗃️ **Backups:** Get `+2` extra slots & reduced cooldown (24 hours)\n' +
        '• ✨ **YouTube Verify:** `/ytverify` subscription verification\n' +
        '• 🤖 **AI System:** Full-Fledged `/ai` commands\n' +
        '• 🚀 **OCR:** Faster queue and priority processing\n' +
        '• 📬 **Support:** Priority assistance & early access to new tools\n\n' +
        '*Use the dropdown below to explore more about Premium!*'
      )
      .setThumbnail('https://cdn.discordapp.com/emojis/1041131707577884692.png')
      .setFooter({ text: 'Premium is optional, but it helps us grow 💖' });

    await interaction.update({ embeds: [embed] });
  }

  if (value === 'buy') {
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('💳 How to Buy Premium')
      .setDescription(
        'Purchasing Premium is easy! Join our support server to get details on our plans, payment methods, and immediate activation.\n\n' +
        '**Link:** https://discord.gg/26ThFyckFX'
      )
      .setFooter({ text: 'Thank you for supporting MULTi-Bot!' });

    await interaction.update({ embeds: [embed] });
  }

  if (value === 'redeem') {
    const embed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle('🎁 How to Redeem')
      .setDescription(
        'If you have received a premium code, you can activate it by running the following command:\n\n' +
        '`/premium redeem code:<your-code>`\n\n' +
        'Once redeemed, Premium perks apply instantly to your server!'
      )
      .setFooter({ text: 'Need a code? Use /premium buy' });

    await interaction.update({ embeds: [embed] });
  }
};
