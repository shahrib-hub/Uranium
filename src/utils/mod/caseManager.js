const { EmbedBuilder } = require('discord.js');
const { getLogChannel } = require('./settings');
const db = require('../../modStorage'); // abstracted

function generateCaseId(guildId) {
  return `CASE-${guildId}-${Date.now().toString(36)}`;
}

async function logCase({
  guild,
  moderator,
  target,
  action,
  reason,
  duration = null,
  evidence = [],
  references = []
}) {
  const caseId = generateCaseId(guild.id);
  const timestamp = Date.now();

  const caseData = {
    caseId,
    guildId: guild.id,
    moderatorId: moderator.id,
    targetId: target.id,
    action,
    reason,
    duration,
    timestamp,
    evidence,
    references
  };

  await db.saveCase(caseData);

  const embed = new EmbedBuilder()
    .setTitle(`📝 Moderation Case: ${action.toUpperCase()}`)
    .setColor(0x5865F2)
    .addFields(
      { name: 'User', value: `<@${target.id}>`, inline: true },
      { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
      { name: 'Reason', value: reason || 'No reason provided' },
      ...(duration ? [{ name: 'Duration', value: `${duration / 1000}s`, inline: true }] : []),
      { name: 'Case ID', value: `\`\`\`${caseId}\`\`\`` }
    )
    .setTimestamp();

  const logChannel = await getLogChannel(guild.id);
  if (logChannel) {
    const channel = guild.channels.cache.get(logChannel);
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed] }).catch(() => {});
    }
  }

  return caseData;
}

module.exports = { logCase };
