const db = require('../utils/giveaway');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { useMongoDB } = require('../config/database');
const { Giveaway, getDbStatus } = require('../database/mongoose');

// ✅ Create a new giveaway
async function createGiveaway(data) {
  const {
    messageId, guildId, channelId, prize,
    winners, endAt, createdBy, config = {}
  } = data;

  const configStr = typeof config === 'string' ? config : JSON.stringify(config || {});

  if (useMongoDB) {
    if (!getDbStatus()) {
      console.error('[giveawayService] MongoDB is enabled but the connection is not ready.');
      return;
    }
    await Giveaway.create({
      messageId,
      guildId,
      channelId,
      prize,
      winners,
      endAt,
      createdBy,
      ended: false,
      participants: '[]',
      config: configStr
    });
    return;
  }

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO giveaways (message_id, guild_id, channel_id, prize, winners, end_at, created_by, ended, participants, config)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [messageId, guildId, channelId, prize, winners, endAt, createdBy, JSON.stringify([]), configStr],
      err => (err ? reject(err) : resolve())
    );
  });
}

// ✅ Get giveaway by message ID
async function getGiveawayByMessageId(messageId) {
  if (useMongoDB) {
    if (!getDbStatus()) return null;
    const doc = await Giveaway.findOne({ messageId });
    if (!doc) return null;
    return {
      message_id: doc.messageId,
      guild_id: doc.guildId,
      channel_id: doc.channelId,
      prize: doc.prize,
      winners: doc.winners,
      end_at: doc.endAt,
      created_by: doc.createdBy,
      ended: doc.ended ? 1 : 0,
      participants: doc.participants,
      config: doc.config || '{}'
    };
  }

  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM giveaways WHERE message_id = ?`,
      [messageId],
      (err, row) => (err ? reject(err) : resolve(row ? { ...row, config: row.config || '{}' } : null))
    );
  });
}

// ✅ Update giveaway details (dynamic fields)
async function updateGiveaway(messageId, updates) {
  if (useMongoDB) {
    if (!getDbStatus()) return;
    const mongoUpdates = {};
    if ('ended' in updates) mongoUpdates.ended = !!updates.ended;
    if ('participants' in updates) mongoUpdates.participants = updates.participants;
    if ('prize' in updates) mongoUpdates.prize = updates.prize;
    if ('winners' in updates) mongoUpdates.winners = updates.winners;
    if ('end_at' in updates) mongoUpdates.endAt = updates.end_at;
    if ('config' in updates) {
      mongoUpdates.config = typeof updates.config === 'string' ? updates.config : JSON.stringify(updates.config);
    }
    
    await Giveaway.updateOne({ messageId }, { $set: mongoUpdates });
    return;
  }

  return new Promise((resolve, reject) => {
    const fields = Object.keys(updates);
    const values = Object.values(updates).map(v => (typeof v === 'object' ? JSON.stringify(v) : v));

    if (!fields.length) return resolve();

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    values.push(messageId);

    db.run(
      `UPDATE giveaways SET ${setClause} WHERE message_id = ?`,
      values,
      err => (err ? reject(err) : resolve())
    );
  });
}

// ✅ End giveaway
async function endGiveaway(messageId) {
  if (useMongoDB) {
    if (!getDbStatus()) return;
    await Giveaway.updateOne({ messageId }, { ended: true });
    return;
  }

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE giveaways SET ended = 1 WHERE message_id = ?`,
      [messageId],
      err => (err ? reject(err) : resolve())
    );
  });
}

