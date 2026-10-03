// src/commands/Utility/country.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'countries.json');

// ---------------------------
// Built-in country list (used for validation & autocomplete)
// This is a reasonably comprehensive list — you can extend it if you want.
// ---------------------------
const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia','Austria','Azerbaijan',
  'Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia',
  'Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
  'Côte d\'Ivoire','Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo (Congo-Brazzaville)','Costa Rica','Croatia','Cuba','Cyprus','Czechia',
  'Denmark','Djibouti','Dominica','Dominican Republic',
  'Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia',
  'Fiji','Finland','France',
  'Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana',
  'Haiti','Honduras','Hungary',
  'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
  'Jamaica','Japan','Jordan',
  'Kazakhstan','Kenya','Kiribati','Kuwait','Kyrgyzstan',
  'Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg',
  'Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
  'Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway',
  'Oman',
  'Pakistan','Palau','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal',
  'Qatar',
  'Romania','Russia','Rwanda',
  'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria',
  'Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu',
  'Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan',
  'Vanuatu','Vatican City','Venezuela','Vietnam',
  'Yemen',
  'Zambia','Zimbabwe'
];

// ---------------------------
// Storage helpers (file-based)
// ---------------------------
function ensureStore() {
  if (!fs.existsSync(path.dirname(DATA_PATH))) fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, JSON.stringify({}), 'utf8');
}

function loadStore() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function saveStore(data) {
  ensureStore();
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function getGuildMap(store, guildId) {
  if (!store[guildId]) store[guildId] = {};
  return store[guildId];
}

// ---------------------------
// Formatting helpers
// ---------------------------
function normalizeCountryName(name) {
  return name.trim().replace(/\s+/g, ' ');
}

function suggestCountries(input, limit = 6) {
  if (!input || !input.trim()) return COUNTRIES.slice(0, limit);
  const q = input.trim().toLowerCase();
  // Prioritize startsWith then includes
  const starts = COUNTRIES.filter(c => c.toLowerCase().startsWith(q));
  const includes = COUNTRIES.filter(c => !c.toLowerCase().startsWith(q) && c.toLowerCase().includes(q));
  return [...starts, ...includes].slice(0, limit);
}

function buildInfoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: 'MULTi-Bot • Countries' });
}

// ---------------------------
// Pagination helpers
// ---------------------------
const ITEMS_PER_PAGE = 8;

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function sendPaginatedEmbed(interaction, pages, buildPageEmbed, ephemeral = false) {
  // pages: array of payload (used by buildPageEmbed)
  if (!pages || pages.length === 0) {
    return interaction.reply({ content: 'No results to display.', flags: 64 });
  }

  let idx = 0;
  const page = buildPageEmbed(pages[idx], idx, pages.length);
  const prevBtn = new ButtonBuilder().setCustomId('country_prev').setLabel('◀️ Prev').setStyle(ButtonStyle.Secondary).setDisabled(true);
  const nextBtn = new ButtonBuilder().setCustomId('country_next').setLabel('Next ▶️').setStyle(ButtonStyle.Secondary).setDisabled(pages.length === 1);

  const row = new ActionRowBuilder().addComponents(prevBtn, nextBtn);

  const message = await interaction.reply({ embeds: [page], components: [row], flags: ephemeral ? 64 : undefined, withResponse: true });

  const filter = i => i.user.id === interaction.user.id && (i.customId === 'country_prev' || i.customId === 'country_next');
  const collector = message.createMessageComponentCollector({ filter, time: 120000 });

  collector.on('collect', async i => {
    try {
      await i.deferUpdate();
      if (i.customId === 'country_next') idx = Math.min(idx + 1, pages.length - 1);
      if (i.customId === 'country_prev') idx = Math.max(idx - 1, 0);

      const newPage = buildPageEmbed(pages[idx], idx, pages.length);
      prevBtn.setDisabled(idx === 0);
      nextBtn.setDisabled(idx === pages.length - 1);
      const newRow = new ActionRowBuilder().addComponents(prevBtn, nextBtn);
      await i.editReply({ embeds: [newPage], components: [newRow] });
    } catch (e) {
      console.error('[country] pagination error', e);
    }
  });

  collector.on('end', async () => {
    try {
      prevBtn.setDisabled(true);
      nextBtn.setDisabled(true);
      const disabledRow = new ActionRowBuilder().addComponents(prevBtn, nextBtn);
      await message.edit({ components: [disabledRow] }).catch(() => {});
    } catch {}
  });
}

