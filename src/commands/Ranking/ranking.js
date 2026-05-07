const {
  SlashCommandBuilder,
  AttachmentBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} = require('discord.js');

const {
  getConfig, setConfig,
  getUser, upsertUser, addXp, setLevel, setXp,
  resetUser, resetAll, topUsers, getRankPosition,
  setRoleReward, removeRoleReward, listRoleRewards
} = require('../../utils/ranking');

const { generateRankCard } = require('../../utils/rankcard');

function xpNeeded(level, formulaText) {
  const f = new Function('level', `return ${formulaText};`);
  return Math.max(0, Math.floor(f(level)));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Server ranking system')
    .setDMPermission(false)
    .addSubcommandGroup(user =>
      user.setName('user').setDescription('User-related ranking')
        .addSubcommand(sc => sc.setName('xp').setDescription('Show user XP')
          .addUserOption(o => o.setName('user').setDescription('User').setRequired(false)))
        .addSubcommand(sc => sc.setName('rank').setDescription('Show user level')
          .addUserOption(o => o.setName('user').setDescription('User').setRequired(false)))
        .addSubcommand(sc => sc.setName('card').setDescription('Show rank card')
          .addUserOption(o => o.setName('user').setDescription('User').setRequired(false))
          .addStringOption(o => o.setName('theme').setDescription('Theme: dark, light, neon').setRequired(false)))
        .addSubcommand(sc => sc.setName('leaderboard').setDescription('Show leaderboard page')
          .addIntegerOption(o => o.setName('page').setDescription('Page number').setRequired(false)))
    )
    .addSubcommandGroup(cfg =>
      cfg.setName('config').setDescription('Configure ranking system')
        .addSubcommand(sc => sc.setName('enable').setDescription('Enable ranking'))
        .addSubcommand(sc => sc.setName('disable').setDescription('Disable ranking'))
        .addSubcommand(sc => sc.setName('setcooldown').setDescription('Set message cooldown (seconds)')
          .addIntegerOption(o => o.setName('seconds').setDescription('Cooldown in seconds').setRequired(true)))
        .addSubcommand(sc => sc.setName('blacklist').setDescription('Manage channel blacklist')
          .addChannelOption(o => o.setName('add').setDescription('Add channel').addChannelTypes(ChannelType.GuildText))
          .addChannelOption(o => o.setName('remove').setDescription('Remove channel').addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(sc => sc.setName('roles').setDescription('Level role rewards')
          .addIntegerOption(o => o.setName('add_level').setDescription('Level to reward'))
          .addRoleOption(o => o.setName('add_role').setDescription('Role to grant'))
          .addIntegerOption(o => o.setName('remove_level').setDescription('Level to remove')))
        .addSubcommand(sc => sc.setName('roles-list').setDescription('List role rewards'))
    )
    .addSubcommandGroup(admin =>
      admin.setName('admin').setDescription('Admin controls')
        .addSubcommand(sc => sc.setName('recalc').setDescription('Recalculate level from XP')
          .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
        .addSubcommand(sc => sc.setName('give').setDescription('Give XP to user')
          .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
          .addIntegerOption(o => o.setName('amount').setDescription('XP amount').setRequired(true)))
        .addSubcommand(sc => sc.setName('set').setDescription('Set user level')
          .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
          .addIntegerOption(o => o.setName('level').setDescription('Level').setRequired(true)))
        .addSubcommand(sc => sc.setName('reset').setDescription('Reset user stats')
          .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
        .addSubcommand(sc => sc.setName('resetall').setDescription('Reset all users in this guild'))
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const member = interaction.member;

    // Permission guard for config/admin groups
    if (['config', 'admin'].includes(group) && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ You need Manage Server permission.', flags: 64 });
    }

    // ---------- USER GROUP ----------
    if (group === 'user') {
      const target = interaction.options.getUser('user') || interaction.user;
      const cfg = await getConfig(guildId);
      const u = await getUser(guildId, target.id) || { xp: 0, level: 0, badges: '[]' };

      if (sub === 'xp') {
        const embed = new EmbedBuilder()
          .setTitle(`XP: ${target.username}`)
          .setColor(0x5865F2)
          .addFields(
            { name: 'XP', value: `${u.xp}`, inline: true },
            { name: 'Level', value: `${u.level}`, inline: true }
          )
          .setFooter({ text: `Cooldown: ${cfg?.cooldown_seconds ?? 'N/A'}s` });
        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'rank') {
        const rankPos = await getRankPosition(guildId, target.id) ?? '—';
        const embed = new EmbedBuilder()
          .setTitle(`Rank: ${target.username}`)
          .setColor(0x5865F2)
          .addFields(
            { name: 'Level', value: `${u.level}`, inline: true },
            { name: 'XP', value: `${u.xp}`, inline: true },
            { name: 'Leaderboard Position', value: `#${rankPos}`, inline: true }
          );
        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'card') {
        const theme = (interaction.options.getString('theme') || 'dark').toLowerCase();
        const nextLevel = (u.level ?? 0) + 1;
        const needed = xpNeeded(nextLevel, cfg?.formula || '50 * level * level + 50 * level');
        const rankPos = await getRankPosition(guildId, target.id) ?? '—';

        const buffer = await generateRankCard({
          avatarUrl: target.displayAvatarURL({ extension: 'png', size: 256 }),
          username: target.username,
          discriminator: target.discriminator,
          level: u.level ?? 0,
          xp: u.xp ?? 0,
          xpNeeded: needed,
          rank: rankPos,
          badges: JSON.parse(u.badges || '[]'),
          theme
        });

        const file = new AttachmentBuilder(buffer, { name: `rank-${target.id}.png` });
        const embed = new EmbedBuilder()
          .setTitle(`Rank Card: ${target.username}`)
          .setColor(0x5865F2)
          .setImage(`attachment://rank-${target.id}.png`);
        return interaction.reply({ embeds: [embed], files: [file] });
      }

      if (sub === 'leaderboard') {
        const page = interaction.options.getInteger('page') || 1;
        const rows = await topUsers(guildId, page, 10);
        const text = rows.map((r, i) => `${(page - 1) * 10 + i + 1}. <@${r.user_id}> — XP: ${r.xp} • Lv ${r.level}`).join('\n') || 'No data.';
        const embed = new EmbedBuilder()
          .setTitle(`Leaderboard — Page ${page}`)
          .setColor(0x5865F2)
          .setDescription(text);
        return interaction.reply({ embeds: [embed] });
      }
    }

    // ---------- CONFIG GROUP ----------
    if (group === 'config') {
      const cfg = await getConfig(guildId) || { enabled: false, blacklist: [], cooldown_seconds: 60, formula: '50 * level * level + 50 * level' };

      if (sub === 'enable') {
        await setConfig(guildId, { ...cfg, enabled: true });
        return interaction.reply({ content: '✅ Ranking enabled.' });
      }

      if (sub === 'disable') {
        await setConfig(guildId, { ...cfg, enabled: false });
        return interaction.reply({ content: '⛔ Ranking disabled.' });
      }

      if (sub === 'setcooldown') {
        const seconds = interaction.options.getInteger('seconds');
        await setConfig(guildId, { ...cfg, cooldown_seconds: Math.max(1, seconds) });
        return interaction.reply({ content: `⏱️ Cooldown set to ${Math.max(1, seconds)} seconds.` });
      }

      if (sub === 'blacklist') {
        const add = interaction.options.getChannel('add');
        const remove = interaction.options.getChannel('remove');
        let list = Array.isArray(cfg.blacklist) ? cfg.blacklist.slice() : [];

        if (add && !list.includes(add.id)) list.push(add.id);
        if (remove) list = list.filter(id => id !== remove.id);

        await setConfig(guildId, { ...cfg, blacklist: list });

        const embed = new EmbedBuilder()
          .setTitle('📵 Blacklisted Channels')
          .setColor(0xED4245)
          .setDescription(list.length ? list.map(id => `<#${id}>`).join('\n') : 'None');
        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'roles') {
        const addLevel = interaction.options.getInteger('add_level');
        const addRole = interaction.options.getRole('add_role');
        const removeLevel = interaction.options.getInteger('remove_level');

        if (addLevel && addRole) {
          await setRoleReward(guildId, addLevel, addRole.id);
          return interaction.reply({ content: `🎖️ Added reward: Level ${addLevel} → <@&${addRole.id}>` });
        }

        if (removeLevel) {
          await removeRoleReward(guildId, removeLevel);
          return interaction.reply({ content: `🗑️ Removed reward for Level ${removeLevel}.` });
        }

        return interaction.reply({ content: 'ℹ️ Provide add_level+add_role or remove_level.' });
      }

      if (sub === 'roles_list') {
        const list = await listRoleRewards(guildId);
        const desc = list.length ? list.map(r => `Lv ${r.level} → <@&${r.role_id}>`).join('\n') : 'No role rewards.';
        const embed = new EmbedBuilder()
          .setTitle('🎖️ Role Rewards')
          .setColor(0x5865F2)
          .setDescription(desc);
        return interaction.reply({ embeds: [embed] });
      }
    }
// ---------- ADMIN GROUP ----------
if (group === 'admin') {
  const cfg = await getConfig(guildId);

  if (sub === 'recalc') {
    const target = interaction.options.getUser('user');
    const u = await getUser(guildId, target.id);
    let level = 0;
    while (u.xp >= xpNeeded(level + 1, cfg.formula)) level++;
    await setLevel(guildId, target.id, level);
    return interaction.reply({ content: `🔁 Recalculated: ${target.username} → Level ${level}.` });
  }

  if (sub === 'give') {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    await addXp(guildId, target.id, Math.max(0, amount));
    return interaction.reply({ content: `➕ Gave ${Math.max(0, amount)} XP to ${target.username}.` });
  }

  if (sub === 'set') {
    const target = interaction.options.getUser('user');
    const level = interaction.options.getInteger('level');
    await setLevel(guildId, target.id, Math.max(0, level));
    return interaction.reply({ content: `🧭 Set ${target.username} to Level ${Math.max(0, level)}.` });
  }

  if (sub === 'reset') {
    const target = interaction.options.getUser('user');
    await resetUser(guildId, target.id);
    return interaction.reply({ content: `🗑️ Reset stats for ${target.username}.` });
  }

  if (sub === 'resetall') {
    await resetAll(guildId);
    return interaction.reply({ content: `🗑️ Reset all user stats in this guild.` });
  }
}

    // If no group matched (shouldn't happen), reply with help
    return interaction.reply({ content: 'Unknown subcommand or insufficient permissions.', flags: 64 });
  }
};