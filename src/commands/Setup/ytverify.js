const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');

const {
  setSettings,
  disable,
  getSettings
} = require('../../utils/ytVerify');
const ytVerifyGloballyDisabled = false; 
module.exports.premium = true;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ytverify')
    .setDescription('YouTube subscription screenshot verification')
    .setDMPermission(false)
    .addSubcommand(sub => sub.setName('setup').setDescription('Interactive setup (admin only)'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable verification (admin only)'))
    .addSubcommand(sub => sub.setName('status').setDescription('Show current verification status')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (['setup', 'disable'].includes(sub) && !isAdmin) {
      return interaction.reply({ content: '❌ You need **Manage Server** permission.', flags: 64 });
    }
      
 const { isPremiumGuild } = require('../../utils/premium');

if (!isPremiumGuild(interaction.guild.id)) {
  return interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor('Red')
      .setTitle('🔒 Premium Feature')
      .setDescription(
        'This command is available only to **premium servers**.\n\n' +
        'We’re actively upgrading our infrastructure to support more features. In the meantime, you can:\n\n' +
        '• Use `/premium buy` to purchase premium\n' +
        '• Use `/premium redeem` to activate a code\n' +
        '• Use `/premium support` to get help or ask questions\n\n' +
        '💖 Thank you for supporting the project!'
      )
      .setFooter({ text: 'Premium required to access this feature.' })],
    flags: 64
  });
}
      
      if (ytVerifyGloballyDisabled) {
  const disabledEmbed = new EmbedBuilder()
    .setColor('Red')
    .setTitle('🚫 Verification Temporarily Disabled')
    .setDescription(
      'Due to current server limitations, the YouTube verification system is temporarily disabled.\n\n' +
      'We’re actively upgrading our infrastructure to restore full functionality soon. In the meantime, you can support us by donating to help us scale faster.\n\n' +
      '💖 Thank you for your patience and support!'
    )
    .setFooter({ text: 'This feature will return once performance improves.' });

  return interaction.reply({ embeds: [disabledEmbed], flags: 64 });
      }

    if (sub === 'setup') {
      const cancelRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cancel_setup').setLabel('❌ Cancel').setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('Blurple')
          .setTitle('YouTube Verification Setup — Step 1/3')
          .setDescription('Please type the exact **YouTube channel name** users must be subscribed to.')],
        components: [cancelRow],
        flags: 64
      });

      const channelName = await waitForMessage(interaction, interaction.user.id);
      if (!channelName) return;

      await interaction.followUp({
        embeds: [new EmbedBuilder()
          .setColor('Blurple')
          .setTitle('Step 2/3 — Roles to Grant')
          .setDescription('Mention one or more **roles** to grant upon successful verification (e.g., @Member @VIP).')],
        components: [cancelRow],
        flags: 64
      });

      const rolesMsg = await waitForMessage(interaction, interaction.user.id);
      if (!rolesMsg) return;

      const roleIds = rolesMsg.mentions.roles.map(r => r.id);
      if (roleIds.length === 0) {
        return interaction.followUp({
          embeds: [new EmbedBuilder()
            .setColor('Red')
            .setTitle('⚠️ Invalid Roles')
            .setDescription('Please mention at least one valid role. Run `/ytverify setup` again.')],
          flags: 64
        });
      }

      await interaction.followUp({
        embeds: [new EmbedBuilder()
          .setColor('Blurple')
          .setTitle('Step 3/3 — Verification Channel')
          .setDescription('Mention the **channel** where users will upload their YouTube screenshots (e.g., #verify).')],
        components: [cancelRow],
        flags: 64
      });

      const verifyChannelMsg = await waitForMessage(interaction, interaction.user.id);
      if (!verifyChannelMsg) return;

      const mentionedChannel = verifyChannelMsg.mentions.channels.first();
      if (!mentionedChannel || mentionedChannel.type !== ChannelType.GuildText) {
        return interaction.followUp({
          embeds: [new EmbedBuilder()
            .setColor('Red')
            .setTitle('⚠️ Invalid Channel')
            .setDescription('Please mention a valid **text channel**. Run `/ytverify setup` again.')],
          flags: 64
        });
      }

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_setup').setLabel('✅ Confirm').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cancel_setup').setLabel('❌ Cancel').setStyle(ButtonStyle.Secondary)
      );

      const summary = new EmbedBuilder()
        .setColor('Gold')
        .setTitle('🔧 Confirm YouTube Verification Settings')
        .addFields(
          { name: '📺 Channel Name', value: channelName.content, inline: true },
          { name: '🎖️ Roles to Grant', value: roleIds.map(id => `<@&${id}>`).join(', '), inline: true },
          { name: '📨 Verification Channel', value: `<#${mentionedChannel.id}>`, inline: true }
        );

      const msg = await interaction.followUp({ embeds: [summary], components: [confirmRow], flags: 64 });

      const confirmed = await waitForButton(msg, interaction.user.id, ['confirm_setup', 'cancel_setup']);
      if (confirmed === 'confirm_setup') {
        setSettings(guildId, {
          channel_name: channelName.content.trim(),
          grant_roles: roleIds,
          verify_channel_id: mentionedChannel.id
        });
        await interaction.followUp({
          embeds: [new EmbedBuilder()
            .setColor('Green')
            .setTitle('✅ YouTube Verification Enabled')
            .setDescription(`Users can now verify by uploading screenshots in <#${mentionedChannel.id}>.`)],
          flags: 64
        });
      } else {
        await interaction.followUp({
          embeds: [new EmbedBuilder().setColor('Grey').setTitle('❌ Setup Cancelled')],
          flags: 64
        });
      }
    }

    else if (sub === 'disable') {
      const settings = await new Promise(res => getSettings(guildId, res));
      if (!settings) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor('Grey')
            .setTitle('ℹ️ No Verification Setup Found')
            .setDescription('There is no YouTube verification system configured for this server.')],
          flags: 64
        });
      }

      disable(guildId);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('Red')
          .setTitle('🛑 YouTube Verification Disabled')
          .setDescription('The verification system has been turned off for this server.')],
        flags: 64
      });
    }

    else if (sub === 'status') {
      const settings = await new Promise(res => getSettings(guildId, res));
      if (!settings) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor('Grey')
            .setTitle('📡 YouTube Verification Status')
            .setDescription('❌ No verification system is currently configured for this server.')],
          flags: 64
        });
      }

      const enabled = settings.enabled === 1;
      const embed = new EmbedBuilder()
        .setColor(enabled ? 'Green' : 'Red')
        .setTitle('📡 YouTube Verification Status')
        .addFields(
          { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Channel Name', value: settings.channel_name, inline: true },
          { name: 'Verification Channel', value: `<#${settings.verify_channel_id}>`, inline: true },
          { name: 'Roles to Grant', value: settings.grant_roles.split(',').map(id => `<@&${id}>`).join(', ') || 'None', inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    }
  }
};

// Helper functions
async function waitForMessage(interaction, userId, timeoutMs = 60000) {
  const channel = interaction.channel;
  return new Promise((resolve) => {
    const collector = channel.createMessageCollector({ time: timeoutMs });
    collector.on('collect', (m) => {
      if (m.author.id === userId) {
        collector.stop('received');
        resolve(m);
      }
    });
    collector.on('end', async (collected, reason) => {
      if (reason !== 'received') {
        await interaction.followUp({
          embeds: [new EmbedBuilder()
            .setColor('Red')
            .setTitle('⏱️ Setup Timed Out')
            .setDescription('You took too long to respond. Please run `/ytverify setup` again.')],
          flags: 64
        });
        resolve(null);
      }
    });
  });
}

async function waitForButton(message, userId, ids, timeoutMs = 60000) {
  return new Promise((resolve) => {
    const collector = message.createMessageComponentCollector({
      time: timeoutMs,
      filter: i => i.user.id === userId && ids.includes(i.customId)
    });
    collector.on('collect', async (i) => {
      await i.deferUpdate();
      collector.stop(i.customId);
      resolve(i.customId);
    });
    collector.on('end', (collected, reason) => {
      if (!ids.includes(reason)) resolve(null);
    });
  });
}