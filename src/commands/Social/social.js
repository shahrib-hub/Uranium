// src/commands/Social/social.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');

const familyStore = require('../../utils/familyStorage');
const { add, list, remove } = require('../../utils/socialDb');
const { isPremiumGuild } = require('../../utils/premium');
const socialEmbeds = require('../../components/socialEmbeds');

const THEME = 0x0b1220;
const ACCENT = 0x57f287;

function baseEmbed(title) {
  return new EmbedBuilder().setColor(THEME).setTitle(title).setFooter({ text: 'Uranium • Social Hub' });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social')
    .setDescription('👥 Social Hub — Family tree, relationships & social media notifications')

    // GROUP: FAMILY
    .addSubcommandGroup(g =>
      g.setName('family')
        .setDescription('Family relations: marry, adopt, children, partner, divorce')
        .addSubcommand(s =>
          s.setName('adopt')
            .setDescription('Request to adopt a user as your child')
            .addUserOption(o => o.setName('user').setDescription('Target child').setRequired(true))
        )
        .addSubcommand(s =>
          s.setName('children')
            .setDescription("List your children or someone's children")
            .addUserOption(o => o.setName('user').setDescription('Optional member'))
        )
        .addSubcommand(s =>
          s.setName('marry')
            .setDescription('Propose marriage to someone')
            .addUserOption(o => o.setName('user').setDescription('Partner').setRequired(true))
        )
        .addSubcommand(s =>
          s.setName('divorce')
            .setDescription('Divorce your partner')
            .addUserOption(o => o.setName('user').setDescription('Partner (optional)'))
        )
        .addSubcommand(s =>
          s.setName('partner')
            .setDescription("Show your partner or someone's partner")
            .addUserOption(o => o.setName('user').setDescription('Optional member'))
        )
        .addSubcommand(s =>
          s.setName('runaway')
            .setDescription('Remove yourself from a parent')
            .addUserOption(o => o.setName('parent').setDescription('Parent to run away from').setRequired(true))
        )
        .addSubcommand(s =>
          s.setName('toggle')
            .setDescription('Toggle receiving family requests on/off')
        )
        .addSubcommand(s =>
          s.setName('view')
            .setDescription('View full family tree (parents, partner, children)')
            .addUserOption(o => o.setName('user').setDescription('Optional member'))
        )
    )

    // GROUP: ALERTS
    .addSubcommandGroup(g =>
      g.setName('alerts')
        .setDescription('Social media live notification feeds (YouTube / Twitch)')
        .addSubcommand(s =>
          s.setName('add')
            .setDescription('Add a social channel live notification feed')
            .addStringOption(o =>
              o.setName('platform')
                .setDescription('Platform')
                .setRequired(true)
                .addChoices(
                  { name: 'YouTube', value: 'youtube' },
                  { name: 'Twitch', value: 'twitch' }
                )
            )
            .addStringOption(o => o.setName('source').setDescription('YouTube Channel ID / Twitch username').setRequired(true))
            .addChannelOption(o => o.setName('channel').setDescription('Channel for notifications').setRequired(true))
            .addStringOption(o => o.setName('message').setDescription('Custom notification announcement message').setRequired(true))
        )
        .addSubcommand(s =>
          s.setName('remove')
            .setDescription('Remove a configured notification feed')
            .addIntegerOption(o => o.setName('id').setDescription('Notification ID').setRequired(true))
        )
        .addSubcommand(s =>
          s.setName('list')
            .setDescription('List all active social notification feeds')
        )
        .addSubcommand(s =>
          s.setName('status')
            .setDescription('View social alert system status and guild limits')
        )
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const actor = interaction.user;
    const guildId = interaction.guild?.id;

    const replyErr = (text) => interaction.reply({ embeds: [baseEmbed('Error').setDescription(text).setColor('Red')], flags: 64 });
    const replyOk = (title, text) => interaction.reply({ embeds: [baseEmbed(title).setDescription(text).setColor(ACCENT)] });

    try {
      // ══════════════════════════════════════════════
      // GROUP: FAMILY
      // ══════════════════════════════════════════════
      if (group === 'family') {
        await familyStore.initFamilyStorage();

        if (sub === 'toggle') {
          const current = await familyStore.getAllowRequests(actor.id);
          await familyStore.setAllowRequests(actor.id, !current);
          return interaction.reply({
            embeds: [baseEmbed('Request Preferences').setDescription(`Incoming family requests are now **${!current ? 'enabled' : 'disabled'}**.`).setColor(ACCENT)],
            flags: 64
          });
        }

        if (sub === 'marry') {
          const target = interaction.options.getUser('user', true);
          if (target.id === actor.id) return replyErr('You cannot marry yourself.');
          if (target.bot) return replyErr('You cannot marry a bot.');

          const partnerA = await familyStore.getPartner(actor.id);
          if (partnerA) return replyErr('You are already married. Divorce first.');
          const partnerB = await familyStore.getPartner(target.id);
          if (partnerB) return replyErr('That user is already married.');

          const allow = await familyStore.getAllowRequests(target.id);
          if (!allow) return replyErr('That user is not accepting family requests.');

          const existing = await familyStore.findPending('marry', actor.id, target.id);
          if (existing) return replyErr('You already have a pending marriage request to that user.');

          const pendingId = await familyStore.createPending('marry', actor.id, target.id);
          const embed = baseEmbed('💍 Marriage Proposal').setDescription(`${actor} proposed marriage to ${target}!\n\n*Waiting for their response...*`);
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`family_accept:${pendingId}`).setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`family_decline:${pendingId}`).setLabel('Decline').setStyle(ButtonStyle.Danger)
          );

          return interaction.reply({ embeds: [embed], components: [row] });
        }

        if (sub === 'adopt') {
          const target = interaction.options.getUser('user', true);
          if (target.id === actor.id) return replyErr('You cannot adopt yourself.');
          if (target.bot) return replyErr('You cannot adopt a bot.');

          const existingPartner = await familyStore.getPartner(actor.id);
          if (existingPartner && existingPartner === target.id) return replyErr('You cannot adopt your partner.');

          const allow = await familyStore.getAllowRequests(target.id);
          if (!allow) return replyErr('That user is not accepting family requests.');

          const existing = await familyStore.findPending('adopt', actor.id, target.id);
          if (existing) return replyErr('You already have a pending adoption request to that user.');

          const pendingId = await familyStore.createPending('adopt', actor.id, target.id);
          const embed = baseEmbed('👶 Adoption Request').setDescription(`${actor} wants to adopt ${target}!\n\n*Waiting for their response...*`);
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`family_accept:${pendingId}`).setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`family_decline:${pendingId}`).setLabel('Decline').setStyle(ButtonStyle.Danger)
          );

          return interaction.reply({ embeds: [embed], components: [row] });
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

          const embed = baseEmbed(`👨‍👩‍👦 ${who.username}'s Family`)
            .addFields(
              { name: '💍 Partner', value: partnerId ? `<@${partnerId}>` : '*None*', inline: true },
              { name: '🧑‍🤝‍🧑 Parents', value: parents.length ? parents.join('\n') : '*None*', inline: true },
              { name: '👶 Children', value: children.length ? children.join('\n') : '*None*', inline: false }
            );

          return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'runaway') {
          const parent = interaction.options.getUser('parent', true);
          const isParent = await familyStore.isParentOf(parent.id, actor.id);
          if (!isParent) return replyErr('You are not a child of that user.');

          await familyStore.removeParentChild(parent.id, actor.id);
          return replyOk('Runaway', `You have separated from parent <@${parent.id}>.`);
        }

        if (sub === 'divorce') {
          const target = interaction.options.getUser('user');
          const currentPartner = await familyStore.getPartner(actor.id);
          if (!currentPartner && !target) return replyErr('You are not married.');

          const targetId = target ? target.id : currentPartner;
          const partnerOfTarget = await familyStore.getPartner(targetId);
          if (partnerOfTarget !== actor.id) {
            return replyErr('You are not married to that user.');
          }

          await familyStore.removePartner(actor.id);
          await familyStore.removePartner(targetId);
          return replyOk('Divorce', `You are no longer married to <@${targetId}>.`);
        }
      }

      // ══════════════════════════════════════════════
      // GROUP: ALERTS
      // ══════════════════════════════════════════════
      if (group === 'alerts') {
        if (!guildId) return replyErr('Alerts can only be configured in a server.');

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({ content: '❌ You need **Manage Server** permission to configure alerts.', flags: 64 });
        }

        const premium = isPremiumGuild(guildId);
        const rows = await list(guildId);
        const limits = premium ? 5 : 1;
        const cooldown = premium ? 60 * 60 * 1000 : 12 * 60 * 60 * 1000;

        if (sub === 'add') {
          const platform = interaction.options.getString('platform', true);
          const count = rows.filter(r => r.platform === platform).length;

          if (count >= limits) {
            return interaction.reply({
              content: `❌ You’ve reached the **${platform.toUpperCase()}** notification feed limit (${limits} feeds per server).`,
              flags: 64
            });
          }

          await add({
            guildId,
            platform,
            source: interaction.options.getString('source', true),
            notifyChannelId: interaction.options.getChannel('channel', true).id,
            message: interaction.options.getString('message', true),
            cooldown
          });

          return interaction.reply({
            content: `✅ **${platform.toUpperCase()}** notification feed added successfully!`,
            flags: 64
          });
        }

        if (sub === 'remove') {
          await remove(interaction.options.getInteger('id', true), guildId);
          return interaction.reply({ content: '🗑️ Notification feed removed.', flags: 64 });
        }

        if (sub === 'list' || sub === 'status') {
          const embed = socialEmbeds.dashboard(rows, premium);
          return interaction.reply({ embeds: [embed], flags: 64 });
        }
      }

      return interaction.reply({ content: 'Subcommand not found.', flags: 64 });
    } catch (err) {
      console.error('social command error', err);
      if (!interaction.replied) return interaction.reply({ content: 'An internal error occurred.', flags: 64 });
    }
  }
};