// ✅ Reroll giveaway (update participants list)
async function rerollGiveaway(messageId, newParticipants) {
  if (useMongoDB) {
    if (!getDbStatus()) return;
    await Giveaway.updateOne({ messageId }, { participants: JSON.stringify(newParticipants) });
    return;
  }

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE giveaways SET participants = ? WHERE message_id = ?`,
      [JSON.stringify(newParticipants), messageId],
      err => (err ? reject(err) : resolve())
    );
  });
}

// ✅ List all active giveaways (guildId optional)
async function listActiveGiveaways(guildId = null) {
  if (useMongoDB) {
    if (!getDbStatus()) return [];
    const query = guildId ? { guildId, ended: false } : { ended: false };
    const docs = await Giveaway.find(query);
    return docs.map(doc => ({
      message_id: doc.messageId,
      guild_id: doc.guildId,
      channel_id: doc.channelId,
      prize: doc.prize,
      winners: doc.winners,
      end_at: doc.endAt,
      created_by: doc.createdBy,
      ended: doc.ended ? 1 : 0,
      participants: doc.participants,
      config: doc.config || '{}'
    }));
  }

  return new Promise((resolve, reject) => {
    const query = guildId
      ? `SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0`
      : `SELECT * FROM giveaways WHERE ended = 0`;
    const params = guildId ? [guildId] : [];

    db.all(query, params, (err, rows) => (err ? reject(err) : resolve((rows || []).map(r => ({ ...r, config: r.config || '{}' })))));
  });
}

// ✅ Finalize giveaway: end, update embed, announce winners
async function finalizeGiveaway(messageId, client) {
  const giveaway = await getGiveawayByMessageId(messageId);
  if (!giveaway || giveaway.ended) return { success: false, error: 'Giveaway not found or already ended' };

  if (client?.giveawayTimers?.has(messageId)) {
    clearTimeout(client.giveawayTimers.get(messageId));
    client.giveawayTimers.delete(messageId);
  }

  await endGiveaway(messageId);

  const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
  let winners = [];

  if (channel) {
    let participants = [];
    try {
      participants = JSON.parse(giveaway.participants || '[]');
    } catch {}

    const msg = await channel.messages.fetch(messageId).catch(() => null);
    if (msg) {
      const embed = msg.embeds[0];
      if (embed) {
        const endedEmbed = EmbedBuilder.from(embed)
          .setColor(0x2B2D31)
          .setTitle(`🎉 [ENDED] ${giveaway.prize}`)
          .setFooter({ text: 'Giveaway Concluded • Uranium Giveaways' });

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`giveaway_ended_${messageId}`)
            .setLabel(`🔒 Giveaway Concluded (${participants.length} entries)`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );
        await msg.edit({ embeds: [endedEmbed], components: [disabledRow] }).catch(() => null);
      }
    }

    if (participants.length === 0) {
      const noEntriesEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('😢 Giveaway Concluded — No Entries')
        .setDescription(`The giveaway for **${giveaway.prize}** has concluded, but unfortunately no one entered.`)
        .setFooter({ text: 'Uranium Giveaways' });
      await channel.send({ embeds: [noEntriesEmbed] }).catch(() => null);
    } else {
      const shuffled = [...participants].sort(() => 0.5 - Math.random());
      winners = shuffled.slice(0, giveaway.winners);
      const winnerMentions = winners.map(id => `<@${id}>`).join(' ');

      const winnerEmbed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('🎉 GIVEAWAY WINNER(S) ANNOUNCED! 🎉')
        .setDescription(`Congratulations to our lucky winner(s)!\n\n${winners.map((w, idx) => `🏆 **${idx + 1}.** <@${w}>`).join('\n')}`)
        .addFields(
          { name: '🎁 Prize', value: `**${giveaway.prize}**`, inline: true },
          { name: '👥 Total Entries', value: `\`${participants.length}\``, inline: true },
          { name: '👑 Hosted by', value: `<@${giveaway.created_by}>`, inline: true },
          { name: '🔗 Giveaway Post', value: `[Jump to Announcement](https://discord.com/channels/${giveaway.guild_id}/${giveaway.channel_id}/${messageId})`, inline: false }
        )
        .setFooter({ text: 'Uranium Giveaways • Congratulations!' })
        .setTimestamp();

      await channel.send({
        content: `🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`,
        embeds: [winnerEmbed]
      }).catch(() => null);
    }
  }

  return { success: true, winners };
}

// ✅ List all giveaways for a guild (both active and ended)
async function listAllGiveaways(guildId) {
  if (useMongoDB) {
    if (!getDbStatus()) return [];
    const docs = await Giveaway.find({ guildId }).sort({ endAt: -1 });
    return docs.map(doc => ({
      message_id: doc.messageId,
      guild_id: doc.guildId,
      channel_id: doc.channelId,
      prize: doc.prize,
      winners: doc.winners,
      end_at: doc.endAt,
      created_by: doc.createdBy,
      ended: doc.ended ? 1 : 0,
      participants: doc.participants,
      config: doc.config || '{}'
    }));
  }

  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM giveaways WHERE guild_id = ? ORDER BY end_at DESC`,
      [guildId],
      (err, rows) => (err ? reject(err) : resolve((rows || []).map(r => ({ ...r, config: r.config || '{}' }))))
    );
  });
}

// ✅ Delete giveaway from database
async function deleteGiveaway(messageId) {
  if (useMongoDB) {
    if (!getDbStatus()) return;
    await Giveaway.deleteOne({ messageId });
    return;
  }

  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM giveaways WHERE message_id = ?`, [messageId], err => (err ? reject(err) : resolve()));
  });
}

