// src/commands/Utility/birthday.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const bstore = require('../../utils/birthdayStorage');

const THEME = 0x0b1220;
const ACCENT = 0x57f287;

function mkEmbed(title = null) {
  const e = new EmbedBuilder().setColor(THEME);
  if (title) e.setTitle(title);
  e.setFooter({ text: 'MULTi-Bot • Birthdays' });
  return e;
}

function validMonthDay(month, day) {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12) return false;
  const maxDay = [31, ( (new Date().getFullYear()%4===0 && new Date().getFullYear()%100!==0) || new Date().getFullYear()%400===0) ? 29 : 28, 31,30,31,30,31,31,30,31,30,31][month-1];
  if (day < 1 || day > maxDay) return false;
  return true;
}

function formatDate(row) {
  if (!row) return '(none)';
  const m = String(row.month).padStart(2,'0');
  const d = String(row.day).padStart(2,'0');
  return row.year ? `${row.year}-${m}-${d}` : `${m}-${d}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Birthday utilities')
    .addSubcommand(sc => sc.setName('set')
      .setDescription('Set your birthday (or admin set for a user)')
      .addIntegerOption(o => o.setName('month').setDescription('Month (1-12)').setRequired(true))
      .addIntegerOption(o => o.setName('day').setDescription('Day (1-31)').setRequired(true))
      .addIntegerOption(o => o.setName('year').setDescription('Year (optional)').setRequired(false))
      .addStringOption(o => o.setName('note').setDescription('Short note (optional)'))
      .addUserOption(o => o.setName('user').setDescription('Set for another user (admins only)')))
    .addSubcommand(sc => sc.setName('view')
      .setDescription('View a user\'s birthday')
      .addUserOption(o => o.setName('user').setDescription('User to view').setRequired(false)))
    .addSubcommand(sc => sc.setName('list').setDescription('List all birthdays in this server'))
    .addSubcommand(sc => sc.setName('matches').setDescription('Upcoming birthdays in the next N days').addIntegerOption(o => o.setName('days').setDescription('Days ahead').setMinValue(0).setMaxValue(60)))
    .addSubcommand(sc => sc.setName('remove').setDescription('Remove your birthday or admin remove').addUserOption(o => o.setName('user').setDescription('User to remove (admins only)')))
    .setDefaultMemberPermissions(0), // allow everyone to use view/list/matches; set/remove may be used by users; admin override uses checks inside

  async execute(interaction) {
    await bstore.initBirthdayStorage();
    const sub = interaction.options.getSubcommand();
    const me = interaction.user;

    const isAdmin = interaction.memberPermissions?.has?.('ManageGuild') || interaction.member?.permissions?.has?.('ManageGuild');

    try {
      if (sub === 'set') {
        const month = interaction.options.getInteger('month', true);
        const day = interaction.options.getInteger('day', true);
        const year = interaction.options.getInteger('year') ?? null;
        const note = interaction.options.getString('note') ?? null;
        const target = interaction.options.getUser('user') ?? me;

        if (target.id !== me.id && !isAdmin) {
          return interaction.reply({ embeds: [mkEmbed('Permission').setDescription('Only server admins can set birthdays for others.')], flags: 64 });
        }

        if (!validMonthDay(month, day)) {
          return interaction.reply({ embeds: [mkEmbed('Invalid Date').setDescription('Please provide a valid month and day.')], flags: 64 });
        }

        await bstore.setBirthday({ guildId: interaction.guild.id, userId: target.id, year, month, day, note });
        const desc = `Saved birthday for ${target} — **${year ? `${year}-` : ''}${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}**${note ? `\nNote: ${note}` : ''}`;
        return interaction.reply({ embeds: [mkEmbed('Birthday Saved').setDescription(desc).setColor(ACCENT)], flags: 64 });
      }

      if (sub === 'view') {
        const target = interaction.options.getUser('user') ?? me;
        const row = await bstore.getBirthday(interaction.guild.id, target.id);
        if (!row) return interaction.reply({ embeds: [mkEmbed('Birthday').setDescription(`${target} has not set a birthday.`)], flags: 64 });

        const embed = mkEmbed(`${target.username}'s Birthday`).addFields(
          { name: 'Date', value: formatDate(row), inline: true },
          { name: 'Note', value: row.note ? row.note : '(none)', inline: true }
        );
        return interaction.reply({ embeds: [embed], flags: 64 });
      }

      if (sub === 'list') {
        const rows = await bstore.listBirthdaysForGuild(interaction.guild.id);
        if (!rows.length) return interaction.reply({ embeds: [mkEmbed('Birthdays').setDescription('No birthdays saved for this server.')], flags: 64 });

        // Build lines: mention - date
        const lines = rows.map(r => `<@${r.user_id}> — ${formatDate(r)}${r.note ? ` — ${r.note}` : ''}`);
        // If too long, chunk into multiple messages; but use ephemeral to admin only to avoid channel spam
        const out = lines.join('\n');
        return interaction.reply({ embeds: [mkEmbed('Birthdays').setDescription(out)], flags: 64 });
      }

      if (sub === 'matches') {
        const days = interaction.options.getInteger('days') ?? 7;
        const rows = await bstore.upcomingBirthdays(interaction.guild.id, days, new Date());
        if (!rows.length) return interaction.reply({ embeds: [mkEmbed('Matches').setDescription(`No birthdays in the next ${days} days.`)], flags: 64 });

        const lines = rows.map(r => {
          const when = `${String(r.month).padStart(2,'0')}-${String(r.day).padStart(2,'0')}`;
          const age = r.year ? ` (turning ${new Date().getFullYear() - r.year})` : '';
          return `<@${r.user_id}> — ${when}${age}${r.note ? ` — ${r.note}` : ''}`;
        });

        return interaction.reply({ embeds: [mkEmbed(`Upcoming Birthdays — next ${days} days`).setDescription(lines.join('\n'))], flags: 64 });
      }

      if (sub === 'remove') {
        const target = interaction.options.getUser('user') ?? me;
        if (target.id !== me.id && !isAdmin) {
          return interaction.reply({ embeds: [mkEmbed('Permission').setDescription('Only server admins can remove other users\' birthdays.')], flags: 64 });
        }
        await bstore.removeBirthday(interaction.guild.id, target.id);
        return interaction.reply({ embeds: [mkEmbed('Removed').setDescription(`Birthday removed for ${target}.`).setColor(ACCENT)], flags: 64 });
      }

      return interaction.reply({ embeds: [mkEmbed('Unknown').setDescription('Unknown subcommand.')], flags: 64 });
    } catch (err) {
      console.error('[birthday command] error', err);
      return interaction.reply({ embeds: [mkEmbed('Error').setDescription('Internal error occurred.')], flags: 64 });
    }
  }
};