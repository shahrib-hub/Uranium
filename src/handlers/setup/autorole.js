// src/commands/Moderation/autorole.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const autoroleStore = require('../../utils/autoroleStorage');

const PANEL_COLOR = 0x071022;
const ACCENT = 0x57f287;

function mkEmbed({ title = null, description = null }) {
  const e = new EmbedBuilder().setColor(PANEL_COLOR);
  if (title) e.setTitle(title);
  if (description) e.setDescription(description);
  e.setFooter({ text: 'MULTi-Bot • AutoRoles' });
  return e;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Manage auto-role sets for this server (assign roles when members join)')
    .addSubcommand(sc => sc.setName('create')
      .setDescription('Create a new autorole set')
      .addStringOption(o => o.setName('name').setDescription('Optional name for this set'))
      .addIntegerOption(o => o.setName('delay').setDescription('Delay in seconds before assigning roles').setMinValue(0))
      .addStringOption(o => o.setName('welcome').setDescription('Optional DM welcome message (use {user}, {guild})')))
    .addSubcommand(sc => sc.setName('add')
      .setDescription('Add a role to a set')
      .addIntegerOption(o => o.setName('set').setDescription('Target set id').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to add').setRequired(true)))
    .addSubcommand(sc => sc.setName('remove')
      .setDescription('Remove a role from a set (by role)')
      .addIntegerOption(o => o.setName('set').setDescription('Target set id').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true)))
    .addSubcommand(sc => sc.setName('list')
      .setDescription('List autorole sets in this server'))
    .addSubcommand(sc => sc.setName('view')
      .setDescription('View a set and its roles')
      .addIntegerOption(o => o.setName('set').setDescription('Set id').setRequired(true)))
    .addSubcommand(sc => sc.setName('enable').setDescription('Enable a set').addIntegerOption(o => o.setName('set').setDescription('Set id').setRequired(true)))
    .addSubcommand(sc => sc.setName('disable').setDescription('Disable a set').addIntegerOption(o => o.setName('set').setDescription('Set id').setRequired(true)))
    .addSubcommand(sc => sc.setName('delete').setDescription('Delete a set').addIntegerOption(o => o.setName('set').setDescription('Set id').setRequired(true)))
    .addSubcommand(sc => sc.setName('set-default').setDescription('Mark a set as the default for this guild').addIntegerOption(o => o.setName('set').setDescription('Set id').setRequired(true)))
    .addSubcommand(sc => sc.setName('assign-now').setDescription('Force assign a set to a member (admin only)').addIntegerOption(o => o.setName('set').setDescription('Set id').setRequired(true)).addUserOption(o => o.setName('user').setDescription('User to assign').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await autoroleStore.initAutoroleStorage();

    const replyErr = async (msg) => interaction.reply({ embeds: [mkEmbed({ description: `❌ ${msg}` })], flags: 64 });

    try {
      if (sub === 'create') {
        const name = interaction.options.getString('name') ?? null;
        const delay = interaction.options.getInteger('delay') ?? 0;
        const welcome = interaction.options.getString('welcome') ?? null;

        const setId = await autoroleStore.createSet({
          guildId: interaction.guild.id,
          name,
          delaySeconds: delay,
          welcomeMessage: welcome,
          creatorId: interaction.user.id
        });

        return interaction.reply({ embeds: [mkEmbed({ title: 'AutoRole Set Created', description: `✅ Set ID **${setId}** created. Add roles with \`/autorole add\`.` })], flags: 64 });
      }

      if (sub === 'add') {
        const setId = interaction.options.getInteger('set', true);
        const role = interaction.options.getRole('role', true);

        const set = await autoroleStore.getSetById(setId);
        if (!set || set.guild_id !== interaction.guild.id) return replyErr('Set not found.');

        // hierarchy check
        const botMember = interaction.guild.members.me;
        if (!botMember.permissions.has('ManageRoles') && (!interaction.guild.members.me.permissions.has?.('ManageRoles'))) {
          return replyErr('I need the Manage Roles permission to assign roles on join.');
        }
        if (role.position >= botMember.roles.highest.position) return replyErr('I cannot manage that role because it is equal/higher than my highest role. Move my role above it.');

        const dup = await autoroleStore.findItemInSet(setId, role.id);
        if (dup) return replyErr('That role is already in the set.');

        await autoroleStore.addRoleToSet({ setId, roleId: role.id });
        // if the set has no message feedback, just confirm
        return interaction.reply({ embeds: [mkEmbed({ description: `✅ Added <@&${role.id}> to set **${setId}**.` })], flags: 64 });
      }

      if (sub === 'remove') {
        const setId = interaction.options.getInteger('set', true);
        const role = interaction.options.getRole('role', true);

        const set = await autoroleStore.getSetById(setId);
        if (!set || set.guild_id !== interaction.guild.id) return replyErr('Set not found.');

        const item = await autoroleStore.findItemInSet(setId, role.id);
        if (!item) return replyErr('Role not found in set.');

        await autoroleStore.removeRoleItem(item.id);
        return interaction.reply({ embeds: [mkEmbed({ description: `✅ Removed <@&${role.id}> from set **${setId}**.` })], flags: 64 });
      }

      if (sub === 'list') {
        const rows = await autoroleStore.listSetsForGuild(interaction.guild.id);
        if (!rows.length) return interaction.reply({ embeds: [mkEmbed({ description: 'No autorole sets configured.' })], flags: 64 });

        const lines = rows.map(r => `• **ID ${r.id}** ${r.name ? `— ${r.name}` : ''} — ${r.enabled ? 'Enabled' : 'Disabled'} ${r.is_default ? '• Default' : ''}`);
        return interaction.reply({ embeds: [mkEmbed({ title: 'AutoRole Sets', description: lines.join('\n') })], flags: 64 });
      }

      if (sub === 'view') {
        const setId = interaction.options.getInteger('set', true);
        const set = await autoroleStore.getSetById(setId);
        if (!set || set.guild_id !== interaction.guild.id) return replyErr('Set not found.');
        const items = await autoroleStore.listItemsForSet(setId);
        const rolesList = items.length ? items.map(it => `<@&${it.role_id}>`).join('\n') : '(no roles)';
        const desc = `**Name:** ${set.name || '(none)'}\n**Enabled:** ${set.enabled ? 'Yes' : 'No'}\n**Delay:** ${set.delay_seconds || 0}s\n**Roles:**\n${rolesList}`;
        return interaction.reply({ embeds: [mkEmbed({ title: `Set ID ${setId}`, description: desc })], flags: 64 });
      }

      if (sub === 'enable' || sub === 'disable') {
        const setId = interaction.options.getInteger('set', true);
        const set = await autoroleStore.getSetById(setId);
        if (!set || set.guild_id !== interaction.guild.id) return replyErr('Set not found.');
        await autoroleStore.updateSet(setId, { enabled: sub === 'enable' ? 1 : 0 });
        return interaction.reply({ embeds: [mkEmbed({ description: `✅ ${sub === 'enable' ? 'Enabled' : 'Disabled'} set ${setId}.` })], flags: 64 });
      }

      if (sub === 'delete') {
        const setId = interaction.options.getInteger('set', true);
        const set = await autoroleStore.getSetById(setId);
        if (!set || set.guild_id !== interaction.guild.id) return replyErr('Set not found.');
        await autoroleStore.deleteSet(setId);
        return interaction.reply({ embeds: [mkEmbed({ description: `✅ Deleted set ${setId}.` })], flags: 64 });
      }

      if (sub === 'set-default') {
        const setId = interaction.options.getInteger('set', true);
        const set = await autoroleStore.getSetById(setId);
        if (!set || set.guild_id !== interaction.guild.id) return replyErr('Set not found.');
        await autoroleStore.setDefaultSet(interaction.guild.id, setId);
        return interaction.reply({ embeds: [mkEmbed({ description: `✅ Set ${setId} as default for this server.` })], flags: 64 });
      }

      if (sub === 'assign-now') {
        const setId = interaction.options.getInteger('set', true);
        const user = interaction.options.getUser('user', true);
        const set = await autoroleStore.getSetById(setId);
        if (!set || set.guild_id !== interaction.guild.id) return replyErr('Set not found.');

        // fetch member
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return replyErr('Member not found in this guild.');

        // assign sequentially (no delay enforced here except small gap)
        const items = await autoroleStore.listItemsForSet(setId);
        const botMember = interaction.guild.members.me;
        if (!botMember.permissions.has('ManageRoles')) return replyErr('I need Manage Roles permission to assign roles.');

        const results = [];
        for (const it of items) {
          const role = interaction.guild.roles.cache.get(it.role_id);
          if (!role) {
            results.push(`⚠ <@&${it.role_id}> — role not found`);
            continue;
          }
          if (role.position >= botMember.roles.highest.position) {
            results.push(`⚠ ${role.name} — cannot manage (hierarchy)`);
            continue;
          }
          try {
            await member.roles.add(role, 'Autorole manual assign');
            results.push(`✅ ${role.name}`);
          } catch (e) {
            results.push(`❌ ${role.name} — failed`);
          }
          // prevent bursts
          await new Promise(res => setTimeout(res, 300));
        }

        return interaction.reply({ embeds: [mkEmbed({ title: `Assign results for ${user.tag}`, description: results.join('\n') })], flags: 64 });
      }

      return replyErr('Unknown subcommand.');
    } catch (err) {
      console.error('[autorole command] error', err);
      return interaction.reply({ embeds: [mkEmbed({ description: '❌ Internal error' })], flags: 64 });
    }
  }
};