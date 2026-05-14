const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { addInventoryItem, clearExpiredEffects, getActiveEffects, deleteEffect, bumpStat } = require('../utils/economyStorage');
const { addWalletSafe, consumeAdventureTicket, getActionMultiplier, setUsedCooldown } = require('./service');
const { addXP } = require('./levelSystem');
const { rollRange, rollChance } = require('./rng');

const activeAdventures = new Map();

async function maybeConsumeAdventureEscape(userId) {
  await clearExpiredEffects(userId);
  const effects = await getActiveEffects(userId);
  const effect = effects.find((entry) => entry.key === 'adventure_escape');
  if (!effect) return false;
  await deleteEffect(effect.effectId);
  return true;
}

async function startAdventure(interaction, userId, zone) {
  if (!zone) {
    return interaction.followUp({ content: 'Unknown adventure zone.', flags: 64 }).catch(() => {});
  }
  if (activeAdventures.has(userId)) {
    return interaction.followUp({ content: 'You are already on an adventure.', flags: 64 }).catch(() => {});
  }

  try {
    await consumeAdventureTicket(userId);
    await setUsedCooldown(userId, 'ADVENTURE');
  } catch (error) {
    return interaction.followUp({ content: error.message, flags: 64 }).catch(() => {});
  }

  const imagePath = path.resolve(__dirname, '..', 'assets', 'adventure', `adv_${zone.id}.png`);
  const attachment = fs.existsSync(imagePath) ? new AttachmentBuilder(imagePath, { name: `adv_${zone.id}.png` }) : null;
  const actionBoost = await getActionMultiplier(userId, 'adventure');

  const state = {
    userId,
    zone,
    round: 0,
    maxRounds: rollRange(4, 7),
    loot: { Atoms: 0, xp: 0, items: [] },
    status: 'Exploring...',
    caught: false,
    multiplier: actionBoost.multiplier,
    msg: null
  };
  activeAdventures.set(userId, state);

  const embed = buildAdventureEmbed(interaction, state);
  const payload = { embeds: [embed], components: [], fetchReply: true };
  if (attachment) payload.files = [attachment];
  if (attachment) embed.setImage(`attachment://adv_${zone.id}.png`);

  const msg = await interaction.editReply(payload);
  state.msg = msg;
  processAdventureTick(interaction, userId);
}

async function processAdventureTick(interaction, userId) {
  const state = activeAdventures.get(userId);
  if (!state || state.caught) return;

  if (state.round >= state.maxRounds) {
    return finishAdventure(interaction, userId, true);
  }

  state.round += 1;
  const ambushed = rollChance(0.2);
  if (ambushed) {
    const escaped = await maybeConsumeAdventureEscape(userId);
    if (escaped) {
      state.status = 'A smoke bomb saved you from an ambush.';
    } else {
      state.caught = true;
      state.status = 'Caught in an ambush.';
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('eco:adv:fight').setLabel('Fight Back').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('eco:adv:flee').setLabel('Flee').setStyle(ButtonStyle.Secondary)
      );
      await state.msg.edit({ embeds: [buildAdventureEmbed(interaction, state)], components: [row] }).catch(() => {});
      return;
    }
  }

  const foundAtoms = Math.floor(rollRange(state.zone.Atoms[0], state.zone.Atoms[1]) * state.multiplier);
  const foundXp = Math.floor(rollRange(20, 50) * state.multiplier);
  state.loot.Atoms += foundAtoms;
  state.loot.xp += foundXp;

  if (rollChance(state.zone.rareChance * Math.min(2, state.multiplier))) {
    state.loot.items.push('crate_rare');
    state.status = `Found \`${foundAtoms.toLocaleString()}\` Atoms and a Rare Crate.`;
  } else {
    state.status = `Found \`${foundAtoms.toLocaleString()}\` Atoms.`;
  }

  await state.msg.edit({ embeds: [buildAdventureEmbed(interaction, state)], components: [] }).catch(() => {});
  setTimeout(() => processAdventureTick(interaction, userId), 4000);
}

async function handleAdventureButton(interaction) {
  const userId = interaction.user.id;
  const state = activeAdventures.get(userId);
  if (!state) return interaction.reply({ content: 'Adventure expired or invalid.', flags: 64 }).catch(() => {});

  await interaction.deferUpdate().catch(() => {});
  if (interaction.customId === 'eco:adv:flee') {
    state.status = 'You fled and kept 25% of your loot.';
    state.loot.Atoms = Math.floor(state.loot.Atoms * 0.25);
    state.loot.xp = Math.floor(state.loot.xp * 0.25);
    state.loot.items = [];
    return finishAdventure(interaction, userId, true);
  }

  if (interaction.customId === 'eco:adv:fight') {
    if (rollChance(0.5)) {
      state.status = 'You won the ambush fight and boosted your loot.';
      state.loot.Atoms = Math.floor(state.loot.Atoms * 1.5);
      state.caught = false;
      await state.msg.edit({ embeds: [buildAdventureEmbed(interaction, state)], components: [] }).catch(() => {});
      setTimeout(() => processAdventureTick(interaction, userId), 4000);
    } else {
      state.status = 'You lost the fight and dropped everything.';
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
  if (state.loot.xp > 0) await addXP(userId, state.loot.xp);
  for (const itemId of state.loot.items) {
    await addInventoryItem(userId, itemId, 1);
  }
  await bumpStat(userId, 'adventure_used', 1);

  if (success) state.status = 'Adventure Complete.';
  await state.msg.edit({ embeds: [buildAdventureEmbed(interaction, state, true)], components: [] }).catch(() => {});
}

function buildAdventureEmbed(interaction, state, isFinal = false) {
  const embed = new EmbedBuilder()
    .setColor(isFinal ? (state.loot.Atoms > 0 ? 0x00ff88 : 0xe74c3c) : 0x3498db)
    .setAuthor({ name: `${interaction.user.username}'s Adventure`, iconURL: interaction.user.displayAvatarURL() })
    .setTitle(state.zone.name)
    .setDescription([
      `Status: ${state.status}`,
      `Round: \`${state.round}/${state.maxRounds}\``,
      '',
      `Atoms: \`${state.loot.Atoms.toLocaleString()}\``,
      `XP: \`${state.loot.xp}\``,
      `Adventure boost: \`${state.multiplier.toFixed(2)}x\``
    ].join('\n'))
    .setFooter({ text: isFinal ? 'Adventure Ended' : 'Updating live...' });

  if (state.loot.items.length > 0) {
    embed.addFields({ name: 'Items Found', value: state.loot.items.join(', ') });
  }
  embed.setImage(`attachment://adv_${state.zone.id}.png`);
  return embed;
}

module.exports = { startAdventure, handleAdventureButton };
