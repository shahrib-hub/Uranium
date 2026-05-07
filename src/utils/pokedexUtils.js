// src/utils/pokedexUtils.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://pokeapi.co/api/v2',
  timeout: 10000
});

const MOVES_PER_PAGE = 10;

/**
 * Fetch basic Pokémon + species data from PokéAPI
 */
async function fetchPokemonBasic(nameOrId) {
  const pokemonRes = await api.get(`/pokemon/${encodeURIComponent(nameOrId)}`);
  const poke = pokemonRes.data;

  const speciesRes = await api.get(poke.species.url);
  const species = speciesRes.data;

  return { poke, species };
}

/**
 * Extract evolution chain list (simple linear chain)
 */
async function fetchEvolutionChain(species) {
  if (!species.evolution_chain?.url) return [];
  const evoRes = await api.get(species.evolution_chain.url);

  const chain = [];
  let node = evoRes.data.chain;

  while (node) {
    chain.push(node.species.name);
    node = node.evolves_to[0];
  }
  return chain;
}

/**
 * Build Pokédex panel (embed + buttons) for given state.
 * state: { name, page, shiny }
 */
async function buildPokedexPanel(state) {
  let { name, page = 0, shiny = false } = state;
  name = String(name).toLowerCase();

  const { poke, species } = await fetchPokemonBasic(name);
  const evoChain = await fetchEvolutionChain(species);

  const displayName = poke.name.toUpperCase();
  const id = poke.id;
  const types = poke.types.map(t => t.type.name).join(', ');
  const height = (poke.height / 10).toFixed(1);
  const weight = (poke.weight / 10).toFixed(1);

  const abilitiesNormal = poke.abilities
    .filter(a => !a.is_hidden)
    .map(a => a.ability.name)
    .join(', ') || 'None';

  const abilitiesHidden = poke.abilities
    .filter(a => a.is_hidden)
    .map(a => a.ability.name)
    .join(', ') || 'None';

  const stats = poke.stats
    .map(s => `**${s.stat.name}**: ${s.base_stat}`)
    .join('\n');

  const flavor =
    species.flavor_text_entries.find(f => f.language.name === 'en')?.flavor_text
      ?.replace(/\s+/g, ' ') ||
    'No description available';

  const isLegendary = species.is_legendary ? 'Yes' : 'No';
  const isMythical = species.is_mythical ? 'Yes' : 'No';
  const eggGroups = species.egg_groups.map(e => e.name).join(', ') || 'Unknown';
  const generation = species.generation.name;

  // Moves & pagination
  const moves = poke.moves.map(m => m.move.name);
  const pageCount = Math.max(1, Math.ceil(moves.length / MOVES_PER_PAGE));

  // Clamp page
  if (page < 0) page = 0;
  if (page > pageCount - 1) page = pageCount - 1;

  const slice = moves.slice(page * MOVES_PER_PAGE, (page + 1) * MOVES_PER_PAGE);
  const moveText =
    slice.length > 0
      ? slice.map((m, i) => `\`${page * MOVES_PER_PAGE + i + 1}.\` ${m}`).join('\n')
      : 'No recorded moves.';

  // Evolution chain text, highlight current
  const evoText =
    evoChain.length > 0
      ? evoChain
          .map(eName =>
            eName.toLowerCase() === poke.name.toLowerCase()
              ? `→ **${eName}** (current)`
              : `→ ${eName}`
          )
          .join('\n')
      : 'No evolution data.';

  const spriteDefault =
    poke.sprites.other?.['official-artwork']?.front_default || poke.sprites.front_default;
  const spriteShiny =
    poke.sprites.other?.['official-artwork']?.front_shiny || poke.sprites.front_shiny;

  const embed = new EmbedBuilder()
    .setColor(shiny ? 0xf1c40f : 0x3498db)
    .setTitle(`📖 Pokédex — ${displayName}${shiny ? ' ✨ SHINY' : ''}`)
    .setThumbnail(shiny ? spriteShiny || spriteDefault : spriteDefault)
    .setDescription(flavor)
    .addFields(
      {
        name: '🆔 Basic',
        value: `**ID:** ${id}\n**Types:** ${types}\n**Height:** ${height} m\n**Weight:** ${weight} kg`
      },
      {
        name: '✨ Abilities',
        value: `**Normal:** ${abilitiesNormal}\n**Hidden:** ${abilitiesHidden}`
      },
      {
        name: '📊 Stats',
        value: stats
      },
      {
        name: '🥚 Species',
        value: `**Egg Groups:** ${eggGroups}\n**Generation:** ${generation}\n**Legendary:** ${isLegendary}\n**Mythical:** ${isMythical}`
      },
      {
        name: `🎯 Moves (Page ${page + 1}/${pageCount})`,
        value: moveText
      },
      {
        name: '🔗 Evolution Chain',
        value: evoText
      }
    )
    .setFooter({ text: 'Pokédex • Shiny Toggle • Move Pages • Evolution Cycle' });

  // Buttons: shiny toggle, prev moves, next moves, next evolution
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`pokedex|shiny|${poke.name}|${page}|${shiny ? 1 : 0}`)
      .setLabel('✨ Shiny')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`pokedex|prev|${poke.name}|${page}|${shiny ? 1 : 0}`)
      .setLabel('⬅ Moves')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`pokedex|next|${poke.name}|${page}|${shiny ? 1 : 0}`)
      .setLabel('➡ Moves')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`pokedex|evo|${poke.name}|${page}|${shiny ? 1 : 0}`)
      .setLabel('🔁 Next Evolution')
      .setStyle(ButtonStyle.Success)
  );

  return { embed, components: [row], meta: { page, pageCount, name: poke.name, shiny } };
}

module.exports = {
  api,
  MOVES_PER_PAGE,
  fetchPokemonBasic,
  fetchEvolutionChain,
  buildPokedexPanel
};
