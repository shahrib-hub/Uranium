const db = require('../../modStorage'); // abstracted
const { logCase } = require('./caseManager');

async function scheduleUnpunish({
  guildId,
  userId,
  action, // 'unban', 'unmute', 'untimeout'
  expiresAt, // timestamp in ms
  caseId
}) {
  await db.saveScheduledTask({
    guildId,
    userId,
    action,
    expiresAt,
    caseId
  });
}

async function runReconciler(client) {
  const now = Date.now();
  const tasks = await db.getDueScheduledTasks(now);

  for (const task of tasks) {
    const guild = client.guilds.cache.get(task.guildId);
    if (!guild) continue;

    try {
      const member = await guild.members.fetch(task.userId).catch(() => null);

      if (task.action === 'unban') {
        await guild.bans.remove(task.userId, 'Temporary ban expired');
      } else if (task.action === 'unmute' && member) {
        const mutedRoleId = await db.getMutedRoleId(guild.id);
        if (mutedRoleId && member.roles.cache.has(mutedRoleId)) {
          await member.roles.remove(mutedRoleId, 'Temporary mute expired');
        }
      } else if (task.action === 'untimeout' && member) {
        await member.timeout(null, 'Temporary timeout expired');
      }

      await logCase({
        guild,
        moderator: client.user,
        target: member?.user || { id: task.userId, tag: 'Unknown' },
        action: task.action,
        reason: 'Temporary punishment expired',
        duration: null,
        evidence: [],
        references: [task.caseId]
      });

      await db.markTaskComplete(task.id);
    } catch (err) {
      console.error(`Failed to process scheduled task for ${task.userId}:`, err);
    }
  }
}

module.exports = { scheduleUnpunish, runReconciler };
