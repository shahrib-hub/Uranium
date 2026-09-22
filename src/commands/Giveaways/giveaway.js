const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const { listActiveGiveaways } = require('../../listeners/giveawayService');

// ⏱️ Embedded duration parser
function parseDuration(str) {
  const regex = /(\d+)\s*([dhms])/gi;
  const units = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  let total = 0, match;
  while ((match = regex.exec(str)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (units[unit]) total += value * units[unit];
  }
  return total > 0 ? total : null;
}

function formatDuration(ms) {
  const d = Math.floor(ms / 86400000); ms %= 86400000;
  const h = Math.floor(ms / 3600000); ms %= 3600000;
  const m = Math.floor(ms / 60000); ms %= 60000;
  const s = Math.floor(ms / 1000);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, s && `${s}s`].filter(Boolean).join(' ') || '0s';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('🎉 Manage giveaways with confirmation buttons')
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption(opt => opt.setName('duration').setDescription('e.g. 1d 6h 30m').setRequired(true))
        .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(true))
        .addStringOption(opt => opt.setName('prize').setDescription('Prize').setRequired(true))
        .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Optional extra rules or description'))
        .addStringOption(opt => opt.setName('color').setDescription('Optional accent hex color (e.g. #5865F2, #57F287)'))
        .addRoleOption(opt => opt.setName('required_role').setDescription('Optional role required to enter'))
        .addStringOption(opt => opt.setName('button_label').setDescription('Optional button label (default: Enter)'))
        .addStringOption(opt => opt.setName('button_emoji').setDescription('Optional button emoji (default: 🎉)'))
        .addStringOption(opt => opt.setName('ping').setDescription('Ping on launch').addChoices({ name: 'None', value: 'none' }, { name: '@everyone', value: 'everyone' }, { name: '@here', value: 'here' }))
        .addStringOption(opt => opt.setName('thumbnail').setDescription('Optional thumbnail image URL'))
        .addStringOption(opt => opt.setName('banner').setDescription('Optional banner image URL'))
        .addStringOption(opt => opt.setName('content').setDescription('Optional announcement message')))
    .addSubcommand(sub =>
      sub.setName('edit')
        .setDescription('Edit an existing giveaway')
        .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
        .addStringOption(opt => opt.setName('duration').setDescription('New duration').setRequired(true))
        .addIntegerOption(opt => opt.setName('winners').setDescription('New winners count').setRequired(true))
        .addStringOption(opt => opt.setName('prize').setDescription('New prize').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('end')
        .setDescription('End a giveaway early')
        .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('reroll')
        .setDescription('Reroll a giveaway')
        .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all active giveaways')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const member = interaction.member;
    const userId = interaction.user.id;

    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ flags: 64, content: '❌ You need Manage Channels permission.' });
    }

    if (sub === 'start') {
      const durationInput = interaction.options.getString('duration');
      const durationMs = parseDuration(durationInput);
      if (!durationMs) return interaction.reply({ flags: 64, content: '❌ Invalid duration format. Examples: `1h`, `1d 6h`, `30m`.' });

      const winners = interaction.options.getInteger('winners');
      const prize = interaction.options.getString('prize');
      const channel = interaction.options.getChannel('channel');
      const description = interaction.options.getString('description') || '';
      const color = interaction.options.getString('color') || '#5865F2';
      const requiredRole = interaction.options.getRole('required_role');
      const buttonLabel = interaction.options.getString('button_label') || 'Enter';
      const buttonEmoji = interaction.options.getString('button_emoji') || '🎉';
      const ping = interaction.options.getString('ping') || 'none';
      const thumbnail = interaction.options.getString('thumbnail') || '';
      const banner = interaction.options.getString('banner') || '';
      const content = interaction.options.getString('content') || '🎉 **GIVEAWAY TIME!** 🎉 React or click below to enter!';
      const normalized = formatDuration(durationMs);

      const config = {
        description,
        color,
        requiredRole: requiredRole ? requiredRole.id : undefined,
        buttonLabel,
        buttonEmoji,
        ping,
        thumbnail: thumbnail || undefined,
        image: banner || undefined
      };

      const previewData = {
        prize,
        winners,
        durationMs,
        channelId: channel.id,
        content,
        config
      };

      let previewColor = 0xF1C40F;
      if (color && typeof color === 'string') {
        const parsed = parseInt(color.replace('#', '').trim(), 16);
        if (!Number.isNaN(parsed)) previewColor = parsed;
      }

      const preview = new EmbedBuilder()
        .setColor(previewColor)
        .setTitle('🎁 Giveaway Launch Preview')
        .setDescription(
          `**Prize:** ${prize}\n` +
          `**Winners:** ${winners}\n` +
          `**Duration:** ${normalized}\n` +
          `**Channel:** ${channel}\n` +
          (requiredRole ? `**Required Role:** <@&${requiredRole.id}>\n` : '') +
          (description ? `**Description:** ${description}\n` : '') +
          `**Button:** \`${buttonEmoji} ${buttonLabel} (0)\`\n` +
          `**Ping:** \`${ping}\``
        )
        .setFooter({ text: `RAW_CONFIG::${JSON.stringify(previewData)}` });

      if (thumbnail) {
        try { new URL(thumbnail); preview.setThumbnail(thumbnail); } catch {}
      }
      if (banner) {
        try { new URL(banner); preview.setImage(banner); } catch {}
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`giveaway_confirm_start_${userId}`).setLabel('🚀 Confirm & Launch').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`giveaway_cancel_start_${userId}`).setLabel('❌ Cancel').setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({ embeds: [preview], components: [row], flags: 64 });
    }

    if (sub === 'edit') {
      const durationInput = interaction.options.getString('duration');
      const durationMs = parseDuration(durationInput);
      if (!durationMs) return interaction.reply({ flags: 64, content: '❌ Invalid duration format.' });

      const messageId = interaction.options.getString('message_id');
      const winners = interaction.options.getInteger('winners');
      const prize = interaction.options.getString('prize');
      const normalized = formatDuration(durationMs);

      const preview = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('✏️ Giveaway Edit Preview')
        .setDescription(`**Message ID:** ${messageId}\n**New Prize:** ${prize}\n**New Winners:** ${winners}\n**New Duration:** ${normalized}`)
        .setFooter({ text: 'Click confirm to apply changes.' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`giveaway_confirm_edit_${userId}_${messageId}`).setLabel('✅ Confirm').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`giveaway_cancel_edit_${userId}_${messageId}`).setLabel('❌ Cancel').setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({ embeds: [preview], components: [row], flags: 64 });
    }

    if (sub === 'end') {
      const messageId = interaction.options.getString('message_id');
      const preview = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🛑 End Giveaway Confirmation')
        .setDescription(`End giveaway with message ID: \`${messageId}\`?`)
        .setFooter({ text: 'Click confirm to end.' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`giveaway_confirm_end_${userId}_${messageId}`).setLabel('✅ Confirm').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`giveaway_cancel_end_${userId}_${messageId}`).setLabel('❌ Cancel').setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds: [preview], components: [row], flags: 64 });
    }

    if (sub === 'reroll') {
      const messageId = interaction.options.getString('message_id');
      const preview = new EmbedBuilder()
        .setColor('Purple')
        .setTitle('🔁 Reroll Giveaway Confirmation')
        .setDescription(`Reroll giveaway with message ID: \`${messageId}\`?`)
        .setFooter({ text: 'Click confirm to reroll.' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`giveaway_confirm_reroll_${userId}_${messageId}`).setLabel('✅ Confirm').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`giveaway_cancel_reroll_${userId}_${messageId}`).setLabel('❌ Cancel').setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds: [preview], components: [row], flags: 0 });
    }

    if (sub === 'list') {
      const giveaways = await listActiveGiveaways(interaction.guild.id);
      if (!giveaways.length) {
        return interaction.reply({ flags: 64, embeds: [new EmbedBuilder().setColor('Grey').setTitle('📋 No Active Giveaways')] });
      }

      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('🎉 Active Giveaways')
        .setDescription(giveaways.map(g => {
          const timeLeft = `<t:${Math.floor(g.end_at / 1000)}:R>`;
          return `• [\`${g.message_id}\`](https://discord.com/channels/${g.guild_id}/${g.channel_id}/${g.message_id})\n→ **Prize:** ${g.prize}\n→ **Ends:** ${timeLeft}\n→ **Winners:** ${g.winners}`;
        }).join('\n\n'))
        .setFooter({ text: `Total: ${giveaways.length}` });

       return interaction.reply({ embeds: [embed], flags: 64 });
    }
  }
};