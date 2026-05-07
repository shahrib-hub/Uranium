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
  scheduleGiveawayEnd
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
      return interaction.reply({ flags: 64, content: '❌ This giveaway has ended or does not exist.' });
    }

    const userId = interaction.user.id;
    const participants = JSON.parse(giveaway.participants || '[]');

    if (participants.includes(userId)) {
      return interaction.reply({ flags: 64, content: '⚠️ You have already entered this giveaway!' });
    }

    participants.push(userId);
    await updateGiveaway(messageId, { participants: JSON.stringify(participants) });

    return interaction.reply({ flags: 64, content: '🎉 You have successfully entered the giveaway!' });
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
    const lines = embed?.description?.split('\n') || [];

    const prize = getValue(lines[0], 'Prize');
    const winnersStr = getValue(lines[1], 'Winners');
    const durationStr = getValue(lines[2], 'Duration');
    const channelText = getValue(lines[3], 'Channel');
    const content = getValue(lines[4], 'Message');

    const winners = parseInt(winnersStr, 10);
    const durationMs = parseDuration(durationStr);

    if (!prize || !Number.isInteger(winners) || !durationMs || !channelText) {
      await interaction.update({ content: '❌ Invalid data in preview. Please try again.', components: [] });
      return true;
    }

    const chMatch = channelText.match(/<#(\d+)>/);
    const channelId = chMatch ? chMatch[1] : null;
    const channel = channelId ? await interaction.guild.channels.fetch(channelId).catch(() => null) : null;

    if (!channel) {
      await interaction.update({ content: '❌ Channel not found.', components: [] });
      return true;
    }

    const endAt = Date.now() + durationMs;

    const giveawayEmbed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('🎉 Giveaway')
      .setDescription(`**Prize:** ${prize}\n**Ends:** <t:${Math.floor(endAt / 1000)}:R>\n**Hosted by:** <@${ownerId}>`)
      .setFooter({ text: `Winners: ${winners}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_info')
        .setLabel('Giveaway')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('giveaway_enter_PLACEHOLDER')
        .setLabel('🎉 Enter')
        .setStyle(ButtonStyle.Primary)
    );

    const sent = await channel.send({ content, embeds: [giveawayEmbed], components: [row] });

    const fixedRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_info')
        .setLabel('Giveaway')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`giveaway_enter_${sent.id}`)
        .setLabel('🎉 Enter')
        .setStyle(ButtonStyle.Primary)
    );
    await sent.edit({ components: [fixedRow] });

    await createGiveaway({
      messageId: sent.id,
      guildId: interaction.guild.id,
      channelId: channel.id,
      prize,
      winners,
      endAt,
      createdBy: ownerId,
      participants: JSON.stringify([])
    });

    // ✅ Schedule auto-end
    await scheduleGiveawayEnd(interaction.client, {
      messageId: sent.id,
      channelId: channel.id,
      prize,
      winners,
      endAt
    });

    await interaction.update({ content: '✅ Giveaway started!', embeds: [], components: [] });
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

    const endAt = Date.now() + durationMs;
    await updateGiveaway(msgId, { prize, winners, end_at: endAt });

    await interaction.update({ content: '✅ Giveaway updated!', embeds: [], components: [] });
    return true;
  }

  // 🛑 Confirm end
  if (action === 'confirm' && type === 'end') {
    await finalizeGiveaway(refMessageId, interaction.client);
    await interaction.update({ content: '✅ Giveaway ended.', embeds: [], components: [] });
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
    if (participants.length < giveaway.winners) {
      await interaction.update({ content: '❌ Not enough participants to reroll.', components: [] });
      return true;
    }

    const shuffled = participants.sort(() => 0.5 - Math.random());
    const newWinners = shuffled.slice(0, giveaway.winners);
    const winnerMentions = newWinners.map(id => `<@${id}>`).join(', ');

    await interaction.update({ content: `🎉 New winner(s): ${winnerMentions}`, embeds: [], components: [] });
    return true;
  }

  return false;
};
