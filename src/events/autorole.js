// src/events/autoroles.js
const { Events } = require('discord.js');
const autoroleStore = require('../utils/autoroleStorage');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member) {
    try {
      await autoroleStore.initAutoroleStorage();

      const guild = member.guild;
      // pick enabled default set first, else all enabled sets
      const defaultSet = await autoroleStore.getDefaultSetForGuild(guild.id);
      let sets = [];
      if (defaultSet && defaultSet.enabled) {
        sets = [defaultSet];
      } else {
        const all = await autoroleStore.listSetsForGuild(guild.id);
        sets = all.filter(s => s.enabled);
      }
      if (!sets.length) return;

      // combine roles from sets (dedupe)
      const roleIds = new Set();
      const setMap = new Map(); // roleId -> setId (first set owning it)
      const setDelays = new Map(); // setId -> delay

      for (const s of sets) {
        const items = await autoroleStore.listItemsForSet(s.id);
        for (const it of items) {
          if (!roleIds.has(it.role_id)) {
            roleIds.add(it.role_id);
            setMap.set(it.role_id, s.id);
          }
        }
        setDelays.set(s.id, s.delay_seconds || 0);
      }

      if (!roleIds.size) return;

      const botMember = guild.members.me;
      if (!botMember) return;
      if (!botMember.permissions.has('ManageRoles')) return; // cannot assign anything

      // assign sequentially to avoid bursts
      for (const roleId of roleIds) {
        const setId = setMap.get(roleId);
        const delay = setDelays.get(setId) || 0;
        if (delay > 0) {
          await new Promise(res => setTimeout(res, delay * 1000));
        }

        try {
          const role = guild.roles.cache.get(roleId);
          if (!role) {
            await autoroleStore.logAction({ guildId: guild.id, userId: member.user.id, roleId, setId, action: 'fail', reason: 'role_not_found' });
            continue;
          }
          if (role.position >= botMember.roles.highest.position) {
            await autoroleStore.logAction({ guildId: guild.id, userId: member.user.id, roleId, setId, action: 'fail', reason: 'hierarchy' });
            continue;
          }

          await member.roles.add(role, 'Autorole on join').catch(async (e) => {
            await autoroleStore.logAction({ guildId: guild.id, userId: member.user.id, roleId, setId, action: 'fail', reason: 'exception' });
          });

          await autoroleStore.logAction({ guildId: guild.id, userId: member.user.id, roleId, setId, action: 'grant' });
          // small gap between adds
          await new Promise(res => setTimeout(res, 300));
        } catch (err) {
          // ensure we don't crash the process
          try {
            await autoroleStore.logAction({ guildId: guild.id, userId: member.user.id, roleId, setId, action: 'fail', reason: 'exception' });
          } catch {}
        }
      }

      // send optional welcome messages per default set only
      if (defaultSet && defaultSet.welcome_message) {
        const text = defaultSet.welcome_message.replace(/\{user\}/g, `<@${member.user.id}>`).replace(/\{guild\}/g, guild.name);
        try {
          await member.send({ content: text }).catch(() => {});
        } catch {}
      }
    } catch (err) {
      // keep silent but don't crash
      console.error('[autoroles] guildMemberAdd handler error', err);
    }
  }
};