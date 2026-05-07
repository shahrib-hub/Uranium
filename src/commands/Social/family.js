// src/commands/Social/family.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const familyStore = require('../../utils/familyStorage');

const THEME = 0x0b1220;
const ACCENT = 0x57f287;

function baseEmbed(title) {
  return new EmbedBuilder().setColor(THEME).setTitle(title).setFooter({ text: 'MULTi-Bot • Family' });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('family')
    .setDescription('Family system: adopt, marry, children, partner, runaway, toggle, view, divorce')
    .addSubcommand(sc => sc.setName('adopt').setDescription('Request to adopt a user as your child').addUserOption(o => o.setName('user').setDescription('Target child').setRequired(true)))
    .addSubcommand(sc => sc.setName('children').setDescription('List your children or someone\'s children').addUserOption(o => o.setName('user').setDescription('Optional member')))
    .addSubcommand(sc => sc.setName('marry').setDescription('Propose marriage to someone').addUserOption(o => o.setName('user').setDescription('Partner').setRequired(true)))
    .addSubcommand(sc => sc.setName('divorce').setDescription('Divorce your partner or break a marriage').addUserOption(o => o.setName('user').setDescription('Partner (optional)')))
    .addSubcommand(sc => sc.setName('partner').setDescription('Show your partner or someone\'s partner').addUserOption(o => o.setName('user').setDescription('Optional member')))
    .addSubcommand(sc => sc.setName('runaway').setDescription('Remove yourself from a parent').addUserOption(o => o.setName('parent').setDescription('Parent to run away from').setRequired(true)))
    .addSubcommand(sc => sc.setName('toggle').setDescription('Toggle receiving family requests (on/off)'))
    .addSubcommand(sc => sc.setName('view').setDescription('View your family (parents/partner/children)').addUserOption(o => o.setName('user').setDescription('Optional member')))
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    await familyStore.initFamilyStorage();
    const sub = interaction.options.getSubcommand();
    const actor = interaction.user;

    const replyErr = (text) => interaction.reply({ embeds: [baseEmbed('Error').setDescription(text).setColor('Red')], flags: 64 });
    const replyOk = (title, text) => interaction.reply({ embeds: [baseEmbed(title).setDescription(text).setColor(ACCENT)], flags: 0 });

    try {
      if (sub === 'toggle') {
        const current = await familyStore.getAllowRequests(actor.id);
        await familyStore.setAllowRequests(actor.id, !current);
        return interaction.reply({ embeds: [baseEmbed('Request Preferences').setDescription(`Incoming family requests are now **${!current ? 'enabled' : 'disabled'}**.`).setColor(ACCENT)], flags: 64 });
      }

      if (sub === 'marry') {
        const target = interaction.options.getUser('user', true);
        if (target.id === actor.id) return replyErr('You cannot marry yourself.');
        // check existing partnership
        const partnerA = await familyStore.getPartner(actor.id);
        if (partnerA) return replyErr('You are already married. Divorce first.');
        const partnerB = await familyStore.getPartner(target.id);
        if (partnerB) return replyErr('That user is already married.');

        // check target allow requests
        const allow = await familyStore.getAllowRequests(target.id);
        if (!allow) return replyErr('That user is not accepting family requests.');

        // create pending
        const existing = await familyStore.findPending('marry', actor.id, target.id);
        if (existing) return replyErr('You already have a pending marriage request to that user.');

        const pendingId = await familyStore.createPending('marry', actor.id, target.id);
        const embed = baseEmbed('Marriage Proposal').setDescription(`${actor} proposed marriage to ${target}.\n\n*Waiting for their response.*`);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`family_accept:${pendingId}`).setLabel('Accept').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`family_decline:${pendingId}`).setLabel('Decline').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
        return;
      }

      if (sub === 'adopt') {
        const target = interaction.options.getUser('user', true);
        if (target.id === actor.id) return replyErr('You cannot adopt yourself.');
        // do not allow adopting your parent or partner
        const existingPartner = await familyStore.getPartner(actor.id);
        if (existingPartner && existingPartner === target.id) return replyErr('You cannot adopt your partner.');

        // check allow requests of target (child must accept)
        const allow = await familyStore.getAllowRequests(target.id);
        if (!allow) return replyErr('That user is not accepting family requests.');

        const existing = await familyStore.findPending('adopt', actor.id, target.id);
        if (existing) return replyErr('You already have a pending adoption request to that user.');

        const pendingId = await familyStore.createPending('adopt', actor.id, target.id);
        const embed = baseEmbed('Adoption Request').setDescription(`${actor} wants to adopt ${target}.\n\n*Waiting for their response.*`);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`family_accept:${pendingId}`).setLabel('Accept').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`family_decline:${pendingId}`).setLabel('Decline').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
        return;
      }

      if (sub === 'children') {
        const who = interaction.options.getUser('user') ?? actor;
        const rows = await familyStore.listChildrenOf(who.id);
        const kids = rows.map(r => `<@${r.child_id}>`);
        return interaction.reply({ embeds: [baseEmbed(`${who.username}'s Children`).setDescription(kids.length ? kids.join('\n') : '(no children)')], flags: 64 });
      }

      if (sub === 'partner') {
        const who = interaction.options.getUser('user') ?? actor;
        const partnerId = await familyStore.getPartner(who.id);
        if (!partnerId) return interaction.reply({ embeds: [baseEmbed('Partner').setDescription('(no partner)')], flags: 64 });
        return interaction.reply({ embeds: [baseEmbed('Partner').setDescription(`<@${partnerId}>`)], flags: 64 });
      }

      if (sub === 'view') {
        const who = interaction.options.getUser('user') ?? actor;
        const partnerId = await familyStore.getPartner(who.id);
        const parentsRows = await familyStore.listParentsOf(who.id);
        const childrenRows = await familyStore.listChildrenOf(who.id);

        const parents = parentsRows.map(r => `<@${r.parent_id}>`);
        const children = childrenRows.map(r => `<@${r.child_id}>`);

        const embed = baseEmbed(`${who.username}'s Family`)
          .addFields(
            { name: 'Partner', value: partnerId ? `<@${partnerId}>` : '(none)', inline: true },
            { name: 'Parents', value: parents.length ? parents.join('\n') : '(none)', inline: true },
            { name: 'Children', value: children.length ? children.join('\n') : '(none)', inline: false }
          );

        return interaction.reply({ embeds: [embed], flags: 0 });
      }

      if (sub === 'runaway') {
        const parent = interaction.options.getUser('parent', true);
        const childId = actor.id;
        // ensure relation exists
        const isParent = await familyStore.isParentOf(parent.id, childId);
        if (!isParent) return replyErr('You are not a child of that user.');

        await familyStore.removeParentChild(parent.id, childId);
        return replyOk('Runaway', `You have removed <@${parent.id}> as your parent.`);
      }

      if (sub === 'divorce') {
        // optional user param to target specific partner; otherwise use current partner
        const target = interaction.options.getUser('user');
        const currentPartner = await familyStore.getPartner(actor.id);
        if (!currentPartner && !target) return replyErr('You are not married.');

        const targetId = target ? target.id : currentPartner;
        if (!targetId) return replyErr('Target not found.');

        // check they are partners
        const partnerOfTarget = await familyStore.getPartner(targetId);
        if (partnerOfTarget !== actor.id) {
          return replyErr('You are not partners with that user.');
        }

        // remove both sides
        await familyStore.removePartner(actor.id);
        await familyStore.removePartner(targetId);
        return replyOk('Divorce', `You are no longer partners with <@${targetId}>.`);
      }

      return replyErr('Unknown subcommand.');
    } catch (err) {
      console.error('[family command] error', err);
      return replyErr('Internal error occurred.');
    }
  }
};