// ---------------------------
// Command definition
// ---------------------------
module.exports = {
  data: new SlashCommandBuilder()
    .setName('country')
    .setDescription('Set and view countries for server members.')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set your country.')
        .addStringOption(o =>
          o
            .setName('name')
            .setDescription('Choose your country (autocomplete enabled).')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View your country or someone else\'s.')
        .addUserOption(o =>
          o.setName('user').setDescription('User to view (defaults to you).').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all countries for users in this server (paginated).')
    )
    .addSubcommand(sub =>
      sub.setName('matches')
        .setDescription('See who in this server shares your country (paginated).')
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove your country (admins can remove others).')
        .addUserOption(o =>
          o
            .setName('user')
            .setDescription('User whose country should be removed (admin only).')
            .setRequired(false)
        )
    ),

  /**
   * Autocomplete handler — returns up to 25 suggestions for the "name" option.
   * Your interactionCreate should route autocomplete to the command code.
   */
  async autocomplete(interaction) {
    try {
      const focused = interaction.options.getFocused(true);
      if (focused.name !== 'name') return interaction.respond([]);

      const value = focused.value || '';
      const suggestions = suggestCountries(value, 25).map(c => ({ name: c, value: c }));
      return interaction.respond(suggestions);
    } catch (e) {
      console.error('[country.autocomplete] error', e);
      return interaction.respond([]);
    }
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const { guild, user, member } = interaction;

    // Load store
    const store = loadStore();
    const guildMap = getGuildMap(store, guild.id);

    // ---- set
    if (sub === 'set') {
      const raw = interaction.options.getString('name', true);
      const name = normalizeCountryName(raw);

      // validate
      const found = COUNTRIES.find(c => c.toLowerCase() === name.toLowerCase());
      if (!found) {
        // offer suggestions
        const suggestions = suggestCountries(name, 6);
        if (suggestions.length) {
          return interaction.reply({
            embeds: [buildInfoEmbed('❌ Unknown country', `I couldn't find **${raw}** in the country list. Did you mean:\n\n• ${suggestions.join('\n• ')}`)],
            flags: 64
          });
        } else {
          return interaction.reply({
            content: `❌ Invalid country: **${raw}**. Please select a country using autocomplete.`,
            flags: 64
          });
        }
      }

      guildMap[user.id] = found;
      saveStore(store);

      return interaction.reply({ embeds: [buildInfoEmbed('✅ Country Set', `Your country has been set to **${found}**.`)], flags: 64 });
    }

    // ---- view
    if (sub === 'view') {
      const target = interaction.options.getUser('user') || user;
      const entry = guildMap[target.id];
      if (!entry) {
        return interaction.reply({
          content: target.id === user.id
            ? 'ℹ️ You have not set a country yet. Use `/country set`.'
            : `ℹ️ ${target.tag} has not set a country yet.`,
          flags: 64
        });
      }
      return interaction.reply({ embeds: [buildInfoEmbed('🌍 Country Info', `**User:** <@${target.id}>\n**Country:** ${entry}`)] });
    }

    // ---- list (paginated)
    if (sub === 'list') {
      const entries = Object.entries(guildMap); // [userId, country]
      if (entries.length === 0) {
        return interaction.reply({ content: 'ℹ️ No countries have been set in this server yet.', flags: 64 });
      }

      // group by country
      const grouped = {};
      for (const [userId, country] of entries) {
        if (!grouped[country]) grouped[country] = [];
        grouped[country].push(userId);
      }

      const rows = Object.keys(grouped).sort((a, b) => a.localeCompare(b)).map(country => {
        return { country, users: grouped[country] };
      });

      // build pages (ITEMS_PER_PAGE rows per page)
      const chunks = chunkArray(rows, ITEMS_PER_PAGE);
      const pages = chunks.map(chunk => chunk.map(r => r)); // payload per page

      const buildPageEmbed = (pagePayload, idx, total) => {
        let desc = '';
        for (const { country, users } of pagePayload) {
          const mentions = users.map(id => `<@${id}>`).join(', ');
          desc += `**${country}** — ${users.length} user(s)\n${mentions}\n\n`;
        }
        const embed = buildInfoEmbed('🌐 Countries in this Server', desc || 'No data.');
        embed.setFooter({ text: `Page ${idx + 1} / ${total} • MULTi-Bot • Countries` });
        return embed;
      };

      return sendPaginatedEmbed(interaction, pages, buildPageEmbed, false);
    }

    // ---- matches (paginated)
    if (sub === 'matches') {
      const myCountry = guildMap[user.id];
      if (!myCountry) {
        return interaction.reply({ content: 'ℹ️ You have not set a country yet. Use `/country set` first.', flags: 64 });
      }

      const matches = Object.entries(guildMap)
        .filter(([uid, country]) => country === myCountry && uid !== user.id)
        .map(([uid]) => uid);

      if (matches.length === 0) {
        return interaction.reply({ content: `🌍 Your country is **${myCountry}**, but no one else in this server has that set yet.`, flags: 64 });
      }

      const chunks = chunkArray(matches, ITEMS_PER_PAGE);
      const pages = chunks;

      const buildPageEmbed = (pagePayload, idx, total) => {
        const desc = pagePayload.map(id => `• <@${id}>`).join('\n');
        const embed = buildInfoEmbed('🌍 Country Matches', `Your country: **${myCountry}**\n\nUsers with the same country:\n${desc}`);
        embed.setFooter({ text: `Page ${idx + 1} / ${total} • MULTi-Bot • Countries` });
        return embed;
      };

      return sendPaginatedEmbed(interaction, pages, buildPageEmbed, false);
    }

    // ---- remove
    if (sub === 'remove') {
      const target = interaction.options.getUser('user') || user;
      const isSelf = target.id === user.id;
      const isAdmin = member.permissions.has(PermissionFlagsBits.ManageGuild);

      if (!isSelf && !isAdmin) {
        return interaction.reply({ content: '❌ You can only remove **your own** country unless you have **Manage Server** permission.', flags: 64 });
      }

      if (!guildMap[target.id]) {
        return interaction.reply({ content: isSelf ? 'ℹ️ You don’t have a country set.' : `ℹ️ ${target.tag} doesn’t have a country set.`, flags: 64 });
      }

      delete guildMap[target.id];
      saveStore(store);

      return interaction.reply({ content: isSelf ? '✅ Your country has been removed.' : `✅ Removed country for <@${target.id}>.`, flags: 64 });
    }

    // fallback
    return interaction.reply({ content: '❌ Unknown subcommand.', flags: 64 });
  }
};
