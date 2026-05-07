// src/buttons/family_buttons.js
const { EmbedBuilder } = require('discord.js');
const familyStore = require('../utils/familyStorage');

function errEmbed(text) {
  return new EmbedBuilder().setColor('Red').setDescription(text);
}

function okEmbed(text) {
  return new EmbedBuilder().setColor(0x57f287).setDescription(text);
}

module.exports = async function handleFamilyButtons(interaction) {
  const id = interaction.customId;
  // expected: family_accept:<pendingId> OR family_decline:<pendingId>
  if (!id.startsWith('family_')) return;

  try {
    await familyStore.initFamilyStorage();

    const parts = id.split(':');
    const action = parts[0]; // family_accept or family_decline
    const pendingId = Number(parts[1]);
    if (!pendingId) {
      return interaction.reply({ embeds: [errEmbed('Invalid request.')], flags: 64 });
    }

    const pending = await familyStore.getPendingById(pendingId);
    if (!pending) {
      return interaction.reply({ embeds: [errEmbed('Request not found or already handled.')], flags: 64 });
    }

    // ensure target is the one clicking (only target can accept/decline)
    if (String(interaction.user.id) !== String(pending.target_id)) {
      return interaction.reply({ embeds: [errEmbed('Only the request target can accept or decline.')], flags: 64 });
    }

    if (action === 'family_decline') {
      await familyStore.deletePending(pendingId);
      return interaction.update({ embeds: [okEmbed('You declined the request.')], components: [] });
    }

    if (action === 'family_accept') {
      if (pending.type === 'marry') {
        // ensure neither is already married to someone else
        const existingA = await familyStore.getPartner(pending.requester_id);
        const existingB = await familyStore.getPartner(pending.target_id);
        if (existingA && existingA !== pending.target_id) {
          await familyStore.deletePending(pendingId);
          return interaction.update({ embeds: [errEmbed('Requester is already married to someone else.')], components: [] });
        }
        if (existingB && existingB !== pending.requester_id) {
          await familyStore.deletePending(pendingId);
          return interaction.update({ embeds: [errEmbed('You are already married to someone else.')], components: [] });
        }

        // set partner both sides
        await familyStore.setPartner(pending.requester_id, pending.target_id);
        await familyStore.setPartner(pending.target_id, pending.requester_id);
        await familyStore.deletePending(pendingId);

        return interaction.update({ embeds: [okEmbed('Marriage confirmed — you are now partners!')], components: [] });
      }

      if (pending.type === 'adopt') {
        // adoption: requester becomes parent, target becomes child
        // ensure not already parent-child
        const already = await familyStore.isParentOf(pending.requester_id, pending.target_id);
        if (already) {
          await familyStore.deletePending(pendingId);
          return interaction.update({ embeds: [errEmbed('This adoption already exists.')], components: [] });
        }

        await familyStore.addParentChild(pending.requester_id, pending.target_id);
        await familyStore.deletePending(pendingId);
        return interaction.update({ embeds: [okEmbed('Adoption confirmed — family updated.')], components: [] });
      }

      // unknown type
      await familyStore.deletePending(pendingId);
      return interaction.update({ embeds: [errEmbed('Unknown request type.')], components: [] });
    }

    return interaction.reply({ embeds: [errEmbed('Unknown action.')], flags: 64 });
  } catch (err) {
    console.error('[family_buttons] error', err);
    try { await interaction.reply({ embeds: [errEmbed('Internal error.')], flags: 64 }); } catch {}
  }
};