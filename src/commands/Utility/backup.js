// src/commands/Utility/backup.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const backupStorage = require('../../utils/backupStorage');
const { serializeGuild } = require('../../utils/backupSerializer');
const { isPremiumGuild } = require('../../utils/premium');

const BACKUP_FREE_SLOTS = 1;
const BACKUP_PREMIUM_SLOTS = 3;
const COOLDOWN_FREE = 7 * 24 * 60 * 60 * 1000;
const COOLDOWN_PREMIUM = 24 * 60 * 60 * 1000;

const backupsGloballyDisabled = false;

// not hard-premium, but has premium benefits
module.exports.premium = false;

function formatDuration(ms) {
  if (ms <= 0) return 'now';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!parts.length) parts.push('<1m');
  return parts.join(' ');
}

module.exports.data = new SlashCommandBuilder()
  .setName('backup')
  .setDescription('📦 MULTi-Backup • Create and manage server snapshots.')
  .addSubcommand(sub =>
    sub
      .setName('info')
      .setDescription('📚 View your backup tier, slots, and cooldown.')
  )
  .addSubcommand(sub =>
    sub
      .setName('create')
      .setDescription('🧬 Capture a fresh snapshot of your server.')
      .addStringOption(o =>
        o
          .setName('name')
          .setDescription('Label for this snapshot (e.g. "Pre-Revamp", "Event Setup").')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('restore')
      .setDescription('⚠️ Deep-restore your server from a snapshot.')
      .addIntegerOption(o =>
        o
          .setName('slot')
          .setDescription('Snapshot slot to restore (1–3).')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(3)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('delete')
      .setDescription('🗑️ Delete a stored snapshot.')
      .addIntegerOption(o =>
        o
          .setName('slot')
          .setDescription('Snapshot slot to delete (1–3).')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(3)
      )
  );

module.exports.execute = async (interaction) => {
  if (!interaction.guild) {
    return interaction.reply({ content: '❌ This command can only be used inside a server.', flags: 64 });
  }

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff5555)
          .setTitle('🔒 Admin Only')
          .setDescription(
            'You need **Administrator** permission to manage the backup system.\n' +
            'This is to prevent accidental full-server restores.'
          )
          .setFooter({ text: 'MULTi-Bot Backups • Access restricted.' }),
      ],
      flags: 64,
    });
  }

  if (backupsGloballyDisabled) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('🚫 Backups Temporarily Disabled')
          .setDescription(
            'The backup engine is currently under maintenance.\n' +
            'Please try again later or contact support if this persists.'
          )
          .setFooter({ text: 'MULTi-Bot Backups • Engine offline.' }),
      ],
      flags: 64,
    });
  }

  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  let premium = false;
  try {
    premium = !!isPremiumGuild(guildId);
  } catch (e) {
    console.error('[backup] premium check failed', e);
  }

  const maxSlots = premium ? BACKUP_PREMIUM_SLOTS : BACKUP_FREE_SLOTS;
  const cooldownMs = premium ? COOLDOWN_PREMIUM : COOLDOWN_FREE;

  try {
    if (sub === 'info') {
      return handleInfo(interaction, guildId, premium, maxSlots, cooldownMs);
    }
    if (sub === 'create') {
      return handleCreate(interaction, guildId, userId, premium, maxSlots, cooldownMs);
    }
    if (sub === 'restore') {
      return handleRestore(interaction, guildId, userId, maxSlots);
    }
    if (sub === 'delete') {
      return handleDelete(interaction, guildId, userId, maxSlots);
    }
  } catch (err) {
    console.error('[backup] execute error:', err);
    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({ content: '❌ Backup system crashed unexpectedly.', flags: 64 });
    }
  }
};

/* ------------ /backup info ------------ */
async function handleInfo(interaction, guildId, premium, maxSlots, cooldownMs) {
  const backups = await backupStorage.getBackupsByGuild(guildId);
  const last = await backupStorage.getLastCreatedAt(guildId);
  const now = Date.now();
  const remaining = last ? cooldownMs - (now - last) : 0;

  const used = backups.length;
  const list = backups.length
    ? backups
        .map(
          b =>
            `> 🎴 **Slot ${b.slot}** — \`${b.name}\`\n` +
            `> Saved <t:${Math.floor(b.created_at / 1000)}:R> by <@${b.created_by}>`
        )
        .join('\n\n')
    : '_No snapshots saved yet. Use `/backup create` to capture your current layout._';

  const embed = new EmbedBuilder()
    .setColor(premium ? 0xffc857 : 0x5865f2)
    .setTitle('📦 MULTi-Backup Dashboard')
    .setDescription(
      `${premium ? '💎 **Tier:** Premium' : '🪙 **Tier:** Free'}\n` +
      (premium
        ? '• Slots: **3**\n• Cooldown: **1 day** between `/backup create`.\n'
        : '• Slots: **1**\n• Cooldown: **7 days** between `/backup create`.\n')
    )
    .addFields(
      {
        name: '💾 Slots & Limits',
        value: `You are using **${used}/${maxSlots}** available snapshot slots.`,
        inline: true,
      },
      {
        name: '⏱ Cooldown Status',
        value:
          remaining > 0
            ? `⏳ Next snapshot available in **${formatDuration(remaining)}**.`
            : '✅ You can create a new snapshot **right now**.',
        inline: true,
      },
      {
        name: '📁 Saved Snapshots',
        value: list,
        inline: false,
      }
    )
    .setFooter({ text: 'MULTi-Bot Backups • Your server, safely bottled.' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], flags: 64 });
}

