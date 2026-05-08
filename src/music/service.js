const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');
const {
  COLORS,
  buildControlButtons,
  buildFilterMenu,
  currentFilterLabel,
  buildQueueEmbed,
  buildSearchEmbed,
  buildNowPlayingEmbed,
  errorEmbed,
  formatTimeMs,
  getDurationMs,
  successEmbed,
  simpleEmbed,
  trackDisplay,
  trackDuration,
  trackTitle,
  limit,
  trackAuthor
} = require('./ui');

const SEARCH_TIMEOUT = 10000;
const FILTER_PRESETS = {
  clear: {},
  none: {},
  nightcore: { timescale: { speed: 1.2, pitch: 1.2, rate: 1.0 } },
  bassboost: { equalizer: [{ band: 0, gain: 0.25 }, { band: 1, gain: 0.25 }, { band: 2, gain: 0.25 }] },
  vaporwave: { timescale: { speed: 0.85, pitch: 0.8 } },
  soft: { lowPass: { smoothing: 20.0 } },
  karaoke: { karaoke: { level: 1.0, monoLevel: 1.0, filterBand: 220.0, filterWidth: 100.0 } },
  rotation: { rotation: { rotationHz: 0.2 } },
  chipmunk: { timescale: { speed: 1.05, pitch: 1.35 } },
  daycore: { timescale: { speed: 0.85, pitch: 0.85 } }
};

function musicConfig(client) {
  return {
    defaultSource: client.musicConfig?.defaultSource || process.env.DEFAULT_SOURCE || 'ytmsearch:',
    lavaSrc: client.musicConfig?.lavaSrc || String(process.env.LAVASRC || 'false').toLowerCase() === 'true',
    lavaSrcSource: client.musicConfig?.lavaSrcSource || process.env.LAVASRC_SOURCE || 'spsearch:',
    minVolume: client.musicConfig?.minVolume ?? 1,
    maxVolume: client.musicConfig?.maxVolume ?? 100
  };
}
function getCurrentFilter(player) {
  return String(player?.data?.get('filter') || 'clear');
}


function searchSources(client) {
  const config = musicConfig(client);
  const sources = [];
  sources.push('ytmsearch:', 'ytsearch:');
  if (config.lavaSrc) sources.push(config.lavaSrcSource);
  sources.push('scsearch:');
  sources.push(''); 
  return [...new Set(sources.filter(s => s !== undefined))];
}

function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), SEARCH_TIMEOUT);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Robust track search with fallback mechanisms.
 * Fix: Explicitly handles URLs to prevent 'phantom' redirects by avoiding search prefixes on links.
 */
async function searchTracks(client, query, requester) {
  if (!query) return { tracks: [], type: 'SEARCH' };
  const q = String(query).trim();
  
  // 1. URL DETECTOR - If it's a URL, search it RAW without ANY prefixes.
  const isUrl = /^https?:\/\//.test(q);
  if (isUrl) {
    try {

      const result = await withTimeout(client.music.search(q, { requester }), 'URL Resolution');
      const tracks = result.tracks || result.data || [];
      if (tracks.length > 0) {

        result.tracks = tracks;
        return result;
      }
    } catch (e) {

    }
    // If it was a URL and it failed/returned nothing, do NOT fallback to fuzzy search as it leads to 'phantom' tracks.
    return { tracks: [], type: 'SEARCH', error: 'Failed to resolve link.' };
  }

  // 2. FUZZY SEARCH - For text queries, try multiple sources.
  let lastError = null;
  const sources = searchSources(client);
  for (const source of sources) {
    try {
      const searchQuery = source ? `${source}${q}` : q;

      const result = await withTimeout(client.music.search(searchQuery, { requester }), `Search with ${source || 'direct'}`);
      const tracks = result.tracks || result.data || [];
      if (tracks.length > 0) {
        result.tracks = tracks;
        result.usedSource = source || 'direct';
        return result;
      }
    } catch (error) {
      lastError = error;
    }
  }

  return { tracks: [], type: 'SEARCH', error: lastError?.message || 'No results found.' };
}

