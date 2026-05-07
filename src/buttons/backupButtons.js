// src/buttons/backupButtons.js
const { EmbedBuilder, ChannelType } = require('discord.js');
const backupStorage = require('../utils/backupStorage');
const { applyBackup } = require('../utils/backupSerializer');

module.exports = async function (interaction) {
  const id = interaction.customId;
  // Format:
  // backup_restore_confirm:<slot>:<userId>
  // backup_restore_cancel:<slot>:<userId>
  // backup_delete_confirm:<slot>:<userId>
  // backup_delete_cancel:<slot>:<userId>

  const parts = id.split(':');
  const raw = parts[0];          // e.g. backup_restore_confirm
  const slotStr = parts[1];      // e.g. "1"
  const ownerId = parts[2];      // the user who ran /backup restore
  const slot = parseInt(slotStr, 10) || 1;

  if (
    ![
      'backup_restore_confirm',
      'backup_restore_cancel',
      'backup_delete_confirm',
      'backup_delete_cancel',
    ].includes(raw)
  ) {
    return;
  }

  if (!interaction.guild) {
    return interaction.reply({
      content: '❌ This can only be used in a server.',
      flags: 64,
    });
  }

  if (ownerId && interaction.user.id !== ownerId) {
    return interaction.reply({
      content: '❌ Only the user who requested this action can confirm it.',
      flags: 64,
    });
  }

  /* ---------- RESTORE ---------- */
  if (raw.startsWith('backup_restore')) {
    // cancel
    if (raw === 'backup_restore_cancel') {
      return interaction.update({
        content: '❌ Backup restore cancelled.',
        components: [],
        embeds: [],
      });
    }

    // confirm
    const backup = await backupStorage.getBackup(interaction.guild.id, slot);
    if (!backup) {
      return interaction.update({
        content: '❌ Snapshot not found or already deleted.',
        components: [],
        embeds: [],
      });
    }

    // acknowledge and show "restoring..."
    await interaction.update({
      content: '⏳ Restoring snapshot… This may take a bit depending on server size.',
      components: [],
      embeds: [],
    });

    try {
      const data = JSON.parse(backup.data);

      // 🧠 apply backup + get summary
      const summary = await applyBackup(interaction.guild, data);

      const timeSec = (summary.timeMs / 1000).toFixed(1);

      const fails =
        summary.rolesDeleteFailed +
        summary.rolesCreateFailed +
        summary.channelsDeleteFailed +
        summary.channelsCreateFailed +
        summary.overwritesFailed;

      const affectedLines = [
        `• 🗑️ Channels deleted: **${summary.channelsDeleted}**`,
        `• 🧱 Channels created: **${summary.channelsCreated}**`,
        `• 🎭 Roles deleted: **${summary.rolesDeleted}**`,
        `• 🧬 Roles created: **${summary.rolesCreated}**`,
        `• 🔐 Permission overwrites applied: **${summary.overwritesApplied}**`,
      ].join('\n');

      const failureLines = fails
        ? [
            `• Channel delete failed: **${summary.channelsDeleteFailed}**`,
            `• Channel create failed: **${summary.channelsCreateFailed}**`,
            `• Role delete failed: **${summary.rolesDeleteFailed}**`,
            `• Role create failed: **${summary.rolesCreateFailed}**`,
            `• Overwrites failed: **${summary.overwritesFailed}**`,
          ].join('\n')
        : '✅ No errors were reported during restore.';

      const doneEmbed = new EmbedBuilder()
        .setColor(0x00ff9d)
        .setTitle('✅ Snapshot Restore Completed')
        .setDescription(
          `The server has been restored from **slot \`${slot}\`**.\n\n` +
          `**Snapshot name:** \`${backup.name}\`\n` +
          `**Requested by:** <@${interaction.user.id}>`
        )
        .addFields(
          {
            name: '📦 Changes Applied',
            value: affectedLines,
            inline: false,
          },
          {
            name: '⏱ Time Taken',
            value: `~**${timeSec} seconds**`,
            inline: true,
          },
          {
            name: '⚠️ Internal Notes',
            value: failureLines,
            inline: false,
          },
        )
        .setFooter({ text: 'MULTi-Bot Backups • Restore summary' })
        .setTimestamp();

      // Wait 3 seconds, then send summary in a safe channel
      setTimeout(async () => {
        try {
          // Try to find a text channel the bot can send messages in
          const me = interaction.guild.members.me;
          let targetChannel = null;

          if (me) {
            targetChannel = interaction.guild.channels.cache
              .filter(
                c =>
                  c.type === ChannelType.GuildText &&
                  c.permissionsFor(me)?.has('ViewChannel') &&
                  c.permissionsFor(me)?.has('SendMessages')
              )
              .sort((a, b) => a.rawPosition - b.rawPosition)
              .first();
          }

          if (!targetChannel) {
            console.error('[backup] No suitable channel found to send restore summary.');
            return;
          }

          await targetChannel.send({ embeds: [doneEmbed] });
        } catch (err) {
          console.error('[backup] Failed to send restore summary message:', err);
        }
      }, 3000);

      // no need to followUp here; interaction was already updated
      return;
    } catch (err) {
      console.error('[backup] Failed to apply backup', err);
      return interaction.followUp({
        content: '❌ An error occurred while restoring this snapshot.',
        flags: 64,
      });
    }
  }

  /* ---------- DELETE ---------- */
  if (raw.startsWith('backup_delete')) {
    // cancel
    if (raw === 'backup_delete_cancel') {
      return interaction.update({
        content: '❌ Snapshot deletion cancelled.',
        components: [],
        embeds: [],
      });
    }

    const backup = await backupStorage.getBackup(interaction.guild.id, slot);
    if (!backup) {
      return interaction.update({
        content: '❌ Snapshot not found or already deleted.',
        components: [],
        embeds: [],
      });
    }

    await backupStorage.deleteBackup(interaction.guild.id, slot);

    const deletedEmbed = new EmbedBuilder()
      .setColor(0xff5555)
      .setTitle('🗑️ Snapshot Deleted')
      .setDescription(
        `**Slot:** \`${slot}\`\n` +
        `**Snapshot:** \`${backup.name}\`\n` +
        `**Deleted by:** <@${interaction.user.id}>`
      )
      .setFooter({ text: 'MULTi-Bot Backups • Slot freed.' })
      .setTimestamp();

    return interaction.update({
      content: '',
      embeds: [deletedEmbed],
      components: [],
    });
  }
};
