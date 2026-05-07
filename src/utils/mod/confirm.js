// src/utils/mod/confirm.js
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

async function confirmAction(interaction, {
  action,
  target,
  reason = 'No reason provided',
  duration = null,
  evidence = [],
  timeoutMs = 30000
}) {
  const confirmId = `mod::confirm::${interaction.id}`;
  const cancelId = `mod::cancel::${interaction.id}`;

  const embed = new EmbedBuilder()
    .setTitle(`⚠️ Confirm ${action}`)
    .setColor(0xFEE75C)
    .setDescription([
      `**Target:** ${target.tag} (${target.id})`,
      `**Reason:** ${reason}`,
      duration ? `**Duration:** ${Math.floor(duration / 1000)}s` : null,
      evidence.length ? `**Evidence:** ${evidence.length} item(s)` : null
    ].filter(Boolean).join('\n'));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(confirmId)
      .setLabel('✅ Confirm')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(cancelId)
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({ embeds: [embed], components: [row], flags: 64 });

  const message = await interaction.fetchReply();

  const collector = message.createMessageComponentCollector({
    time: timeoutMs,
    filter: i => i.user.id === interaction.user.id
  });

  return new Promise(resolve => {
    collector.on('collect', async i => {
      try {
        if (i.customId === confirmId) {
          await i.update({ content: '✅ Confirmed.', components: [], embeds: [] });
          resolve(true);
        } else {
          await i.update({ content: '❌ Cancelled.', components: [], embeds: [] });
          resolve(false);
        }
      } catch (err) {
        if (err?.code === 10062) { resolve(false); return; }
        console.error('[confirm] collector error:', err);
        resolve(false);
      }
    });

    collector.on('end', async collected => {
      if (!collected.size) {
        await message.edit({ content: '⏱️ Confirmation timed out.', components: [], embeds: [] }).catch(() => {});
        resolve(false);
      }
    });
  });
}

module.exports = { confirmAction };
