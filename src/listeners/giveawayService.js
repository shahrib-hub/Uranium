const db = require('../utils/giveaway');
const { EmbedBuilder } = require('discord.js');
const { useMongoDB } = require('../config/database');
const { Giveaway, getDbStatus } = require('../database/mongoose');

// ✅ Create a new giveaway
async function createGiveaway(data) {
  const {
    messageId, guildId, channelId, prize,
    winners, endAt, createdBy
  } = data;

  if (useMongoDB) {
    if (!getDbStatus()) {
      console.error('[giveawayService] MongoDB is enabled but the connection is not ready.');
      return;
    }
    await Giveaway.create({
      messageId, guildId, channelId, prize, winners, endAt, createdBy, ended: false, participants: '[]'
    });
    return;
  }

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO giveaways (message_id, guild_id, channel_id, prize, winners, end_at, created_by, ended, participants)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [messageId, guildId, channelId, prize, winners, endAt, createdBy, JSON.stringify([])],
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
      participants: doc.participants
    };
  }

  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM giveaways WHERE message_id = ?`,
      [messageId],
      (err, row) => (err ? reject(err) : resolve(row || null))
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
    // Add other fields if needed, but currently only ended and participants are updated dynamically
    
    await Giveaway.updateOne({ messageId }, { $set: mongoUpdates });
    return;
  }

  return new Promise((resolve, reject) => {
    const fields = Object.keys(updates);
    const values = Object.values(updates);

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
      participants: doc.participants
    }));
  }

  return new Promise((resolve, reject) => {
    const query = guildId
      ? `SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0`
      : `SELECT * FROM giveaways WHERE ended = 0`;
    const params = guildId ? [guildId] : [];

    db.all(query, params, (err, rows) => (err ? reject(err) : resolve(rows)));
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
    const msg = await channel.messages.fetch(messageId).catch(() => null);
    if (msg) {
      const embed = msg.embeds[0];
      if (embed) {
        const endedEmbed = EmbedBuilder.from(embed)
          .setColor('Red')
          .setTitle('🎉 Giveaway Ended')
          .setFooter({ text: 'Giveaway ended' });
        await msg.edit({ embeds: [endedEmbed], components: [] }).catch(() => null);
      }
    }

    const participants = JSON.parse(giveaway.participants || '[]');
    if (participants.length === 0) {
      await channel.send(`😢 No valid entries for the giveaway **${giveaway.prize}**.`).catch(() => null);
    } else {
      const shuffled = [...participants].sort(() => 0.5 - Math.random());
      winners = shuffled.slice(0, giveaway.winners);
      const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
      await channel.send(`🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`).catch(() => null);
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
      participants: doc.participants
    }));
  }

  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM giveaways WHERE guild_id = ? ORDER BY end_at DESC`,
      [guildId],
      (err, rows) => (err ? reject(err) : resolve(rows || []))
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
  scheduleGiveawayEnd
};