/* ------------ /backup create ------------ */
async function handleCreate(interaction, guildId, userId, premium, maxSlots, cooldownMs) {
  const last = await backupStorage.getLastCreatedAt(guildId);
  const now = Date.now();

  if (last && now - last < cooldownMs) {
    const remaining = cooldownMs - (now - last);
    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle('⏳ Snapshot Cooldown Active')
      .setDescription(
        'You recently created a snapshot for this server.\n\n' +
          `You can capture the next one in **${formatDuration(remaining)}**.\n\n` +
          '💡 **Tip:** Premium servers enjoy a shorter cooldown and more slots.'
      )
      .setFooter({ text: 'MULTi-Bot Backups • Cooldown in effect.' });

    return interaction.reply({ embeds: [embed], flags: 64 });
  }

  const backups = await backupStorage.getBackupsByGuild(guildId);
  const usedSlots = backups.length;

  // choose slot: free or overwrite oldest
  let slot;
  if (usedSlots >= maxSlots) {
    backups.sort((a, b) => a.created_at - b.created_at);
    slot = backups[0].slot;
  } else {
    const usedNumbers = backups.map(b => b.slot);
    slot = 1;
    while (usedNumbers.includes(slot) && slot <= maxSlots) slot++;
    if (slot > maxSlots) slot = 1;
  }

  const name = interaction.options.getString('name') || `Snapshot #${slot}`;
  const data = serializeGuild(interaction.guild);

  await backupStorage.saveBackup({
    guildId,
    slot,
    name,
    createdBy: userId,
    isPremium: premium,
    data,
  });

  await backupStorage.setLastCreatedAt(guildId, now);

  const embed = new EmbedBuilder()
    .setColor(0x00ff9d)
    .setTitle('✅ Snapshot Captured')
    .setDescription(
      `Your current server configuration has been bottled into **slot ${slot}**.\n\n` +
        `**Label:** \`${name}\`\n` +
        `**Tier:** ${premium ? '💎 Premium (3 slots • 1d cooldown)' : '🪙 Free (1 slot • 7d cooldown)'}`
    )
    .setFooter({ text: 'MULTi-Bot Backups • Snapshot saved successfully.' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], flags: 64 });
}

/* ------------ /backup restore ------------ */
async function handleRestore(interaction, guildId, userId, maxSlots) {
  const slot = interaction.options.getInteger('slot', true);

  if (slot < 1 || slot > maxSlots) {
    return interaction.reply({
      content: `❌ This server can only use slots **1–${maxSlots}**.`,
      flags: 64,
    });
  }

  const backup = await backupStorage.getBackup(guildId, slot);
  if (!backup) {
    return interaction.reply({
      content: `❌ No snapshot found in slot **${slot}**.`,
      flags: 64,
    });
  }

  const data = JSON.parse(backup.data);
  const rolesCount = (data.roles || []).length;
  const channelsCount = (data.channels || []).length;

  const embed = new EmbedBuilder()
    .setColor(0xffaa00)
    .setTitle('⚠️ Deep Restore Warning')
    .setDescription(
      'You are about to **restore** this server from a saved snapshot.\n\n' +
        'This will:\n' +
        '• 🧨 Delete existing channels & roles (except critical ones)\n' +
        '• 🧱 Recreate channels, categories, permissions, and roles from the backup\n\n' +
        'Make sure you fully understand the impact before confirming.'
    )
    .addFields(
      { name: 'Slot', value: `\`${slot}\``, inline: true },
      { name: 'Snapshot Name', value: `\`${backup.name}\``, inline: true },
      { name: 'Saved', value: `<t:${Math.floor(backup.created_at / 1000)}:R>`, inline: true },
      { name: 'Roles in Snapshot', value: `${rolesCount}`, inline: true },
      { name: 'Channels in Snapshot', value: `${channelsCount}`, inline: true },
      { name: 'Created By', value: `<@${backup.created_by}>`, inline: true }
    )
    .setFooter({ text: 'MULTi-Bot Backups • This restore cannot be undone.' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`backup_restore_confirm:${slot}:${userId}`)
      .setLabel('✅ Confirm Restore')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`backup_restore_cancel:${slot}:${userId}`)
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary)
  );

  return interaction.reply({ embeds: [embed], components: [row] });
}

/* ------------ /backup delete ------------ */
async function handleDelete(interaction, guildId, userId, maxSlots) {
  const slot = interaction.options.getInteger('slot', true);

  if (slot < 1 || slot > maxSlots) {
    return interaction.reply({
      content: `❌ This server can only use slots **1–${maxSlots}**.`,
      flags: 64,
    });
  }

  const backup = await backupStorage.getBackup(guildId, slot);
  if (!backup) {
    return interaction.reply({
      content: `❌ No snapshot found in slot **${slot}**.`,
      flags: 64,
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0xff5555)
    .setTitle('🗑️ Confirm Snapshot Deletion')
    .setDescription(
      'You are about to **permanently delete** this stored snapshot.\n\n' +
        'This will **not** change your current server layout — only the saved backup is removed.'
    )
    .addFields(
      { name: 'Slot', value: `\`${slot}\``, inline: true },
      { name: 'Snapshot Name', value: `\`${backup.name}\``, inline: true },
      { name: 'Saved', value: `<t:${Math.floor(backup.created_at / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: 'MULTi-Bot Backups • Snapshot removal pending confirmation.' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`backup_delete_confirm:${slot}:${userId}`)
      .setLabel('✅ Confirm Delete')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`backup_delete_cancel:${slot}:${userId}`)
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary)
  );

  return interaction.reply({ embeds: [embed], components: [row] });
}