async function createPlayer(client, guildId, voiceId, textId) {
  if (!client.music) throw new Error('Music core not ready');
  let player = client.music.players.get(guildId);
  if (player) {
    if (player.voiceId !== voiceId) await player.setVoiceChannel(voiceId);
    if (textId) player.textId = textId;
    return player;
  }
  const guild = await client.guilds.fetch(guildId);
  player = await client.music.createPlayer({
    guildId,
    voiceId,
    textId: textId || null,
    shardId: guild.shardId ?? 0,
    volume: 100,
    deaf: true
  });
  if (!player.data.get('filter')) player.data.set('filter', 'clear');
  return player;
}

async function applyFilter(player, preset) {
  const normalized = String(preset || 'clear').toLowerCase();
  const filterData = FILTER_PRESETS[normalized] || {};
  if (normalized === 'clear' || normalized === 'none') {
    await player.shoukaku.clearFilters();
    player.data.set('filter', 'clear');
    return 'clear';
  }
  await player.shoukaku.setFilters(filterData);
  player.data.set('filter', normalized);
  return normalized;
}

async function updatePlayerMessage(client, player) {
  if (!player?.message || !player?.queue?.current) return null;
  return player.message.edit({
    embeds: [buildNowPlayingEmbed(player.queue.current, player, client)],
    components: buildControlButtons(player.guildId, player.paused)
  }).catch(() => null);
}

async function addTracksAndPlay(player, tracks) {
  player.queue.add(tracks);
  if (!player.playing && !player.paused) await player.play();
}

