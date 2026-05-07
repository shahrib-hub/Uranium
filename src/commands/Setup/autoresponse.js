const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const {
  getAutoResponses,
  addAutoResponse,
  removeAutoResponse,
  getAutoResponse,
  countAutoResponses
} = require('../../utils/autoresponse');

const { isPremiumGuild } = require('../../utils/premium');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoresponse')
    .setDescription('⚡ Manage automatic responses')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a new auto-response trigger'))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove an existing trigger')
        .addStringOption(opt =>
          opt.setName('trigger')
            .setDescription('The trigger text to remove')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all auto-response triggers')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const member = interaction.member;

    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('❌ Permission Denied')
        .setDescription('You need the **Manage Server** permission to use this command.');
      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    const guildId = interaction.guild.id;

    // 🧩 ADD (message-based wizard)
    if (sub === 'add') {
      await interaction.reply({ content: '📥 Starting auto-response setup. Please answer the following prompts.', flags: 64 });

      const filter = m => m.author.id === interaction.user.id;
      const channel = interaction.channel;

      await channel.send('📝 What should the **trigger** be? (e.g., `hello`)');
      const triggerMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
      const trigger = triggerMsg.first()?.content.trim().toLowerCase();
      if (!trigger) return channel.send('❌ Setup cancelled. No trigger provided.');

      const existing = await getAutoResponse(guildId, trigger);
      if (existing) return channel.send('⚠️ That trigger already exists. Please choose a different one.');

      const currentCount = await countAutoResponses(guildId);
      const isPremium = await isPremiumGuild(guildId);
      const maxAllowed = isPremium ? 100 : 10;

      if (currentCount >= maxAllowed) {
        return channel.send(`🚫 Trigger limit reached. Free servers can have up to **10** auto-responses. Upgrade to premium for **100** auto-responses.`);
      }

      await channel.send('💬 What should the **response** be?');
      const responseMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
      const response = responseMsg.first()?.content;
      if (!response) return channel.send('❌ Setup cancelled. No response provided.');

      await channel.send('📦 Should the response be sent as an **embed**? Type `true` or `false`.');
      const embedMsg = await channel.awaitMessages({ filter, max: 1, time: 60000 });
      const embedFlag = embedMsg.first()?.content.toLowerCase() === 'true';

      const summary = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('🧠 Confirm Auto-Response')
        .addFields(
          { name: 'Trigger', value: trigger, inline: true },
          { name: 'Embed', value: embedFlag ? 'Yes' : 'No', inline: true },
          { name: 'Response', value: response }
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_autoresponse')
          .setLabel('✅ Confirm')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel_autoresponse')
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
          if (i.customId === 'confirm_autoresponse') {
            await addAutoResponse(guildId, trigger, response, embedFlag);
            await i.update({ content: '✅ Auto-response added successfully!', embeds: [], components: [] });
          } else {
            await i.update({ content: '❌ Setup cancelled.', embeds: [], components: [] });
          }
          collector.stop();
        } catch (err) {
          if (err?.code === 10062) return;
          console.error('[autoresponse] collector error:', err);
        }
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') {
          confirmMsg.edit({ content: '⏱️ Setup timed out.', components: [], embeds: [] });
        }
      });
    }

    // 🧹 REMOVE
    if (sub === 'remove') {
      const trigger = interaction.options.getString('trigger').toLowerCase();
      const existing = await getAutoResponse(guildId, trigger);
      if (!existing) {
        return interaction.reply({ content: '❌ Trigger not found.', flags: 64 });
      }

      await removeAutoResponse(guildId, trigger);
      return interaction.reply({ content: `🗑️ Removed auto-response for trigger: \`${trigger}\``, flags: 64 });
    }

    // 📋 LIST
    if (sub === 'list') {
      const all = await getAutoResponses(guildId);
      if (!all.length) {
        return interaction.reply({ content: 'ℹ️ No auto-responses set up yet.', flags: 64 });
      }

      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('📋 Auto-Response Triggers')
        .setDescription(all.map(r => `• \`${r.trigger}\` → ${r.embed ? '[embed]' : '[text]'}`).join('\n'));

      return interaction.reply({ embeds: [embed], flags: 64 });
    }
  }
};
