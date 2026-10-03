const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

/**
 * Helper: format ms -> human readable (X days, Y hours, Z minutes)
 */
function formatDuration(ms) {
  if (ms <= 0) return 'Less than a second remaining.';

  let totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  totalSeconds -= days * 86400;
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds -= hours * 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;

  const parts = [];
  if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  if (!days && !hours && !minutes && seconds) {
    parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);
  }

  return parts.join(', ') || 'Less than a second remaining.';
}

/**
 * Helper: returns Date of next occurrence of fixed MM-DD in local time
 */
function getNextFixedDate(month, day) {
  const now = new Date();
  const year = now.getFullYear();

  let target = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (target <= now) {
    target = new Date(year + 1, month - 1, day, 0, 0, 0, 0);
  }
  return target;
}

/**
 * Helper: next New Year (Jan 1)
 */
function getNextNewYear() {
  const now = new Date();
  const year = now.getFullYear();
  let target = new Date(year, 0, 1, 0, 0, 0, 0); // Jan 1 current year
  if (target <= now) {
    target = new Date(year + 1, 0, 1, 0, 0, 0, 0);
  }
  return target;
}

/**
 * Helper: Western (Gregorian) Easter Sunday for a given year
 * (Meeus/Jones/Butcher algorithm)
 */
function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  // month is 3 or 4 -> JS month index month-1
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Helper: next Easter Sunday
 */
function getNextEaster() {
  const now = new Date();
  let year = now.getFullYear();
  let easter = getEasterSunday(year);
  if (easter <= now) {
    year += 1;
    easter = getEasterSunday(year);
  }
  return easter;
}

/**
 * Helper: US-style Thanksgiving (4th Thursday of November)
 */
function getThanksgivingForYear(year) {
  let d = new Date(year, 10, 1); // November 1
  // getDay(): 0=Sun ... 4=Thu
  while (d.getDay() !== 4) {
    d.setDate(d.getDate() + 1);
  }
  // Now it's the first Thursday; 4th Thursday means +3 weeks => +21 days
  d.setDate(d.getDate() + 21);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getNextThanksgiving() {
  const now = new Date();
  let year = now.getFullYear();
  let tg = getThanksgivingForYear(year);
  if (tg <= now) {
    year += 1;
    tg = getThanksgivingForYear(year);
  }
  return tg;
}

/**
 * Helper: parse YYYY-MM-DD string
 */
function parseISODateString(str) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Helper: embed builder
 */
function buildCountdownEmbed(label, targetDate) {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  const unixSeconds = Math.floor(targetDate.getTime() / 1000);
  const human = formatDuration(diff);

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`⏳ Countdown to ${label}`)
    .setDescription(
      `> **Time remaining:** ${human}\n` +
      `> **Target:** <t:${unixSeconds}:F>\n` +
      `> **Relative:** <t:${unixSeconds}:R>`
    )
    .setFooter({ text: 'MULTi-Bot • Countdowns' });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('countdown')
    .setDescription('View countdowns to special dates and events.')
    .addSubcommand(sub =>
      sub
        .setName('aprilfools')
        .setDescription('Countdown to the next April Fools\' Day (April 1).')
    )
    .addSubcommand(sub =>
      sub
        .setName('birthday')
        .setDescription('Countdown to your birthday (or any birthday).')
        .addIntegerOption(o =>
          o
            .setName('day')
            .setDescription('Day of the month (1–31).')
            .setRequired(true)
        )
        .addIntegerOption(o =>
          o
            .setName('month')
            .setDescription('Month number (1–12).')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('christmas')
        .setDescription('Countdown to Christmas (December 25).')
    )
    .addSubcommand(sub =>
      sub
        .setName('date')
        .setDescription('Countdown to a specific date (YYYY-MM-DD).')
        .addStringOption(o =>
          o
            .setName('value')
            .setDescription('Target date in YYYY-MM-DD format (e.g. 2025-12-25).')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('easter')
        .setDescription('Countdown to the next Easter Sunday (Western).')
    )
    .addSubcommand(sub =>
      sub
        .setName('halloween')
        .setDescription('Countdown to Halloween (October 31).')
    )
    .addSubcommand(sub =>
      sub
        .setName('newyear')
        .setDescription('Countdown to New Year\'s Day (January 1).')
    )
    .addSubcommand(sub =>
      sub
        .setName('thanksgiving')
        .setDescription('Countdown to US Thanksgiving (4th Thursday of November).')
    )
    .addSubcommand(sub =>
      sub
        .setName('valentines')
        .setDescription('Countdown to Valentine\'s Day (February 14).')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const now = new Date();
    let target;
    let label;

    try {
      switch (sub) {
        case 'aprilfools': {
          label = 'April Fools\' Day';
          target = getNextFixedDate(4, 1);
          break;
        }

        case 'birthday': {
          const day = interaction.options.getInteger('day', true);
          const month = interaction.options.getInteger('month', true);

          if (day < 1 || day > 31 || month < 1 || month > 12) {
            return interaction.reply({
              content: '❌ Please provide a valid day (1–31) and month (1–12).',
              flags: 64
            });
          }

          label = 'your birthday';
          target = getNextFixedDate(month, day);
          break;
        }

        case 'christmas': {
          label = 'Christmas';
          target = getNextFixedDate(12, 25);
          break;
        }

        case 'date': {
          const value = interaction.options.getString('value', true).trim();
          const parsed = parseISODateString(value);
          if (!parsed) {
            return interaction.reply({
              content: '❌ Invalid date format. Please use **YYYY-MM-DD** (e.g. `2025-12-25`).',
              flags: 64
            });
          }

          // If date in the past, move to next year with same month/day
          let year = parsed.getFullYear();
          let candidate = new Date(year, parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
          if (candidate <= now) {
            candidate = new Date(year + 1, parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
          }

          label = value;
          target = candidate;
          break;
        }

        case 'easter': {
          label = 'Easter Sunday';
          target = getNextEaster();
          break;
        }

        case 'halloween': {
          label = 'Halloween';
          target = getNextFixedDate(10, 31);
          break;
        }

        case 'newyear': {
          label = 'New Year\'s Day';
          target = getNextNewYear();
          break;
        }

        case 'thanksgiving': {
          label = 'Thanksgiving (US)';
          target = getNextThanksgiving();
          break;
        }

        case 'valentines': {
          label = 'Valentine\'s Day';
          target = getNextFixedDate(2, 14);
          break;
        }

        default: {
          return interaction.reply({
            content: '❌ Unknown subcommand.',
            flags: 64
          });
        }
      }

      const embed = buildCountdownEmbed(label, target);
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[countdown] error:', err);
      return interaction.reply({
        content: '❌ An error occurred while calculating that countdown.',
        flags: 64
      }).catch(() => {});
    }
  }
};