async function executeMusicAction(interaction) {
  const { client, guildId, member, options } = interaction;
  const sub = options.getSubcommand();

  let player = client.music?.players?.get(guildId);
  await interaction.deferReply({ flags: 64 }).catch(() => null);

  try {
    switch (sub) {
      case 'play': {
        const query = options.getString('query');
        if (!member.voice.channelId) return interaction.editReply({ embeds: [errorEmbed('Join a voice channel first.')] });
        if (player && player.voiceId !== member.voice.channelId) return interaction.editReply({ embeds: [errorEmbed('You must be in the same voice channel.')] });
        
        player = await createPlayer(client, guildId, member.voice.channelId, interaction.channelId);
        const res = await searchTracks(client, query, member);
        if (!res.tracks?.length) return interaction.editReply({ embeds: [errorEmbed(res.error || 'No results found.')] });
        
        if (res.type === 'PLAYLIST') {
          await addTracksAndPlay(player, res.tracks);
          await interaction.editReply({ embeds: [successEmbed(`Added playlist **${res.playlistName || 'Unknown'}** (${res.tracks.length} tracks) to queue.`)] });
        } else {
          await addTracksAndPlay(player, res.tracks[0]);
          await interaction.editReply({ embeds: [successEmbed(`Added **${res.tracks[0].title}** to queue.`)] });
        }
        break;
      }

      case 'search': {
        const query = options.getString('query');
        if (!member.voice.channelId) return interaction.editReply({ embeds: [errorEmbed('Join a voice channel first.')] });
        if (player && player.voiceId !== member.voice.channelId) return interaction.editReply({ embeds: [errorEmbed('You must be in the same voice channel.')] });
        
        player = await createPlayer(client, guildId, member.voice.channelId, interaction.channelId);
        const res = await searchTracks(client, query, member);
        if (!res.tracks?.length) return interaction.editReply({ embeds: [errorEmbed(res.error || 'No results found.')] });

        if (res.type === 'PLAYLIST') {
          await addTracksAndPlay(player, res.tracks);
          return interaction.editReply({ embeds: [successEmbed(`Added playlist **${res.playlistName || 'Unknown'}** (${res.tracks.length} tracks) to queue.`)] });
        }

        const tracks = res.tracks.slice(0, 10);
        const select = new StringSelectMenuBuilder()
          .setCustomId('music_search_select')
          .setPlaceholder('Choose a track to play...')
          .addOptions(tracks.map((t, i) => ({
            label: limit(t.title || 'Unknown', 95),
            description: limit(t.author || 'Unknown', 95),
            value: i.toString()
          })));

        await interaction.editReply({ 
          embeds: [buildSearchEmbed(query, tracks)], 
          components: [new ActionRowBuilder().addComponents(select)] 
        });

        const msg = await interaction.fetchReply();
        const collector = msg.createMessageComponentCollector({
          filter: i => i.user.id === interaction.user.id,
          time: 30000,
          max: 1
        });

        collector.on('collect', async i => {
          const track = tracks[parseInt(i.values[0])];
          await addTracksAndPlay(player, track);
          await i.update({ embeds: [successEmbed(`Added **${track.title}** to queue.`)], components: [] });
          if (player) client.dashboardBridge?.emitPlayerUpdate(player);
        });

        collector.on('end', (_, reason) => {
          if (reason === 'time') interaction.editReply({ components: [] }).catch(() => null);
        });
        return; 
      }

      case 'join': {
        if (!member.voice.channelId) return interaction.editReply({ embeds: [errorEmbed('Join a voice channel first.')] });
        player = await createPlayer(client, guildId, member.voice.channelId, interaction.channelId);
        await interaction.editReply({ embeds: [successEmbed(`Joined <#${member.voice.channelId}>.`)] });
        break;
      }

      case 'leave': {
        if (!player) return interaction.editReply({ embeds: [errorEmbed('I am not in a voice channel.')] });
        await player.destroy();
        await interaction.editReply({ embeds: [successEmbed('Left the voice channel.')] });
        break;
      }

      case 'pause': {
        if (!player) return interaction.editReply({ embeds: [errorEmbed('No player active.')] });
        if (player.paused) return interaction.editReply({ embeds: [errorEmbed('Player is already paused.')] });
        await player.pause(true);
        await interaction.editReply({ embeds: [successEmbed('Paused the music.')] });
        break;
      }

      case 'resume': {
        if (!player) return interaction.editReply({ embeds: [errorEmbed('No player active.')] });
        if (!player.paused) return interaction.editReply({ embeds: [errorEmbed('Player is not paused.')] });
        await player.pause(false);
        await interaction.editReply({ embeds: [successEmbed('Resumed the music.')] });
        break;
      }

      case 'skip': {
        if (!player) return interaction.editReply({ embeds: [errorEmbed('No player active.')] });
        await player.skip();
        await interaction.editReply({ embeds: [successEmbed('Skipped the current song.')] });
        break;
      }

      case 'previous': {
        if (!player) return interaction.editReply({ embeds: [errorEmbed('No player active.')] });
        const previous = player.getPrevious?.(true) || player.queue.previous?.shift();
        if (!previous) return interaction.editReply({ embeds: [errorEmbed('No previous song found.')] });
        if (player.queue.current) player.queue.unshift(player.queue.current);
        player.queue.unshift(previous);
        await player.skip();
        await interaction.editReply({ embeds: [successEmbed('Playing the previous song.')] });
        break;
      }

      case 'stop': {
        if (!player) return interaction.editReply({ embeds: [errorEmbed('No player active.')] });
        player.queue.clear();
        await player.destroy();
        await interaction.editReply({ embeds: [successEmbed('Stopped the player and cleared the queue.')] });
        break;
      }

      case 'nowplaying': {
        if (!player || !player.queue.current) return interaction.editReply({ embeds: [errorEmbed('Nothing is playing right now.')] });
        await interaction.editReply({ embeds: [buildNowPlayingEmbed(player.queue.current, player, client)] });
        break;
      }

      case 'queue': {
        if (!player) return interaction.editReply({ embeds: [errorEmbed('No player active.')] });
        await interaction.editReply({ embeds: [buildQueueEmbed(player, client)] });
        break;
      }

      case 'clear': {
        if (!player) return interaction.editReply({ embeds: [errorEmbed('No player active.')] });
        player.queue.clear();
        await interaction.editReply({ embeds: [successEmbed('Cleared the queue.')] });
        break;
      }

      case 'shuffle': {
        if (!player) return interaction.editReply({ embeds: [errorEmbed('No player active.')] });
        if (player.queue.size < 2) return interaction.editReply({ embeds: [errorEmbed('Need at least 2 songs to shuffle.')] });
        player.queue.shuffle();
        await interaction.editReply({ embeds: [successEmbed('Shuffled the queue.')] });
        break;
      }

      case 'remove': {
        if (!player) return interaction.editReply({ embeds: [errorEmbed('No player active.')] });
        const pos = options.getInteger('position');
        if (pos > player.queue.size || pos < 1) return interaction.editReply({ embeds: [errorEmbed(`Invalid position. Queue size is ${player.queue.size}.`)] });
        const removed = player.queue.remove(pos - 1);
        await interaction.editReply({ embeds: [successEmbed(`Removed **${removed.title}** from queue.`)] });
        break;
      }

      case 'seek': {
        if (!player || !player.queue.current) return interaction.editReply({ embeds: [errorEmbed('Nothing is playing.')] });
        const seconds = options.getInteger('seconds');
        const duration = getDurationMs(player.queue.current);
        if (seconds * 1000 > duration) return interaction.editReply({ embeds: [errorEmbed('Cannot seek past song duration.')] });
        await player.seek(seconds * 1000);
        await interaction.editReply({ embeds: [successEmbed(`Seeked to \`${formatTimeMs(seconds * 1000)}\`.`)] });
        break;
      }

      case 'volume': {
        if (!player) return interaction.editReply({ embeds: [errorEmbed('No player active.')] });
        const val = options.getInteger('value');
        if (val === null) return interaction.editReply({ embeds: [simpleEmbed(`Current volume: \`${player.volume}%\`.`)] });
        await player.setVolume(val);
        await interaction.editReply({ embeds: [successEmbed(`Volume set to \`${val}%\`.`)] });
        break;
      }

      case 'loop': {
        if (!player) return interaction.editReply({ embeds: [errorEmbed('No player active.')] });
        const mode = options.getString('mode');
        const next = mode || (player.loop === 'none' ? 'track' : player.loop === 'track' ? 'queue' : 'none');
        player.setLoop(next);
        await interaction.editReply({ embeds: [successEmbed(`Loop mode set to \`${next}\`.`)] });
        break;
      }

      case 'filter': {
        if (!player) return interaction.editReply({ embeds: [errorEmbed('No player active.')] });
        const mode = options.getString('mode');
        const applied = await applyFilter(player, mode);
        await interaction.editReply({ embeds: [successEmbed(`Filter applied: **${currentFilterLabel({ data: new Map([['filter', applied]]) })}**.`)] });
        break;
      }

      default: {
        await interaction.editReply({ embeds: [errorEmbed('Unknown subcommand.')] });
        break;
      }
    }

    if (player) {
      setImmediate(() => {
        client.dashboardBridge?.emitPlayerUpdate(player);
        updatePlayerMessage(client, player).catch(() => null);
      });
    }

  } catch (err) {
    console.error('[MusicAction] Error:', err);
    await interaction.editReply({ embeds: [errorEmbed(`An error occurred: ${err.message}`)] }).catch(() => null);
  }
}


module.exports = {
  applyFilter,
  createPlayer,
  addTracksAndPlay,
  executeMusicAction,
  searchTracks,
  updatePlayerMessage,
  formatTimeMs,
  musicConfig,
  getCurrentFilter
};
