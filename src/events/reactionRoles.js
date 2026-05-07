// src/events/reactionRoles.js
const { Events } = require('discord.js');
const rrStorage = require('../utils/rrStorage');
const rrdb = require('../utils/rrdb');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(_, client) {
    await rrStorage.initStorage();

    async function findItemForReaction(setupId, reaction) {
      const possible = [];

      if (reaction.emoji?.id)
        possible.push(`${reaction.emoji.name}:${reaction.emoji.id}`);

      try { possible.push(reaction.emoji.toString()); } catch {}

      if (reaction.emoji?.name)
        possible.push(reaction.emoji.name);

      const uniq = [...new Set(possible.filter(Boolean))];
      return rrStorage.findItemByAnyIdentifier(setupId, uniq);
    }

    // 🔵 Reaction Added
    client.on('messageReactionAdd', async (reaction, user) => {
      try {
        if (user.bot) return;

        if (reaction.partial) {
          try { await reaction.fetch(); } catch { return; }
        }

        const msg = reaction.message;
        if (!msg?.guild) return;

        const setup = await rrStorage.getSetupByMessage(msg.guild.id, msg.id);
        if (!setup || setup.mode !== 'reactions') return;

        const item = await findItemForReaction(setup.id, reaction);
        if (!item) return;

        const member = await msg.guild.members.fetch(user.id).catch(() => null);
        if (!member) return;

        const role = msg.guild.roles.cache.get(item.role_id);
        if (!role) return;

        const botMember = msg.guild.members.me;
        if (!botMember) return;
        if (role.position >= botMember.roles.highest.position) return;

        await member.roles.add(role, 'RR reaction add').catch(() => {});
        await rrStorage.logAction({
          guildId: msg.guild.id,
          userId: user.id,
          roleId: role.id,
          setupId: setup.id,
          action: 'grant'
        });

      } catch { /* silent */ }
    });

    // 🔴 Reaction Removed
    client.on('messageReactionRemove', async (reaction, user) => {
      try {
        if (user.bot) return;

        if (reaction.partial) {
          try { await reaction.fetch(); } catch { return; }
        }

        const msg = reaction.message;
        if (!msg?.guild) return;

        const setup = await rrStorage.getSetupByMessage(msg.guild.id, msg.id);
        if (!setup || setup.mode !== 'reactions') return;

        const item = await findItemForReaction(setup.id, reaction);
        if (!item) return;

        const member = await msg.guild.members.fetch(user.id).catch(() => null);
        if (!member) return;

        const role = msg.guild.roles.cache.get(item.role_id);
        if (!role) return;

        await member.roles.remove(role, 'RR reaction remove').catch(() => {});
        await rrStorage.logAction({
          guildId: msg.guild.id,
          userId: user.id,
          roleId: role.id,
          setupId: setup.id,
          action: 'revoke'
        });

      } catch { /* silent */ }
    });

    // 🗑 Role Deleted → cleanup orphaned RR items
    client.on(Events.GuildRoleDelete, async (role) => {
      try {
        const rows = await rrdb.instance.all(
          `SELECT id FROM rr_items WHERE role_id = ?;`,
          [role.id]
        );

        for (const row of rows) {
          await rrStorage.removeItem(row.id).catch(() => {});
        }

      } catch { /* silent */ }
    });

    // 🗑 Panel message deleted → unlink setup
    client.on(Events.MessageDelete, async (message) => {
      try {
        if (!message.guild) return;

        const setup = await rrStorage.getSetupByMessage(message.guild.id, message.id);
        if (!setup) return;

        await rrStorage.updateSetupMessageId(setup.id, null).catch(() => {});
      } catch { /* silent */ }
    });
  }
};