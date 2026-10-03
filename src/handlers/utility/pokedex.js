// src/commands/Utility/pokedex.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

let pokemonList = [];
let pokemonListLoadedAt = 0;
const POKEMON_LIST_TTL = 1000 * 60 * 60 * 12; // 12 hours

function cap(str = '') {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function niceName(str = '') {
  return str
    .replace(/-/g, ' ')
    .split(' ')
    .map(s => cap(s))
    .join(' ');
}

async function loadPokemonList() {
  const now = Date.now();
  if (pokemonList.length && now - pokemonListLoadedAt < POKEMON_LIST_TTL) return pokemonList;

  try {
    const res = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0');
    pokemonList = res.data.results.map((p, i) => {
      const parts = p.url.split('/').filter(Boolean);
      const id = Number(parts[parts.length - 1]) || i + 1;
      return { name: p.name.toLowerCase(), id };
    });
    pokemonListLoadedAt = now;
  } catch (e) {
    console.error('[pokedex] failed to load list', e);
  }

  return pokemonList;
}

function buildStatLines(stats) {
  if (!Array.isArray(stats) || !stats.length) return 'No stats data.';

  const nameMap = {
    hp: 'HP',
    attack: 'ATK',
    defense: 'DEF',
    'special-attack': 'SP.ATK',
    'special-defense': 'SP.DEF',
    speed: 'SPD',
  };

  return stats
    .map(s => {
      const key = s.stat?.name || '';
      const label = nameMap[key] || key.toUpperCase();
      const val = s.base_stat ?? 0;

      const blocks = Math.max(1, Math.round((val / 255) * 10));
      const bar = '█'.repeat(blocks) + '░'.repeat(10 - blocks);

      return `**${label.padEnd(6)}** ▸ ${val.toString().padStart(3)}  ${bar}`;
    })
    .join('\n');
}

function getGenderRatio(genderRate) {
  if (genderRate === -1) return '⚪ Genderless';
  // gender_rate is out of 8, female rate
  const female = (genderRate / 8) * 100;
  const male = 100 - female;
  return `♂ **${male.toFixed(1)}%** • ♀ **${female.toFixed(1)}%**`;
}

function pickFlavor(species) {
  if (!species || !Array.isArray(species.flavor_text_entries)) return null;

  const english = species.flavor_text_entries.filter(
    e => e.language?.name === 'en'
  );

  if (!english.length) return null;

  // Prefer modern games (sword/shield, let's go, etc.)
  const preferredOrder = ['sv', 'sw', 'shield', 'sword', 'lets-go-eevee', 'lets-go-pikachu', 'ultra-sun', 'ultra-moon'];

  let chosen = english[0];

  for (const key of preferredOrder) {
    const match = english.find(e => e.version?.name === key);
    if (match) {
      chosen = match;
      break;
    }
  }

  return chosen.flavor_text.replace(/\s+/g, ' ').replace(/\f/g, ' ').trim();
}

const typeColorMap = {
  normal: 0xaaaa99,
  fire: 0xff7043,
  water: 0x42a5f5,
  electric: 0xffd54f,
  grass: 0x66bb6a,
  ice: 0x80deea,
  fighting: 0xef5350,
  poison: 0xab47bc,
  ground: 0xd4a373,
  flying: 0x90caf9,
  psychic: 0xff80ab,
  bug: 0x9ccc65,
  rock: 0x8d6e63,
  ghost: 0x7e57c2,
  dragon: 0x7b1fa2,
  dark: 0x5d4037,
  steel: 0xb0bec5,
  fairy: 0xf48fb1,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pokedex')
    .setDescription('📘 MULTi-Bot Pokédex • Look up detailed Pokémon info.')
    .addStringOption(o =>
      o
        .setName('pokemon')
        .setDescription('Name or ID of the Pokémon')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  // 🔎 Autocomplete handler
  async autocomplete(interaction) {
    const focused = (interaction.options.getFocused() || '').toLowerCase().trim();
    const list = await loadPokemonList();

    let source =
      list.length > 0
        ? list
        : [
            { name: 'bulbasaur', id: 1 },
            { name: 'charmander', id: 4 },
            { name: 'squirtle', id: 7 },
            { name: 'pikachu', id: 25 },
            { name: 'eevee', id: 133 },
          ];

    if (focused) {
      // If user is typing a number, prioritise ID matches
      if (/^\d+$/.test(focused)) {
        const num = Number(focused);
        source = source.filter(p => p.id.toString().startsWith(focused)).slice(0, 25);
      } else {
        source = source
          .filter(p => p.name.startsWith(focused) || p.name.includes(focused))
          .slice(0, 25);
      }
    } else {
      source = source.slice(0, 25);
    }

    const choices = source.map(p => ({
      name: `#${p.id.toString().padStart(4, '0')} • ${cap(p.name)}`,
      value: p.name,
    }));

    return interaction.respond(choices);
  },

  // 🧬 Main command
  async execute(interaction) {
    const queryRaw = interaction.options.getString('pokemon', true).trim();
    const query = queryRaw.toLowerCase();

    // Public command, can take a bit => defer
    await interaction.deferReply();

    let pokemonData;
    let speciesData;

    try {
      // First get core Pokémon data
      const pokeRes = await axios.get(
        `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(query)}`
      );
      pokemonData = pokeRes.data;

      // Then species data for flavor text etc.
      const speciesRes = await axios.get(
        `https://pokeapi.co/api/v2/pokemon-species/${pokemonData.id}`
      );
      speciesData = speciesRes.data;
    } catch (e) {
      if (e.response && e.response.status === 404) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff5555)
              .setTitle('❌ Pokémon Not Found')
              .setDescription(
                `I couldn't find any Pokémon matching \`${queryRaw}\`.\n` +
                  'Make sure the name/ID is correct, or try using autocomplete suggestions.'
              )
              .setFooter({ text: 'MULTi-Bot Pokedex • No matching entry.' }),
          ],
        });
      }

      console.error('[pokedex] API error', e);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffaa00)
            .setTitle('⚠️ PokéAPI Unreachable')
            .setDescription('The PokéAPI is not responding right now. Please try again later.')
            .setFooter({ text: 'MULTi-Bot Pokedex • External API error.' }),
        ],
      });
    }

    const data = pokemonData;
    const species = speciesData || {};

    // --- Basic info ---
    const id = data.id;
    const displayName = niceName(data.name);
    const types = data.types
      .sort((a, b) => a.slot - b.slot)
      .map(t => niceName(t.type.name))
      .join(' / ') || 'Unknown';

    const heightM = (data.height / 10).toFixed(1);
    const weightKg = (data.weight / 10).toFixed(1);

    // --- Abilities ---
    const abilities = data.abilities
      .sort((a, b) => Number(a.is_hidden) - Number(b.is_hidden))
      .map(a => {
        const name = niceName(a.ability.name);
        return a.is_hidden ? `${name} *(Hidden)*` : name;
      })
      .join('\n') || 'None';

    // --- Stats ---
    const statsBlock = buildStatLines(data.stats);

    // --- Species info ---
    const generaEntry = (species.genera || []).find(g => g.language?.name === 'en');
    const speciesName = generaEntry?.genus || 'Pokémon';

    const flavor = pickFlavor(species) || 'No Pokédex flavor text available.';
    const eggGroups = (species.egg_groups || []).map(e => niceName(e.name)).join(', ') || 'Unknown';
    const genderText = getGenderRatio(species.gender_rate);
    const baseHappiness = species.base_happiness ?? 'Unknown';
    const captureRate = species.capture_rate ?? 'Unknown';
    const growthRate = species.growth_rate ? niceName(species.growth_rate.name) : 'Unknown';
    const colorName = species.color ? niceName(species.color.name) : 'Unknown';
    const generation = species.generation ? species.generation.name.toUpperCase().replace('GENERATION-', 'GEN ') : 'Unknown';

    // --- Sprite ---
    const sprite =
      data.sprites.other?.['official-artwork']?.front_default ||
      data.sprites.other?.home?.front_default ||
      data.sprites.front_default ||
      null;

    const primaryType = data.types[0]?.type?.name;
    const color =
      primaryType && typeColorMap[primaryType]
        ? typeColorMap[primaryType]
        : 0x5865f2;

    const basicInfo = [
      `🧬 **Species:** ${speciesName}`,
      `🔢 **Dex ID:** #${id.toString().padStart(4, '0')}`,
      `🌈 **Type:** ${types}`,
      `🎨 **Color:** ${colorName}`,
      `📍 **Generation:** ${generation}`,
    ].join('\n');

    const trainingInfo = [
      `⭐ **Base EXP:** ${data.base_experience ?? 'Unknown'}`,
      `😊 **Base Happiness:** ${baseHappiness}`,
      `🎯 **Capture Rate:** ${captureRate}`,
      `📈 **Growth Rate:** ${growthRate}`,
    ].join('\n');

    const breedingInfo = [
      `🥚 **Egg Groups:** ${eggGroups}`,
      `⚧ **Gender Ratio:** ${genderText}`,
      `📏 **Height:** ${heightM} m`,
      `⚖️ **Weight:** ${weightKg} kg`,
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`📗 #${id.toString().padStart(4, '0')} — ${displayName}`)
      .setDescription(basicInfo)
      .addFields(
        {
          name: '📊 Base Stats',
          value: statsBlock,
          inline: false,
        },
        {
          name: '✨ Abilities',
          value: abilities,
          inline: false,
        },
        {
          name: '🧪 Training Data',
          value: trainingInfo,
          inline: true,
        },
        {
          name: '🍼 Breeding & Body',
          value: breedingInfo,
          inline: true,
        },
        {
          name: '📜 Pokédex Entry',
          value: flavor,
          inline: false,
        }
      )
      .setFooter({ text: 'MULTi-Bot Pokedex • Data provided by PokéAPI' })
      .setTimestamp();

    if (sprite) embed.setThumbnail(sprite);

    return interaction.editReply({ embeds: [embed] });
  },
};
