// src/commands/Utility/starboard.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} = require('discord.js');
const { getStarboardConfig, setStarboardConfig } = require('../../utils/starboardStorage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('starboard')
    .setDescription('⭐ Manage server Starboard settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Configure and activate the Starboard')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel where starred messages will be posted')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt
            .setName('threshold')
            .setDescription('Number of reactions required to showcase a message (default: 3)')
            .setMinValue(1)
            .setMaxValue(25)
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('emoji')
            .setDescription('Reaction emoji to count (default: ⭐)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('View current Starboard configuration')
    )
    .addSubcommand(sub =>
      sub
        .setName('threshold')
        .setDescription('Update the reaction star count threshold')
        .addIntegerOption(opt =>
          opt
            .setName('count')
            .setDescription('New reaction count threshold')
            .setMinValue(1)
            .setMaxValue(50)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('selfstar')
        .setDescription('Allow or disallow authors to star their own messages')
        .addBooleanOption(opt =>
          opt
            .setName('allow')
            .setDescription('True to allow self-starring, false to disallow')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('blacklist')
        .setDescription('Ignore a channel from Starboard reactions')
        .addStringOption(opt =>
          opt
            .setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Add Channel', value: 'add' },
              { name: 'Remove Channel', value: 'remove' },
              { name: 'List Blacklisted', value: 'list' }
            )
        )
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Target channel (required for add/remove)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('disable')
        .setDescription('Temporarily disable Starboard in this server')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // 1. SETUP
    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel', true);
      const threshold = interaction.options.getInteger('threshold') || 3;
      const emoji = interaction.options.getString('emoji') || '⭐';

      const updated = await setStarboardConfig(guildId, {
        channelId: channel.id,
        threshold,
        emoji,
        enabled: true
      });

      const embed = new EmbedBuilder()
        .setColor(0xFFAC33)
        .setTitle('⭐ Starboard Activated')
        .setDescription(`Successfully enabled the Starboard system for **${interaction.guild.name}**!`)
        .addFields(
          { name: 'Channel', value: `<#${channel.id}>`, inline: true },
          { name: 'Threshold', value: `\`${threshold}\` reactions`, inline: true },
          { name: 'Emoji', value: `${emoji}`, inline: true }
        )
        .setFooter({ text: 'Uranium Community Engagement' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // 2. STATUS
    if (sub === 'status') {
      const config = await getStarboardConfig(guildId);
      if (!config || !config.channelId) {
        return interaction.reply({
          content: '⚠️ Starboard has not been set up in this server yet. Use `/starboard setup` to get started!',
          flags: 64
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xFFAC33)
        .setTitle('⭐ Starboard Configuration')
        .addFields(
          { name: 'Status', value: config.enabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
          { name: 'Channel', value: config.channelId ? `<#${config.channelId}>` : '*None*', inline: true },
          { name: 'Threshold', value: `\`${config.threshold || 3}\` reactions`, inline: true },
          { name: 'Emoji', value: `${config.emoji || '⭐'}`, inline: true },
          { name: 'Self-Starring', value: config.selfStar ? '✅ Allowed' : '❌ Disallowed', inline: true },
          { name: 'Blacklisted Channels', value: (config.ignoredChannels?.length) ? config.ignoredChannels.map(c => `<#${c}>`).join(', ') : '*None*', inline: false }
        )
        .setFooter({ text: 'Uranium • Starboard Hub' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // 3. THRESHOLD
    if (sub === 'threshold') {
      const count = interaction.options.getInteger('count', true);
      await setStarboardConfig(guildId, { threshold: count });
      return interaction.reply({
        content: `✅ Starboard reaction threshold updated to **${count}** reactions.`
      });
    }

    // 4. SELFSTAR
    if (sub === 'selfstar') {
      const allow = interaction.options.getBoolean('allow', true);
      await setStarboardConfig(guildId, { selfStar: allow });
      return interaction.reply({
        content: `✅ Self-starring is now **${allow ? 'allowed' : 'disallowed'}**.`
      });
    }

    // 5. BLACKLIST
    if (sub === 'blacklist') {
      const action = interaction.options.getString('action', true);
      const targetChannel = interaction.options.getChannel('channel');
      const config = (await getStarboardConfig(guildId)) || { ignoredChannels: [] };
      let ignored = Array.isArray(config.ignoredChannels) ? [...config.ignoredChannels] : [];

      if (action === 'list') {
        if (!ignored.length) {
          return interaction.reply({ content: 'ℹ️ No channels are currently blacklisted from Starboard.' });
        }
        return interaction.reply({
          content: `📋 **Blacklisted Starboard Channels:**\n${ignored.map(c => `• <#${c}>`).join('\n')}`
        });
      }

      if (!targetChannel) {
        return interaction.reply({ content: '❌ Please specify a channel to add or remove.', flags: 64 });
      }

      if (action === 'add') {
        if (!ignored.includes(targetChannel.id)) {
          ignored.push(targetChannel.id);
          await setStarboardConfig(guildId, { ignoredChannels: ignored });
        }
        return interaction.reply({ content: `✅ Added <#${targetChannel.id}> to the Starboard blacklist.` });
      }

      if (action === 'remove') {
        ignored = ignored.filter(id => id !== targetChannel.id);
        await setStarboardConfig(guildId, { ignoredChannels: ignored });
        return interaction.reply({ content: `✅ Removed <#${targetChannel.id}> from the Starboard blacklist.` });
      }
    }

    // 6. DISABLE
    if (sub === 'disable') {
      await setStarboardConfig(guildId, { enabled: false });
      return interaction.reply({
        content: '🛑 Starboard has been **disabled** for this server. Use `/starboard setup` to re-enable it.'
      });
    }
  }
};
