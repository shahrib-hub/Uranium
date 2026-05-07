const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

const {
  getSetup,
  createSetup,
  deleteSetup
} = require('../../listeners/joinToCreateServices');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join-to-create')
    .setDescription('🎙️ Setup or disable Join-To-Create voice channels')
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Configure Join-To-Create for your server')
        .addChannelOption(opt =>
          opt.setName('voice_channel')
            .setDescription('Voice channel users join to trigger creation')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildVoice))
        .addChannelOption(opt =>
          opt.setName('category')
            .setDescription('Category where new voice channels will be created')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory))
        .addIntegerOption(opt =>
          opt.setName('limit')
            .setDescription('Max users per temporary voice channel (1–99)')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable the Join-To-Create system')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const member = interaction.member;

    // ✅ Permission check
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels) &&
        !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        flags: 64,
        embeds: [new EmbedBuilder()
          .setColor('Red')
          .setTitle('🚫 Insufficient Permissions')
          .setDescription('You need **Manage Channels** or **Administrator** permission to use this command.')
          .setFooter({ text: 'MULTi-Bot • Join-To-Create' })]
      });
    }

    const guildId = interaction.guild.id;

    if (sub === 'setup') {
      const existing = await getSetup(guildId);
      if (existing) {
        return interaction.reply({
          flags: 64,
          embeds: [new EmbedBuilder()
            .setColor('Red')
            .setTitle('⚠️ Already Configured')
            .setDescription('Join-To-Create is already active in this server. Disable it first to change the configuration.')
            .setFooter({ text: 'MULTi-Bot • Join-To-Create' })]
        });
      }

      const voiceChannel = interaction.options.getChannel('voice_channel');
      const category = interaction.options.getChannel('category');
      const userLimit = interaction.options.getInteger('limit');

      if (userLimit < 1 || userLimit > 99) {
        return interaction.reply({
          flags: 64,
          embeds: [new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Invalid User Limit')
            .setDescription('Please provide a user limit between 1 and 99.')
            .setFooter({ text: 'MULTi-Bot • Join-To-Create' })]
        });
      }

      await createSetup({
        guildId,
        triggerVoiceId: voiceChannel.id,
        targetCategoryId: category.id,
        userLimit,
        createdBy: interaction.user.id
      });

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Join-To-Create Setup Complete')
          .setDescription([
            `**Trigger Channel:** <#${voiceChannel.id}>`,
            `**Target Category:** ${category.name}`,
            `**Max Users per VC:** ${userLimit}`,
            `👤 Setup by: <@${interaction.user.id}>`
          ].join('\n'))
          .setFooter({ text: 'MULTi-Bot • Join-To-Create' })]
      });
    }

    if (sub === 'disable') {
      const existing = await getSetup(guildId);
      if (!existing) {
        return interaction.reply({
          flags: 64,
          embeds: [new EmbedBuilder()
            .setColor('Red')
            .setTitle('⚠️ No Setup Found')
            .setDescription('There is no active Join-To-Create setup to disable in this server.')
            .setFooter({ text: 'MULTi-Bot • Join-To-Create' })]
        });
      }

      await deleteSetup(guildId);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('Grey')
          .setTitle('🗑️ Join-To-Create Disabled')
          .setDescription('The Join-To-Create system has been disabled and configuration removed.')
          .setFooter({ text: 'MULTi-Bot • Join-To-Create' })]
      });
    }
  }
};
