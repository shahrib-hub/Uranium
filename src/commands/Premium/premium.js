const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const {
  isPremiumGuild,
  isPremiumUser,
  redeemCode
} = require('../../utils/premium');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('🌟 Manage premium features and access')
    .addSubcommand(sub =>
      sub.setName('help').setDescription('📘 Learn about premium features'))
    .addSubcommand(sub =>
      sub.setName('buy').setDescription('💳 Get links to purchase premium'))
    .addSubcommand(sub =>
      sub.setName('redeem').setDescription('🎁 Redeem a premium code')
        .addStringOption(opt =>
          opt.setName('code')
            .setDescription('Enter your premium code')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('support').setDescription('🛠️ Get support for premium'))
    .addSubcommand(sub =>
      sub.setName('status').setDescription('📊 Check your premium status')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild?.id;
    const userId = interaction.user.id;

    if (sub === 'help') {
      const { StringSelectMenuBuilder } = require('discord.js');

      const embed = new EmbedBuilder()
        .setColor('#FFD700') // Rich Gold
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
        .setThumbnail('https://cdn.discordapp.com/emojis/1041131707577884692.png') // Example star icon
        .setFooter({ text: 'Premium is optional, but it helps us grow 💖' });

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
        new ButtonBuilder()
          .setLabel('💳 Buy Premium')
          .setStyle(ButtonStyle.Link)
          .setURL('https://discord.gg/26ThFyckFX')
      );

      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('💎 Buy Premium Access')
        .setDescription(
            'We are giving away free premium to servers, please join our support server for more information\n\n' +
          'Support the bot and unlock powerful features.\n\n' +
          'Click below to purchase premium or redeem a code.'
        )
        .setFooter({ text: 'Thank you for supporting the project 💖' });

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (sub === 'redeem') {
      const code = interaction.options.getString('code');
      const result = redeemCode(code, guildId, userId);

      if (!result.success) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Code Redemption Failed')
            .setDescription(`Reason: **${result.reason}**\nPlease check your code and try again.`)
            .setFooter({ text: 'Need help? Use /premium support' })]
        });
      }

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Premium Activated')
          .setDescription(`Premium is now active for this server!\n\n🗓️ Expires: <t:${Math.floor(new Date(result.expiresAt).getTime() / 1000)}:D>`)
          .setFooter({ text: 'Enjoy your premium perks!' })]
      });
    }

    if (sub === 'support') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('🛠️ Join Support Server')
          .setStyle(ButtonStyle.Link)
          .setURL('https://discord.gg/26ThFyckFX')
      );

      const embed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('🛠️ Premium Support')
        .setDescription('Need help with premium or have questions?\nJoin our support server below and we’ll assist you!')
        .setFooter({ text: 'We’re here to help you out 💬' });

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (sub === 'status') {
      const guildStatus = isPremiumGuild(guildId);
      const userStatus = isPremiumUser(userId);

      const embed = new EmbedBuilder()
        .setColor(guildStatus || userStatus ? 'Green' : 'Red')
        .setTitle('📊 Premium Status Overview')
        .addFields(
          { name: 'Server Premium', value: guildStatus ? '✅ Active' : '❌ Not Active', inline: true },
          { name: 'User Premium', value: userStatus ? '✅ Active' : '❌ Not Active', inline: true }
        )
        .setFooter({ text: 'Use /premium buy or /premium redeem to activate premium.' });

      return interaction.reply({ embeds: [embed] });
    }
  }
};
