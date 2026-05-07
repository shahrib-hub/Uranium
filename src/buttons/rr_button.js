// src/buttons/rr_button.js
const { EmbedBuilder } = require('discord.js');
const rrStorage = require('../utils/rrStorage');

function errEmbed(text) {
  return new EmbedBuilder().setColor('Red').setDescription(text);
}

module.exports = async function handleRRButton(interaction) {
  const id = interaction.customId;
  if (!id.startsWith('rr_btn:')) return;

  const [_, guildId, setupIdStr, itemIdStr] = id.split(':');
  const setupId = Number(setupIdStr);
  const itemId = Number(itemIdStr);

  const lockKey = `${guildId}:${interaction.user.id}`;
  if (!global._rrLocks) global._rrLocks = new Set();

  if (global._rrLocks.has(lockKey)) {
    return interaction.reply({
      embeds: [errEmbed('Slow down — processing your previous action...')],
      flags: 64
    });
  }

  global._rrLocks.add(lockKey);

  try {
    const setup = await rrStorage.getSetupById(setupId);
    if (!setup || String(setup.guild_id) !== String(guildId))
      return interaction.reply({ embeds: [errEmbed('Setup not found.')], flags: 64 });

    const item = await rrStorage.findItemById(itemId);
    if (!item)
      return interaction.reply({ embeds: [errEmbed('This item no longer exists.')], flags: 64 });

    const guild = interaction.guild;
    const member = await guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member)
      return interaction.reply({ embeds: [errEmbed('Member not found.')], flags: 64 });

    const role = guild.roles.cache.get(item.role_id);
    if (!role)
      return interaction.reply({ embeds: [errEmbed('Role no longer exists.')], flags: 64 });

    const botMember = guild.members.me;
    if (role.position >= botMember.roles.highest.position)
      return interaction.reply({
        embeds: [errEmbed(`My role must be above **${role.name}** to manage it.`)],
        flags: 64
      });

    const already = member.roles.cache.has(role.id);

    if (already) {
      await member.roles.remove(role, `RR button toggle`);
      return interaction.reply({ content: `➖ Removed **${role.name}**`, flags: 64 });
    } else {
      await member.roles.add(role, `RR button toggle`);
      return interaction.reply({ content: `➕ Added **${role.name}**`, flags: 64 });
    }
  } catch (err) {
    console.error('[rr_button error]', err);
    try {
      return interaction.reply({ embeds: [errEmbed('Internal error.')], flags: 64 });
    } catch {}
  } finally {
    global._rrLocks.delete(lockKey);
  }
};