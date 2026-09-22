const {
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
  ActionRowBuilder
} = require('discord.js');

const {
  createGiveaway,
  updateGiveaway,
  endGiveaway,
  rerollGiveaway,
  getGiveawayByMessageId,
  finalizeGiveaway,
  scheduleGiveawayEnd,
  buildGiveawayEmbed,
  buildGiveawayRow,
  formatAnnouncementContent
} = require('../listeners/giveawayService');

// ⏱️ Duration parser: "1h", "30m", "1d 6h", "2d3h15m"
function parseDuration(str) {
  if (!str || typeof str !== 'string') return null;
  const regex = /(\d+)\s*([dhms])/gi;
  const units = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  let total = 0, match;
  while ((match = regex.exec(str)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (!units[unit] || Number.isNaN(value)) continue;
    total += value * units[unit];
  }
  return total > 0 ? total : null;
}

// Helper to extract value after a bold label
function getValue(line, label) {
  if (!line) return null;
  const re = new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.*)$`);
  const m = line.match(re);
  return m ? m[1].trim() : null;
}

module.exports = async function handleGiveawayButtons(interaction) {
  const customId = interaction.customId;

  // 🎉 Handle user entry: giveaway_enter_<messageId>
  if (customId.startsWith('giveaway_enter_')) {
    const messageId = customId.split('_')[2];
    const giveaway = await getGiveawayByMessageId(messageId);
    if (!giveaway || giveaway.ended) {
      return interaction.reply({
        flags: 64,
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('❌ Giveaway Inactive')
            .setDescription('This giveaway has ended or does not exist.')
        ]
      });
    }

    let config = {};
    try {
      config = JSON.parse(giveaway.config || '{}');
    } catch {}

    // Check Role Requirement
    if (config.requiredRole) {
      const member = interaction.member;
      const hasRole = member?.roles?.cache?.has(config.requiredRole);
      if (!hasRole) {
        return interaction.reply({
          flags: 64,
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('🛡️ Entry Requirement Not Met')
              .setDescription(`You must have the <@&${config.requiredRole}> role to enter this giveaway.`)
              .setFooter({ text: 'Acquire the required role and try entering again!' })
          ]
        });
      }
    }

    const userId = interaction.user.id;
    let participants = [];
    try {
      participants = JSON.parse(giveaway.participants || '[]');
    } catch {}

    if (participants.includes(userId)) {
      return interaction.reply({
        flags: 64,
        embeds: [
          new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('⚠️ Already Entered')
            .setDescription(`You have already entered the giveaway for **${giveaway.prize}**!\nTotal entries so far: **${participants.length}**.\nGood luck!`)
            .setFooter({ text: 'Winners will be randomly picked when the giveaway concludes.' })
        ]
      });
    }

    participants.push(userId);
    await updateGiveaway(messageId, { participants: JSON.stringify(participants) });

    // Update message button dynamically with new entrant count
    const updatedRow = buildGiveawayRow({
      messageId,
      winners: giveaway.winners || 1,
      config,
      participantCount: participants.length
    });
    await interaction.message.edit({ components: [updatedRow] }).catch(() => null);

    return interaction.reply({
      flags: 64,
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('🎉 Entry Confirmed!')
          .setDescription(`You have successfully entered the giveaway for **${giveaway.prize}**!\nTotal entries: **${participants.length}**.`)
          .setFooter({ text: 'Winners will be randomly selected when time expires.' })
      ]
    });
  }

  // 🎛️ Handle management buttons
  const [prefix, action, type, ownerId, refMessageId] = customId.split('_');
  if (prefix !== 'giveaway') return false;

  if (action !== 'enter' && interaction.user.id !== ownerId) {
    await interaction.reply({ content: '❌ You are not authorized to confirm this action.', flags: 64 });
    return true;
  }

  if (action === 'cancel') {
    await interaction.update({ content: '❌ Action cancelled.', embeds: [], components: [] });
    return true;
  }

  // ✅ Confirm start
  if (action === 'confirm' && type === 'start') {
    const embed = interaction.message.embeds[0];
    let prize, winners, durationMs, channelId, content, config = {};

    // Check if raw config JSON is embedded in footer
    const footerText = embed?.footer?.text || '';
    if (footerText.startsWith('RAW_CONFIG::')) {
      try {
        const raw = JSON.parse(footerText.slice('RAW_CONFIG::'.length));
        prize = raw.prize;
        winners = raw.winners;
        durationMs = raw.durationMs;
        channelId = raw.channelId;
        content = raw.content;
        config = raw.config || {};
      } catch {}
    }

    if (!prize) {
      const lines = embed?.description?.split('\n') || [];
      prize = getValue(lines[0], 'Prize');
      const winnersStr = getValue(lines[1], 'Winners');
      const durationStr = getValue(lines[2], 'Duration');
      const channelText = getValue(lines[3], 'Channel');
      content = getValue(lines[4], 'Message');

      winners = parseInt(winnersStr, 10);
      durationMs = parseDuration(durationStr);

      const chMatch = channelText ? channelText.match(/<#(\d+)>/) : null;
      channelId = chMatch ? chMatch[1] : null;
    }

    if (!prize || !Number.isInteger(winners) || !durationMs || !channelId) {
      await interaction.update({ content: '❌ Invalid data in preview. Please try again.', components: [] });
      return true;
    }

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await interaction.update({ content: '❌ Target channel not found.', components: [] });
      return true;
    }

    const endAt = Date.now() + durationMs;

    const giveawayEmbed = buildGiveawayEmbed({
      prize,
      winners,
      endAt,
      hostId: ownerId,
      config
    });

    const initialRow = buildGiveawayRow({
      messageId: 'PLACEHOLDER',
      winners,
      config,
      participantCount: 0
    });

    const announcement = formatAnnouncementContent(content, config.ping);
    const sent = await channel.send({
      content: announcement,
      embeds: [giveawayEmbed],
      components: [initialRow]
    });

    const fixedRow = buildGiveawayRow({
      messageId: sent.id,
      winners,
      config,
      participantCount: 0
    });
    await sent.edit({ components: [fixedRow] });

    await createGiveaway({
      messageId: sent.id,
      guildId: interaction.guild.id,
      channelId: channel.id,
      prize,
      winners,
      endAt,
      createdBy: ownerId,
      participants: JSON.stringify([]),
      config
    });

    // Schedule auto-end
    await scheduleGiveawayEnd(interaction.client, {
      messageId: sent.id,
      channelId: channel.id,
      prize,
      winners,
      endAt
    });

    await interaction.update({
      content: `✅ Giveaway launched successfully in <#${channel.id}>! [Jump to Giveaway](${sent.url})`,
      embeds: [],
      components: []
    });
    return true;
  }

  // ✏️ Confirm edit
  if (action === 'confirm' && type === 'edit') {
    const embed = interaction.message.embeds[0];
    const lines = embed?.description?.split('\n') || [];

    const msgId = getValue(lines[0], 'Message ID') || refMessageId;
    const prize = getValue(lines[1], 'New Prize');
    const winnersStr = getValue(lines[2], 'New Winners');
    const durationStr = getValue(lines[3], 'New Duration');

    const winners = parseInt(winnersStr, 10);
    const durationMs = parseDuration(durationStr);

    if (!msgId || !prize || !Number.isInteger(winners) || !durationMs) {
      await interaction.update({ content: '❌ Invalid edit data in preview.', components: [] });
      return true;
    }

    const giveaway = await getGiveawayByMessageId(msgId);
    if (!giveaway) {
      await interaction.update({ content: '❌ Giveaway not found.', components: [] });
      return true;
    }

    const endAt = Date.now() + durationMs;
    await updateGiveaway(msgId, { prize, winners, end_at: endAt });

    // Update Discord message
    const channel = await interaction.guild.channels.fetch(giveaway.channel_id).catch(() => null);
    if (channel) {
      const msg = await channel.messages.fetch(msgId).catch(() => null);
      if (msg) {
        let participants = [];
        try { participants = JSON.parse(giveaway.participants || '[]'); } catch {}

        const updatedEmbed = buildGiveawayEmbed({
          prize,
          winners,
          endAt,
          hostId: giveaway.created_by,
          config: giveaway.config
        });

        const updatedRow = buildGiveawayRow({
          messageId: msgId,
          winners,
          config: giveaway.config,
          participantCount: participants.length
        });

        await msg.edit({ embeds: [updatedEmbed], components: [updatedRow] }).catch(() => null);
      }
    }

    if (interaction.client?.giveawayTimers?.has(msgId)) {
      clearTimeout(interaction.client.giveawayTimers.get(msgId));
    }
    scheduleGiveawayEnd(interaction.client, {
      messageId: msgId,
      channelId: giveaway.channel_id,
      prize,
      winners,
      endAt
    });

    await interaction.update({ content: '✅ Giveaway updated and synced with Discord!', embeds: [], components: [] });
    return true;
  }

  // 🛑 Confirm end
  if (action === 'confirm' && type === 'end') {
    await finalizeGiveaway(refMessageId, interaction.client);
    await interaction.update({ content: '✅ Giveaway concluded and winners announced.', embeds: [], components: [] });
    return true;
  }

  // 🔁 Confirm reroll
  if (action === 'confirm' && type === 'reroll') {
    const giveaway = await getGiveawayByMessageId(refMessageId);
    if (!giveaway) {
      await interaction.update({ content: '❌ Giveaway not found.', components: [] });
      return true;
    }

    const participants = JSON.parse(giveaway.participants || '[]');
    if (participants.length === 0) {
      await interaction.update({ content: '❌ No participants entered to reroll.', components: [] });
      return true;
    }

    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    const count = Math.min(giveaway.winners || 1, participants.length);
    const newWinners = shuffled.slice(0, count);
    const winnerMentions = newWinners.map(id => `<@${id}>`).join(' ');

    const channel = await interaction.client.channels.fetch(giveaway.channel_id).catch(() => null);
    if (channel) {
      const rerollEmbed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('🎉 GIVEAWAY REROLL: NEW WINNER(S)! 🎉')
        .setDescription(`Congratulations to our new lucky winner(s)!\n\n${newWinners.map((w, idx) => `🏆 **${idx + 1}.** <@${w}>`).join('\n')}`)
        .addFields(
          { name: '🎁 Prize', value: `**${giveaway.prize}**`, inline: true },
          { name: '👥 Total Entries', value: `\`${participants.length}\``, inline: true },
          { name: '👑 Hosted by', value: `<@${giveaway.created_by}>`, inline: true },
          { name: '🔗 Original Giveaway', value: `[Jump to Giveaway Post](https://discord.com/channels/${giveaway.guild_id}/${giveaway.channel_id}/${refMessageId})`, inline: false }
        )
        .setFooter({ text: 'Uranium Giveaways • Reroll Completed' })
        .setTimestamp();

      await channel.send({
        content: `🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}** in the reroll!`,
        embeds: [rerollEmbed]
      }).catch(() => null);
    }

    await interaction.update({ content: `✅ Rerolled successfully! Announced new winner(s): ${winnerMentions}`, embeds: [], components: [] });
    return true;
  }

  return false;
};

