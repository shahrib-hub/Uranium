const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { getBalance, addWalletSafe, bumpStat, addInventoryItem, removeInventoryItem } = require('../utils/economyStorage');
const { awardActionXP } = require('./levelSystem');
const { rollRange, rollChance } = require('./rng');
const { ZONES } = require('./constants');
const path = require('path');
const fs = require('fs');

const activeAdventures = new Map();

async function startAdventure(interaction, userId, zone) {
  if (activeAdventures.has(userId)) {
    return interaction.followUp({ content: '❌ You are already on an adventure!', flags: 64 }).catch(() => {});
  }

  // Deduct Ticket
  const { getInventory } = require('../utils/economyStorage');
  const inv = await getInventory(userId);
  const ticket = inv.find(i => i.id === 'adv_ticket');
  if (!ticket || ticket.amount < 1) {
    return interaction.followUp({ content: '🎫 You need an **Adventure Ticket** to start this journey! Buy one from the shop.', flags: 64 }).catch(() => {});
  }
  await removeInventoryItem(userId, 'adv_ticket', 1);

  const imgPath = path.resolve(__dirname, '..', 'assets', 'adventure', `adv_${zone.id}.png`);
  const attachment = fs.existsSync(imgPath) ? new AttachmentBuilder(imgPath, { name: `adv_${zone.id}.png` }) : null;

  const state = {
    userId,
    zone,
    round: 0,
    maxRounds: rollRange(4, 7), // Total updates before completion
    loot: { Atoms: 0, xp: 0, items: [] },
    status: 'Exploring...',
    caught: false,
    msg: null
  };
  activeAdventures.set(userId, state);

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setAuthor({ name: `${interaction.user.username}'s Adventure`, iconURL: interaction.user.displayAvatarURL() })
    .setTitle(`🗺️ ${zone.name}`)
    .setDescription(`You step into the ${zone.name}...\n\n**Status:** ${state.status}`)
    .setFooter({ text: 'Updating live... ⏳' });
  
  if (attachment) embed.setImage(`attachment://adv_${zone.id}.png`);

  const replyObj = { embeds: [embed], components: [], fetchReply: true };
  if (attachment) replyObj.files = [attachment];

  const msg = await interaction.editReply(replyObj);
  state.msg = msg;

  // Start the loop (4-second ticks)
  processAdventureTick(interaction, userId);
}

async function processAdventureTick(interaction, userId) {
  const state = activeAdventures.get(userId);
  if (!state) return;

  if (state.caught) return; // Wait for user interaction

  // Check if finished
  if (state.round >= state.maxRounds) {
    return finishAdventure(interaction, userId, true);
  }

  // Roll event
  state.round++;
  const isTrap = rollChance(0.20); // 20% chance to get caught

  if (isTrap) {
    state.caught = true;
    state.status = '⚠️ **CAUGHT!** An enemy ambushed you!';
    const embed = buildAdventureEmbed(interaction, state);
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('eco:adv:fight').setLabel('⚔️ Fight Back!').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('eco:adv:flee').setLabel('🏃 Flee').setStyle(ButtonStyle.Secondary)
    );
    await state.msg.edit({ embeds: [embed], components: [row] }).catch(() => {});
    return;
  }

  // Normal Loot round
  const foundCoins = rollRange(state.zone.Atoms[0], state.zone.Atoms[1]);
  const foundXp = rollRange(20, 50);
  state.loot.Atoms += foundCoins;
  state.loot.xp += foundXp;

  if (rollChance(state.zone.rareChance)) {
    state.loot.items.push('crate_rare');
    state.status = `Found \`${foundCoins.toLocaleString()}\` ⚛️ and a **Rare Crate**!`;
  } else {
    state.status = `Found \`${foundCoins.toLocaleString()}\` ⚛️!`;
  }

  const embed = buildAdventureEmbed(interaction, state);
  await state.msg.edit({ embeds: [embed], components: [] }).catch(() => {});

  // Queue next tick
  setTimeout(() => processAdventureTick(interaction, userId), 4000);
}

async function handleAdventureButton(interaction) {
  const userId = interaction.user.id;
  const state = activeAdventures.get(userId);
  if (!state) return interaction.reply({ content: '❌ Adventure expired or invalid.', flags: 64 }).catch(() => {});

  // Acknowledge interaction immediately
  await interaction.deferUpdate().catch(() => {});

  const id = interaction.customId;

  if (id === 'eco:adv:flee') {
    state.status = '🏃 You fled! You kept 25% of your loot.';
    state.loot.Atoms = Math.floor(state.loot.Atoms * 0.25);
    state.loot.xp = Math.floor(state.loot.xp * 0.25);
    state.loot.items = [];
    return finishAdventure(interaction, userId, true);
  }

  if (id === 'eco:adv:fight') {
    // 50/50 chance to win
    if (rollChance(0.50)) {
      state.status = '⚔️ You fought back and WON! Loot multiplied!';
      state.loot.Atoms = Math.floor(state.loot.Atoms * 1.5);
      state.caught = false;
      const embed = buildAdventureEmbed(interaction, state);
      await state.msg.edit({ embeds: [embed], components: [] }).catch(() => {});
      setTimeout(() => processAdventureTick(interaction, userId), 4000);
    } else {
      state.status = '💀 You lost the fight and lost EVERYTHING!';
      state.loot.Atoms = 0;
      state.loot.xp = 0;
      state.loot.items = [];
      return finishAdventure(interaction, userId, false);
    }
  }
}

async function finishAdventure(interaction, userId, success) {
  const state = activeAdventures.get(userId);
  if (!state) return;
  activeAdventures.delete(userId);

  if (state.loot.Atoms > 0) await addWalletSafe(userId, state.loot.Atoms);
  if (state.loot.xp > 0) await awardActionXP(userId, 'adventure', state.loot.xp); // passing fixed xp
  for (const item of state.loot.items) {
    await addInventoryItem(userId, item, 1);
  }

  if (success) {
    state.status = '✅ **Adventure Complete!**';
  }

  const embed = buildAdventureEmbed(interaction, state, true);
  await state.msg.edit({ embeds: [embed], components: [] }).catch(() => {});
}

function buildAdventureEmbed(interaction, state, isFinal = false) {
  const color = isFinal ? (state.loot.Atoms > 0 ? 0x00ff88 : 0xe74c3c) : 0x3498db;
  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${interaction.user.username}'s Adventure`, iconURL: interaction.user.displayAvatarURL() })
    .setTitle(`🗺️ ${state.zone.name}`)
    .setDescription(`**Status:** ${state.status}\n\n**Round:** \`${state.round}/${state.maxRounds}\``)
    .addFields(
      { name: 'Current Loot', value: `⚛️ \`${state.loot.Atoms.toLocaleString()}\` Atoms\n🧪 \`${state.loot.xp}\` XP`, inline: true }
    );
  
  if (state.loot.items.length > 0) {
    embed.addFields({ name: 'Items Found', value: state.loot.items.join(', '), inline: true });
  }

  if (isFinal) embed.setFooter({ text: 'Adventure Ended' });
  else embed.setFooter({ text: 'Updating live... ⏳' });

  // Do not re-attach image via edit, it persists if we keep the same attachment URL mapping, 
  // but just in case, we don't set image if we aren't uploading it again to save bandwidth.
  // Actually, to keep the image, we must retain the attachment:// reference but we don't need to re-upload.
  embed.setImage(`attachment://adv_${state.zone.id}.png`);

  return embed;
}

module.exports = { startAdventure, handleAdventureButton };