// ✅ Schedule giveaway to end automatically
function scheduleGiveawayEnd(client, giveaway) {
  const timeLeft = giveaway.endAt - Date.now();
  if (timeLeft <= 0) return finalizeGiveaway(giveaway.messageId, client);

  const timer = setTimeout(() => finalizeGiveaway(giveaway.messageId, client), timeLeft);
  if (client?.giveawayTimers) {
    client.giveawayTimers.set(giveaway.messageId, timer);
  }
}

// 🎨 Embed & Button Helpers for Unified Professional Giveaways
function parseHexColor(colorStr, defaultColor = 0x5865F2) {
  if (!colorStr || typeof colorStr !== 'string') return defaultColor;
  const cleaned = colorStr.replace('#', '').trim();
  const num = parseInt(cleaned, 16);
  return Number.isNaN(num) ? defaultColor : num;
}

function buildGiveawayEmbed({ prize, winners, endAt, hostId, config = {} }) {
  if (typeof config === 'string') {
    try { config = JSON.parse(config); } catch { config = {}; }
  }

  const embedColor = parseHexColor(config.color, 0x5865F2);
  const title = config.title?.trim() || `🎉 GIVEAWAY: ${prize}`;

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(title)
    .setTimestamp(endAt)
    .setFooter({ text: `Uranium Giveaways • Winners: ${winners} • Concludes` });

  const descParts = [];

  if (config.description?.trim()) {
    descParts.push(`>>> ${config.description.trim()}`);
    descParts.push('');
  }

  descParts.push(`🎁 **Prize:** **${prize}**`);
  descParts.push(`🏆 **Winners:** **${winners}** ${winners === 1 ? 'Winner' : 'Winners'}`);
  descParts.push(`⏳ **Ends:** <t:${Math.floor(endAt / 1000)}:R> (<t:${Math.floor(endAt / 1000)}:F>)`);
  descParts.push(`👑 **Hosted by:** <@${hostId}>`);

  if (config.requiredRole) {
    descParts.push(`🛡️ **Required Role:** <@&${config.requiredRole}>`);
  }

  embed.setDescription(descParts.join('\n'));

  if (config.thumbnail) {
    try {
      new URL(config.thumbnail);
      embed.setThumbnail(config.thumbnail);
    } catch {}
  }

  if (config.image) {
    try {
      new URL(config.image);
      embed.setImage(config.image);
    } catch {}
  }

  return embed;
}

function buildGiveawayRow({ messageId, winners, config = {}, participantCount = 0 }) {
  if (typeof config === 'string') {
    try { config = JSON.parse(config); } catch { config = {}; }
  }

  const buttonEmoji = config.buttonEmoji?.trim() || '🎉';
  const buttonLabel = config.buttonLabel?.trim() || 'Enter';

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway_enter_${messageId}`)
      .setLabel(`${buttonEmoji} ${buttonLabel} (${participantCount})`)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`giveaway_info_${messageId}`)
      .setLabel(`${winners} ${winners === 1 ? 'Winner' : 'Winners'}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );
}

function formatAnnouncementContent(content, ping) {
  let prefix = '';
  if (ping === 'everyone') prefix = '@everyone ';
  else if (ping === 'here') prefix = '@here ';
  else if (ping && ping !== 'none') prefix = `<@&${ping}> `;

  const main = content?.trim() || '🎉 **GIVEAWAY TIME!** 🎉 React or click below to enter!';
  return `${prefix}${main}`.trim();
}

module.exports = {
  createGiveaway,
  getGiveawayByMessageId,
  updateGiveaway,
  endGiveaway,
  rerollGiveaway,
  listActiveGiveaways,
  listAllGiveaways,
  deleteGiveaway,
  finalizeGiveaway,
  scheduleGiveawayEnd,
  buildGiveawayEmbed,
  buildGiveawayRow,
  formatAnnouncementContent,
  parseHexColor
};

